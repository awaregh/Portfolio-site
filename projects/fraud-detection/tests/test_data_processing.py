"""Tests for the data processing pipeline."""

import numpy as np
import pandas as pd
import pytest

from src.data_processing.ingest import generate_synthetic_data
from src.data_processing.preprocess import clean_data, scale_features
from src.data_processing.split import get_cv_folds, stratified_split, temporal_split


class TestDataIngestion:
    """Tests for data ingestion functions."""

    def test_generate_synthetic_data_shape(self):
        df = generate_synthetic_data(n_samples=1000, fraud_rate=0.02)
        assert len(df) == 1000
        assert "Class" in df.columns
        assert "Time" in df.columns
        assert "Amount" in df.columns
        for i in range(1, 29):
            assert f"V{i}" in df.columns

    def test_generate_synthetic_data_fraud_rate(self):
        df = generate_synthetic_data(n_samples=10000, fraud_rate=0.05)
        actual_rate = df["Class"].mean()
        assert abs(actual_rate - 0.05) < 0.01

    def test_generate_synthetic_data_types(self):
        df = generate_synthetic_data(n_samples=100)
        assert df["Class"].dtype in [np.int64, np.int32, int]
        assert df["Amount"].dtype == np.float64


class TestPreprocessing:
    """Tests for data preprocessing functions."""

    def test_clean_data_removes_duplicates(self):
        df = pd.DataFrame({"V1": [1, 1, 2], "Amount": [10, 10, 20], "Class": [0, 0, 1]})
        cleaned = clean_data(df)
        assert len(cleaned) == 2

    def test_clean_data_handles_missing(self):
        df = pd.DataFrame({"V1": [1, np.nan, 3], "Amount": [10, 20, 30], "Class": [0, 0, 1]})
        cleaned = clean_data(df)
        assert len(cleaned) == 2
        assert not cleaned.isna().any().any()

    def test_scale_features(self):
        df = generate_synthetic_data(n_samples=100)
        scaled_df, scaler = scale_features(df)
        assert abs(scaled_df["Amount"].median()) < 1.0
        assert scaler is not None

    def test_scale_features_transform_only(self):
        df = generate_synthetic_data(n_samples=100)
        _, scaler = scale_features(df)
        df2 = generate_synthetic_data(n_samples=50)
        scaled_df2, _ = scale_features(df2, scaler=scaler, fit=False)
        assert len(scaled_df2) == 50


class TestSplitting:
    """Tests for train/test splitting functions."""

    def test_stratified_split_preserves_ratio(self):
        df = generate_synthetic_data(n_samples=1000, fraud_rate=0.1)
        train, test = stratified_split(df, test_ratio=0.2)
        assert len(train) + len(test) == len(df)
        assert abs(train["Class"].mean() - test["Class"].mean()) < 0.02

    def test_temporal_split_ordering(self):
        df = generate_synthetic_data(n_samples=1000)
        train, test = temporal_split(df, test_ratio=0.2)
        assert train["Time"].max() <= test["Time"].min()

    def test_cv_folds(self):
        df = generate_synthetic_data(n_samples=1000)
        folds = get_cv_folds(df, n_folds=5)
        assert len(folds) == 5
        for train_idx, val_idx in folds:
            assert len(set(train_idx) & set(val_idx)) == 0
