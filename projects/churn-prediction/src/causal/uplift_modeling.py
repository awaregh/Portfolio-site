"""
Uplift modelling for targeted retention campaigns.

Uplift (a.k.a. "incremental response") modelling answers a different
question than standard churn prediction: given a finite retention budget,
*which* customers will actually be saved by an intervention?

The Four Quadrants:
  - Sure Things: would have stayed regardless → waste of budget
  - Lost Causes: will churn regardless → waste of budget
  - Do Not Disturbs: would have stayed, but intervention makes them churn
  - Persuadables: will churn without intervention, stay with it → target

Implementation: Two-Model approach (T-learner)
  - Model C (control): trained on customers who received no retention action
  - Model T (treatment): trained on customers who received a retention action
  - Uplift = P(retain | treatment) - P(retain | control)
    Positive uplift → Persuadables; negative uplift → Do Not Disturbs

A more sophisticated S-learner or causal forest approach is described in
docs/ but the two-model approach is production-ready and interpretable.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, clone


class TwoModelUplift:
    """Two-model (T-learner) uplift model.

    Parameters
    ----------
    base_estimator:
        Any sklearn-compatible classifier with ``predict_proba``.
        Must support ``fit(X, y)``.
    """

    def __init__(self, base_estimator: BaseEstimator) -> None:
        self.base_estimator = base_estimator
        self._model_control: BaseEstimator | None = None
        self._model_treatment: BaseEstimator | None = None

    def fit(
        self,
        X: pd.DataFrame,
        y: pd.Series,
        treatment: pd.Series,
    ) -> "TwoModelUplift":
        """Fit control and treatment models separately.

        Parameters
        ----------
        X:
            Feature matrix.
        y:
            Binary outcome: 1 = retained, 0 = churned.
        treatment:
            Binary indicator: 1 = received retention intervention,
            0 = control group.
        """
        control_mask = treatment == 0
        treatment_mask = treatment == 1

        self._model_control = clone(self.base_estimator)
        self._model_control.fit(X[control_mask], y[control_mask])

        self._model_treatment = clone(self.base_estimator)
        self._model_treatment.fit(X[treatment_mask], y[treatment_mask])

        return self

    def predict_uplift(self, X: pd.DataFrame) -> np.ndarray:
        """Compute uplift score for each customer.

        Returns
        -------
        np.ndarray
            Uplift scores in [-1, 1].  Positive = persuadable;
            negative = do-not-disturb.
        """
        assert (
            self._model_control is not None and self._model_treatment is not None
        ), "Call fit() first."

        p_retain_control = self._model_control.predict_proba(X)[:, 1]
        p_retain_treatment = self._model_treatment.predict_proba(X)[:, 1]
        return p_retain_treatment - p_retain_control

    def rank_by_uplift(self, X: pd.DataFrame) -> pd.DataFrame:
        """Return a DataFrame with customer index and uplift score, sorted
        descending.  Feed the top N to the retention campaign.
        """
        uplift = self.predict_uplift(X)
        result = pd.DataFrame({"uplift": uplift}, index=X.index)
        return result.sort_values("uplift", ascending=False)

    def qini_curve(
        self, X: pd.DataFrame, y: pd.Series, treatment: pd.Series
    ) -> pd.DataFrame:
        """Compute the Qini curve for model evaluation.

        The Qini coefficient (area between the Qini curve and the random
        baseline) measures incremental lift — analogous to AUC for standard
        classification.

        Returns
        -------
        pd.DataFrame
            Columns: ``fraction_treated``, ``incremental_conversions``.
        """
        df = pd.DataFrame(
            {
                "uplift": self.predict_uplift(X),
                "y": y.values,
                "treatment": treatment.values,
            }
        )
        df = df.sort_values("uplift", ascending=False).reset_index(drop=True)
        n = len(df)

        cumulative_incremental = []
        for k in range(1, n + 1):
            top_k = df.iloc[:k]
            n_t = (top_k["treatment"] == 1).sum()
            n_c = (top_k["treatment"] == 0).sum()
            conversions_t = top_k.loc[top_k["treatment"] == 1, "y"].sum()
            conversions_c = top_k.loc[top_k["treatment"] == 0, "y"].sum()
            if n_t > 0 and n_c > 0:
                incremental = conversions_t / n_t - conversions_c / n_c
            else:
                incremental = 0.0
            cumulative_incremental.append(incremental * n_t)

        return pd.DataFrame(
            {
                "fraction_treated": np.arange(1, n + 1) / n,
                "incremental_conversions": cumulative_incremental,
            }
        )
