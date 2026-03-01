"""
Preprocessing pipeline: synthetic data generation, feature engineering,
time-based train/test splits, and cohort generation.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Tuple

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Synthetic dataset
# ---------------------------------------------------------------------------

def generate_synthetic_dataset(n_customers: int = 5000, seed: int = 42) -> pd.DataFrame:
    """Generate a realistic SaaS churn dataset.

    Parameters
    ----------
    n_customers:
        Number of synthetic customer records to generate.
    seed:
        Random seed for reproducibility.

    Returns
    -------
    pd.DataFrame
        DataFrame with columns: customer_id, tenure_months, monthly_spend,
        support_tickets, login_frequency, feature_adoption_score,
        contract_type, industry, churned, churn_date, observation_date.
    """
    rng = np.random.default_rng(seed)

    customer_ids = [f"CUST-{i:05d}" for i in range(1, n_customers + 1)]

    tenure_months = rng.integers(1, 73, size=n_customers).astype(int)
    monthly_spend = np.clip(
        rng.normal(loc=200, scale=80, size=n_customers), 20, 800
    ).round(2)
    support_tickets = rng.poisson(lam=2.5, size=n_customers).astype(int)
    login_frequency = np.clip(
        rng.normal(loc=15, scale=6, size=n_customers), 0, 60
    ).round(1)
    feature_adoption_score = np.clip(
        rng.beta(a=2, b=3, size=n_customers), 0, 1
    ).round(3)

    contract_type = rng.choice(["monthly", "annual"], size=n_customers, p=[0.6, 0.4])
    industry = rng.choice(
        ["tech", "finance", "healthcare", "retail"],
        size=n_customers,
        p=[0.35, 0.25, 0.20, 0.20],
    )

    # Build churn probability from feature signals
    logit = (
        -2.5
        + 0.03 * (30 - tenure_months).clip(0)        # newer customers churn more
        + 0.008 * support_tickets                      # more tickets → higher risk
        - 0.015 * login_frequency                      # less engaged → higher risk
        - 1.2 * feature_adoption_score                 # low adoption → higher risk
        - 0.8 * (contract_type == "annual").astype(float)  # annual less likely to churn
        + 0.003 * (200 - monthly_spend).clip(0)        # low spend → slightly higher risk
    )
    churn_prob = 1 / (1 + np.exp(-logit))
    churned = rng.binomial(1, churn_prob).astype(int)

    # Observation date: random date within the last 12 months
    base_date = datetime(2024, 1, 1)
    obs_offsets = rng.integers(0, 365, size=n_customers)
    observation_dates = [base_date + timedelta(days=int(d)) for d in obs_offsets]

    # Churn date: 1–6 months after observation for churned customers
    churn_dates: list[datetime | None] = []
    for i in range(n_customers):
        if churned[i] == 1:
            churn_offset = rng.integers(30, 181)
            churn_dates.append(observation_dates[i] + timedelta(days=int(churn_offset)))
        else:
            churn_dates.append(None)

    df = pd.DataFrame(
        {
            "customer_id": customer_ids,
            "tenure_months": tenure_months,
            "monthly_spend": monthly_spend,
            "support_tickets": support_tickets,
            "login_frequency": login_frequency,
            "feature_adoption_score": feature_adoption_score,
            "contract_type": contract_type,
            "industry": industry,
            "churned": churned,
            "churn_date": pd.to_datetime(churn_dates),
            "observation_date": pd.to_datetime(observation_dates),
        }
    )

    logger.info("Generated synthetic dataset with %d rows (%.1f%% churn rate).",
                len(df), df["churned"].mean() * 100)
    return df


# ---------------------------------------------------------------------------
# Feature engineering
# ---------------------------------------------------------------------------

def add_engineered_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add derived features to the raw customer DataFrame.

    Parameters
    ----------
    df:
        Raw customer DataFrame (output of :func:`generate_synthetic_dataset`).

    Returns
    -------
    pd.DataFrame
        DataFrame with additional columns:
        spend_per_month_normalized, tickets_per_month, login_per_month,
        is_annual, tenure_bucket.
    """
    df = df.copy()

    # Normalized spend (z-score style, avoids division by zero)
    spend_std = df["monthly_spend"].std()
    spend_mean = df["monthly_spend"].mean()
    df["spend_per_month_normalized"] = (
        (df["monthly_spend"] - spend_mean) / spend_std if spend_std > 0 else 0.0
    )

    # Ticket rate per tenure month
    df["tickets_per_month"] = (
        df["support_tickets"] / df["tenure_months"].clip(lower=1)
    ).round(4)

    # Login rate per tenure month
    df["login_per_month"] = (
        df["login_frequency"] / df["tenure_months"].clip(lower=1)
    ).round(4)

    # Binary contract flag
    df["is_annual"] = (df["contract_type"] == "annual").astype(int)

    # Tenure bucket
    df["tenure_bucket"] = pd.cut(
        df["tenure_months"],
        bins=[0, 3, 12, 36, np.inf],
        labels=["new", "growing", "mature", "veteran"],
        right=True,
    ).astype(str)

    return df


