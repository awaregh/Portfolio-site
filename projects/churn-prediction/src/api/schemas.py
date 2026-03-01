"""
Pydantic schemas for the churn prediction API.
"""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class CustomerFeatures(BaseModel):
    """Input features for a single customer scoring request."""

    customer_id: str = Field(..., description="Unique customer identifier")
    recency_days: float = Field(..., ge=0, description="Days since last activity")
    frequency_total: float = Field(..., ge=0, description="Total event count")
    events_7d: float = Field(default=0, ge=0, description="Events in last 7 days")
    events_30d: float = Field(default=0, ge=0, description="Events in last 30 days")
    events_90d: float = Field(default=0, ge=0, description="Events in last 90 days")
    engagement_trend: float = Field(
        default=1.0, ge=0, description="events_7d / events_30d ratio"
    )
    logins_30d: float = Field(default=0, ge=0, description="Login count in last 30 days")
    mrr: float = Field(default=0.0, ge=0, description="Monthly recurring revenue (USD)")
    support_tickets_30d: float = Field(
        default=0, ge=0, description="Support tickets opened in last 30 days"
    )
    support_tickets_90d: float = Field(
        default=0, ge=0, description="Support tickets opened in last 90 days"
    )
    tenure_days: float = Field(..., ge=0, description="Days since acquisition")
    is_dormant: int = Field(default=0, ge=0, le=1, description="1 if inactive 30+ days")
    high_support_friction: int = Field(
        default=0, ge=0, le=1, description="1 if ≥3 tickets in 30 days"
    )

    model_config = {"json_schema_extra": {
        "example": {
            "customer_id": "cust_12345",
            "recency_days": 45,
            "frequency_total": 320,
            "events_7d": 2,
            "events_30d": 8,
            "events_90d": 55,
            "engagement_trend": 0.25,
            "logins_30d": 4,
            "mrr": 199.0,
            "support_tickets_30d": 2,
            "support_tickets_90d": 5,
            "tenure_days": 420,
            "is_dormant": 1,
            "high_support_friction": 0,
        }
    }}


class FeatureImportanceItem(BaseModel):
    feature: str
    shap_value: float


class ScoringResponse(BaseModel):
    customer_id: str
    churn_probability: float = Field(..., ge=0.0, le=1.0)
    risk_tier: str = Field(..., description="low | medium | high")
    latency_ms: float
    feature_contributions: Optional[list[FeatureImportanceItem]] = None


class BatchScoringRequest(BaseModel):
    customers: list[CustomerFeatures]

    model_config = {"json_schema_extra": {
        "example": {
            "customers": [
                {
                    "customer_id": "cust_001",
                    "recency_days": 5,
                    "frequency_total": 800,
                    "events_7d": 25,
                    "events_30d": 90,
                    "events_90d": 280,
                    "engagement_trend": 0.28,
                    "logins_30d": 20,
                    "mrr": 499.0,
                    "support_tickets_30d": 0,
                    "support_tickets_90d": 1,
                    "tenure_days": 730,
                    "is_dormant": 0,
                    "high_support_friction": 0,
                }
            ]
        }
    }}


class BatchScoringResponse(BaseModel):
    results: list[ScoringResponse]
    total_latency_ms: float
