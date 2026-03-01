"""
Uplift modeling via the T-Learner meta-learner strategy.

The T-Learner trains two separate response models — one for the treatment
group and one for the control group — then estimates the Conditional Average
Treatment Effect (CATE) as the difference in predicted probabilities.
"""

from __future__ import annotations

import logging

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


def generate_treatment_data(
    df: pd.DataFrame,
    treatment_effect: float = 0.15,
    seed: int = 42,
) -> pd.DataFrame:
    """Augment a customer DataFrame with a randomised treatment assignment.

    Simulates an A/B test where a retention intervention is randomly applied
    to ~50 % of customers and reduces their churn probability by
    ``treatment_effect``.

    Parameters
    ----------
    df:
        Customer DataFrame with a ``churned`` column.
    treatment_effect:
        Absolute reduction in churn probability for treated customers.
    seed:
        Random seed for reproducibility.

    Returns
    -------
    pd.DataFrame
        Copy of *df* with additional columns: ``treatment`` (0/1) and
        ``churned_obs`` (observed outcome after applying treatment effect).
    """
    rng = np.random.default_rng(seed)
    df = df.copy()
    df["treatment"] = rng.binomial(1, 0.5, size=len(df))

    # Re-sample observed churn with reduced probability for treated customers
    base_rate = df["churned"].to_numpy(dtype=float)
    treated_rate = np.clip(base_rate - treatment_effect * df["treatment"].to_numpy(), 0, 1)
    df["churned_obs"] = rng.binomial(1, treated_rate).astype(int)

    logger.info(
        "Treatment data generated — treatment rate: %.1f%%, "
        "control churn: %.2f%%, treated churn: %.2f%%",
        df["treatment"].mean() * 100,
        df.loc[df["treatment"] == 0, "churned_obs"].mean() * 100,
        df.loc[df["treatment"] == 1, "churned_obs"].mean() * 100,
    )
    return df


class TLearnerUplift:
    """T-Learner uplift model using two LightGBM classifiers.

    The treatment model ``μ₁(x)`` is trained on the treatment group and the
    control model ``μ₀(x)`` on the control group.  Uplift (CATE) is estimated
    as ``τ̂(x) = μ₁(x) − μ₀(x)``.
    """

    def __init__(self, random_state: int = 42) -> None:
        self.random_state = random_state
        self._treatment_model = None
        self._control_model = None

    # ------------------------------------------------------------------
    def fit(
        self,
        X_treatment: np.ndarray,
        y_treatment: np.ndarray,
        X_control: np.ndarray,
        y_control: np.ndarray,
    ) -> "TLearnerUplift":
        """Fit both the treatment and control response models.

        Parameters
        ----------
        X_treatment, y_treatment:
            Features and observed outcomes for the treatment group.
        X_control, y_control:
            Features and observed outcomes for the control group.

        Returns
        -------
        TLearnerUplift
            ``self``, to allow method chaining.
        """
        try:
            import lightgbm as lgb
        except ImportError as exc:
            raise ImportError("lightgbm is required: pip install lightgbm") from exc

        shared_params = dict(
            n_estimators=200,
            learning_rate=0.05,
            num_leaves=31,
            random_state=self.random_state,
            verbose=-1,
        )
        callbacks = [lgb.log_evaluation(period=-1)]

        self._treatment_model = lgb.LGBMClassifier(**shared_params)
        self._treatment_model.fit(X_treatment, y_treatment, callbacks=callbacks)
        logger.info("T-Learner: treatment model fitted on %d samples.", len(y_treatment))

        self._control_model = lgb.LGBMClassifier(**shared_params)
        self._control_model.fit(X_control, y_control, callbacks=callbacks)
        logger.info("T-Learner: control model fitted on %d samples.", len(y_control))

        return self

    # ------------------------------------------------------------------
    def predict_uplift(self, X: np.ndarray) -> np.ndarray:
        """Predict the individual treatment effect (uplift) for each sample.

        Parameters
        ----------
        X:
            Feature matrix, shape ``(n_samples, n_features)``.

        Returns
        -------
        np.ndarray
            1-D array of estimated uplift scores (can be negative).

        Raises
        ------
        RuntimeError
            If called before :meth:`fit`.
        """
        if self._treatment_model is None or self._control_model is None:
            raise RuntimeError("TLearnerUplift must be fitted before calling predict_uplift.")

        p_treatment = self._treatment_model.predict_proba(X)[:, 1]
        p_control = self._control_model.predict_proba(X)[:, 1]
        uplift = p_treatment - p_control
        return uplift
