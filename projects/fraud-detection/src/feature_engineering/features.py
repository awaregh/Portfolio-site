"""Feature engineering module.

Creates temporal, frequency, and behavioral features from transaction data
to improve fraud detection model performance.
"""

import logging

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


def add_temporal_features(df: pd.DataFrame, time_col: str = "Time") -> pd.DataFrame:
    """Add time-based features derived from the transaction timestamp.

    Args:
        df: Transaction DataFrame with a Time column (seconds from first txn).

    Returns:
        DataFrame with additional temporal feature columns.
    """
    df = df.copy()

    # Hour of day (assuming Time is seconds elapsed, cycle over 24h)
    df["hour_of_day"] = (df[time_col] / 3600) % 24

    # Sine/cosine encoding of hour for cyclical representation
    df["hour_sin"] = np.sin(2 * np.pi * df["hour_of_day"] / 24)
    df["hour_cos"] = np.cos(2 * np.pi * df["hour_of_day"] / 24)

    # Time since midnight (normalized)
    max_time = df[time_col].max()
    df["time_normalized"] = df[time_col] / max_time if max_time > 0 else 0.0

    # Is nighttime transaction (between 11pm and 6am)
    df["is_night"] = ((df["hour_of_day"] >= 23) | (df["hour_of_day"] <= 6)).astype(int)

    logger.info("Added %d temporal features", 5)
    return df


def add_frequency_features(df: pd.DataFrame, amount_col: str = "Amount") -> pd.DataFrame:
    """Add frequency-based features using rolling statistics on Amount.

    Since we lack explicit user IDs in the standard dataset, we use
    amount-bucket-based aggregations as a proxy.

    Args:
        df: Transaction DataFrame.

    Returns:
        DataFrame with additional frequency feature columns.
    """
    df = df.copy()

    # Amount percentile rank
    df["amount_percentile"] = df[amount_col].rank(pct=True)

    # Log-transformed amount (handles skewness)
    df["log_amount"] = np.log1p(df[amount_col].clip(lower=0))

    # Amount z-score relative to global distribution
    mean_amount = df[amount_col].mean()
    std_amount = df[amount_col].std()
    df["amount_zscore"] = (
        (df[amount_col] - mean_amount) / std_amount if std_amount > 0 else 0
    )

    # Is high-value transaction (> 95th percentile)
    p95 = df[amount_col].quantile(0.95)
    df["is_high_value"] = (df[amount_col] > p95).astype(int)

    # Amount bucket (discretized)
    df["amount_bucket"] = pd.qcut(
        df[amount_col].rank(method="first"), q=10, labels=False
    )

    logger.info("Added %d frequency features", 5)
    return df


def add_behavioral_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add behavioral features derived from PCA component patterns.

    Captures interaction patterns between PCA features that may indicate fraud.

    Args:
        df: Transaction DataFrame with V1-V28 columns.

    Returns:
        DataFrame with additional behavioral feature columns.
    """
    df = df.copy()
    v_cols = [f"V{i}" for i in range(1, 29)]
    existing_v_cols = [c for c in v_cols if c in df.columns]

    if not existing_v_cols:
        logger.warning("No V columns found, skipping behavioral features")
        return df

    # Mean and std of PCA components per transaction
    df["v_mean"] = df[existing_v_cols].mean(axis=1)
    df["v_std"] = df[existing_v_cols].std(axis=1)

    # Max absolute deviation (indicates unusual patterns)
    df["v_max_abs"] = df[existing_v_cols].abs().max(axis=1)

    # Number of PCA components with absolute value > 2 (outlier signals)
    df["v_outlier_count"] = (df[existing_v_cols].abs() > 2).sum(axis=1)

    # Interaction features between most discriminative components
    if "V1" in df.columns and "V2" in df.columns:
        df["v1_v2_interaction"] = df["V1"] * df["V2"]
    if "V3" in df.columns and "V4" in df.columns:
        df["v3_v4_interaction"] = df["V3"] * df["V4"]

    # Skewness of PCA components per transaction
    df["v_skew"] = df[existing_v_cols].skew(axis=1)

    logger.info("Added behavioral features")
    return df


def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Run the full feature engineering pipeline.

    Args:
        df: Raw transaction DataFrame.

    Returns:
        DataFrame with all engineered features.
    """
    df = add_temporal_features(df)
    df = add_frequency_features(df)
    df = add_behavioral_features(df)

    logger.info(
        "Feature engineering complete: %d total columns",
        len(df.columns),
    )
    return df


def get_feature_columns(df: pd.DataFrame) -> list[str]:
    """Get the list of feature columns (excluding target and metadata).

    Args:
        df: DataFrame with engineered features.

    Returns:
        List of feature column names.
    """
    exclude = {"Class", "Time"}
    return [c for c in df.columns if c not in exclude]
