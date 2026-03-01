"""LightGBM model for fraud detection.

Gradient-boosted decision tree model with built-in handling for
class imbalance via scale_pos_weight and focal loss support.
"""

import logging
from typing import Any, Optional

import lightgbm as lgb
import numpy as np

logger = logging.getLogger(__name__)

DEFAULT_PARAMS: dict[str, Any] = {
    "objective": "binary",
    "metric": "auc",
    "boosting_type": "gbdt",
    "num_leaves": 63,
    "learning_rate": 0.05,
    "feature_fraction": 0.8,
    "bagging_fraction": 0.8,
    "bagging_freq": 5,
    "min_child_samples": 50,
    "reg_alpha": 0.1,
    "reg_lambda": 0.1,
    "verbose": -1,
    "n_jobs": -1,
    "random_state": 42,
}


def compute_scale_pos_weight(y: np.ndarray) -> float:
    """Compute scale_pos_weight for imbalanced binary classification.

    Args:
        y: Binary labels array.

    Returns:
        Ratio of negative to positive samples.
    """
    n_pos = np.sum(y == 1)
    n_neg = np.sum(y == 0)
    weight = n_neg / n_pos if n_pos > 0 else 1.0
    logger.info("scale_pos_weight: %.2f (neg=%d, pos=%d)", weight, n_neg, n_pos)
    return weight


def build_lgbm_model(
    params: Optional[dict] = None,
    scale_pos_weight: Optional[float] = None,
) -> lgb.LGBMClassifier:
    """Build a LightGBM classifier.

    Args:
        params: Optional parameter overrides.
        scale_pos_weight: Weight for positive class (computed automatically if None).

    Returns:
        Configured LGBMClassifier.
    """
    model_params = DEFAULT_PARAMS.copy()
    if params:
        model_params.update(params)
    if scale_pos_weight is not None:
        model_params["scale_pos_weight"] = scale_pos_weight

    model = lgb.LGBMClassifier(**model_params)
    logger.info("Built LightGBM model with params: %s", model_params)
    return model


def train_lgbm(
    model: lgb.LGBMClassifier,
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_val: Optional[np.ndarray] = None,
    y_val: Optional[np.ndarray] = None,
    num_boost_round: int = 500,
    early_stopping_rounds: int = 50,
) -> lgb.LGBMClassifier:
    """Train the LightGBM model with optional early stopping.

    Args:
        model: LGBMClassifier instance.
        X_train: Training features.
        y_train: Training labels.
        X_val: Optional validation features.
        y_val: Optional validation labels.
        num_boost_round: Maximum boosting rounds.
        early_stopping_rounds: Early stopping patience.

    Returns:
        Trained LGBMClassifier.
    """
    model.set_params(n_estimators=num_boost_round)

    fit_params: dict[str, Any] = {}
    if X_val is not None and y_val is not None:
        fit_params["eval_set"] = [(X_val, y_val)]
        fit_params["callbacks"] = [
            lgb.early_stopping(early_stopping_rounds, verbose=False),
            lgb.log_evaluation(period=100),
        ]

    logger.info("Training LightGBM on %d samples", len(X_train))
    model.fit(X_train, y_train, **fit_params)
    logger.info(
        "LightGBM training complete — best iteration: %s",
        getattr(model, "best_iteration_", "N/A"),
    )
    return model


def tune_hyperparameters(
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_val: np.ndarray,
    y_val: np.ndarray,
    n_trials: int = 20,
) -> dict:
    """Simple random search over key hyperparameters.

    Args:
        X_train: Training features.
        y_train: Training labels.
        X_val: Validation features.
        y_val: Validation labels.
        n_trials: Number of random configurations to try.

    Returns:
        Best hyperparameter configuration.
    """
    from sklearn.metrics import roc_auc_score

    rng = np.random.RandomState(42)
    best_score = 0.0
    best_params: dict = {}

    search_space = {
        "num_leaves": [31, 63, 127],
        "learning_rate": [0.01, 0.03, 0.05, 0.1],
        "feature_fraction": [0.6, 0.7, 0.8, 0.9],
        "bagging_fraction": [0.6, 0.7, 0.8, 0.9],
        "min_child_samples": [20, 50, 100],
        "reg_alpha": [0.0, 0.1, 0.5, 1.0],
        "reg_lambda": [0.0, 0.1, 0.5, 1.0],
    }

    spw = compute_scale_pos_weight(y_train)

    for trial in range(n_trials):
        params = {k: rng.choice(v) for k, v in search_space.items()}
        model = build_lgbm_model(params=params, scale_pos_weight=spw)
        model = train_lgbm(
            model, X_train, y_train, X_val, y_val,
            num_boost_round=300, early_stopping_rounds=30,
        )
        y_pred_proba = model.predict_proba(X_val)[:, 1]
        score = roc_auc_score(y_val, y_pred_proba)

        if score > best_score:
            best_score = score
            best_params = params
            logger.info("Trial %d: AUC=%.6f (new best)", trial + 1, score)
        else:
            logger.debug("Trial %d: AUC=%.6f", trial + 1, score)

    logger.info("Best AUC: %.6f with params: %s", best_score, best_params)
    return best_params
