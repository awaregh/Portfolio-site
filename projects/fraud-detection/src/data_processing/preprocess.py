"""Data preprocessing module.

Handles cleaning, scaling, and preparing transaction data for model training.
"""

import logging
from typing import Optional

import numpy as np
import pandas as pd
from sklearn.preprocessing import RobustScaler

logger = logging.getLogger(__name__)


def clean_data(df: pd.DataFrame) -> pd.DataFrame:
    """Clean transaction data by handling missing values and outliers.

    Args:
        df: Raw transaction DataFrame.

    Returns:
        Cleaned DataFrame.
    """
    initial_len = len(df)

    # Drop exact duplicates
    df = df.drop_duplicates().reset_index(drop=True)
    dropped = initial_len - len(df)
    if dropped > 0:
        logger.info("Dropped %d duplicate rows", dropped)

    # Handle missing values — drop rows with any NaN in feature columns
    feature_cols = [c for c in df.columns if c != "Class"]
    before = len(df)
    df = df.dropna(subset=feature_cols).reset_index(drop=True)
    dropped_na = before - len(df)
    if dropped_na > 0:
        logger.info("Dropped %d rows with missing values", dropped_na)

    # Ensure Class is integer
    if "Class" in df.columns:
        df["Class"] = df["Class"].astype(int)

    logger.info("Clean data: %d rows, %d columns", len(df), len(df.columns))
    return df


def scale_features(
    df: pd.DataFrame,
    scaler: Optional[RobustScaler] = None,
    fit: bool = True,
) -> tuple[pd.DataFrame, RobustScaler]:
    """Scale Amount and Time features using RobustScaler.

    PCA features (V1-V28) are already scaled. Only Time and Amount need scaling.

    Args:
        df: Transaction DataFrame.
        scaler: Optional pre-fitted scaler (for inference).
        fit: Whether to fit the scaler (True for training, False for inference).

    Returns:
        Tuple of (scaled DataFrame, fitted scaler).
    """
    df = df.copy()
    cols_to_scale = [c for c in ["Time", "Amount"] if c in df.columns]

    if not cols_to_scale:
        logger.warning("No columns to scale (Time/Amount not found)")
        return df, scaler or RobustScaler()

    if scaler is None:
        scaler = RobustScaler()

    if fit:
        df[cols_to_scale] = scaler.fit_transform(df[cols_to_scale])
        logger.info("Fitted and transformed columns: %s", cols_to_scale)
    else:
        df[cols_to_scale] = scaler.transform(df[cols_to_scale])
        logger.info("Transformed columns with pre-fitted scaler: %s", cols_to_scale)

    return df, scaler
