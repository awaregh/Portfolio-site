"""
Gradient boosting models: XGBoost and LightGBM.

Both trainers support optional validation sets for early stopping,
returning fitted estimators that expose a scikit-learn compatible API.
"""

from __future__ import annotations

import logging
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)


def train_xgboost(
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_val: Optional[np.ndarray] = None,
    y_val: Optional[np.ndarray] = None,
    n_estimators: int = 500,
    learning_rate: float = 0.05,
    max_depth: int = 6,
    subsample: float = 0.8,
    colsample_bytree: float = 0.8,
    early_stopping_rounds: int = 30,
    random_state: int = 42,
):
    """Train an XGBoost binary classifier.

    Parameters
    ----------
    X_train, y_train:
        Training features and labels.
    X_val, y_val:
        Optional validation set used for early stopping.
    n_estimators:
        Maximum number of boosting rounds.
    learning_rate:
        Step-size shrinkage per boosting round.
    max_depth:
        Maximum tree depth.
    subsample:
        Row sub-sampling ratio per tree.
    colsample_bytree:
        Column sub-sampling ratio per tree.
    early_stopping_rounds:
        Rounds without improvement before halting (only used if val set
        is provided).
    random_state:
        Random seed.

    Returns
    -------
    XGBClassifier
        Fitted XGBoost classifier.
    """
    try:
        from xgboost import XGBClassifier
    except ImportError as exc:
        raise ImportError("xgboost is required: pip install xgboost") from exc

    scale_pos_weight = float((y_train == 0).sum()) / max(float((y_train == 1).sum()), 1)

    params: dict = dict(
        n_estimators=n_estimators,
        learning_rate=learning_rate,
        max_depth=max_depth,
        subsample=subsample,
        colsample_bytree=colsample_bytree,
        scale_pos_weight=scale_pos_weight,
        use_label_encoder=False,
        eval_metric="logloss",
        random_state=random_state,
        verbosity=0,
    )

    if X_val is not None and y_val is not None:
        params["early_stopping_rounds"] = early_stopping_rounds
        model = XGBClassifier(**params)
        model.fit(
            X_train, y_train,
            eval_set=[(X_val, y_val)],
            verbose=False,
        )
    else:
        model = XGBClassifier(**params)
        model.fit(X_train, y_train)

    logger.info(
        "XGBClassifier trained — best_iteration=%s, n_estimators=%d",
        getattr(model, "best_iteration", "N/A"),
        model.n_estimators,
    )
    return model


def train_lightgbm(
    X_train: np.ndarray,
    y_train: np.ndarray,
    X_val: Optional[np.ndarray] = None,
    y_val: Optional[np.ndarray] = None,
    n_estimators: int = 500,
    learning_rate: float = 0.05,
    num_leaves: int = 63,
    subsample: float = 0.8,
    colsample_bytree: float = 0.8,
    early_stopping_rounds: int = 30,
    random_state: int = 42,
):
    """Train a LightGBM binary classifier.

    Parameters
    ----------
    X_train, y_train:
        Training features and labels.
    X_val, y_val:
        Optional validation set used for early stopping.
    n_estimators:
        Maximum number of boosting iterations.
    learning_rate:
        Step-size shrinkage per iteration.
    num_leaves:
        Maximum number of leaves per tree.
    subsample:
        Row sub-sampling fraction.
    colsample_bytree:
        Feature sub-sampling fraction.
    early_stopping_rounds:
        Patience for early stopping when val set is provided.
    random_state:
        Random seed.

    Returns
    -------
    LGBMClassifier
        Fitted LightGBM classifier.
    """
    try:
        import lightgbm as lgb
    except ImportError as exc:
        raise ImportError("lightgbm is required: pip install lightgbm") from exc

    pos_weight = float((y_train == 0).sum()) / max(float((y_train == 1).sum()), 1)

    model = lgb.LGBMClassifier(
        n_estimators=n_estimators,
        learning_rate=learning_rate,
        num_leaves=num_leaves,
        subsample=subsample,
        colsample_bytree=colsample_bytree,
        scale_pos_weight=pos_weight,
        random_state=random_state,
        verbose=-1,
    )

    callbacks = [lgb.log_evaluation(period=-1)]

    if X_val is not None and y_val is not None:
        callbacks.append(lgb.early_stopping(stopping_rounds=early_stopping_rounds, verbose=False))
        model.fit(
            X_train, y_train,
            eval_set=[(X_val, y_val)],
            callbacks=callbacks,
        )
    else:
        model.fit(X_train, y_train, callbacks=callbacks)

    logger.info(
        "LGBMClassifier trained — best_iteration=%s",
        getattr(model, "best_iteration_", "N/A"),
    )
    return model
