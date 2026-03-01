"""Model performance tracking module.

Tracks prediction quality metrics over time to detect model degradation.
"""

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

import numpy as np

logger = logging.getLogger(__name__)


class PerformanceTracker:
    """Tracks model performance metrics over time.

    Records predictions and ground truth labels as they become available,
    computing rolling metrics to detect performance degradation.
    """

    def __init__(self, log_dir: str | Path = "monitoring_logs"):
        """Initialize performance tracker.

        Args:
            log_dir: Directory to store performance logs.
        """
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(parents=True, exist_ok=True)
        self.predictions: list[dict[str, Any]] = []
        self.ground_truth: dict[str, int] = {}

    def log_prediction(
        self,
        transaction_id: str,
        fraud_probability: float,
        is_fraud: bool,
        model_version: str,
    ) -> None:
        """Log a single prediction for tracking.

        Args:
            transaction_id: Unique transaction identifier.
            fraud_probability: Model's fraud probability score.
            is_fraud: Binary fraud prediction.
            model_version: Model version used.
        """
        self.predictions.append(
            {
                "transaction_id": transaction_id,
                "fraud_probability": fraud_probability,
                "is_fraud": is_fraud,
                "model_version": model_version,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
        )

    def record_ground_truth(self, transaction_id: str, actual_fraud: bool) -> None:
        """Record ground truth label when it becomes available.

        Args:
            transaction_id: Unique transaction identifier.
            actual_fraud: Whether the transaction was actually fraudulent.
        """
        self.ground_truth[transaction_id] = int(actual_fraud)

    def compute_rolling_metrics(self, window_size: int = 1000) -> dict[str, Any]:
        """Compute metrics over the most recent predictions with known ground truth.

        Args:
            window_size: Number of recent predictions to include.

        Returns:
            Dictionary with rolling performance metrics.
        """
        # Match predictions with ground truth
        matched = []
        for pred in self.predictions[-window_size:]:
            tid = pred["transaction_id"]
            if tid in self.ground_truth:
                matched.append(
                    {
                        "probability": pred["fraud_probability"],
                        "predicted": int(pred["is_fraud"]),
                        "actual": self.ground_truth[tid],
                    }
                )

        if len(matched) < 10:
            return {"status": "insufficient_data", "matched_count": len(matched)}

        actuals = np.array([m["actual"] for m in matched])
        predicted = np.array([m["predicted"] for m in matched])
        probabilities = np.array([m["probability"] for m in matched])

        tp = np.sum((predicted == 1) & (actuals == 1))
        fp = np.sum((predicted == 1) & (actuals == 0))
        tn = np.sum((predicted == 0) & (actuals == 0))
        fn = np.sum((predicted == 0) & (actuals == 1))

        precision = tp / (tp + fp) if (tp + fp) > 0 else 0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0

        return {
            "status": "ok",
            "matched_count": len(matched),
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1_score": round(f1, 4),
            "fraud_rate_actual": round(float(actuals.mean()), 6),
            "fraud_rate_predicted": round(float(predicted.mean()), 6),
            "mean_probability": round(float(probabilities.mean()), 6),
            "confusion_matrix": {
                "tp": int(tp),
                "fp": int(fp),
                "tn": int(tn),
                "fn": int(fn),
            },
        }

    def save_log(self) -> None:
        """Persist prediction log to disk."""
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        log_file = self.log_dir / f"predictions_{timestamp}.json"
        with open(log_file, "w") as f:
            json.dump(self.predictions, f, indent=2)
        logger.info("Saved %d predictions to %s", len(self.predictions), log_file)
