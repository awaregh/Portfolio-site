"""
Pydantic schemas for request / response validation.
"""

from __future__ import annotations

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class CustomerFeatures(BaseModel):
    """Input features for a single customer prediction request."""

    customer_id: str = Field(..., description="Unique customer identifier.")
    tenure_months: int = Field(..., ge=0, description="Months as a customer.")
    monthly_spend: float = Field(..., ge=0, description="Average monthly spend in USD.")
    support_tickets: int = Field(..., ge=0, description="Number of support tickets opened.")
    login_frequency: float = Field(..., ge=0, description="Average monthly login count.")
    feature_adoption_score: float = Field(
        ..., ge=0.0, le=1.0, description="Feature adoption score [0, 1]."
    )
    contract_type: Literal["monthly", "annual"] = Field(
        ..., description="Subscription contract type."
    )
    industry: Literal["tech", "finance", "healthcare", "retail"] = Field(
        ..., description="Customer's industry vertical."
    )

    model_config = {"json_schema_extra": {
        "example": {
            "customer_id": "CUST-00001",
            "tenure_months": 14,
            "monthly_spend": 220.50,
            "support_tickets": 3,
            "login_frequency": 12.0,
            "feature_adoption_score": 0.42,
            "contract_type": "monthly",
            "industry": "tech",
        }
    }}


class ChurnPrediction(BaseModel):
    """Prediction output for a single customer."""

    customer_id: str
    churn_probability: float = Field(..., ge=0.0, le=1.0)
    churn_risk_tier: Literal["low", "medium", "high"]
    top_risk_factors: List[str] = Field(
        default_factory=list,
        description="Top feature names driving the prediction.",
    )
    survival_months_p50: Optional[float] = Field(
        None, description="Median survival horizon in months (if Cox model available)."
    )


class BatchRequest(BaseModel):
    """Batch scoring request containing multiple customers."""

    customers: List[CustomerFeatures] = Field(
        ..., min_length=1, max_length=1000, description="List of customers to score."
    )


class BatchResponse(BaseModel):
    """Batch scoring response."""

    predictions: List[ChurnPrediction]
    model_version: str
    scored_at: datetime
