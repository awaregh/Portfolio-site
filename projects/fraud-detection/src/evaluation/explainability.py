"""Model explainability module.

Provides SHAP-based explanations and feature importance analysis
for fraud detection models.
"""

import logging
from typing import Any, Optional

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


def compute_feature_importance(
    model: Any,
    feature_names: list[str],
    importance_type: str = "gain",
) -> pd.DataFrame:
    """Extract feature importance from a trained model.

    Args:
        model: Trained model (LightGBM or sklearn Pipeline).
        feature_names: List of feature column names.
        importance_type: Type of importance ('gain', 'split', or 'weight').

    Returns:
        DataFrame with feature names and importance scores, sorted descending.
    """
    # Handle sklearn Pipeline
    if hasattr(model, "named_steps"):
        model = model.named_steps.get("classifier", model)

    if hasattr(model, "feature_importances_"):
        importances = model.feature_importances_
    elif hasattr(model, "coef_"):
        importances = np.abs(model.coef_[0])
    else:
        raise ValueError("Model does not expose feature importances")

    importance_df = pd.DataFrame(
        {"feature": feature_names, "importance": importances}
    ).sort_values("importance", ascending=False)

    importance_df["importance_pct"] = (
        importance_df["importance"] / importance_df["importance"].sum() * 100
    )

    logger.info("Top 10 features by importance:")
    for _, row in importance_df.head(10).iterrows():
        logger.info("  %s: %.4f (%.2f%%)", row["feature"], row["importance"], row["importance_pct"])

    return importance_df


def compute_shap_values(
    model: Any,
    X: np.ndarray,
    feature_names: list[str],
    max_samples: int = 1000,
) -> dict[str, Any]:
    """Compute SHAP values for model explanations.

    Args:
        model: Trained model.
        X: Feature matrix.
        feature_names: List of feature column names.
        max_samples: Maximum samples for SHAP computation.

    Returns:
        Dictionary with SHAP values and summary statistics.
    """
    try:
        import shap
    except ImportError:
        logger.warning("SHAP not installed — returning feature importance only")
        importance_df = compute_feature_importance(model, feature_names)
        return {
            "method": "feature_importance_fallback",
            "top_features": importance_df.head(20).to_dict("records"),
        }

    # Handle sklearn Pipeline
    actual_model = model
    if hasattr(model, "named_steps"):
        actual_model = model.named_steps.get("classifier", model)

    # Sample data if too large
    if len(X) > max_samples:
        indices = np.random.RandomState(42).choice(len(X), max_samples, replace=False)
        X_sample = X[indices]
    else:
        X_sample = X

    # Choose appropriate explainer
    if hasattr(actual_model, "predict_proba"):
        explainer = shap.TreeExplainer(actual_model)
    else:
        explainer = shap.Explainer(actual_model)

    shap_values = explainer.shap_values(X_sample)

    # Handle multi-output (binary classification returns list of 2 arrays)
    if isinstance(shap_values, list) and len(shap_values) == 2:
        shap_values = shap_values[1]  # Positive class SHAP values

    # Mean absolute SHAP values per feature
    mean_abs_shap = np.mean(np.abs(shap_values), axis=0)
    shap_importance = pd.DataFrame(
        {"feature": feature_names, "mean_abs_shap": mean_abs_shap}
    ).sort_values("mean_abs_shap", ascending=False)

    logger.info("Top 10 features by SHAP importance:")
    for _, row in shap_importance.head(10).iterrows():
        logger.info("  %s: %.4f", row["feature"], row["mean_abs_shap"])

    return {
        "method": "shap_tree_explainer",
        "top_features": shap_importance.head(20).to_dict("records"),
        "n_samples_explained": len(X_sample),
    }
