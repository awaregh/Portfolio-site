"""Tests for the FastAPI scoring endpoint."""

import pytest
from fastapi.testclient import TestClient

from src.api.app import app, _prediction_cache


@pytest.fixture
def client():
    """Create a test client for the API."""
    _prediction_cache.clear()
    return TestClient(app)


@pytest.fixture
def sample_transaction():
    """Sample transaction payload."""
    return {
        "transaction_id": "txn-test-001",
        "time": 12345.0,
        "amount": 150.00,
        "V1": -1.3598,
        "V2": -0.0728,
        "V3": 2.5363,
        "V4": 1.3782,
        "V5": -0.3383,
        "V6": 0.4624,
        "V7": 0.2396,
        "V8": 0.0987,
        "V9": 0.3638,
        "V10": 0.0908,
        "V11": -0.5516,
        "V12": -0.6178,
        "V13": -0.9914,
        "V14": -0.3112,
        "V15": 1.4682,
        "V16": -0.4706,
        "V17": 0.2080,
        "V18": 0.0258,
        "V19": 0.4040,
        "V20": 0.2514,
        "V21": -0.0183,
        "V22": 0.2778,
        "V23": -0.1105,
        "V24": 0.0669,
        "V25": 0.1285,
        "V26": -0.1891,
        "V27": 0.1336,
        "V28": -0.0211,
    }


class TestHealthEndpoint:
    """Tests for the health check endpoint."""

    def test_health_check(self, client):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "model_loaded" in data
        assert "uptime_seconds" in data


class TestPredictEndpoint:
    """Tests for the prediction endpoint."""

    def test_predict_returns_503_without_model(self, client, sample_transaction):
        response = client.post("/predict", json=sample_transaction)
        # Without a model loaded, expect 503
        assert response.status_code == 503

    def test_predict_validation(self, client):
        # Missing required field
        response = client.post("/predict", json={"amount": 100})
        assert response.status_code == 422


class TestIdempotency:
    """Tests for idempotent scoring behavior."""

    def test_schema_validation(self, client, sample_transaction):
        # Ensure schema accepts valid transaction
        from src.api.schemas import TransactionRequest

        txn = TransactionRequest(**sample_transaction)
        assert txn.transaction_id == "txn-test-001"
        assert txn.amount == 150.00
