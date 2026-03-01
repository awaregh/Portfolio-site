"""
Survival analysis using the Cox Proportional Hazards model (lifelines).

Models *time-to-churn* rather than a binary outcome, enabling per-customer
survival curves and median churn-free tenure predictions.
"""

from __future__ import annotations

import logging
from typing import Tuple

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

# Features used for the Cox model (must be numeric / already encoded)
_COX_FEATURES = [
    "tenure_months",
    "monthly_spend",
    "support_tickets",
    "login_frequency",
    "feature_adoption_score",
    "is_annual",
]

_DURATION_COL = "tenure_months"
_EVENT_COL = "churned"


def prepare_survival_data(df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray]:
    """Extract duration and event arrays for survival analysis.

    Parameters
    ----------
    df:
        Customer DataFrame produced by the preprocessing pipeline.

    Returns
    -------
    Tuple[np.ndarray, np.ndarray]
        ``(durations, events)`` where *durations* are tenure in months and
        *events* are the binary churn indicator.
    """
    durations = df[_DURATION_COL].to_numpy(dtype=float)
    events = df[_EVENT_COL].to_numpy(dtype=int)
    return durations, events


def train_cox_model(df: pd.DataFrame):
    """Train a Cox Proportional Hazards model on customer data.

    Parameters
    ----------
    df:
        Customer DataFrame that contains the ``_COX_FEATURES`` columns,
        plus ``tenure_months`` (duration) and ``churned`` (event flag).

    Returns
    -------
    lifelines.CoxPHFitter
        Fitted Cox model.

    Raises
    ------
    ImportError
        If ``lifelines`` is not installed.
    """
    try:
        from lifelines import CoxPHFitter
    except ImportError as exc:
        raise ImportError("lifelines is required: pip install lifelines") from exc

    required_cols = _COX_FEATURES + [_DURATION_COL, _EVENT_COL]
    missing = [c for c in required_cols if c not in df.columns]
    if missing:
        raise KeyError(f"Missing columns for Cox model: {missing}")

    # Ensure 'is_annual' exists (may not if add_engineered_features was skipped)
    cox_df = df[required_cols].copy()
    if "is_annual" not in cox_df.columns and "contract_type" in df.columns:
        cox_df["is_annual"] = (df["contract_type"] == "annual").astype(int)

    # Clip durations to avoid zero-length intervals
    cox_df[_DURATION_COL] = cox_df[_DURATION_COL].clip(lower=0.5)

    cph = CoxPHFitter(penalizer=0.1)
    cph.fit(
        cox_df,
        duration_col=_DURATION_COL,
        event_col=_EVENT_COL,
        show_progress=False,
    )

    logger.info(
        "CoxPHFitter trained — concordance index: %.4f",
        cph.concordance_index_,
    )
    return cph


def predict_survival_at_t(model, df: pd.DataFrame, t: int = 12) -> np.ndarray:
    """Return per-customer probability of *not* churning by month *t*.

    Parameters
    ----------
    model:
        A fitted :class:`~lifelines.CoxPHFitter` instance.
    df:
        Customer DataFrame with the same feature columns used at fit time.
    t:
        Horizon in months.

    Returns
    -------
    np.ndarray
        1-D array of survival probabilities in ``[0, 1]``.
    """
    cox_df = df[_COX_FEATURES].copy()
    if "is_annual" not in cox_df.columns and "contract_type" in df.columns:
        cox_df["is_annual"] = (df["contract_type"] == "annual").astype(int)

    survival_functions = model.predict_survival_function(cox_df)
    # survival_functions columns = customer index, rows = time points
    # Find row closest to requested horizon t
    times = survival_functions.index.to_numpy()
    idx = np.argmin(np.abs(times - t))
    survival_probs = survival_functions.iloc[idx].to_numpy()
    return survival_probs
