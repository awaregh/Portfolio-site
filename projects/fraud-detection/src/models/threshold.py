"""Threshold optimization for fraud detection models.

Optimizes classification threshold based on business cost objectives
rather than using the default 0.5 cutoff.
"""

import logging
from typing import Optional

import numpy as np
from sklearn.metrics import precision_recall_curve, roc_curve

logger = logging.getLogger(__name__)


def optimize_threshold_f1(
    y_true: np.ndarray,
    y_scores: np.ndarray,
) -> tuple[float, float]:
    """Find the threshold that maximizes F1 score.

    Args:
        y_true: True binary labels.
        y_scores: Predicted probabilities.

    Returns:
        Tuple of (optimal_threshold, best_f1_score).
    """
    precisions, recalls, thresholds = precision_recall_curve(y_true, y_scores)
    # F1 = 2 * (precision * recall) / (precision + recall)
    f1_scores = np.where(
        (precisions + recalls) > 0,
        2 * (precisions * recalls) / (precisions + recalls),
        0,
    )
    # precision_recall_curve returns n+1 precisions/recalls but n thresholds
    best_idx = np.argmax(f1_scores[:-1])
    best_threshold = thresholds[best_idx]
    best_f1 = f1_scores[best_idx]

    logger.info("Optimal F1 threshold: %.4f (F1=%.4f)", best_threshold, best_f1)
    return float(best_threshold), float(best_f1)


def optimize_threshold_cost(
    y_true: np.ndarray,
    y_scores: np.ndarray,
    cost_fp: float = 1.0,
    cost_fn: float = 10.0,
) -> tuple[float, float]:
    """Find the threshold that minimizes total business cost.

    In fraud detection, missing a fraud (FN) is typically far more expensive
    than a false alarm (FP).

    Args:
        y_true: True binary labels.
        y_scores: Predicted probabilities.
        cost_fp: Cost per false positive (false alarm).
        cost_fn: Cost per false negative (missed fraud).

    Returns:
        Tuple of (optimal_threshold, minimum_cost).
    """
    thresholds = np.linspace(0.01, 0.99, 200)
    best_cost = float("inf")
    best_threshold = 0.5

    for t in thresholds:
        preds = (y_scores >= t).astype(int)
        fp = np.sum((preds == 1) & (y_true == 0))
        fn = np.sum((preds == 0) & (y_true == 1))
        total_cost = cost_fp * fp + cost_fn * fn

        if total_cost < best_cost:
            best_cost = total_cost
            best_threshold = t

    logger.info(
        "Cost-optimal threshold: %.4f (total_cost=%.2f, cost_fp=%.1f, cost_fn=%.1f)",
        best_threshold,
        best_cost,
        cost_fp,
        cost_fn,
    )
    return float(best_threshold), float(best_cost)


def optimize_threshold_fpr(
    y_true: np.ndarray,
    y_scores: np.ndarray,
    max_fpr: float = 0.05,
) -> tuple[float, float]:
    """Find threshold that maximizes recall given a max FPR constraint.

    Args:
        y_true: True binary labels.
        y_scores: Predicted probabilities.
        max_fpr: Maximum acceptable false positive rate.

    Returns:
        Tuple of (optimal_threshold, recall_at_threshold).
    """
    fpr, tpr, thresholds = roc_curve(y_true, y_scores)

    # Find indices where FPR <= max_fpr
    valid = fpr <= max_fpr
    if not valid.any():
        logger.warning("No threshold achieves FPR <= %.4f", max_fpr)
        return 0.5, 0.0

    best_idx = np.where(valid)[0][-1]  # Highest TPR at FPR <= max_fpr
    best_threshold = thresholds[best_idx] if best_idx < len(thresholds) else 0.5
    best_tpr = tpr[best_idx]

    logger.info(
        "FPR-constrained threshold: %.4f (TPR=%.4f at FPR<=%.4f)",
        best_threshold,
        best_tpr,
        max_fpr,
    )
    return float(best_threshold), float(best_tpr)
