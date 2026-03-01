"""Tests for model training and evaluation metrics."""

from __future__ import annotations

import numpy as np
import pytest

from src.evaluation.metrics import compute_roc_auc
from src.features.builder import build_feature_matrix
from src.models.baseline import predict_proba, train_logistic_regression
from src.preprocessing.pipeline import add_engineered_features, generate_synthetic_dataset


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def sample_data():
    df = generate_synthetic_dataset(n_customers=500, seed=42)
    df = add_engineered_features(df)
    X, y, preprocessor = build_feature_matrix(df)
    return X, y, preprocessor


# ---------------------------------------------------------------------------
# Logistic Regression
# ---------------------------------------------------------------------------

def test_logistic_regression_trains(sample_data):
    X, y, _ = sample_data
    model = train_logistic_regression(X, y)
    assert model is not None
    assert hasattr(model, "coef_")


def test_logistic_regression_predict_proba_range(sample_data):
    X, y, _ = sample_data
    model = train_logistic_regression(X, y)
    probs = predict_proba(model, X)
    assert probs.shape == (len(y),), "Probability array must have one entry per sample."
    assert (probs >= 0).all() and (probs <= 1).all(), "All probabilities must be in [0, 1]."


def test_logistic_regression_predict_proba_no_nan(sample_data):
    X, y, _ = sample_data
    model = train_logistic_regression(X, y)
    probs = predict_proba(model, X)
    assert not np.isnan(probs).any(), "Probabilities must not contain NaN."


# ---------------------------------------------------------------------------
# XGBoost
# ---------------------------------------------------------------------------

def test_xgboost_trains_and_predicts(sample_data):
    pytest.importorskip("xgboost")
    from src.models.gradient_boosting import train_xgboost

    X, y, _ = sample_data
    # Use a small number of estimators for speed
    model = train_xgboost(X, y, n_estimators=50)
    probs = model.predict_proba(X)[:, 1]
    assert probs.shape == (len(y),)
    assert (probs >= 0).all() and (probs <= 1).all()


def test_xgboost_with_validation(sample_data):
    pytest.importorskip("xgboost")
    from src.models.gradient_boosting import train_xgboost

    X, y, _ = sample_data
    mid = len(y) // 2
    model = train_xgboost(X[:mid], y[:mid], X[mid:], y[mid:], n_estimators=50)
    probs = model.predict_proba(X)[:, 1]
    assert (probs >= 0).all() and (probs <= 1).all()


# ---------------------------------------------------------------------------
# LightGBM
# ---------------------------------------------------------------------------

def test_lightgbm_trains_and_predicts(sample_data):
    pytest.importorskip("lightgbm")
    from src.models.gradient_boosting import train_lightgbm

    X, y, _ = sample_data
    model = train_lightgbm(X, y, n_estimators=50)
    probs = model.predict_proba(X)[:, 1]
    assert probs.shape == (len(y),)
    assert (probs >= 0).all() and (probs <= 1).all()


# ---------------------------------------------------------------------------
# Evaluation metrics
# ---------------------------------------------------------------------------

def test_compute_roc_auc_on_good_model(sample_data):
    X, y, _ = sample_data
    model = train_logistic_regression(X, y)
    probs = predict_proba(model, X)
    auc = compute_roc_auc(y, probs)
    assert 0.5 <= auc <= 1.0, f"AUC should be in [0.5, 1.0], got {auc:.4f}"


def test_compute_roc_auc_perfect_score():
    y_true = np.array([0, 0, 1, 1])
    y_prob = np.array([0.1, 0.2, 0.8, 0.9])
    auc = compute_roc_auc(y_true, y_prob)
    assert auc == pytest.approx(1.0)


def test_compute_roc_auc_random_score():
    rng = np.random.default_rng(0)
    y_true = rng.integers(0, 2, size=200)
    y_prob = rng.random(200)
    auc = compute_roc_auc(y_true, y_prob)
    # Random should be close to 0.5
    assert 0.3 < auc < 0.7
