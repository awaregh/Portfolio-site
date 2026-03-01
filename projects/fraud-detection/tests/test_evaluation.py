"""Tests for the evaluation module."""

import numpy as np
import pytest

from src.evaluation.explainability import compute_feature_importance
from src.evaluation.metrics import (
    compute_all_metrics,
    compute_cost_analysis,
    compute_fpr_tpr_tradeoff,
)


@pytest.fixture
def predictions():
    """Generate synthetic predictions for evaluation tests."""
    rng = np.random.RandomState(42)
    n = 1000
    y_true = np.concatenate([np.zeros(950), np.ones(50)])
    y_scores = np.clip(
        np.where(y_true == 1, rng.beta(5, 2, n), rng.beta(2, 5, n)),
        0, 1,
    )
    return y_true, y_scores


class TestMetrics:
    """Tests for evaluation metric computation."""

    def test_compute_all_metrics(self, predictions):
        y_true, y_scores = predictions
        metrics = compute_all_metrics(y_true, y_scores)
        assert "roc_auc" in metrics
        assert "pr_auc" in metrics
        assert "confusion_matrix" in metrics
        assert 0 <= metrics["roc_auc"] <= 1
        assert 0 <= metrics["pr_auc"] <= 1

    def test_confusion_matrix_sums(self, predictions):
        y_true, y_scores = predictions
        metrics = compute_all_metrics(y_true, y_scores)
        cm = metrics["confusion_matrix"]
        assert cm["tp"] + cm["fp"] + cm["tn"] + cm["fn"] == len(y_true)

    def test_cost_analysis(self, predictions):
        y_true, y_scores = predictions
        result = compute_cost_analysis(y_true, y_scores)
        assert "optimal_threshold" in result
        assert "minimum_cost" in result
        assert result["minimum_cost"] <= result["cost_at_default"]

    def test_fpr_tpr_tradeoff(self, predictions):
        y_true, y_scores = predictions
        tradeoffs = compute_fpr_tpr_tradeoff(y_true, y_scores)
        assert len(tradeoffs) > 0
        for t in tradeoffs:
            assert "target_fpr" in t
            assert "tpr" in t


class TestExplainability:
    """Tests for model explainability."""

    def test_feature_importance_from_sklearn(self):
        from sklearn.linear_model import LogisticRegression

        rng = np.random.RandomState(42)
        X = rng.randn(100, 5)
        y = (X[:, 0] > 0).astype(int)
        model = LogisticRegression().fit(X, y)
        importance_df = compute_feature_importance(
            model, [f"feat_{i}" for i in range(5)]
        )
        assert len(importance_df) == 5
        assert "importance" in importance_df.columns
