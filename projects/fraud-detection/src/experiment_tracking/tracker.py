"""Experiment tracking module.

Provides lightweight experiment tracking with model versioning
and metric logging, storing results as JSON artifacts.
"""

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


class ExperimentTracker:
    """Tracks experiments, metrics, and model versions.

    Stores experiment results as structured JSON files,
    providing a lightweight alternative to MLflow for
    projects without infrastructure dependencies.
    """

    def __init__(self, experiments_dir: str | Path = "experiments"):
        """Initialize the experiment tracker.

        Args:
            experiments_dir: Directory to store experiment logs.
        """
        self.experiments_dir = Path(experiments_dir)
        self.experiments_dir.mkdir(parents=True, exist_ok=True)

    def log_experiment(
        self,
        experiment_name: str,
        metrics: dict[str, Any],
        params: dict[str, Any] | None = None,
        tags: dict[str, str] | None = None,
    ) -> str:
        """Log an experiment run with metrics and parameters.

        Args:
            experiment_name: Name of the experiment.
            metrics: Dictionary of metric values.
            params: Dictionary of hyperparameters.
            tags: Dictionary of string tags.

        Returns:
            Run ID string.
        """
        timestamp = datetime.now(timezone.utc)
        run_id = f"{experiment_name}_{timestamp.strftime('%Y%m%d_%H%M%S')}"

        experiment_log = {
            "run_id": run_id,
            "experiment_name": experiment_name,
            "timestamp": timestamp.isoformat(),
            "metrics": _serialize_metrics(metrics),
            "params": params or {},
            "tags": tags or {},
        }

        log_file = self.experiments_dir / f"{run_id}.json"
        with open(log_file, "w") as f:
            json.dump(experiment_log, f, indent=2, default=str)

        logger.info("Logged experiment: %s (run_id=%s)", experiment_name, run_id)
        return run_id

    def list_experiments(self) -> list[dict[str, Any]]:
        """List all recorded experiments.

        Returns:
            List of experiment summaries sorted by timestamp.
        """
        experiments = []
        for log_file in self.experiments_dir.glob("*.json"):
            with open(log_file, "r") as f:
                experiments.append(json.load(f))

        experiments.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        return experiments

    def get_best_run(self, metric: str = "roc_auc") -> dict[str, Any] | None:
        """Find the experiment run with the best value for a given metric.

        Args:
            metric: Metric name to optimize.

        Returns:
            Best experiment record, or None if no experiments exist.
        """
        experiments = self.list_experiments()
        if not experiments:
            return None

        best = max(
            experiments,
            key=lambda x: x.get("metrics", {}).get(metric, 0),
        )
        return best


def _serialize_metrics(metrics: dict) -> dict:
    """Recursively convert numpy types to Python natives for JSON serialization."""
    result = {}
    for k, v in metrics.items():
        if isinstance(v, dict):
            result[k] = _serialize_metrics(v)
        elif hasattr(v, "item"):
            result[k] = v.item()
        else:
            result[k] = v
    return result
