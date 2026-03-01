"""Data ingestion module.

Handles loading transaction data from CSV, Parquet, or database sources.
Supports the standard credit card fraud detection dataset format
(anonymized PCA features V1-V28 + Time + Amount + Class).
"""

import logging
from pathlib import Path
from typing import Optional

import pandas as pd

logger = logging.getLogger(__name__)


def load_csv(filepath: str | Path, sample_frac: Optional[float] = None) -> pd.DataFrame:
    """Load transaction data from CSV file.

    Args:
        filepath: Path to the CSV file.
        sample_frac: Optional fraction of data to sample (for development).

    Returns:
        DataFrame with transaction records.
    """
    filepath = Path(filepath)
    if not filepath.exists():
        raise FileNotFoundError(f"Data file not found: {filepath}")

    logger.info("Loading data from %s", filepath)
    df = pd.read_csv(filepath)

    if sample_frac is not None and 0 < sample_frac < 1:
        df = df.sample(frac=sample_frac, random_state=42).reset_index(drop=True)
        logger.info("Sampled %.1f%% of data: %d rows", sample_frac * 100, len(df))

    logger.info(
        "Loaded %d transactions (%d fraudulent, %.4f%% fraud rate)",
        len(df),
        df["Class"].sum() if "Class" in df.columns else 0,
        (df["Class"].mean() * 100) if "Class" in df.columns else 0,
    )
    return df


def load_parquet(filepath: str | Path) -> pd.DataFrame:
    """Load transaction data from Parquet file.

    Args:
        filepath: Path to the Parquet file.

    Returns:
        DataFrame with transaction records.
    """
    filepath = Path(filepath)
    if not filepath.exists():
        raise FileNotFoundError(f"Data file not found: {filepath}")

    logger.info("Loading data from %s", filepath)
    df = pd.read_parquet(filepath)
    logger.info("Loaded %d transactions", len(df))
    return df


def generate_synthetic_data(n_samples: int = 100000, fraud_rate: float = 0.017) -> pd.DataFrame:
    """Generate synthetic transaction data for development and testing.

    Produces data matching the schema of the standard credit card fraud dataset:
    Time, V1-V28 (PCA components), Amount, Class.

    Args:
        n_samples: Number of transactions to generate.
        fraud_rate: Fraction of fraudulent transactions.

    Returns:
        DataFrame with synthetic transaction records.
    """
    import numpy as np

    rng = np.random.RandomState(42)
    n_fraud = int(n_samples * fraud_rate)
    n_legit = n_samples - n_fraud

    # Legitimate transactions
    legit_features = rng.randn(n_legit, 28)
    legit_time = np.sort(rng.uniform(0, 172800, n_legit))
    legit_amount = np.abs(rng.lognormal(3.0, 1.5, n_legit))
    legit_labels = np.zeros(n_legit, dtype=int)

    # Fraudulent transactions — shifted distribution
    fraud_features = rng.randn(n_fraud, 28) * 1.5 + rng.choice([-2, 2], size=(n_fraud, 28))
    fraud_time = rng.uniform(0, 172800, n_fraud)
    fraud_amount = np.abs(rng.lognormal(4.5, 2.0, n_fraud))
    fraud_labels = np.ones(n_fraud, dtype=int)

    features = np.vstack([legit_features, fraud_features])
    time_col = np.concatenate([legit_time, fraud_time])
    amount_col = np.concatenate([legit_amount, fraud_amount])
    labels = np.concatenate([legit_labels, fraud_labels])

    columns = ["Time"] + [f"V{i}" for i in range(1, 29)] + ["Amount", "Class"]
    data = np.column_stack([time_col, features, amount_col, labels])
    df = pd.DataFrame(data, columns=columns)
    df["Class"] = df["Class"].astype(int)

    # Shuffle
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)

    logger.info(
        "Generated %d synthetic transactions (%.2f%% fraud)",
        len(df),
        fraud_rate * 100,
    )
    return df
