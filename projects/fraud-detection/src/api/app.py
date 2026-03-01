"""FastAPI application for real-time fraud scoring.

Provides endpoints for single and batch transaction scoring,
health checks, and model metadata.
"""

import json
import logging
import os
import pickle
import time
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException

from src.api.schemas import (
    BatchRequest,
    BatchResponse,
    FraudPrediction,
    HealthResponse,
    TransactionRequest,
)
from src.feature_engineering.features import engineer_features, get_feature_columns

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Fraud Detection API",
    description="Real-time transaction fraud scoring service",
    version="1.0.0",
)

# Global state
_model: Any = None
_scaler: Any = None
_feature_columns: list[str] = []
_threshold: float = 0.5
_model_version: str = "unknown"
_start_time: float = time.time()
# In-memory cache for idempotent scoring. In production, replace with Redis
# for persistence across restarts and horizontal scaling.
_prediction_cache: dict[str, FraudPrediction] = {}
_CACHE_MAX_SIZE = 10000

ARTIFACTS_DIR = Path(os.getenv("ARTIFACTS_DIR", "artifacts"))


def load_model_artifacts(artifacts_dir: Path | None = None) -> None:
    """Load model and preprocessing artifacts from disk.

    Args:
        artifacts_dir: Directory containing model artifacts.
    """
    global _model, _scaler, _feature_columns, _threshold, _model_version

    artifacts_dir = artifacts_dir or ARTIFACTS_DIR

    model_path = artifacts_dir / "lgbm_model.pkl"
    scaler_path = artifacts_dir / "scaler.pkl"
    features_path = artifacts_dir / "feature_columns.json"
    threshold_path = artifacts_dir / "threshold_config.json"

    if not model_path.exists():
        logger.warning("Model artifact not found at %s", model_path)
        return

    with open(model_path, "rb") as f:
        _model = pickle.load(f)

    if scaler_path.exists():
        with open(scaler_path, "rb") as f:
            _scaler = pickle.load(f)

    if features_path.exists():
        with open(features_path, "r") as f:
            _feature_columns = json.load(f)

    if threshold_path.exists():
        with open(threshold_path, "r") as f:
            config = json.load(f)
            _threshold = config.get("f1_optimal", 0.5)

    _model_version = f"lgbm-{int(model_path.stat().st_mtime)}"
    logger.info("Model artifacts loaded (version=%s, threshold=%.4f)", _model_version, _threshold)


from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(application: FastAPI):
    """Load model artifacts on startup."""
    load_model_artifacts()
    yield


app.router.lifespan_context = lifespan


def _prepare_features(txn: TransactionRequest) -> pd.DataFrame:
    """Convert a transaction request into a feature DataFrame.

    Args:
        txn: Transaction request object.

    Returns:
        DataFrame with engineered features.
    """
    data = {
        "Time": [txn.time],
        "Amount": [txn.amount],
    }
    for i in range(1, 29):
        data[f"V{i}"] = [getattr(txn, f"v{i}")]

    df = pd.DataFrame(data)

    if _scaler is not None:
        cols_to_scale = [c for c in ["Time", "Amount"] if c in df.columns]
        df[cols_to_scale] = _scaler.transform(df[cols_to_scale])

    df = engineer_features(df)
    return df


def _score_transaction(txn: TransactionRequest) -> FraudPrediction:
    """Score a single transaction.

    Args:
        txn: Transaction request.

    Returns:
        Fraud prediction result.
    """
    if _model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")

    # Idempotency check
    if txn.transaction_id in _prediction_cache:
        cached = _prediction_cache[txn.transaction_id]
        return FraudPrediction(
            transaction_id=cached.transaction_id,
            fraud_probability=cached.fraud_probability,
            is_fraud=cached.is_fraud,
            threshold=cached.threshold,
            model_version=cached.model_version,
            cached=True,
        )

    df = _prepare_features(txn)

    # Align features with training columns
    for col in _feature_columns:
        if col not in df.columns:
            df[col] = 0.0
    df = df[_feature_columns]

    proba = float(_model.predict_proba(df.values)[:, 1][0])

    prediction = FraudPrediction(
        transaction_id=txn.transaction_id,
        fraud_probability=round(proba, 6),
        is_fraud=proba >= _threshold,
        threshold=_threshold,
        model_version=_model_version,
        cached=False,
    )

    # Cache for idempotency (bounded to prevent unbounded memory growth)
    if len(_prediction_cache) >= _CACHE_MAX_SIZE:
        oldest_key = next(iter(_prediction_cache))
        del _prediction_cache[oldest_key]
    _prediction_cache[txn.transaction_id] = prediction
    return prediction


@app.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Check API health and model status."""
    return HealthResponse(
        status="healthy" if _model is not None else "degraded",
        model_loaded=_model is not None,
        model_version=_model_version,
        uptime_seconds=round(time.time() - _start_time, 2),
    )


@app.post("/predict", response_model=FraudPrediction)
async def predict(txn: TransactionRequest) -> FraudPrediction:
    """Score a single transaction for fraud.

    This endpoint is idempotent — repeated calls with the same
    transaction_id return the cached result.
    """
    return _score_transaction(txn)


@app.post("/predict/batch", response_model=BatchResponse)
async def predict_batch(batch: BatchRequest) -> BatchResponse:
    """Score a batch of transactions for fraud."""
    predictions = [_score_transaction(txn) for txn in batch.transactions]
    fraud_count = sum(1 for p in predictions if p.is_fraud)
    return BatchResponse(
        predictions=predictions,
        total=len(predictions),
        fraud_count=fraud_count,
    )
