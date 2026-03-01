"""Tests for the FastAPI scoring endpoints."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from src.api.main import app, _model_state
from src.api.schemas import BatchResponse, ChurnPrediction

_VALID_CUSTOMER = {
    "customer_id": "TEST-001",
    "tenure_months": 12,
    "monthly_spend": 199.99,
    "support_tickets": 2,
    "login_frequency": 10.0,
    "feature_adoption_score": 0.55,
    "contract_type": "monthly",
    "industry": "tech",
}

_API_KEY = "changeme-super-secret-key"
_AUTH_HEADERS = {"X-API-Key": _API_KEY}


@pytest.fixture(scope="module")
def client():
    """Create a TestClient with the model pre-loaded."""
    with TestClient(app) as c:
        yield c


# ---------------------------------------------------------------------------
# /health
# ---------------------------------------------------------------------------

def test_health_returns_200(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


# ---------------------------------------------------------------------------
# /api/v1/predict
# ---------------------------------------------------------------------------

def test_predict_returns_valid_churn_prediction(client):
    response = client.post(
        "/api/v1/predict",
        json=_VALID_CUSTOMER,
        headers=_AUTH_HEADERS,
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["customer_id"] == "TEST-001"
    assert 0.0 <= data["churn_probability"] <= 1.0
    assert data["churn_risk_tier"] in ("low", "medium", "high")
    assert isinstance(data["top_risk_factors"], list)


def test_predict_requires_auth(client):
    response = client.post("/api/v1/predict", json=_VALID_CUSTOMER)
    assert response.status_code == 401


def test_predict_invalid_industry(client):
    bad_payload = {**_VALID_CUSTOMER, "industry": "unknown_sector"}
    response = client.post("/api/v1/predict", json=bad_payload, headers=_AUTH_HEADERS)
    assert response.status_code == 422


def test_predict_negative_tenure_rejected(client):
    bad_payload = {**_VALID_CUSTOMER, "tenure_months": -1}
    response = client.post("/api/v1/predict", json=bad_payload, headers=_AUTH_HEADERS)
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# /api/v1/predict/batch
# ---------------------------------------------------------------------------

def test_batch_predict_returns_batch_response(client):
    payload = {"customers": [_VALID_CUSTOMER, {**_VALID_CUSTOMER, "customer_id": "TEST-002"}]}
    response = client.post(
        "/api/v1/predict/batch",
        json=payload,
        headers=_AUTH_HEADERS,
    )
    assert response.status_code == 200, response.text
    data = response.json()
    assert "predictions" in data
    assert len(data["predictions"]) == 2
    assert "model_version" in data
    assert "scored_at" in data


def test_batch_predict_requires_auth(client):
    payload = {"customers": [_VALID_CUSTOMER]}
    response = client.post("/api/v1/predict/batch", json=payload)
    assert response.status_code == 401


def test_batch_predict_empty_list_rejected(client):
    payload = {"customers": []}
    response = client.post(
        "/api/v1/predict/batch",
        json=payload,
        headers=_AUTH_HEADERS,
    )
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# /api/v1/model/info
# ---------------------------------------------------------------------------

def test_model_info_returns_metadata(client):
    response = client.get("/api/v1/model/info", headers=_AUTH_HEADERS)
    assert response.status_code == 200
    data = response.json()
    assert "model_type" in data
    assert "version" in data
    assert data["n_features"] > 0
