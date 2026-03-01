"""
FastAPI application for real-time and batch churn scoring.

On startup the app attempts to load a saved model from MODEL_PATH.  If no
saved model exists it trains a fresh LogisticRegression on the synthetic
dataset so the service is always ready out of the box.
"""

from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict

import joblib
import numpy as np
from fastapi import Depends, FastAPI, HTTPException, Security, status
from fastapi.security import APIKeyHeader

from src.api.schemas import (
    BatchRequest,
    BatchResponse,
    ChurnPrediction,
    CustomerFeatures,
)

logger = logging.getLogger(__name__)
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO").upper())

# ---------------------------------------------------------------------------
# Application instance
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Churn Prediction API",
    description="Real-time and batch customer churn scoring with SHAP explainability.",
    version="1.0.0",
)

# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------

_API_KEY_HEADER = APIKeyHeader(name="X-API-Key", auto_error=False)
_EXPECTED_API_KEY = os.getenv("API_KEY", "changeme-super-secret-key")


async def verify_api_key(api_key: str = Security(_API_KEY_HEADER)) -> str:
    """Validate the X-API-Key header."""
    if not api_key or api_key != _EXPECTED_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key.",
        )
    return api_key


# ---------------------------------------------------------------------------
# Model state (loaded at startup)
# ---------------------------------------------------------------------------

_model_state: Dict[str, Any] = {
    "model": None,
    "preprocessor": None,
    "feature_names": [],
    "model_type": "logistic_regression",
    "version": "1.0.0",
    "trained_at": None,
}


def _train_and_save_model() -> None:
    """Train a logistic regression on synthetic data and persist it."""
    from src.features.builder import build_feature_matrix, get_feature_names_out
    from src.models.baseline import train_logistic_regression
    from src.preprocessing.pipeline import add_engineered_features, generate_synthetic_dataset

    logger.info("No saved model found — training on synthetic data …")
    df = generate_synthetic_dataset(n_customers=5000)
    df = add_engineered_features(df)
    X, y, preprocessor = build_feature_matrix(df)
    model = train_logistic_regression(X, y)
    feature_names = get_feature_names_out(preprocessor)

    _model_state["model"] = model
    _model_state["preprocessor"] = preprocessor
    _model_state["feature_names"] = feature_names
    _model_state["model_type"] = "logistic_regression"
    _model_state["trained_at"] = datetime.now(timezone.utc).isoformat()

    # Persist for future restarts
    model_path = Path(os.getenv("MODEL_PATH", "models/churn_model.joblib"))
    model_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(
        {
            "model": model,
            "preprocessor": preprocessor,
            "feature_names": feature_names,
            "model_type": "logistic_regression",
            "version": _model_state["version"],
            "trained_at": _model_state["trained_at"],
        },
        model_path,
    )
    logger.info("Model saved to %s", model_path)


@app.on_event("startup")
async def load_model() -> None:
    """Load or train the model on application startup."""
    model_path = Path(os.getenv("MODEL_PATH", "models/churn_model.joblib"))

    if model_path.exists():
        logger.info("Loading model from %s …", model_path)
        artifact = joblib.load(model_path)
        _model_state.update(artifact)
        logger.info("Model loaded — version: %s", _model_state.get("version", "unknown"))
    else:
        _train_and_save_model()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_RISK_TIER_THRESHOLDS = {"low": 0.3, "medium": 0.6}  # <0.3 low, <0.6 medium, >=0.6 high


def _risk_tier(prob: float) -> str:
    if prob < _RISK_TIER_THRESHOLDS["low"]:
        return "low"
    if prob < _RISK_TIER_THRESHOLDS["medium"]:
        return "medium"
    return "high"


def _customer_to_df(customer: CustomerFeatures):
    """Convert a CustomerFeatures schema to a DataFrame ready for scoring."""
    import pandas as pd
    from src.preprocessing.pipeline import add_engineered_features

    row = customer.model_dump()
    df = pd.DataFrame([row])
    df = add_engineered_features(df)
    return df


def _score_customers(customers: list[CustomerFeatures]) -> list[ChurnPrediction]:
    """Run the model on a list of CustomerFeatures and return predictions."""
    import pandas as pd
    from src.preprocessing.pipeline import add_engineered_features

    preprocessor = _model_state["preprocessor"]
    model = _model_state["model"]
    feature_names: list[str] = _model_state["feature_names"]

    rows = [c.model_dump() for c in customers]
    df = pd.DataFrame(rows)
    df = add_engineered_features(df)

    X = preprocessor.transform(df)
    probs = model.predict_proba(X)[:, 1]

    # Top risk factors from model coefficients (LR) or feature importances
    top_factors: list[str] = []
    if hasattr(model, "coef_") and len(feature_names) == model.coef_.shape[1]:
        importances = np.abs(model.coef_[0])
        top_idx = np.argsort(importances)[::-1][:5]
        top_factors = [feature_names[i] for i in top_idx]
    elif hasattr(model, "feature_importances_") and len(feature_names) == len(
        model.feature_importances_
    ):
        top_idx = np.argsort(model.feature_importances_)[::-1][:5]
        top_factors = [feature_names[i] for i in top_idx]

    predictions = []
    for customer, prob in zip(customers, probs):
        predictions.append(
            ChurnPrediction(
                customer_id=customer.customer_id,
                churn_probability=round(float(prob), 4),
                churn_risk_tier=_risk_tier(float(prob)),
                top_risk_factors=top_factors,
                survival_months_p50=None,
            )
        )
    return predictions


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health", tags=["ops"])
async def health() -> Dict[str, str]:
    """Liveness check — always returns 200 OK."""
    return {"status": "ok", "version": _model_state.get("version", "unknown")}


@app.get("/api/v1/model/info", tags=["model"])
async def model_info(_: str = Depends(verify_api_key)) -> Dict[str, Any]:
    """Return metadata about the currently loaded model."""
    return {
        "model_type": _model_state.get("model_type"),
        "version": _model_state.get("version"),
        "trained_at": _model_state.get("trained_at"),
        "n_features": len(_model_state.get("feature_names", [])),
    }


@app.post(
    "/api/v1/predict",
    response_model=ChurnPrediction,
    tags=["scoring"],
)
async def predict(
    customer: CustomerFeatures,
    _: str = Depends(verify_api_key),
) -> ChurnPrediction:
    """Score a single customer and return a :class:`ChurnPrediction`."""
    if _model_state["model"] is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model not loaded.",
        )
    results = _score_customers([customer])
    return results[0]


@app.post(
    "/api/v1/predict/batch",
    response_model=BatchResponse,
    tags=["scoring"],
)
async def predict_batch(
    request: BatchRequest,
    _: str = Depends(verify_api_key),
) -> BatchResponse:
    """Score a batch of customers and return a :class:`BatchResponse`."""
    if _model_state["model"] is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model not loaded.",
        )
    predictions = _score_customers(request.customers)
    return BatchResponse(
        predictions=predictions,
        model_version=_model_state.get("version", "unknown"),
        scored_at=datetime.now(timezone.utc),
    )
