"""Tests for the monitoring module."""

import numpy as np
import pytest

from src.monitoring.drift import DriftDetector
from src.monitoring.performance import PerformanceTracker


class TestDriftDetector:
    """Tests for drift detection."""

    def test_psi_no_drift(self):
        rng = np.random.RandomState(42)
        ref = rng.normal(0.1, 0.05, 1000)
        cur = rng.normal(0.1, 0.05, 1000)
        detector = DriftDetector()
        psi = detector.compute_psi(ref, cur)
        assert psi < 0.1  # No significant drift

    def test_psi_with_drift(self):
        rng = np.random.RandomState(42)
        ref = rng.normal(0.1, 0.05, 1000)
        cur = rng.normal(0.5, 0.1, 1000)
        detector = DriftDetector()
        psi = detector.compute_psi(ref, cur)
        assert psi > 0.2  # Significant drift

    def test_prediction_drift_detection(self):
        rng = np.random.RandomState(42)
        ref = rng.normal(0.1, 0.05, 1000)
        cur = rng.normal(0.5, 0.1, 1000)
        detector = DriftDetector(reference_predictions=ref)
        result = detector.check_prediction_drift(cur)
        assert result["drift_detected"] is True

    def test_no_drift_detected(self):
        rng = np.random.RandomState(42)
        ref = rng.normal(0.1, 0.05, 1000)
        cur = rng.normal(0.1, 0.05, 800)
        detector = DriftDetector(reference_predictions=ref)
        result = detector.check_prediction_drift(cur)
        assert result["drift_detected"] == False

    def test_feature_drift_detection(self):
        rng = np.random.RandomState(42)
        ref = rng.randn(500, 3)
        cur = rng.randn(500, 3) + 3  # Shifted
        detector = DriftDetector(
            reference_features=ref,
            feature_names=["f1", "f2", "f3"],
        )
        result = detector.check_feature_drift(cur)
        assert result["drifted_features_count"] > 0


class TestPerformanceTracker:
    """Tests for performance tracking."""

    def test_log_prediction(self, tmp_path):
        tracker = PerformanceTracker(log_dir=tmp_path)
        tracker.log_prediction("txn-1", 0.95, True, "v1")
        assert len(tracker.predictions) == 1

    def test_rolling_metrics_insufficient(self, tmp_path):
        tracker = PerformanceTracker(log_dir=tmp_path)
        tracker.log_prediction("txn-1", 0.95, True, "v1")
        result = tracker.compute_rolling_metrics()
        assert result["status"] == "insufficient_data"

    def test_rolling_metrics_with_ground_truth(self, tmp_path):
        tracker = PerformanceTracker(log_dir=tmp_path)
        for i in range(20):
            is_fraud = i < 5
            tracker.log_prediction(f"txn-{i}", 0.8 if is_fraud else 0.1, is_fraud, "v1")
            tracker.record_ground_truth(f"txn-{i}", is_fraud)
        result = tracker.compute_rolling_metrics()
        assert result["status"] == "ok"
        assert "precision" in result
        assert "recall" in result

    def test_save_log(self, tmp_path):
        tracker = PerformanceTracker(log_dir=tmp_path)
        tracker.log_prediction("txn-1", 0.95, True, "v1")
        tracker.save_log()
        log_files = list(tmp_path.glob("*.json"))
        assert len(log_files) == 1
