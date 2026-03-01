"""
Cohort generation for churn analysis.

Cohorts let us track groups of customers acquired in the same period and
compare their retention curves — a core tool for understanding whether
product changes (or seasonal effects) actually move the needle on churn.
"""

from __future__ import annotations

import pandas as pd


def generate_cohorts(
    df: pd.DataFrame,
    customer_col: str = "customer_id",
    acquisition_date_col: str = "acquisition_date",
    freq: str = "M",
) -> pd.DataFrame:
    """Assign each customer to a monthly acquisition cohort.

    Parameters
    ----------
    df:
        Customer-level DataFrame with one row per customer.
    customer_col:
        Column with unique customer identifier.
    acquisition_date_col:
        Column with the customer's first subscription date.
    freq:
        Pandas offset alias for cohort bucketing.  Defaults to ``"M"``
        (monthly), which groups customers by the month they joined.

    Returns
    -------
    pd.DataFrame
        Input DataFrame augmented with a ``cohort`` column
        (``Period`` dtype at *freq* frequency).
    """
    df = df.copy()
    df[acquisition_date_col] = pd.to_datetime(df[acquisition_date_col])
    df["cohort"] = df[acquisition_date_col].dt.to_period(freq)
    return df


def cohort_retention_matrix(
    events: pd.DataFrame,
    customer_col: str = "customer_id",
    event_date_col: str = "event_date",
    acquisition_date_col: str = "acquisition_date",
    freq: str = "M",
) -> pd.DataFrame:
    """Build a cohort × period retention matrix (values = retention rate).

    For each acquisition cohort the matrix shows what fraction of the
    original customers were still active in each subsequent period.  This
    is the canonical input for cohort retention heatmaps.

    Parameters
    ----------
    events:
        Long-format event DataFrame (multiple rows per customer).
    customer_col, event_date_col, acquisition_date_col:
        Column name mappings.
    freq:
        Aggregation frequency for periods.

    Returns
    -------
    pd.DataFrame
        Cohort retention matrix with cohorts as index and integer period
        offsets (0, 1, 2, …) as columns.  Values are retention rates in
        [0, 1].
    """
    df = events.copy()
    df[event_date_col] = pd.to_datetime(df[event_date_col])
    df[acquisition_date_col] = pd.to_datetime(df[acquisition_date_col])

    df["cohort"] = df[acquisition_date_col].dt.to_period(freq)
    df["event_period"] = df[event_date_col].dt.to_period(freq)
    df["period_offset"] = (df["event_period"] - df["cohort"]).apply(
        lambda x: x.n if hasattr(x, "n") else 0
    )

    # Count distinct active customers per (cohort, period_offset)
    retention = (
        df[df["period_offset"] >= 0]
        .groupby(["cohort", "period_offset"])[customer_col]
        .nunique()
        .reset_index()
    )

    # Cohort sizes (period 0)
    cohort_sizes = retention[retention["period_offset"] == 0].set_index("cohort")[
        customer_col
    ]

    pivot = retention.pivot(
        index="cohort", columns="period_offset", values=customer_col
    )

    # Normalise by cohort size
    retention_matrix = pivot.div(cohort_sizes, axis=0)
    retention_matrix.columns.name = "period_offset"

    return retention_matrix


def get_cohort_risk_profile(
    features: pd.DataFrame,
    predictions: pd.DataFrame,
    cohort_col: str = "cohort",
) -> pd.DataFrame:
    """Aggregate predicted churn risk by cohort.

    Useful for explaining *which* cohorts are at highest risk and surfacing
    them to customer success teams.

    Parameters
    ----------
    features:
        Feature DataFrame with ``cohort`` column.
    predictions:
        DataFrame with ``customer_id`` and ``churn_probability`` columns.
    cohort_col:
        Column name for cohort grouping.

    Returns
    -------
    pd.DataFrame
        Cohort-level risk summary (mean, median, p90 churn probability,
        count).
    """
    combined = features.merge(predictions, on="customer_id", how="inner")
    profile = combined.groupby(cohort_col)["churn_probability"].agg(
        count="count",
        mean_churn_prob="mean",
        median_churn_prob="median",
        p90_churn_prob=lambda x: x.quantile(0.9),
    )
    profile = profile.sort_values("mean_churn_prob", ascending=False)
    return profile.reset_index()
