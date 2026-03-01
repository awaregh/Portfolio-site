"""
Feature store builder.

Converts a preprocessed customer DataFrame into model-ready numpy arrays
using a sklearn ColumnTransformer.
"""

from __future__ import annotations

import logging
from typing import Tuple

import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Feature definitions
# ---------------------------------------------------------------------------

NUMERIC_FEATURES: list[str] = [
    "tenure_months",
    "monthly_spend",
    "support_tickets",
    "login_frequency",
    "feature_adoption_score",
    "spend_per_month_normalized",
    "tickets_per_month",
    "login_per_month",
    "is_annual",
]

CATEGORICAL_FEATURES: list[str] = [
    "contract_type",
    "industry",
    "tenure_bucket",
]

ALL_FEATURES: list[str] = NUMERIC_FEATURES + CATEGORICAL_FEATURES

TARGET_COL: str = "churned"


# ---------------------------------------------------------------------------
# Preprocessor factory
# ---------------------------------------------------------------------------

def get_preprocessor() -> ColumnTransformer:
    """Return an *unfitted* sklearn ColumnTransformer for the feature set.

    Numeric columns are standardised; categorical columns are one-hot
    encoded (unknown categories are ignored at inference time).

    Returns
    -------
    ColumnTransformer
        Ready to call ``.fit_transform()`` or ``.fit()`` / ``.transform()``.
    """
    numeric_pipeline = Pipeline(
        steps=[("scaler", StandardScaler())],
    )
    categorical_pipeline = Pipeline(
        steps=[
            (
                "encoder",
                OneHotEncoder(handle_unknown="ignore", sparse_output=False),
            )
        ],
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", numeric_pipeline, NUMERIC_FEATURES),
            ("cat", categorical_pipeline, CATEGORICAL_FEATURES),
        ],
        remainder="drop",
        verbose_feature_names_out=False,
    )
    return preprocessor


# ---------------------------------------------------------------------------
# Feature matrix builder
# ---------------------------------------------------------------------------

def build_feature_matrix(
    df: pd.DataFrame,
    preprocessor: ColumnTransformer | None = None,
    fit: bool = True,
) -> Tuple[np.ndarray, np.ndarray, ColumnTransformer]:
    """Build the model-ready feature matrix from a customer DataFrame.

    Parameters
    ----------
    df:
        Customer DataFrame containing all columns in ``ALL_FEATURES`` and
        ``TARGET_COL``.
    preprocessor:
        An existing ColumnTransformer to use.  If *None*, a new one is
        created via :func:`get_preprocessor`.
    fit:
        If *True*, call ``fit_transform``; otherwise call ``transform``
        (use ``fit=False`` for validation / test data).

    Returns
    -------
    Tuple[np.ndarray, np.ndarray, ColumnTransformer]
        ``(X, y, fitted_preprocessor)``

    Raises
    ------
    KeyError
        If any expected feature column is missing from *df*.
    """
    missing = [c for c in ALL_FEATURES if c not in df.columns]
    if missing:
        raise KeyError(f"Missing feature columns: {missing}")
    if TARGET_COL not in df.columns:
        raise KeyError(f"Target column '{TARGET_COL}' not found in DataFrame.")

    if preprocessor is None:
        preprocessor = get_preprocessor()

    X_raw = df[ALL_FEATURES]
    y = df[TARGET_COL].to_numpy(dtype=np.int32)

    if fit:
        X = preprocessor.fit_transform(X_raw)
    else:
        X = preprocessor.transform(X_raw)

    logger.info(
        "Built feature matrix: shape=%s, positive_rate=%.2f%%",
        X.shape,
        y.mean() * 100,
    )
    return X, y, preprocessor


def get_feature_names_out(preprocessor: ColumnTransformer) -> list[str]:
    """Return the output feature names from a fitted ColumnTransformer.

    Parameters
    ----------
    preprocessor:
        A *fitted* ColumnTransformer.

    Returns
    -------
    list[str]
        Feature names in the same order as columns of the transformed array.
    """
    return list(preprocessor.get_feature_names_out())
