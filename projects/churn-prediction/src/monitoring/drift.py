"""
Model and feature drift monitoring.

Implements Population Stability Index (PSI) and Kolmogorov-Smirnov (KS)
statistics to detect distribution shift between reference and current data.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List

import numpy as np
import pandas as pd
from scipy import stats

logger = logging.getLogger(__name__)

_PSI_LOW = 0.1
_PSI_HIGH = 0.25


def compute_psi(
    expected: np.ndarray,
    actual: np.ndarray,
    bins: int = 10,
) -> float:
    """Compute the Population Stability Index (PSI) between two distributions.

    PSI < 0.10  → no significant shift
    PSI < 0.25  → minor shift (monitor)
    PSI >= 0.25 → major shift (action required)

    Parameters
    ----------
    expected:
        Reference distribution (e.g., training data scores).
    actual:
        Current / production distribution.
    bins:
        Number of equal-width bins.

    Returns
    -------
    float
        PSI value.
    """
    expected = np.asarray(expected, dtype=float)
    actual = np.asarray(actual, dtype=float)

    min_val = min(expected.min(), actual.min())
    max_val = max(expected.max(), actual.max())
    bin_edges = np.linspace(min_val, max_val, bins + 1)

    # Clip to handle exact boundary values
    expected_counts, _ = np.histogram(expected, bins=bin_edges)
    actual_counts, _ = np.histogram(actual, bins=bin_edges)

    # Avoid division by zero / log(0) with small epsilon
    eps = 1e-6
    expected_pct = (expected_counts + eps) / (len(expected) + eps * bins)
    actual_pct = (actual_counts + eps) / (len(actual) + eps * bins)

    psi = float(np.sum((actual_pct - expected_pct) * np.log(actual_pct / expected_pct)))
    logger.debug("PSI: %.4f", psi)
    return round(psi, 6)


def compute_ks_statistic(
    reference: np.ndarray,
    current: np.ndarray,
) -> Dict[str, float]:
    """Compute the two-sample Kolmogorov-Smirnov statistic.

    Parameters
    ----------
    reference:
        Reference distribution array.
    current:
        Current distribution array.

    Returns
    -------
    dict
        Keys: ``ks_statistic`` (float), ``p_value`` (float).
    """
    result = stats.ks_2samp(reference, current)
    return {"ks_statistic": round(float(result.statistic), 6), "p_value": round(float(result.pvalue), 6)}


def monitor_prediction_drift(
    reference_probs: np.ndarray,
    current_probs: np.ndarray,
    threshold: float = 0.1,
) -> Dict[str, Any]:
    """Monitor drift in model prediction scores.

    Parameters
    ----------
    reference_probs:
        Churn probabilities from the reference window (e.g., last month).
    current_probs:
        Churn probabilities from the current window.
    threshold:
        PSI threshold above which drift is flagged.

    Returns
    -------
    dict
        Keys: ``psi``, ``ks_stat``, ``p_value``, ``drift_detected``,
        ``reference_mean``, ``current_mean``.
    """
    psi = compute_psi(reference_probs, current_probs)
    ks_result = compute_ks_statistic(reference_probs, current_probs)
    drift_detected = psi > threshold

    result = {
        "psi": psi,
        "ks_stat": ks_result["ks_statistic"],
        "p_value": ks_result["p_value"],
        "drift_detected": drift_detected,
        "reference_mean": round(float(np.mean(reference_probs)), 4),
        "current_mean": round(float(np.mean(current_probs)), 4),
    }
    if drift_detected:
        logger.warning(
            "Prediction drift detected! PSI=%.4f (threshold=%.2f)", psi, threshold
        )
    else:
        logger.info("No prediction drift detected. PSI=%.4f", psi)
    return result


def monitor_feature_drift(
    reference_df: pd.DataFrame,
    current_df: pd.DataFrame,
    features: List[str],
    psi_threshold: float = 0.1,
    ks_alpha: float = 0.05,
) -> Dict[str, Dict[str, Any]]:
    """Monitor drift across individual features.

    Parameters
    ----------
    reference_df:
        Reference window DataFrame.
    current_df:
        Current window DataFrame.
    features:
        List of numeric column names to monitor.
    psi_threshold:
        PSI threshold for flagging drift.
    ks_alpha:
        Significance level for KS test p-value.

    Returns
    -------
    dict
        Mapping of feature name → dict with ``psi``, ``ks_statistic``,
        ``p_value``, ``drift_detected``.
    """
    missing_ref = [f for f in features if f not in reference_df.columns]
    missing_cur = [f for f in features if f not in current_df.columns]
    if missing_ref or missing_cur:
        raise KeyError(
            f"Features not found — reference missing: {missing_ref}, current missing: {missing_cur}"
        )

    drift_report: Dict[str, Dict[str, Any]] = {}
    for feature in features:
        ref_vals = reference_df[feature].dropna().to_numpy(dtype=float)
        cur_vals = current_df[feature].dropna().to_numpy(dtype=float)

        psi = compute_psi(ref_vals, cur_vals)
        ks = compute_ks_statistic(ref_vals, cur_vals)
        drift_detected = (psi > psi_threshold) or (ks["p_value"] < ks_alpha)

        drift_report[feature] = {
            "psi": psi,
            "ks_statistic": ks["ks_statistic"],
            "p_value": ks["p_value"],
            "drift_detected": drift_detected,
        }
        if drift_detected:
            logger.warning(
                "Feature drift detected for '%s': PSI=%.4f, KS p=%.4f",
                feature, psi, ks["p_value"],
            )

    return drift_report
