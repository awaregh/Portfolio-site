"""Tests for the model training module."""

import numpy as np
import pytest

from src.data_processing.ingest import generate_synthetic_data
from src.data_processing.preprocess import clean_data, scale_features
from src.data_processing.split import stratified_split
from src.feature_engineering.features import engineer_features, get_feature_columns
from src.models.baseline import build_baseline_model, train_baseline
from src.models.lightgbm_model import build_lgbm_model, compute_scale_pos_weight, train_lgbm
from src.models.threshold import (
    optimize_threshold_cost,
    optimize_threshold_f1,
    optimize_threshold_fpr,
)


@pytest.fixture
def prepared_data():
    """Generate and prepare data for model tests."""
    df = generate_synthetic_data(n_samples=2000, fraud_rate=0.05)
    df = clean_data(df)
    df, _ = scale_features(df)
    df = engineer_features(df)
    feature_cols = get_feature_columns(df)
    train_df, test_df = stratified_split(df, test_ratio=0.3)
    return {
        "X_train": train_df[feature_cols].values,
        "y_train": train_df["Class"].values,
        "X_test": test_df[feature_cols].values,
        "y_test": test_df["Class"].values,
        "feature_cols": feature_cols,
    }


class TestBaselineModel:
    """Tests for Logistic Regression baseline."""

    def test_build_and_train(self, prepared_data):
        model = build_baseline_model()
        model = train_baseline(model, prepared_data["X_train"], prepared_data["y_train"])
        proba = model.predict_proba(prepared_data["X_test"])[:, 1]
        assert len(proba) == len(prepared_data["X_test"])
        assert all(0 <= p <= 1 for p in proba)

    def test_predictions_not_trivial(self, prepared_data):
        model = build_baseline_model()
        model = train_baseline(model, prepared_data["X_train"], prepared_data["y_train"])
        preds = model.predict(prepared_data["X_test"])
        assert len(set(preds)) > 1, "Model should predict both classes"


class TestLightGBMModel:
    """Tests for LightGBM model."""

    def test_compute_scale_pos_weight(self, prepared_data):
        spw = compute_scale_pos_weight(prepared_data["y_train"])
        assert spw > 1.0  # Should be > 1 for imbalanced data

    def test_build_and_train(self, prepared_data):
        spw = compute_scale_pos_weight(prepared_data["y_train"])
        model = build_lgbm_model(scale_pos_weight=spw)
        model = train_lgbm(
            model,
            prepared_data["X_train"],
            prepared_data["y_train"],
            num_boost_round=10,
        )
        proba = model.predict_proba(prepared_data["X_test"])[:, 1]
        assert len(proba) == len(prepared_data["X_test"])

    def test_with_early_stopping(self, prepared_data):
        model = build_lgbm_model()
        model = train_lgbm(
            model,
            prepared_data["X_train"],
            prepared_data["y_train"],
            prepared_data["X_test"],
            prepared_data["y_test"],
            num_boost_round=50,
            early_stopping_rounds=10,
        )
        assert model is not None


class TestThresholdOptimization:
    """Tests for threshold optimization."""

    def test_optimize_f1(self, prepared_data):
        model = build_baseline_model()
        model = train_baseline(model, prepared_data["X_train"], prepared_data["y_train"])
        proba = model.predict_proba(prepared_data["X_test"])[:, 1]

        threshold, f1 = optimize_threshold_f1(prepared_data["y_test"], proba)
        assert 0 < threshold < 1
        assert 0 <= f1 <= 1

    def test_optimize_cost(self, prepared_data):
        model = build_baseline_model()
        model = train_baseline(model, prepared_data["X_train"], prepared_data["y_train"])
        proba = model.predict_proba(prepared_data["X_test"])[:, 1]

        threshold, cost = optimize_threshold_cost(prepared_data["y_test"], proba)
        assert 0 < threshold < 1
        assert cost >= 0

    def test_optimize_fpr(self, prepared_data):
        model = build_baseline_model()
        model = train_baseline(model, prepared_data["X_train"], prepared_data["y_train"])
        proba = model.predict_proba(prepared_data["X_test"])[:, 1]

        threshold, tpr = optimize_threshold_fpr(prepared_data["y_test"], proba, max_fpr=0.05)
        assert 0 < threshold < 1
        assert 0 <= tpr <= 1
