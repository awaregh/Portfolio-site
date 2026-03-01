"""
Time-based train / validation / test splits for churn modelling.

Uses a forward-chaining (expanding-window) strategy to prevent data leakage:
  - training data always precedes the observation window
  - features are computed at the observation date
  - labels are derived from events *after* the observation date

                 |--- train ---|--- val ---|--- test ---|
                 t0           t1          t2          t3
"""

from __future__ import annotations

from dataclasses import dataclass

import pandas as pd


@dataclass
class SplitResult:
    train: pd.DataFrame
    val: pd.DataFrame
    test: pd.DataFrame
    train_cutoff: pd.Timestamp
    val_cutoff: pd.Timestamp


def time_based_split(
    df: pd.DataFrame,
    date_col: str = "observation_date",
    val_months: int = 1,
    test_months: int = 1,
) -> SplitResult:
    """Split *df* into train / val / test using forward time ordering.

    Parameters
    ----------
    df:
        Feature DataFrame that must contain *date_col*.
    date_col:
        Column holding the observation date per row.
    val_months:
        Number of months to reserve for validation.
    test_months:
        Number of months to reserve for test.

    Returns
    -------
    SplitResult
        Named tuple of split DataFrames and the cutoff timestamps.
    """
    df = df.copy()
    df[date_col] = pd.to_datetime(df[date_col])

    max_date = df[date_col].max()
    test_cutoff = max_date - pd.DateOffset(months=test_months)
    val_cutoff = test_cutoff - pd.DateOffset(months=val_months)

    train = df[df[date_col] < val_cutoff].copy()
    val = df[(df[date_col] >= val_cutoff) & (df[date_col] < test_cutoff)].copy()
    test = df[df[date_col] >= test_cutoff].copy()

    return SplitResult(
        train=train,
        val=val,
        test=test,
        train_cutoff=pd.Timestamp(val_cutoff),
        val_cutoff=pd.Timestamp(test_cutoff),
    )


def expanding_window_splits(
    df: pd.DataFrame,
    date_col: str = "observation_date",
    n_splits: int = 5,
    gap_days: int = 0,
) -> list[tuple[pd.DataFrame, pd.DataFrame]]:
    """Generate *n_splits* expanding-window (train, val) pairs for CV.

    Each fold adds one additional month of training data.  A *gap_days*
    buffer between train and val prevents look-ahead leakage.

    Yields pairs in chronological order (earliest fold first).
    """
    df = df.copy()
    df[date_col] = pd.to_datetime(df[date_col])

    dates = df[date_col].sort_values().unique()
    fold_size = max(1, len(dates) // (n_splits + 1))

    splits: list[tuple[pd.DataFrame, pd.DataFrame]] = []
    for fold in range(1, n_splits + 1):
        train_end_idx = fold * fold_size
        if train_end_idx >= len(dates):
            break
        train_end = pd.Timestamp(dates[train_end_idx - 1])
        val_start = train_end + pd.Timedelta(days=gap_days + 1)

        val_end_idx = min((fold + 1) * fold_size, len(dates) - 1)
        val_end = pd.Timestamp(dates[val_end_idx])

        train_fold = df[df[date_col] <= train_end]
        val_fold = df[(df[date_col] >= val_start) & (df[date_col] <= val_end)]

        if len(train_fold) > 0 and len(val_fold) > 0:
            splits.append((train_fold.copy(), val_fold.copy()))

    return splits
