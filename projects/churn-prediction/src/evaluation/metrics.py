"""
Evaluation metrics for churn prediction.

Includes ROC-AUC, calibration, decile lift curves, and a retention-impact
business simulation.
"""

from __future__ import annotations

import logging
from typing import Any, Dict

import numpy as np
from sklearn.calibration import calibration_curve
from sklearn.metrics import roc_auc_score

logger = logging.getLogger(__name__)


def compute_roc_auc(y_true: np.ndarray, y_prob: np.ndarray) -> float:
    """Compute the ROC-AUC score.

    Parameters
    ----------
    y_true:
        Ground-truth binary labels.
    y_prob:
        Predicted churn probabilities.

    Returns
    -------
    float
        Area under the ROC curve.
    """
    auc = float(roc_auc_score(y_true, y_prob))
    logger.info("ROC-AUC: %.4f", auc)
    return auc


def compute_calibration(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    n_bins: int = 10,
) -> Dict[str, Any]:
    """Compute calibration statistics.

    Parameters
    ----------
    y_true:
        Ground-truth binary labels.
    y_prob:
        Predicted churn probabilities.
    n_bins:
        Number of calibration bins.

    Returns
    -------
    dict
        Keys: ``fraction_of_positives`` (array), ``mean_predicted_value``
        (array), ``brier_score`` (float).
    """
    from sklearn.metrics import brier_score_loss

    fraction_of_positives, mean_predicted_value = calibration_curve(
        y_true, y_prob, n_bins=n_bins, strategy="uniform"
    )
    brier = float(brier_score_loss(y_true, y_prob))
    return {
        "fraction_of_positives": fraction_of_positives,
        "mean_predicted_value": mean_predicted_value,
        "brier_score": brier,
    }


def compute_lift_curve(
    y_true: np.ndarray,
    y_prob: np.ndarray,
    n_bins: int = 10,
) -> Dict[str, Any]:
    """Compute lift at each decile of the predicted probability.

    Parameters
    ----------
    y_true:
        Ground-truth binary labels.
    y_prob:
        Predicted churn probabilities.
    n_bins:
        Number of equal-sized bins (deciles by default).

    Returns
    -------
    dict
        Keys: ``decile`` (1-indexed array), ``lift`` (array),
        ``cumulative_lift`` (array), ``baseline_rate`` (float).
    """
    baseline_rate = float(y_true.mean())
    if baseline_rate == 0:
        raise ValueError("y_true contains no positive labels; lift is undefined.")

    # Sort by descending score
    order = np.argsort(y_prob)[::-1]
    y_sorted = y_true[order]

    n = len(y_sorted)
    bin_size = n // n_bins
    lift_values: list[float] = []
    cumulative_lift_values: list[float] = []

    for i in range(n_bins):
        start = i * bin_size
        end = (i + 1) * bin_size if i < n_bins - 1 else n
        bin_rate = float(y_sorted[start:end].mean()) if (end > start) else 0.0
        lift_values.append(bin_rate / baseline_rate)
        cum_rate = float(y_sorted[:end].mean()) if end > 0 else 0.0
        cumulative_lift_values.append(cum_rate / baseline_rate)

    return {
        "decile": np.arange(1, n_bins + 1),
        "lift": np.array(lift_values),
        "cumulative_lift": np.array(cumulative_lift_values),
        "baseline_rate": baseline_rate,
    }


def simulate_retention_impact(
    churn_probs: np.ndarray,
    intervention_cost: float = 50.0,
    clv: float = 500.0,
    conversion_rate: float = 0.3,
    targeting_threshold: float = 0.5,
) -> Dict[str, Any]:
    """Simulate the business ROI of a churn-prevention intervention.

    Customers with ``churn_prob >= targeting_threshold`` are targeted for
    intervention.  ROI is computed as::

        ROI = (saved_revenue - total_cost) / total_cost

    Parameters
    ----------
    churn_probs:
        Predicted churn probabilities for the customer base.
    intervention_cost:
        Cost per targeted customer (e.g., discount, support outreach).
    clv:
        Average customer lifetime value.
    conversion_rate:
        Fraction of targeted customers who are successfully retained.
    targeting_threshold:
        Probability threshold above which a customer is targeted.

    Returns
    -------
    dict
        Keys: ``total_at_risk``, ``customers_to_target``, ``expected_churners``,
        ``saved_customers``, ``saved_revenue``, ``total_cost``,
        ``net_benefit``, ``intervention_roi``.
    """
    total_at_risk = int((churn_probs >= targeting_threshold).sum())
    expected_churners = int(churn_probs.sum())
    customers_to_target = total_at_risk
    total_cost = customers_to_target * intervention_cost
    saved_customers = int(customers_to_target * conversion_rate)
    saved_revenue = saved_customers * clv
    net_benefit = saved_revenue - total_cost
    roi = (net_benefit / total_cost) if total_cost > 0 else 0.0

    result = {
        "total_at_risk": total_at_risk,
        "expected_churners": expected_churners,
        "customers_to_target": customers_to_target,
        "saved_customers": saved_customers,
        "saved_revenue": round(saved_revenue, 2),
        "total_cost": round(total_cost, 2),
        "net_benefit": round(net_benefit, 2),
        "intervention_roi": round(roi, 4),
    }
    logger.info("Retention simulation: ROI=%.2f, saved=%d customers.", roi, saved_customers)
    return result
