"""Logistic Regression baseline model for fraud detection.

Provides a simple, interpretable baseline with class-weight balancing
to handle the extreme class imbalance in fraud data.
"""

import logging
from typing import Optional

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

logger = logging.getLogger(__name__)


def build_baseline_model(
    class_weight: str = "balanced",
    C: float = 1.0,
    max_iter: int = 1000,
    random_state: int = 42,
) -> Pipeline:
    """Build a Logistic Regression pipeline with scaling.

    Args:
        class_weight: Class weight strategy ('balanced' for imbalanced data).
        C: Inverse regularization strength.
        max_iter: Maximum solver iterations.
        random_state: Random seed.

    Returns:
        Sklearn Pipeline with StandardScaler and LogisticRegression.
    """
    pipeline = Pipeline(
        [
            ("scaler", StandardScaler()),
            (
                "classifier",
                LogisticRegression(
                    class_weight=class_weight,
                    C=C,
                    max_iter=max_iter,
                    random_state=random_state,
                    solver="lbfgs",
                    n_jobs=-1,
                ),
            ),
        ]
    )
    logger.info("Built baseline LogisticRegression pipeline (C=%.4f, class_weight=%s)", C, class_weight)
    return pipeline


def train_baseline(
    pipeline: Pipeline,
    X_train: np.ndarray,
    y_train: np.ndarray,
) -> Pipeline:
    """Train the baseline model.

    Args:
        pipeline: Sklearn Pipeline.
        X_train: Training features.
        y_train: Training labels.

    Returns:
        Fitted pipeline.
    """
    logger.info("Training baseline model on %d samples", len(X_train))
    pipeline.fit(X_train, y_train)
    logger.info("Baseline model training complete")
    return pipeline
