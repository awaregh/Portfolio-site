"""
SHAP-based model explainability.

Provides global feature importance, local (per-prediction) explanations,
and cohort-level risk attribution using SHAP values.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List

import numpy as np

logger = logging.getLogger(__name__)


def compute_shap_values(
    model: Any,
    X: np.ndarray,
    model_type: str = "tree",
) -> np.ndarray:
    """Compute SHAP values for all samples in *X*.

    Parameters
    ----------
    model:
        A fitted model.  Use ``model_type='tree'`` for XGBoost / LightGBM /
        Random Forest; ``model_type='linear'`` for logistic regression.
    X:
        Feature matrix, shape ``(n_samples, n_features)``.
    model_type:
        ``'tree'`` or ``'linear'``.

    Returns
    -------
    np.ndarray
        SHAP values array of shape ``(n_samples, n_features)``.

    Raises
    ------
    ImportError
        If ``shap`` is not installed.
    ValueError
        If an unsupported ``model_type`` is passed.
    """
    try:
        import shap
    except ImportError as exc:
        raise ImportError("shap is required: pip install shap") from exc

    if model_type == "tree":
        explainer = shap.TreeExplainer(model)
        shap_vals = explainer.shap_values(X)
        # Some tree explainers return a list [class0, class1] for binary tasks
        if isinstance(shap_vals, list):
            shap_vals = shap_vals[1]
    elif model_type == "linear":
        # Use a background sample (up to 200 rows) for efficiency
        background = shap.utils.sample(X, min(200, X.shape[0]))
        explainer = shap.LinearExplainer(model, background)
        shap_vals = explainer.shap_values(X)
        if isinstance(shap_vals, list):
            shap_vals = shap_vals[1]
    else:
        raise ValueError(f"Unsupported model_type '{model_type}'. Use 'tree' or 'linear'.")

    logger.info(
        "SHAP values computed — shape: %s, model_type: %s",
        np.array(shap_vals).shape,
        model_type,
    )
    return np.array(shap_vals)


def get_top_features(
    shap_values: np.ndarray,
    feature_names: List[str],
    top_n: int = 10,
) -> Dict[str, float]:
    """Return the top *n* features ranked by mean absolute SHAP value.

    Parameters
    ----------
    shap_values:
        SHAP values, shape ``(n_samples, n_features)``.
    feature_names:
        Names corresponding to each column of *shap_values*.
    top_n:
        Number of top features to return.

    Returns
    -------
    dict
        Mapping of feature name → mean |SHAP| value, sorted descending.
    """
    if shap_values.shape[1] != len(feature_names):
        raise ValueError(
            f"shap_values has {shap_values.shape[1]} features but "
            f"feature_names has {len(feature_names)} entries."
        )

    mean_abs = np.abs(shap_values).mean(axis=0)
    top_indices = np.argsort(mean_abs)[::-1][:top_n]
    result = {feature_names[i]: float(mean_abs[i]) for i in top_indices}
    return result


def explain_cohort(
    model: Any,
    X_cohort: np.ndarray,
    feature_names: List[str],
    cohort_name: str,
    model_type: str = "tree",
) -> Dict[str, Any]:
    """Compute cohort-level mean SHAP values for a subset of customers.

    Parameters
    ----------
    model:
        Fitted model to explain.
    X_cohort:
        Feature matrix for the cohort, shape ``(n_cohort, n_features)``.
    feature_names:
        Feature names corresponding to columns of *X_cohort*.
    cohort_name:
        Label for this cohort (used in the returned dict).
    model_type:
        Passed directly to :func:`compute_shap_values`.

    Returns
    -------
    dict
        Keys: ``cohort``, ``n_customers``, ``mean_shap_values`` (dict of
        feature → mean SHAP), ``top_risk_features`` (top 5 features).
    """
    shap_values = compute_shap_values(model, X_cohort, model_type=model_type)
    mean_shap = {
        feature_names[i]: float(shap_values[:, i].mean())
        for i in range(len(feature_names))
    }
    top_risk = dict(
        sorted(mean_shap.items(), key=lambda kv: abs(kv[1]), reverse=True)[:5]
    )

    return {
        "cohort": cohort_name,
        "n_customers": X_cohort.shape[0],
        "mean_shap_values": mean_shap,
        "top_risk_features": top_risk,
    }
