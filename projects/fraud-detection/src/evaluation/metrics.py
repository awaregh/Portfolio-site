"""Evaluation metrics for fraud detection models.

Computes ROC-AUC, PR-AUC, confusion matrix, FPR/TPR tradeoffs,
and cost-based analysis.
"""

import logging
from typing import Any

import numpy as np
from sklearn.metrics import (
    average_precision_score,
    classification_report,
    confusion_matrix,
    f1_score,
    precision_recall_curve,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)

logger = logging.getLogger(__name__)


def compute_all_metrics(
    y_true: np.ndarray,
    y_scores: np.ndarray,
    threshold: float = 0.5,
) -> dict[str, Any]:
    """Compute comprehensive evaluation metrics.

    Args:
        y_true: True binary labels.
        y_scores: Predicted probabilities for the positive class.
        threshold: Classification threshold.

    Returns:
        Dictionary with all computed metrics.
    """
    y_pred = (y_scores >= threshold).astype(int)

    roc_auc = roc_auc_score(y_true, y_scores)
    pr_auc = average_precision_score(y_true, y_scores)
    precision = precision_score(y_true, y_pred, zero_division=0)
    recall = recall_score(y_true, y_pred, zero_division=0)
    f1 = f1_score(y_true, y_pred, zero_division=0)

    tn, fp, fn, tp = confusion_matrix(y_true, y_pred).ravel()
    fpr = fp / (fp + tn) if (fp + tn) > 0 else 0
    tpr = tp / (tp + fn) if (tp + fn) > 0 else 0

    metrics = {
        "roc_auc": float(roc_auc),
        "pr_auc": float(pr_auc),
        "precision": float(precision),
        "recall": float(recall),
        "f1_score": float(f1),
        "fpr": float(fpr),
        "tpr": float(tpr),
        "threshold": float(threshold),
        "confusion_matrix": {
            "tn": int(tn),
            "fp": int(fp),
            "fn": int(fn),
            "tp": int(tp),
        },
        "total_samples": int(len(y_true)),
        "total_positives": int(np.sum(y_true)),
        "total_negatives": int(np.sum(y_true == 0)),
    }

    logger.info(
        "Metrics: ROC-AUC=%.4f, PR-AUC=%.4f, F1=%.4f, Precision=%.4f, Recall=%.4f",
        roc_auc,
        pr_auc,
        f1,
        precision,
        recall,
    )
    return metrics


def compute_cost_analysis(
    y_true: np.ndarray,
    y_scores: np.ndarray,
    cost_fp: float = 1.0,
    cost_fn: float = 10.0,
    n_thresholds: int = 100,
) -> dict[str, Any]:
    """Compute cost-based analysis across thresholds.

    Args:
        y_true: True binary labels.
        y_scores: Predicted probabilities.
        cost_fp: Cost per false positive.
        cost_fn: Cost per false negative.
        n_thresholds: Number of thresholds to evaluate.

    Returns:
        Dictionary with cost analysis results.
    """
    thresholds = np.linspace(0.01, 0.99, n_thresholds)
    costs = []

    for t in thresholds:
        preds = (y_scores >= t).astype(int)
        fp = np.sum((preds == 1) & (y_true == 0))
        fn = np.sum((preds == 0) & (y_true == 1))
        total_cost = cost_fp * fp + cost_fn * fn
        costs.append(
            {
                "threshold": float(t),
                "fp": int(fp),
                "fn": int(fn),
                "cost": float(total_cost),
            }
        )

    min_cost_entry = min(costs, key=lambda x: x["cost"])

    result = {
        "cost_fp": cost_fp,
        "cost_fn": cost_fn,
        "optimal_threshold": min_cost_entry["threshold"],
        "minimum_cost": min_cost_entry["cost"],
        "cost_at_default": next(
            c["cost"] for c in costs if abs(c["threshold"] - 0.5) < 0.02
        ),
    }

    logger.info(
        "Cost analysis: optimal_threshold=%.4f, min_cost=%.2f",
        result["optimal_threshold"],
        result["minimum_cost"],
    )
    return result


def compute_fpr_tpr_tradeoff(
    y_true: np.ndarray,
    y_scores: np.ndarray,
    target_fprs: list[float] | None = None,
) -> list[dict[str, float]]:
    """Compute TPR at various FPR operating points.

    Args:
        y_true: True binary labels.
        y_scores: Predicted probabilities.
        target_fprs: List of FPR values to evaluate.

    Returns:
        List of FPR/TPR/threshold triples.
    """
    if target_fprs is None:
        target_fprs = [0.001, 0.005, 0.01, 0.02, 0.05, 0.1]

    fpr, tpr, thresholds = roc_curve(y_true, y_scores)
    tradeoffs = []

    for target_fpr in target_fprs:
        idx = np.searchsorted(fpr, target_fpr, side="right") - 1
        idx = max(0, min(idx, len(thresholds) - 1))
        tradeoffs.append(
            {
                "target_fpr": target_fpr,
                "actual_fpr": float(fpr[idx]),
                "tpr": float(tpr[idx]),
                "threshold": float(thresholds[idx]),
            }
        )

    return tradeoffs
