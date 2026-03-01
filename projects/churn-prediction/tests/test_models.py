import numpy as np
import pandas as pd
import pytest
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sklearn.linear_model import LogisticRegression

from src.models.baseline import LogisticChurnModel
from src.evaluation.metrics import evaluate_classifier
from src.evaluation.calibration import calibration_summary
from src.evaluation.lift_curve import compute_lift_curve, compute_cumulative_gains
from src.evaluation.retention_simulation import simulate_retention_impact
from src.causal.uplift_modeling import TwoModelUplift
from src.monitoring.drift_detection import (
    psi,
    FeatureDriftMonitor,
    PredictionDriftMonitor,
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def _make_classification_data(n=300, churn_rate=0.15, seed=0):
    rng = np.random.default_rng(seed)
    X = pd.DataFrame({
        "recency_days": rng.integers(0, 120, n).astype(float),
        "frequency_total": rng.integers(10, 500, n).astype(float),
        "mrr": rng.integers(50, 1000, n).astype(float),
        "support_tickets_30d": rng.integers(0, 8, n).astype(float),
        "logins_30d": rng.integers(0, 60, n).astype(float),
        "tenure_days": rng.integers(30, 730, n).astype(float),
    })
    # Generate correlated labels
    logit = (
        -3
        + 0.03 * X["recency_days"]
        - 0.002 * X["frequency_total"]
        + 0.2 * X["support_tickets_30d"]
    )
    prob = 1 / (1 + np.exp(-logit))
    y = pd.Series((rng.random(n) < prob).astype(int), name="churned")
    return X, y


# ---------------------------------------------------------------------------
# Logistic Regression model tests
# ---------------------------------------------------------------------------

class TestLogisticChurnModel:
    def test_fit_and_predict(self):
        X, y = _make_classification_data()
        model = LogisticChurnModel(calibrate=False)
        model.fit(X, y)
        probs = model.predict_proba(X)
        assert probs.shape == (len(X),)
        assert ((probs >= 0) & (probs <= 1)).all()

    def test_fit_calibrated(self):
        X, y = _make_classification_data()
        model = LogisticChurnModel(calibrate=True)
        model.fit(X, y)
        probs = model.predict_proba(X)
        assert probs.shape == (len(X),)

    def test_predict_binary(self):
        X, y = _make_classification_data()
        model = LogisticChurnModel(calibrate=False)
        model.fit(X, y)
        preds = model.predict(X)
        assert set(preds).issubset({0, 1})

    def test_coef_dataframe_uncalibrated(self):
        X, y = _make_classification_data()
        model = LogisticChurnModel(calibrate=False)
        model.fit(X, y)
        coefs = model.coef_dataframe()
        assert "feature" in coefs.columns
        assert "coefficient" in coefs.columns
        assert len(coefs) == X.shape[1]

    def test_coef_raises_when_calibrated(self):
        X, y = _make_classification_data()
        model = LogisticChurnModel(calibrate=True)
        model.fit(X, y)
        with pytest.raises(ValueError):
            model.coef_dataframe()

    def test_not_fitted_raises(self):
        model = LogisticChurnModel()
        X, _ = _make_classification_data()
        with pytest.raises(AssertionError):
            model.predict_proba(X)


# ---------------------------------------------------------------------------
# Evaluation tests
# ---------------------------------------------------------------------------

class TestEvaluateClassifier:
    def test_auc_in_valid_range(self):
        _, y = _make_classification_data()
        probs = np.random.default_rng(0).random(len(y))
        result = evaluate_classifier(y, probs)
        assert 0 <= result.roc_auc <= 1
        assert 0 <= result.pr_auc <= 1

    def test_threshold_metrics_shape(self):
        _, y = _make_classification_data()
        probs = np.random.default_rng(0).random(len(y))
        result = evaluate_classifier(y, probs, thresholds=[0.3, 0.5])
        assert len(result.threshold_metrics) == 2

    def test_perfect_model_auc_is_one(self):
        y = np.array([0, 0, 1, 1])
        probs = np.array([0.1, 0.2, 0.8, 0.9])
        result = evaluate_classifier(y, probs)
        assert result.roc_auc == pytest.approx(1.0)


class TestCalibrationSummary:
    def test_ece_non_negative(self):
        y = np.array([0, 1] * 50)
        probs = np.clip(np.random.default_rng(0).normal(0.5, 0.2, 100), 0, 1)
        summary = calibration_summary(y, probs)
        assert summary.ece >= 0
        assert summary.mce >= 0

    def test_bin_stats_non_empty(self):
        y = np.array([0, 1] * 50)
        probs = np.linspace(0.05, 0.95, 100)
        summary = calibration_summary(y, probs)
        assert len(summary.bin_stats) > 0


class TestLiftCurve:
    def test_shape(self):
        y = np.array([0, 1] * 50)
        probs = np.linspace(0.1, 0.9, 100)
        curve = compute_lift_curve(y, probs, n_bins=10)
        assert len(curve) == 10
        assert "lift" in curve.columns

    def test_cumulative_recall_monotone(self):
        y = np.array([0, 1] * 50)
        probs = np.linspace(0.1, 0.9, 100)
        curve = compute_lift_curve(y, probs)
        recalls = curve["cumulative_recall"].values
        assert (np.diff(recalls) >= 0).all()


class TestRetentionSimulation:
    def test_summary_rows_equal_n_steps(self):
        ids = np.arange(100)
        probs = np.linspace(0.1, 0.9, 100)
        mrr = np.ones(100) * 200
        result = simulate_retention_impact(ids, probs, mrr, n_steps=10)
        assert len(result.summary) == 10

    def test_best_depth_positive(self):
        ids = np.arange(100)
        probs = np.linspace(0.1, 0.9, 100)
        mrr = np.ones(100) * 200
        result = simulate_retention_impact(ids, probs, mrr)
        assert result.best_depth > 0

    def test_expected_mrr_saved_non_negative(self):
        ids = np.arange(100)
        probs = np.linspace(0.1, 0.9, 100)
        mrr = np.ones(100) * 200
        result = simulate_retention_impact(ids, probs, mrr)
        assert result.expected_mrr_saved >= 0


# ---------------------------------------------------------------------------
# Uplift model tests
# ---------------------------------------------------------------------------

class TestTwoModelUplift:
    def test_fit_and_predict_uplift(self):
        X, y = _make_classification_data(n=400)
        rng = np.random.default_rng(1)
        treatment = pd.Series(rng.integers(0, 2, len(y)))
        model = TwoModelUplift(LogisticRegression(max_iter=500))
        model.fit(X, y, treatment)
        uplift = model.predict_uplift(X)
        assert uplift.shape == (len(X),)

    def test_uplift_range(self):
        X, y = _make_classification_data(n=400)
        rng = np.random.default_rng(2)
        treatment = pd.Series(rng.integers(0, 2, len(y)))
        model = TwoModelUplift(LogisticRegression(max_iter=500))
        model.fit(X, y, treatment)
        uplift = model.predict_uplift(X)
        assert (uplift >= -1).all() and (uplift <= 1).all()

    def test_rank_by_uplift_sorted_descending(self):
        X, y = _make_classification_data(n=400)
        rng = np.random.default_rng(3)
        treatment = pd.Series(rng.integers(0, 2, len(y)))
        model = TwoModelUplift(LogisticRegression(max_iter=500))
        model.fit(X, y, treatment)
        ranked = model.rank_by_uplift(X)
        uplift_vals = ranked["uplift"].values
        assert (uplift_vals[:-1] >= uplift_vals[1:]).all()


# ---------------------------------------------------------------------------
# Drift detection tests
# ---------------------------------------------------------------------------

class TestPSI:
    def test_identical_distributions_near_zero(self):
        rng = np.random.default_rng(0)
        dist = rng.normal(0, 1, 1000)
        assert psi(dist, dist) < 0.01

    def test_shifted_distribution_higher_psi(self):
        rng = np.random.default_rng(0)
        ref = rng.normal(0, 1, 1000)
        cur = rng.normal(3, 1, 1000)  # large shift
        assert psi(ref, cur) > 0.25


class TestFeatureDriftMonitor:
    def test_no_drift_on_identical(self):
        rng = np.random.default_rng(0)
        df = pd.DataFrame({"a": rng.normal(0, 1, 500), "b": rng.normal(5, 2, 500)})
        monitor = FeatureDriftMonitor(df)
        report = monitor.check(df)
        assert report.overall_severity == "none"

    def test_detects_large_shift(self):
        rng = np.random.default_rng(0)
        ref = pd.DataFrame({"a": rng.normal(0, 1, 500)})
        cur = pd.DataFrame({"a": rng.normal(5, 1, 500)})
        monitor = FeatureDriftMonitor(ref)
        report = monitor.check(cur)
        assert report.n_features_drifted > 0


class TestPredictionDriftMonitor:
    def test_no_drift_on_same(self):
        preds = np.random.default_rng(0).random(500)
        monitor = PredictionDriftMonitor(preds)
        report = monitor.check(preds)
        assert not report.drift_detected

    def test_drift_on_shift(self):
        ref = np.random.default_rng(0).random(500) * 0.3
        cur = np.random.default_rng(1).random(500) * 0.9
        monitor = PredictionDriftMonitor(ref)
        report = monitor.check(cur)
        assert report.drift_detected
