"""
Feature engineering for churn prediction.

Transforms raw subscription / event data into model-ready features covering:
  - Recency / frequency / monetary (RFM) signals
  - Engagement trends (rolling windows)
  - Support friction indicators
  - Plan / pricing features
  - Derived time-to-event fields for survival analysis
"""

from __future__ import annotations

import numpy as np
import pandas as pd


# ---------------------------------------------------------------------------
# Core feature builder
# ---------------------------------------------------------------------------

def build_features(
    df: pd.DataFrame,
    snapshot_date: pd.Timestamp | None = None,
    rolling_windows: list[int] | None = None,
) -> pd.DataFrame:
    """Return a feature-engineered DataFrame ready for modelling.

    Parameters
    ----------
    df:
        Raw event/subscription DataFrame with at minimum:
        ``customer_id``, ``event_date``, ``event_type``, ``plan_id``,
        ``mrr``, ``support_tickets``, ``logins``.
    snapshot_date:
        The "as-of" date for feature computation.  Defaults to the
        maximum ``event_date`` in *df*.
    rolling_windows:
        Number-of-day windows for rolling aggregations.
        Defaults to ``[7, 30, 90]``.

    Returns
    -------
    pd.DataFrame
        One row per ``customer_id`` with derived features.
    """
    if rolling_windows is None:
        rolling_windows = [7, 30, 90]

    df = df.copy()
    df["event_date"] = pd.to_datetime(df["event_date"])

    if snapshot_date is None:
        snapshot_date = df["event_date"].max()

    # -- RFM signals --------------------------------------------------------
    last_event = df.groupby("customer_id")["event_date"].max().rename("last_event_date")
    features = last_event.to_frame()
    features["recency_days"] = (snapshot_date - features["last_event_date"]).dt.days
    features["frequency_total"] = df.groupby("customer_id")["event_date"].count()

    # -- Rolling engagement -------------------------------------------------
    for window in rolling_windows:
        cutoff = snapshot_date - pd.Timedelta(days=window)
        window_df = df[df["event_date"] >= cutoff]
        col = f"events_{window}d"
        features[col] = (
            window_df.groupby("customer_id")["event_date"]
            .count()
            .reindex(features.index, fill_value=0)
        )

    # Engagement trend: events_7d / events_30d, clipped to [0, 5] to reduce outlier impact
    if "events_7d" in features.columns and "events_30d" in features.columns:
        features["engagement_trend"] = features["events_7d"] / (
            features["events_30d"].replace(0, np.nan)
        )
        features["engagement_trend"] = features["engagement_trend"].fillna(0).clip(0, 5)

    # -- Login frequency ----------------------------------------------------
    login_df = df[df["event_type"] == "login"]
    features["logins_30d"] = (
        login_df[login_df["event_date"] >= snapshot_date - pd.Timedelta(days=30)]
        .groupby("customer_id")["event_date"]
        .count()
        .reindex(features.index, fill_value=0)
    )

    # -- Monetary / plan features -------------------------------------------
    latest_plan = (
        df.sort_values("event_date")
        .groupby("customer_id")[["plan_id", "mrr"]]
        .last()
    )
    features = features.join(latest_plan, how="left")

    # -- Support friction ---------------------------------------------------
    support_df = df[df["event_type"] == "support_ticket"]
    features["support_tickets_30d"] = (
        support_df[
            support_df["event_date"] >= snapshot_date - pd.Timedelta(days=30)
        ]
        .groupby("customer_id")["event_date"]
        .count()
        .reindex(features.index, fill_value=0)
    )
    features["support_tickets_90d"] = (
        support_df[
            support_df["event_date"] >= snapshot_date - pd.Timedelta(days=90)
        ]
        .groupby("customer_id")["event_date"]
        .count()
        .reindex(features.index, fill_value=0)
    )

    # -- Tenure -------------------------------------------------------------
    first_event = df.groupby("customer_id")["event_date"].min()
    features["tenure_days"] = (snapshot_date - first_event).dt.days

    # -- Derived flags ------------------------------------------------------
    features["is_dormant"] = (features["recency_days"] > 30).astype(int)
    features["high_support_friction"] = (features["support_tickets_30d"] >= 3).astype(int)
    features["plan_id"] = features["plan_id"].fillna("unknown")

    # Drop internal helper columns
    features = features.drop(columns=["last_event_date"], errors="ignore")

    return features.reset_index()


# ---------------------------------------------------------------------------
# Categorical encoding helpers
# ---------------------------------------------------------------------------

def encode_plan(features: pd.DataFrame, plan_col: str = "plan_id") -> pd.DataFrame:
    """One-hot encode the plan column."""
    return pd.get_dummies(features, columns=[plan_col], prefix="plan", dtype=int)


def add_interaction_features(features: pd.DataFrame) -> pd.DataFrame:
    """Add hand-crafted interaction terms that tend to improve tree models."""
    df = features.copy()
    df["support_per_login"] = df["support_tickets_30d"] / (
        df["logins_30d"].replace(0, np.nan)
    )
    df["support_per_login"] = df["support_per_login"].fillna(0).clip(0, 10)
    df["mrr_x_tenure"] = df["mrr"] * df["tenure_days"]
    return df
