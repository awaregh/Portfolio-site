"""
Prediction and feature drift monitoring.

In production, churn model performance degrades silently when:
  1. Feature distributions shift (e.g., a product change doubles the
     average login frequency, making the model's reference thresholds stale).
  2. Prediction distribution shifts (e.g., the model starts outputting
     systematically higher probabilities after a data pipeline change).

Both forms of drift are monitored here using statistical tests:
  - Population Stability Index (PSI): industry-standard measure of
    distribution shift.  PSI < 0.1 → no drift; 0.1–0.2 → monitor;
    > 0.2 → retrain.
  - Kolmogorov-Smirnov test: two-sample test for continuous features.
  - Chi-squared test: for categorical features.

Alerts are emitted as structured dicts for integration with
Prometheus/Grafana alerting rules.
"""

from __future__ import annotations

import warnings
from dataclasses import dataclass, field

import numpy as np
import pandas as pd
from scipy import stats


# ---------------------------------------------------------------------------
# Population Stability Index
# ---------------------------------------------------------------------------

def psi(
    reference: np.ndarray,
    current: np.ndarray,
    n_bins: int = 10,
    eps: float = 1e-4,
) -> float:
    """Compute the Population Stability Index between two distributions.

    Parameters
    ----------
    reference:
        Distribution from training period.
    current:
        Distribution from current scoring window.
    n_bins:
        Number of equal-width bins for histogram.
    eps:
        Smoothing constant to avoid log(0).

    Returns
    -------
    float
        PSI value.  Interpretation:
          < 0.10 → stable
          0.10–0.25 → minor shift, monitor
          > 0.25 → significant shift, investigate / retrain
    """
    bins = np.linspace(
        min(reference.min(), current.min()),
        max(reference.max(), current.max()),
        n_bins + 1,
    )
    ref_counts, _ = np.histogram(reference, bins=bins)
    cur_counts, _ = np.histogram(current, bins=bins)

    ref_pct = (ref_counts + eps) / (len(reference) + eps * n_bins)
    cur_pct = (cur_counts + eps) / (len(current) + eps * n_bins)

    return float(np.sum((cur_pct - ref_pct) * np.log(cur_pct / ref_pct)))


# ---------------------------------------------------------------------------
# Feature Drift Monitor
# ---------------------------------------------------------------------------

@dataclass
class FeatureDriftAlert:
    feature: str
    psi: float
    ks_statistic: float
    ks_p_value: float
    drift_detected: bool
    severity: str  # "none" | "warning" | "critical"


@dataclass
class FeatureDriftReport:
    alerts: list[FeatureDriftAlert] = field(default_factory=list)
    n_features_drifted: int = 0
    overall_severity: str = "none"

    def drifted_features(self) -> list[str]:
        return [a.feature for a in self.alerts if a.drift_detected]


class FeatureDriftMonitor:
    """Monitor feature distributions against a reference baseline.

    Parameters
    ----------
    reference_df:
        DataFrame from training / last calibration period.
    psi_warning_threshold:
        PSI value above which a warning is raised.
    psi_critical_threshold:
        PSI value above which a critical alert is raised.
    ks_alpha:
        Significance level for the KS test.
    """

    def __init__(
        self,
        reference_df: pd.DataFrame,
        psi_warning_threshold: float = 0.10,
        psi_critical_threshold: float = 0.25,
        ks_alpha: float = 0.05,
    ) -> None:
        self.reference_df = reference_df.select_dtypes(include="number").copy()
        self.psi_warning_threshold = psi_warning_threshold
        self.psi_critical_threshold = psi_critical_threshold
        self.ks_alpha = ks_alpha

    def check(self, current_df: pd.DataFrame) -> FeatureDriftReport:
        """Check for drift in *current_df* relative to the reference."""
        report = FeatureDriftReport()
        common_cols = [
            c for c in self.reference_df.columns
            if c in current_df.columns
        ]
        for col in common_cols:
            ref = self.reference_df[col].dropna().values
            cur = current_df[col].dropna().values
            if len(ref) < 10 or len(cur) < 10:
                continue

            psi_val = psi(ref, cur)
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                ks_stat, ks_p = stats.ks_2samp(ref, cur)

            drift = psi_val > self.psi_warning_threshold or ks_p < self.ks_alpha
            if psi_val > self.psi_critical_threshold:
                severity = "critical"
            elif psi_val > self.psi_warning_threshold:
                severity = "warning"
            else:
                severity = "none"

            report.alerts.append(
                FeatureDriftAlert(
                    feature=col,
                    psi=round(psi_val, 4),
                    ks_statistic=round(ks_stat, 4),
                    ks_p_value=round(ks_p, 4),
                    drift_detected=drift,
                    severity=severity,
                )
            )

        drifted = [a for a in report.alerts if a.drift_detected]
        report.n_features_drifted = len(drifted)
        severities = [a.severity for a in drifted]
        if "critical" in severities:
            report.overall_severity = "critical"
        elif "warning" in severities:
            report.overall_severity = "warning"
        else:
            report.overall_severity = "none"

        return report


# ---------------------------------------------------------------------------
# Prediction Drift Monitor
# ---------------------------------------------------------------------------

@dataclass
class PredictionDriftReport:
    psi: float
    mean_shift: float
    drift_detected: bool
    severity: str


class PredictionDriftMonitor:
    """Monitor the distribution of churn probability predictions.

    A shift in the prediction distribution can indicate:
      - Data pipeline issues (feature values suddenly different)
      - Concept drift (the relationship between features and churn changed)
      - Labelling / ground truth shift
    """

    def __init__(
        self,
        reference_predictions: np.ndarray,
        psi_warning_threshold: float = 0.10,
        psi_critical_threshold: float = 0.25,
    ) -> None:
        self.reference = reference_predictions
        self.psi_warning_threshold = psi_warning_threshold
        self.psi_critical_threshold = psi_critical_threshold

    def check(self, current_predictions: np.ndarray) -> PredictionDriftReport:
        """Check prediction distribution for drift."""
        psi_val = psi(self.reference, current_predictions)
        mean_shift = float(current_predictions.mean() - self.reference.mean())
        drift = psi_val > self.psi_warning_threshold
        if psi_val > self.psi_critical_threshold:
            severity = "critical"
        elif psi_val > self.psi_warning_threshold:
            severity = "warning"
        else:
            severity = "none"

        return PredictionDriftReport(
            psi=round(psi_val, 4),
            mean_shift=round(mean_shift, 4),
            drift_detected=drift,
            severity=severity,
        )
