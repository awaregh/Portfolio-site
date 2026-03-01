"""Train/test split module.

Handles stratified splitting with temporal awareness for time-series fraud data.
"""

import logging
from typing import Optional

import numpy as np
import pandas as pd
from sklearn.model_selection import StratifiedKFold, train_test_split

logger = logging.getLogger(__name__)


def temporal_split(
    df: pd.DataFrame,
    test_ratio: float = 0.2,
    time_col: str = "Time",
    target_col: str = "Class",
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Split data chronologically — train on earlier transactions, test on later.

    This simulates production conditions where the model sees future transactions.

    Args:
        df: Transaction DataFrame sorted by time.
        test_ratio: Fraction of data to use for testing.
        time_col: Name of the time column.
        target_col: Name of the target column.

    Returns:
        Tuple of (train_df, test_df).
    """
    df = df.sort_values(time_col).reset_index(drop=True)
    split_idx = int(len(df) * (1 - test_ratio))

    train_df = df.iloc[:split_idx].reset_index(drop=True)
    test_df = df.iloc[split_idx:].reset_index(drop=True)

    train_fraud_rate = train_df[target_col].mean()
    test_fraud_rate = test_df[target_col].mean()

    logger.info(
        "Temporal split: train=%d (%.4f%% fraud), test=%d (%.4f%% fraud)",
        len(train_df),
        train_fraud_rate * 100,
        len(test_df),
        test_fraud_rate * 100,
    )
    return train_df, test_df


def stratified_split(
    df: pd.DataFrame,
    test_ratio: float = 0.2,
    target_col: str = "Class",
    random_state: int = 42,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Split data with stratification to preserve class distribution.

    Args:
        df: Transaction DataFrame.
        test_ratio: Fraction of data to use for testing.
        target_col: Name of the target column.
        random_state: Random seed for reproducibility.

    Returns:
        Tuple of (train_df, test_df).
    """
    train_df, test_df = train_test_split(
        df,
        test_size=test_ratio,
        stratify=df[target_col],
        random_state=random_state,
    )
    train_df = train_df.reset_index(drop=True)
    test_df = test_df.reset_index(drop=True)

    logger.info(
        "Stratified split: train=%d (%.4f%% fraud), test=%d (%.4f%% fraud)",
        len(train_df),
        train_df[target_col].mean() * 100,
        len(test_df),
        test_df[target_col].mean() * 100,
    )
    return train_df, test_df


def get_cv_folds(
    df: pd.DataFrame,
    n_folds: int = 5,
    target_col: str = "Class",
    random_state: int = 42,
) -> list[tuple[np.ndarray, np.ndarray]]:
    """Generate stratified cross-validation fold indices.

    Args:
        df: Transaction DataFrame.
        n_folds: Number of folds.
        target_col: Name of the target column.
        random_state: Random seed.

    Returns:
        List of (train_indices, val_indices) tuples.
    """
    skf = StratifiedKFold(n_splits=n_folds, shuffle=True, random_state=random_state)
    folds = list(skf.split(df, df[target_col]))
    logger.info("Generated %d stratified CV folds", n_folds)
    return folds
