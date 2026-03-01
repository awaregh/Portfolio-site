"""
Gradient Boosting churn model (LightGBM).

LightGBM consistently outperforms logistic regression on tabular churn
data for two reasons:
  1. It handles non-linear feature interactions (e.g., high support tickets
     only matter at low engagement, not at high engagement).
  2. It is robust to feature scale and doesn't need explicit interaction
     terms.

Design choices:
  - ``scale_pos_weight`` mirrors ``class_weight="balanced"`` in sklearn,
    reweighting minority class (churners) automatically.
  - Early stopping on a validation set prevents overfitting without
    exhaustive hyperparameter search.
  - SHAP values are computed natively via LightGBM's ``predict`` API,
    making this model directly explainable in production.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

try:
    import lightgbm as lgb
    _HAS_LGB = True
except ImportError:  # pragma: no cover
    _HAS_LGB = False


class GBMChurnModel:
    """LightGBM gradient boosting churn model with early stopping.

    Parameters
    ----------
    n_estimators:
        Maximum number of boosting rounds.
    learning_rate:
        Step size shrinkage.
    num_leaves:
        Maximum tree leaves — primary complexity control in LightGBM.
    early_stopping_rounds:
        Stop training if validation AUC hasn't improved for this many
        rounds.
    """

    def __init__(
        self,
        n_estimators: int = 500,
        learning_rate: float = 0.05,
        num_leaves: int = 31,
        early_stopping_rounds: int = 50,
    ) -> None:
        if not _HAS_LGB:
            raise ImportError("lightgbm is required: pip install lightgbm")
        self.n_estimators = n_estimators
        self.learning_rate = learning_rate
        self.num_leaves = num_leaves
        self.early_stopping_rounds = early_stopping_rounds
        self._model: lgb.Booster | None = None
        self.feature_names_: list[str] = []
        self.best_iteration_: int = 0

    def fit(
        self,
        X_train: pd.DataFrame,
        y_train: pd.Series,
        X_val: pd.DataFrame | None = None,
        y_val: pd.Series | None = None,
    ) -> "GBMChurnModel":
        """Train the LightGBM model with optional early stopping."""
        self.feature_names_ = list(X_train.columns)

        pos = int(y_train.sum())
        neg = len(y_train) - pos
        scale_pos_weight = neg / max(pos, 1)

        params = {
            "objective": "binary",
            "metric": "auc",
            "learning_rate": self.learning_rate,
            "num_leaves": self.num_leaves,
            "scale_pos_weight": scale_pos_weight,
            "verbosity": -1,
            "seed": 42,
        }

        dtrain = lgb.Dataset(X_train, label=y_train, feature_name=self.feature_names_)

        callbacks = [lgb.log_evaluation(period=-1)]
        valid_sets = [dtrain]
        valid_names = ["train"]

        if X_val is not None and y_val is not None:
            dval = lgb.Dataset(X_val, label=y_val, reference=dtrain)
            valid_sets = [dtrain, dval]
            valid_names = ["train", "val"]
            callbacks.append(
                lgb.early_stopping(
                    stopping_rounds=self.early_stopping_rounds,
                    verbose=False,
                )
            )

        self._model = lgb.train(
            params,
            dtrain,
            num_boost_round=self.n_estimators,
            valid_sets=valid_sets,
            valid_names=valid_names,
            callbacks=callbacks,
        )
        self.best_iteration_ = self._model.best_iteration or self.n_estimators
        return self

    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        """Return churn probability for each row."""
        assert self._model is not None, "Call fit() first."
        return self._model.predict(
            X, num_iteration=self.best_iteration_
        )  # type: ignore[return-value]

    def predict(self, X: pd.DataFrame, threshold: float = 0.5) -> np.ndarray:
        """Binary churn prediction at *threshold*."""
        return (self.predict_proba(X) >= threshold).astype(int)

    def feature_importance(self, importance_type: str = "gain") -> pd.DataFrame:
        """Return feature importance sorted by *importance_type*."""
        assert self._model is not None, "Call fit() first."
        importance = self._model.feature_importance(importance_type=importance_type)
        return (
            pd.DataFrame(
                {"feature": self.feature_names_, "importance": importance}
            )
            .sort_values("importance", ascending=False)
            .reset_index(drop=True)
        )

    def shap_values(self, X: pd.DataFrame) -> np.ndarray:
        """Compute SHAP values for explainability.

        Returns a matrix of shape (n_samples, n_features).  Values are in
        log-odds space — positive means the feature pushes toward churn.
        """
        assert self._model is not None, "Call fit() first."
        return self._model.predict(
            X,
            num_iteration=self.best_iteration_,
            pred_contrib=True,
        )[:, :-1]  # drop the bias term (last column)
