"""Drift detection module for monitoring model health in production.

Detects prediction distribution drift and feature drift using
statistical tests to signal when model retraining may be needed.
"""

import logging
from typing import Any

import numpy as np
from scipy import stats

logger = logging.getLogger(__name__)


class DriftDetector:
    """Monitors prediction and feature distributions for drift.

    Uses the Kolmogorov-Smirnov test and Population Stability Index (PSI)
    to detect when production data has drifted from training data.
    """

    def __init__(
        self,
        reference_predictions: np.ndarray | None = None,
        reference_features: np.ndarray | None = None,
        feature_names: list[str] | None = None,
        psi_threshold: float = 0.2,
        ks_alpha: float = 0.05,
    ):
        """Initialize drift detector with reference distributions.

        Args:
            reference_predictions: Prediction scores from training/validation set.
            reference_features: Feature matrix from training/validation set.
            feature_names: Names of feature columns.
            psi_threshold: PSI threshold for drift alert (>0.2 = significant drift).
            ks_alpha: Significance level for KS test.
        """
        self.reference_predictions = reference_predictions
        self.reference_features = reference_features
        self.feature_names = feature_names or []
        self.psi_threshold = psi_threshold
        self.ks_alpha = ks_alpha

    def compute_psi(
        self,
        reference: np.ndarray,
        current: np.ndarray,
        n_bins: int = 10,
    ) -> float:
        """Compute Population Stability Index between two distributions.

        PSI < 0.1: No significant drift
        PSI 0.1-0.2: Moderate drift
        PSI > 0.2: Significant drift

        Args:
            reference: Reference distribution samples.
            current: Current distribution samples.
            n_bins: Number of bins for histogram comparison.

        Returns:
            PSI value.
        """
        eps = 1e-6
        breakpoints = np.linspace(
            min(reference.min(), current.min()),
            max(reference.max(), current.max()),
            n_bins + 1,
        )

        ref_counts = np.histogram(reference, bins=breakpoints)[0] + eps
        cur_counts = np.histogram(current, bins=breakpoints)[0] + eps

        ref_pct = ref_counts / ref_counts.sum()
        cur_pct = cur_counts / cur_counts.sum()

        psi = np.sum((cur_pct - ref_pct) * np.log(cur_pct / ref_pct))
        return float(psi)

    def check_prediction_drift(
        self,
        current_predictions: np.ndarray,
    ) -> dict[str, Any]:
        """Check for drift in prediction score distribution.

        Args:
            current_predictions: Recent prediction scores from production.

        Returns:
            Dictionary with drift detection results.
        """
        if self.reference_predictions is None:
            return {"error": "No reference predictions set"}

        psi = self.compute_psi(self.reference_predictions, current_predictions)
        ks_stat, ks_pvalue = stats.ks_2samp(
            self.reference_predictions, current_predictions
        )

        drift_detected = psi > self.psi_threshold or ks_pvalue < self.ks_alpha

        result = {
            "psi": round(psi, 6),
            "psi_threshold": self.psi_threshold,
            "ks_statistic": round(ks_stat, 6),
            "ks_pvalue": round(ks_pvalue, 6),
            "drift_detected": drift_detected,
            "reference_mean": round(float(self.reference_predictions.mean()), 6),
            "current_mean": round(float(current_predictions.mean()), 6),
            "reference_std": round(float(self.reference_predictions.std()), 6),
            "current_std": round(float(current_predictions.std()), 6),
        }

        if drift_detected:
            logger.warning("Prediction drift detected: PSI=%.4f, KS p=%.6f", psi, ks_pvalue)
        else:
            logger.info("No prediction drift: PSI=%.4f, KS p=%.6f", psi, ks_pvalue)

        return result

    def check_feature_drift(
        self,
        current_features: np.ndarray,
        top_k: int = 10,
    ) -> dict[str, Any]:
        """Check for drift in feature distributions.

        Args:
            current_features: Recent feature matrix from production.
            top_k: Number of most-drifted features to report.

        Returns:
            Dictionary with per-feature drift results.
        """
        if self.reference_features is None:
            return {"error": "No reference features set"}

        n_features = min(
            self.reference_features.shape[1],
            current_features.shape[1],
        )
        feature_results = []

        for i in range(n_features):
            ref_col = self.reference_features[:, i]
            cur_col = current_features[:, i]

            psi = self.compute_psi(ref_col, cur_col)
            ks_stat, ks_pvalue = stats.ks_2samp(ref_col, cur_col)

            name = self.feature_names[i] if i < len(self.feature_names) else f"feature_{i}"
            feature_results.append(
                {
                    "feature": name,
                    "psi": round(psi, 6),
                    "ks_statistic": round(ks_stat, 6),
                    "ks_pvalue": round(ks_pvalue, 6),
                    "drift_detected": psi > self.psi_threshold or ks_pvalue < self.ks_alpha,
                }
            )

        # Sort by PSI descending
        feature_results.sort(key=lambda x: x["psi"], reverse=True)
        drifted_features = [f for f in feature_results if f["drift_detected"]]

        result = {
            "total_features": n_features,
            "drifted_features_count": len(drifted_features),
            "top_drifted": feature_results[:top_k],
            # Flag overall drift if >30% of features drifted (configurable threshold)
            "overall_drift": len(drifted_features) > n_features * 0.3,
        }

        if drifted_features:
            logger.warning(
                "Feature drift detected in %d/%d features",
                len(drifted_features),
                n_features,
            )
        else:
            logger.info("No feature drift detected")

        return result