# ---------------------------------------------------------------------------
# Time-based split
# ---------------------------------------------------------------------------

def time_based_split(
    df: pd.DataFrame, test_months: int = 3
) -> Tuple[pd.DataFrame, pd.DataFrame]:
    """Split the dataset on observation_date using a time-based cutoff.

    Parameters
    ----------
    df:
        Customer DataFrame with an ``observation_date`` column.
    test_months:
        Number of trailing months to hold out as the test set.

    Returns
    -------
    Tuple[pd.DataFrame, pd.DataFrame]
        ``(train_df, test_df)`` — non-overlapping by observation_date.
    """
    if "observation_date" not in df.columns:
        raise ValueError("DataFrame must contain an 'observation_date' column.")

    max_date = pd.to_datetime(df["observation_date"]).max()
    cutoff = max_date - pd.DateOffset(months=test_months)

    train_df = df[df["observation_date"] <= cutoff].copy()
    test_df = df[df["observation_date"] > cutoff].copy()

    logger.info(
        "Time-based split → train: %d rows (cutoff %s), test: %d rows.",
        len(train_df), cutoff.date(), len(test_df),
    )
    return train_df, test_df


# ---------------------------------------------------------------------------
# Cohort generation
# ---------------------------------------------------------------------------

def generate_cohorts(
    df: pd.DataFrame, cohort_col: str = "tenure_bucket"
) -> pd.DataFrame:
    """Group customers into cohorts and compute per-cohort churn statistics.

    Parameters
    ----------
    df:
        Customer DataFrame that must contain ``churned`` and ``cohort_col``.
    cohort_col:
        Column to group by (default: ``tenure_bucket``).

    Returns
    -------
    pd.DataFrame
        Summary DataFrame with columns: cohort, n_customers, n_churned,
        churn_rate, avg_monthly_spend, avg_tenure_months.
    """
    if cohort_col not in df.columns:
        raise ValueError(f"Column '{cohort_col}' not found in DataFrame.")
    if "churned" not in df.columns:
        raise ValueError("DataFrame must contain a 'churned' column.")

    cohort_summary = (
        df.groupby(cohort_col)
        .agg(
            n_customers=(cohort_col, "count"),
            n_churned=("churned", "sum"),
            avg_monthly_spend=("monthly_spend", "mean"),
            avg_tenure_months=("tenure_months", "mean"),
        )
        .reset_index()
        .rename(columns={cohort_col: "cohort"})
    )
    cohort_summary["churn_rate"] = (
        cohort_summary["n_churned"] / cohort_summary["n_customers"]
    ).round(4)

    logger.info("Generated %d cohorts on column '%s'.", len(cohort_summary), cohort_col)
    return cohort_summary
