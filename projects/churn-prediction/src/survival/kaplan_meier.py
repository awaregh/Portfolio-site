"""
Survival analysis for churn prediction.

Survival models complement binary classification in two ways:
  1. They answer *when* a customer will churn, not just *whether*.
  2. They handle right-censored data correctly — customers who haven't
     churned yet are still included as partial information.

Two approaches are implemented:
  - Kaplan-Meier: non-parametric survival curves, useful for cohort
    comparisons and understanding median tenure.
  - Cox Proportional Hazards: semi-parametric model that produces
    customer-level hazard ratios from features.  The hazard ratio is
    a multiplicative factor on the baseline hazard — a ratio of 2.0
    means the customer churns at twice the baseline rate.

Dependencies
------------
``lifelines`` — install with ``pip install lifelines``.
"""

from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np
import pandas as pd

try:
    from lifelines import KaplanMeierFitter, CoxPHFitter
    _HAS_LIFELINES = True
except ImportError:  # pragma: no cover
    _HAS_LIFELINES = False


# ---------------------------------------------------------------------------
# Kaplan-Meier
# ---------------------------------------------------------------------------

@dataclass
class KMResult:
    """Survival curve result from Kaplan-Meier estimation."""
    timeline: np.ndarray
    survival_probability: np.ndarray
    confidence_lower: np.ndarray
    confidence_upper: np.ndarray
    median_survival: float
    fitter: object = field(repr=False, default=None)


def fit_kaplan_meier(
    durations: pd.Series,
    events: pd.Series,
    label: str = "all",
    alpha: float = 0.05,
) -> KMResult:
    """Fit a Kaplan-Meier survival curve.

    Parameters
    ----------
    durations:
        Time from acquisition to churn (or censoring) in days.
    events:
        Binary indicator: 1 = churned, 0 = still active (censored).
    label:
        Curve label (used when plotting multiple cohorts).
    alpha:
        Significance level for confidence intervals.

    Returns
    -------
    KMResult
    """
    if not _HAS_LIFELINES:
        raise ImportError("lifelines is required: pip install lifelines")

    kmf = KaplanMeierFitter(label=label, alpha=alpha)
    kmf.fit(durations, event_observed=events)

    ci = kmf.confidence_interval_survival_function_
    return KMResult(
        timeline=kmf.timeline,
        survival_probability=kmf.survival_function_.values.flatten(),
        confidence_lower=ci.iloc[:, 0].values,
        confidence_upper=ci.iloc[:, 1].values,
        median_survival=float(kmf.median_survival_time_),
        fitter=kmf,
    )


def compare_cohort_survival(
    df: pd.DataFrame,
    duration_col: str = "tenure_days",
    event_col: str = "churned",
    cohort_col: str = "cohort",
) -> dict[str, KMResult]:
    """Fit a KM curve per cohort and return results keyed by cohort label."""
    results: dict[str, KMResult] = {}
    for cohort, group in df.groupby(cohort_col):
        results[str(cohort)] = fit_kaplan_meier(
            durations=group[duration_col],
            events=group[event_col],
            label=str(cohort),
        )
    return results


# ---------------------------------------------------------------------------
# Cox Proportional Hazards
# ---------------------------------------------------------------------------

@dataclass
class CoxResult:
    """Result from Cox PH model fitting."""
    summary: pd.DataFrame
    concordance_index: float
    fitter: object = field(repr=False, default=None)


def fit_cox_ph(
    df: pd.DataFrame,
    duration_col: str = "tenure_days",
    event_col: str = "churned",
    feature_cols: list[str] | None = None,
    penalizer: float = 0.1,
) -> CoxResult:
    """Fit a Cox Proportional Hazards model.

    Parameters
    ----------
    df:
        DataFrame containing duration, event, and feature columns.
    duration_col:
        Column with time-to-event (days).
    event_col:
        Binary event indicator (1 = churned, 0 = censored).
    feature_cols:
        Feature columns to include as covariates.  If ``None``, all
        numeric columns except *duration_col* and *event_col* are used.
    penalizer:
        L2 regularisation strength (lifelines parameter).  Helps with
        collinear features.

    Returns
    -------
    CoxResult
    """
    if not _HAS_LIFELINES:
        raise ImportError("lifelines is required: pip install lifelines")

    model_df = df.copy()
    if feature_cols is None:
        exclude = {duration_col, event_col}
        feature_cols = [
            c for c in model_df.select_dtypes(include="number").columns
            if c not in exclude
        ]

    cols = [duration_col, event_col] + feature_cols
    model_df = model_df[cols].dropna()

    cph = CoxPHFitter(penalizer=penalizer)
    cph.fit(model_df, duration_col=duration_col, event_col=event_col)

    return CoxResult(
        summary=cph.summary,
        concordance_index=cph.concordance_index_,
        fitter=cph,
    )
