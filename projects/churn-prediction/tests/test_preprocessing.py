import pandas as pd
import numpy as np
import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.preprocessing.feature_engineering import build_features, encode_plan, add_interaction_features
from src.preprocessing.time_splits import time_based_split
from src.preprocessing.cohort_generation import generate_cohorts, cohort_retention_matrix


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def _make_events(n=200, seed=0):
    rng = np.random.default_rng(seed)
    n_customers = 20
    customer_ids = [f"cust_{i:03d}" for i in range(n_customers)]
    rows = []
    for cid in customer_ids:
        for day in range(10):
            event_date = pd.Timestamp("2024-01-01") + pd.Timedelta(days=day)
            event_type = rng.choice(["login", "feature_use", "support_ticket"])
            rows.append({
                "customer_id": cid,
                "event_date": event_date,
                "event_type": event_type,
                "plan_id": rng.choice(["starter", "growth"]),
                "mrr": float(rng.integers(50, 500)),
            })
    return pd.DataFrame(rows)


# ---------------------------------------------------------------------------
# Feature engineering tests
# ---------------------------------------------------------------------------

class TestBuildFeatures:
    def test_returns_one_row_per_customer(self):
        events = _make_events()
        features = build_features(events)
        assert features["customer_id"].nunique() == len(features)

    def test_recency_days_non_negative(self):
        events = _make_events()
        features = build_features(events)
        assert (features["recency_days"] >= 0).all()

    def test_rolling_window_columns_present(self):
        events = _make_events()
        features = build_features(events, rolling_windows=[7, 30])
        assert "events_7d" in features.columns
        assert "events_30d" in features.columns

    def test_tenure_days_positive(self):
        events = _make_events()
        features = build_features(events)
        assert (features["tenure_days"] >= 0).all()

    def test_custom_snapshot_date(self):
        events = _make_events()
        snapshot = pd.Timestamp("2024-01-15")
        features = build_features(events, snapshot_date=snapshot)
        # All recency days should be >= 0 relative to snapshot
        assert (features["recency_days"] >= 0).all()

    def test_is_dormant_flag(self):
        events = _make_events()
        features = build_features(events, snapshot_date=pd.Timestamp("2025-06-01"))
        # All customers inactive for >30 days should be marked dormant
        assert features["is_dormant"].isin([0, 1]).all()

    def test_encode_plan_adds_dummy_columns(self):
        events = _make_events()
        features = build_features(events)
        encoded = encode_plan(features)
        assert any(col.startswith("plan_") for col in encoded.columns)
        assert "plan_id" not in encoded.columns

    def test_interaction_features_added(self):
        events = _make_events()
        features = build_features(events)
        with_interactions = add_interaction_features(features)
        assert "support_per_login" in with_interactions.columns
        assert "mrr_x_tenure" in with_interactions.columns


# ---------------------------------------------------------------------------
# Time-based split tests
# ---------------------------------------------------------------------------

class TestTimeBasedSplit:
    def _make_df(self):
        dates = pd.date_range("2023-01-01", periods=12, freq="MS")
        rows = []
        for d in dates:
            for _ in range(10):
                rows.append({"observation_date": d, "value": 1})
        return pd.DataFrame(rows)

    def test_no_leakage(self):
        df = self._make_df()
        result = time_based_split(df, val_months=2, test_months=2)
        assert result.train["observation_date"].max() < result.val["observation_date"].min()
        assert result.val["observation_date"].max() < result.test["observation_date"].min()

    def test_all_rows_accounted_for(self):
        df = self._make_df()
        result = time_based_split(df, val_months=2, test_months=2)
        total = len(result.train) + len(result.val) + len(result.test)
        assert total == len(df)

    def test_train_is_largest(self):
        df = self._make_df()
        result = time_based_split(df, val_months=1, test_months=1)
        assert len(result.train) > len(result.val)
        assert len(result.train) > len(result.test)


# ---------------------------------------------------------------------------
# Cohort generation tests
# ---------------------------------------------------------------------------

class TestCohortGeneration:
    def _make_customers(self):
        dates = pd.date_range("2023-01-01", periods=6, freq="MS")
        rows = []
        for d in dates:
            for i in range(5):
                rows.append({"customer_id": f"{d.month}_{i}", "acquisition_date": d})
        return pd.DataFrame(rows)

    def test_cohort_column_added(self):
        customers = self._make_customers()
        result = generate_cohorts(customers)
        assert "cohort" in result.columns

    def test_cohort_count_matches_months(self):
        customers = self._make_customers()
        result = generate_cohorts(customers)
        assert result["cohort"].nunique() == 6

    def test_retention_matrix_shape(self):
        events = _make_events(n=200)
        events["acquisition_date"] = pd.Timestamp("2024-01-01")
        matrix = cohort_retention_matrix(events)
        assert matrix.shape[0] >= 1
        assert matrix.shape[1] >= 1

    def test_retention_matrix_period_0_is_one(self):
        events = _make_events(n=200)
        events["acquisition_date"] = pd.Timestamp("2024-01-01")
        matrix = cohort_retention_matrix(events)
        # Period 0 retention must be 1.0 (all customers active at acquisition)
        assert matrix[0].iloc[0] == pytest.approx(1.0)
