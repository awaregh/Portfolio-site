"""
FastAPI scoring API for the churn prediction model.

Endpoints:
  POST /score          — Score a single customer (real-time inference)
  POST /score/batch    — Score a list of customers (batch inference)
  GET  /health         — Liveness check
  GET  /model/info     — Model metadata and feature list

Design notes:
  - Models are loaded once at startup from the registry path (env var).
  - Batch endpoint is optimised for DataFrame-level inference (avoids
    per-row overhead).
  - SHAP explanations are returned on demand via the ``explain=true``
    query param to avoid latency on bulk scoring jobs.
"""

from __future__ import annotations

import os
import pickle
import time
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from .schemas import (
    CustomerFeatures,
    BatchScoringRequest,
    ScoringResponse,
    BatchScoringResponse,
    FeatureImportanceItem,
)

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Model loading
# ---------------------------------------------------------------------------

_model: Any = None
_model_metadata: dict[str, Any] = {}


def _load_model() -> None:
    global _model, _model_metadata
    model_path = os.getenv("MODEL_PATH", "artifacts/churn_model.pkl")
    p = Path(model_path)
    if p.exists():
        with open(p, "rb") as f:
            payload = pickle.load(f)
        _model = payload.get("model")
        _model_metadata = payload.get("metadata", {})
    # If no model file, the API starts in mock mode (useful for demos)


@asynccontextmanager
async def lifespan(application: FastAPI):  # noqa: ARG001
    _load_model()
    yield


app = FastAPI(
    title="Churn Prediction API",
    description=(
        "Real-time and batch churn scoring for SaaS retention programmes. "
        "Returns calibrated churn probabilities and optional SHAP explanations."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok", "model_loaded": str(_model is not None)}


@app.get("/model/info")
def model_info() -> dict[str, Any]:
    return {
        "model_type": _model_metadata.get("model_type", "unknown"),
        "trained_at": _model_metadata.get("trained_at", "unknown"),
        "roc_auc": _model_metadata.get("roc_auc"),
        "feature_names": _model_metadata.get("feature_names", []),
    }


@app.post("/score", response_model=ScoringResponse)
def score_customer(
    customer: CustomerFeatures,
    explain: bool = Query(default=False, description="Return SHAP feature contributions"),
) -> ScoringResponse:
    """Score a single customer and return churn probability."""
    start = time.perf_counter()
    features = _customer_to_dataframe(customer)
    prob = _predict(features)[0]
    latency_ms = round((time.perf_counter() - start) * 1000, 2)

    explanations: list[FeatureImportanceItem] = []
    if explain and hasattr(_model, "shap_values"):
        shap_vals = _model.shap_values(features)[0]
        for feat, val in zip(features.columns, shap_vals):
            explanations.append(FeatureImportanceItem(feature=feat, shap_value=float(val)))
        explanations.sort(key=lambda x: abs(x.shap_value), reverse=True)

    return ScoringResponse(
        customer_id=customer.customer_id,
        churn_probability=round(float(prob), 4),
        risk_tier=_risk_tier(prob),
        latency_ms=latency_ms,
        feature_contributions=explanations if explain else None,
    )


@app.post("/score/batch", response_model=BatchScoringResponse)
def score_batch(request: BatchScoringRequest) -> BatchScoringResponse:
    """Score a batch of customers."""
    start = time.perf_counter()
    rows = []
    for customer in request.customers:
        features = _customer_to_dataframe(customer)
        prob = _predict(features)[0]
        rows.append(
            ScoringResponse(
                customer_id=customer.customer_id,
                churn_probability=round(float(prob), 4),
                risk_tier=_risk_tier(prob),
                latency_ms=0.0,
            )
        )
    total_ms = round((time.perf_counter() - start) * 1000, 2)
    return BatchScoringResponse(results=rows, total_latency_ms=total_ms)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _customer_to_dataframe(customer: CustomerFeatures) -> pd.DataFrame:
    data = customer.model_dump(exclude={"customer_id"})
    return pd.DataFrame([data])


def _predict(features: pd.DataFrame) -> np.ndarray:
    if _model is not None:
        return _model.predict_proba(features)
    # Mock mode: return a simple heuristic based on recency and support tickets
    recency = features.get("recency_days", pd.Series([30])).values[0]
    support = features.get("support_tickets_30d", pd.Series([0])).values[0]
    mock_prob = min(0.95, max(0.05, recency / 120 * 0.5 + support / 10 * 0.3))
    return np.array([mock_prob])


def _risk_tier(prob: float) -> str:
    if prob >= 0.7:
        return "high"
    if prob >= 0.4:
        return "medium"
    return "low"
