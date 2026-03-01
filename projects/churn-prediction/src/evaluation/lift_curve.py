"""
Lift curve computation for churn prediction.

A lift curve answers: "If I contact the top X% of customers ranked by
churn probability, what fraction of actual churners do I capture?"

This is the primary metric used by customer success teams to size campaigns:
  - "At 20% coverage we capture 55% of churners" → contact 200 of 1000 customers
  - vs. random targeting at 20% coverage → capture only 20% of churners
  - Lift = 55% / 20% = 2.75×

The cumulative gains curve is used by finance for expected revenue saved:
  - Sort customers by churn probability descending
  - For each decile, compute sum(MRR × churn_probability)
  - Expected MRR saved = sum over targeted customers × (1 - post-intervention churn rate)
"""

from __future__ import annotations

import numpy as np
import pandas as pd


def compute_lift_curve(
    y_true: np.ndarray | pd.Series,
    y_prob: np.ndarray,
    n_bins: int = 10,
) -> pd.DataFrame:
    """Compute a lift curve (decile-level).

    Parameters
    ----------
    y_true:
        Ground-truth binary churn labels.
    y_prob:
        Predicted churn probabilities (higher = more likely to churn).
    n_bins:
        Number of equal-population bins (deciles by default).

    Returns
    -------
    pd.DataFrame
        Columns: ``percentile``, ``lift``, ``cumulative_recall``,
        ``precision``, ``n_positives``.
    """
    y_true = np.asarray(y_true)
    y_prob = np.asarray(y_prob)

    order = np.argsort(y_prob)[::-1]
    y_sorted = y_true[order]

    n = len(y_sorted)
    total_positives = y_true.sum()
    baseline_rate = total_positives / n

    bin_size = n // n_bins
    rows = []
    for i in range(n_bins):
        start = i * bin_size
        end = start + bin_size if i < n_bins - 1 else n
        bin_slice = y_sorted[start:end]
        cum_slice = y_sorted[:end]

        precision = float(bin_slice.mean()) if len(bin_slice) > 0 else 0.0
        lift = precision / baseline_rate if baseline_rate > 0 else 0.0
        cumulative_recall = float(cum_slice.sum() / max(total_positives, 1))

        rows.append(
            {
                "percentile": round((i + 1) / n_bins, 2),
                "lift": round(lift, 4),
                "cumulative_recall": round(cumulative_recall, 4),
                "precision": round(precision, 4),
                "n_positives": int(bin_slice.sum()),
            }
        )

    return pd.DataFrame(rows)


def compute_cumulative_gains(
    y_true: np.ndarray | pd.Series,
    y_prob: np.ndarray,
) -> pd.DataFrame:
    """Cumulative gains curve — fraction of positives captured vs. fraction
    of population contacted (sorted by predicted probability).
    """
    y_true = np.asarray(y_true)
    y_prob = np.asarray(y_prob)

    order = np.argsort(y_prob)[::-1]
    y_sorted = y_true[order]
    total_positives = y_true.sum()

    cumulative_positives = np.cumsum(y_sorted)
    fraction_population = np.arange(1, len(y_sorted) + 1) / len(y_sorted)
    fraction_positives = cumulative_positives / max(total_positives, 1)

    return pd.DataFrame(
        {
            "fraction_population": fraction_population,
            "fraction_positives_captured": fraction_positives,
        }
    )
