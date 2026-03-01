"""
Calibration analysis for churn probabilities.

A churn model's probability estimates drive decisions downstream:
  - "Contact everyone above 40 % churn probability"
  - "Expected MRR at risk = sum(p_churn × MRR)"

Both use-cases require *calibrated* probabilities — if the model outputs
0.3 for a group of customers, approximately 30 % of them should actually
churn.

We assess calibration with:
  1. Calibration curve (reliability diagram) — binned actual vs. predicted
  2. Expected Calibration Error (ECE) — weighted mean |actual - predicted|
  3. Maximum Calibration Error (MCE) — worst bin
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd


@dataclass
class CalibrationSummary:
    """Calibration statistics for a binary classifier."""
    ece: float
    mce: float
    bin_stats: pd.DataFrame

    def __str__(self) -> str:
        return (
            f"ECE:  {self.ece:.4f}\n"
            f"MCE:  {self.mce:.4f}"
        )


def calibration_summary(
    y_true: np.ndarray | pd.Series,
    y_prob: np.ndarray,
    n_bins: int = 10,
) -> CalibrationSummary:
    """Compute calibration statistics.

    Parameters
    ----------
    y_true:
        Ground-truth binary labels.
    y_prob:
        Predicted churn probabilities in [0, 1].
    n_bins:
        Number of equal-width probability bins.

    Returns
    -------
    CalibrationSummary
    """
    y_true = np.asarray(y_true)
    y_prob = np.asarray(y_prob)

    bin_edges = np.linspace(0, 1, n_bins + 1)
    rows = []
    for lo, hi in zip(bin_edges[:-1], bin_edges[1:]):
        mask = (y_prob >= lo) & (y_prob < hi)
        if lo == bin_edges[-2]:
            mask = (y_prob >= lo) & (y_prob <= hi)
        n = int(mask.sum())
        if n == 0:
            continue
        mean_predicted = float(y_prob[mask].mean())
        mean_actual = float(y_true[mask].mean())
        rows.append(
            {
                "bin_lower": round(lo, 2),
                "bin_upper": round(hi, 2),
                "mean_predicted": round(mean_predicted, 4),
                "mean_actual": round(mean_actual, 4),
                "count": n,
                "abs_error": round(abs(mean_predicted - mean_actual), 4),
            }
        )

    bin_df = pd.DataFrame(rows)
    total = bin_df["count"].sum()
    ece = float((bin_df["abs_error"] * bin_df["count"] / total).sum())
    mce = float(bin_df["abs_error"].max()) if len(bin_df) > 0 else 0.0

    return CalibrationSummary(ece=ece, mce=mce, bin_stats=bin_df)
