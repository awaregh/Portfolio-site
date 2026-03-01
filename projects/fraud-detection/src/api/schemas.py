"""Request and response schemas for the fraud detection API."""

from typing import Optional

from pydantic import BaseModel, Field


class TransactionRequest(BaseModel):
    """Single transaction scoring request."""

    transaction_id: str = Field(..., description="Unique transaction identifier for idempotency")
    time: float = Field(..., description="Seconds elapsed from first transaction in dataset")
    amount: float = Field(..., ge=0, description="Transaction amount")
    v1: float = Field(0.0, alias="V1")
    v2: float = Field(0.0, alias="V2")
    v3: float = Field(0.0, alias="V3")
    v4: float = Field(0.0, alias="V4")
    v5: float = Field(0.0, alias="V5")
    v6: float = Field(0.0, alias="V6")
    v7: float = Field(0.0, alias="V7")
    v8: float = Field(0.0, alias="V8")
    v9: float = Field(0.0, alias="V9")
    v10: float = Field(0.0, alias="V10")
    v11: float = Field(0.0, alias="V11")
    v12: float = Field(0.0, alias="V12")
    v13: float = Field(0.0, alias="V13")
    v14: float = Field(0.0, alias="V14")
    v15: float = Field(0.0, alias="V15")
    v16: float = Field(0.0, alias="V16")
    v17: float = Field(0.0, alias="V17")
    v18: float = Field(0.0, alias="V18")
    v19: float = Field(0.0, alias="V19")
    v20: float = Field(0.0, alias="V20")
    v21: float = Field(0.0, alias="V21")
    v22: float = Field(0.0, alias="V22")
    v23: float = Field(0.0, alias="V23")
    v24: float = Field(0.0, alias="V24")
    v25: float = Field(0.0, alias="V25")
    v26: float = Field(0.0, alias="V26")
    v27: float = Field(0.0, alias="V27")
    v28: float = Field(0.0, alias="V28")

    model_config = {"populate_by_name": True}


class FraudPrediction(BaseModel):
    """Fraud prediction response."""

    transaction_id: str
    fraud_probability: float = Field(..., ge=0, le=1)
    is_fraud: bool
    threshold: float
    model_version: str
    cached: bool = False


class HealthResponse(BaseModel):
    """API health check response."""

    status: str
    model_loaded: bool
    model_version: str
    uptime_seconds: float


class BatchRequest(BaseModel):
    """Batch scoring request."""

    transactions: list[TransactionRequest]


class BatchResponse(BaseModel):
    """Batch scoring response."""

    predictions: list[FraudPrediction]
    total: int
    fraud_count: int
