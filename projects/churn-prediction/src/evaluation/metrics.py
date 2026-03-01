"""
Classifier evaluation metrics for churn prediction.

Beyond AUC: why churn models need additional metrics
------------------------------------------------------
ROC-AUC measures ranking quality but is insensitive to calibration.
A model that assigns 90 % probability to every customer looks great on
AUC but is useless for prioritising outreach (everyone gets contacted).

Precision-Recall AUC is more informative for imbalanced churn datasets
where the positive (churn) class is rare.

Brier Score and log-loss penalise miscalibrated probabilities, which
matter when probabilities drive business decisions (expected MRR at risk).
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import pandas as pd
from sklearn.metrics import (
    average_precision_score,
    brier_score_loss,
    log_loss,
    roc_auc_score,
)


@dataclass
class EvaluationResult:
    roc_auc: float
    pr_auc: float
    brier_score: float
    log_loss: float
    threshold_metrics: pd.DataFrame

    def __str__(self) -> str:
        return (
            f"ROC-AUC:     {self.roc_auc:.4f}\n"
            f"PR-AUC:      {self.pr_auc:.4f}\n"
            f"Brier score: {self.brier_score:.4f}\n"
            f"Log-loss:    {self.log_loss:.4f}"
        )


def evaluate_classifier(
    y_true: np.ndarray | pd.Series,
    y_prob: np.ndarray,
    thresholds: list[float] | None = None,
) -> EvaluationResult:
    """Compute a comprehensive set of evaluation metrics.

    Parameters
    ----------
    y_true:
        Ground-truth binary labels (0 = retained, 1 = churned).
    y_prob:
        Model-predicted churn probabilities.
    thresholds:
        Decision thresholds at which to compute precision, recall, F1.
        Defaults to ``[0.3, 0.4, 0.5, 0.6]``.

    Returns
    -------
    EvaluationResult
    """
    if thresholds is None:
        thresholds = [0.3, 0.4, 0.5, 0.6]

    y_true = np.asarray(y_true)
    y_prob = np.asarray(y_prob)

    roc_auc = float(roc_auc_score(y_true, y_prob))
    pr_auc = float(average_precision_score(y_true, y_prob))
    brier = float(brier_score_loss(y_true, y_prob))
    ll = float(log_loss(y_true, y_prob))

    rows = []
    for t in thresholds:
        y_pred = (y_prob >= t).astype(int)
        tp = int(((y_pred == 1) & (y_true == 1)).sum())
        fp = int(((y_pred == 1) & (y_true == 0)).sum())
        fn = int(((y_pred == 0) & (y_true == 1)).sum())
        tn = int(((y_pred == 0) & (y_true == 0)).sum())
        precision = tp / max(tp + fp, 1)
        recall = tp / max(tp + fn, 1)
        f1 = 2 * precision * recall / max(precision + recall, 1e-9)
        rows.append(
            {
                "threshold": t,
                "precision": round(precision, 4),
                "recall": round(recall, 4),
                "f1": round(f1, 4),
                "tp": tp,
                "fp": fp,
                "fn": fn,
                "tn": tn,
            }
        )

    return EvaluationResult(
        roc_auc=roc_auc,
        pr_auc=pr_auc,
        brier_score=brier,
        log_loss=ll,
        threshold_metrics=pd.DataFrame(rows),
    )
