"""
Logistic Regression baseline for churn prediction.

A well-calibrated logistic regression serves two purposes:
  1. An interpretable production model when stakeholders need transparency.
  2. A baseline to beat — if XGBoost doesn't outperform LR by at least
     2 AUC points, the non-linearity isn't worth the operational complexity.

Design choices:
  - StandardScaler inside a Pipeline avoids train/test leakage.
  - class_weight="balanced" handles the common 5–15 % churn rate imbalance.
  - Calibration with CalibratedClassifierCV (isotonic) fixes the tendency
    of LR to under-/over-estimate probabilities after class reweighting.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler


class LogisticChurnModel:
    """Calibrated Logistic Regression churn model.

    Parameters
    ----------
    C:
        Inverse regularisation strength.  Smaller values → stronger
        regularisation.  Tune via CV.
    max_iter:
        Maximum solver iterations.
    calibrate:
        Whether to wrap with ``CalibratedClassifierCV`` (isotonic regression).
    """

    def __init__(
        self,
        C: float = 1.0,
        max_iter: int = 1000,
        calibrate: bool = True,
    ) -> None:
        self.C = C
        self.max_iter = max_iter
        self.calibrate = calibrate
        self._model: Pipeline | CalibratedClassifierCV | None = None
        self.feature_names_: list[str] = []

    def fit(
        self,
        X: pd.DataFrame,
        y: pd.Series,
        sample_weight: np.ndarray | None = None,
    ) -> "LogisticChurnModel":
        """Fit the model on training data."""
        self.feature_names_ = list(X.columns)
        base = Pipeline(
            [
                ("scaler", StandardScaler()),
                (
                    "lr",
                    LogisticRegression(
                        C=self.C,
                        max_iter=self.max_iter,
                        class_weight="balanced",
                        solver="lbfgs",
                        random_state=42,
                    ),
                ),
            ]
        )
        if self.calibrate:
            self._model = CalibratedClassifierCV(base, method="isotonic", cv=3)
        else:
            self._model = base
        fit_kwargs: dict = {}
        if sample_weight is not None:
            fit_kwargs["sample_weight"] = sample_weight
        self._model.fit(X, y, **fit_kwargs)
        return self

    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        """Return churn probability for each row (column 1 of output)."""
        assert self._model is not None, "Call fit() before predict_proba()."
        return self._model.predict_proba(X)[:, 1]

    def predict(self, X: pd.DataFrame, threshold: float = 0.5) -> np.ndarray:
        """Binary churn prediction at *threshold*."""
        return (self.predict_proba(X) >= threshold).astype(int)

    def coef_dataframe(self) -> pd.DataFrame:
        """Extract feature coefficients (works for uncalibrated model only)."""
        if self.calibrate:
            raise ValueError(
                "Coefficients are not directly accessible on a calibrated model. "
                "Set calibrate=False or use SHAP for feature importance."
            )
        pipeline = self._model
        lr = pipeline.named_steps["lr"]  # type: ignore[union-attr]
        return pd.DataFrame(
            {"feature": self.feature_names_, "coefficient": lr.coef_[0]}
        ).sort_values("coefficient", key=abs, ascending=False)
