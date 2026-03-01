"""
Logistic Regression baseline model.

Provides a class-weighted logistic regression as an interpretable baseline
for the churn prediction task.
"""

from __future__ import annotations

import logging

import numpy as np
from sklearn.linear_model import LogisticRegression

logger = logging.getLogger(__name__)


def train_logistic_regression(
    X_train: np.ndarray,
    y_train: np.ndarray,
    C: float = 1.0,
    max_iter: int = 1000,
    random_state: int = 42,
) -> LogisticRegression:
    """Train a class-weighted logistic regression model.

    Parameters
    ----------
    X_train:
        Feature matrix, shape ``(n_samples, n_features)``.
    y_train:
        Binary target array, shape ``(n_samples,)``.
    C:
        Inverse of regularisation strength.  Smaller values → stronger
        regularisation.
    max_iter:
        Maximum number of solver iterations.
    random_state:
        Random seed for reproducibility.

    Returns
    -------
    LogisticRegression
        Fitted scikit-learn LogisticRegression estimator.
    """
    model = LogisticRegression(
        C=C,
        class_weight="balanced",
        solver="lbfgs",
        max_iter=max_iter,
        random_state=random_state,
    )
    model.fit(X_train, y_train)
    logger.info(
        "LogisticRegression trained — iterations: %d, classes: %s",
        model.n_iter_[0],
        model.classes_,
    )
    return model


def predict_proba(model: LogisticRegression, X: np.ndarray) -> np.ndarray:
    """Return churn probability scores for each sample.

    Parameters
    ----------
    model:
        A fitted :class:`~sklearn.linear_model.LogisticRegression` model.
    X:
        Feature matrix, shape ``(n_samples, n_features)``.

    Returns
    -------
    np.ndarray
        1-D array of churn probabilities in ``[0, 1]``, shape
        ``(n_samples,)``.
    """
    probs = model.predict_proba(X)[:, 1]
    return probs
