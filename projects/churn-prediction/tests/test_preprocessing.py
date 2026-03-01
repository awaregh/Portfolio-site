"""Tests for src/preprocessing/pipeline.py"""

from __future__ import annotations

import pandas as pd
import pytest

from src.preprocessing.pipeline import (
    add_engineered_features,
    generate_synthetic_dataset,
    generate_cohorts,
    time_based_split,
)

# ---------------------------------------------------------------------------
# generate_synthetic_dataset
# ---------------------------------------------------------------------------

EXPECTED_COLUMNS = {
    "customer_id",
    "tenure_months",
    "monthly_spend",
    "support_tickets",
    "login_frequency",
    "feature_adoption_score",
    "contract_type",
    "industry",
    "churned",
    "churn_date",
    "observation_date",
}


def test_generate_synthetic_dataset_shape():
    df = generate_synthetic_dataset(n_customers=200, seed=0)
    assert len(df) == 200


def test_generate_synthetic_dataset_columns():
    df = generate_synthetic_dataset(n_customers=100, seed=1)
    assert EXPECTED_COLUMNS.issubset(set(df.columns)), (
        f"Missing columns: {EXPECTED_COLUMNS - set(df.columns)}"
    )


def test_generate_synthetic_dataset_churn_rate():
    df = generate_synthetic_dataset(n_customers=500, seed=42)
    churn_rate = df["churned"].mean()
    # Expect churn rate roughly between 5 % and 50 %
    assert 0.05 < churn_rate < 0.50, f"Unexpected churn rate: {churn_rate:.2f}"


def test_generate_synthetic_dataset_reproducible():
    df1 = generate_synthetic_dataset(n_customers=100, seed=99)
    df2 = generate_synthetic_dataset(n_customers=100, seed=99)
    pd.testing.assert_frame_equal(df1, df2)


def test_generate_synthetic_dataset_contract_values():
    df = generate_synthetic_dataset(n_customers=200)
    assert set(df["contract_type"].unique()).issubset({"monthly", "annual"})


def test_generate_synthetic_dataset_industry_values():
    df = generate_synthetic_dataset(n_customers=200)
    assert set(df["industry"].unique()).issubset({"tech", "finance", "healthcare", "retail"})


# ---------------------------------------------------------------------------
# add_engineered_features
# ---------------------------------------------------------------------------

ENGINEERED_COLUMNS = {
    "spend_per_month_normalized",
    "tickets_per_month",
    "login_per_month",
    "is_annual",
    "tenure_bucket",
}


def test_add_engineered_features_adds_columns():
    df = generate_synthetic_dataset(n_customers=100, seed=7)
    df_eng = add_engineered_features(df)
    assert ENGINEERED_COLUMNS.issubset(set(df_eng.columns)), (
        f"Missing engineered columns: {ENGINEERED_COLUMNS - set(df_eng.columns)}"
    )


def test_add_engineered_features_is_annual_binary():
    df = generate_synthetic_dataset(n_customers=100, seed=7)
    df_eng = add_engineered_features(df)
    assert set(df_eng["is_annual"].unique()).issubset({0, 1})


def test_add_engineered_features_tenure_bucket_values():
    df = generate_synthetic_dataset(n_customers=200, seed=7)
    df_eng = add_engineered_features(df)
    valid_buckets = {"new", "growing", "mature", "veteran"}
    assert set(df_eng["tenure_bucket"].unique()).issubset(valid_buckets)


def test_add_engineered_features_does_not_modify_original():
    df = generate_synthetic_dataset(n_customers=50, seed=7)
    original_cols = set(df.columns)
    add_engineered_features(df)
    assert set(df.columns) == original_cols, "Original DataFrame should not be mutated."


# ---------------------------------------------------------------------------
# time_based_split
# ---------------------------------------------------------------------------

def test_time_based_split_non_overlapping():
    df = generate_synthetic_dataset(n_customers=500, seed=42)
    train, test = time_based_split(df, test_months=3)

    if len(train) > 0 and len(test) > 0:
        assert train["observation_date"].max() <= test["observation_date"].min(), (
            "Train and test observation dates must not overlap."
        )


def test_time_based_split_covers_all_rows():
    df = generate_synthetic_dataset(n_customers=300, seed=42)
    train, test = time_based_split(df, test_months=3)
    assert len(train) + len(test) == len(df)


def test_time_based_split_missing_date_raises():
    df = generate_synthetic_dataset(n_customers=100, seed=42).drop(
        columns=["observation_date"]
    )
    with pytest.raises(ValueError, match="observation_date"):
        time_based_split(df)


# ---------------------------------------------------------------------------
# generate_cohorts
# ---------------------------------------------------------------------------

def test_generate_cohorts_returns_dataframe():
    df = generate_synthetic_dataset(n_customers=300, seed=42)
    df = add_engineered_features(df)
    cohorts = generate_cohorts(df, cohort_col="tenure_bucket")
    assert isinstance(cohorts, pd.DataFrame)
    assert "churn_rate" in cohorts.columns


def test_generate_cohorts_churn_rate_range():
    df = generate_synthetic_dataset(n_customers=500, seed=42)
    df = add_engineered_features(df)
    cohorts = generate_cohorts(df, cohort_col="tenure_bucket")
    assert (cohorts["churn_rate"] >= 0).all()
    assert (cohorts["churn_rate"] <= 1).all()
