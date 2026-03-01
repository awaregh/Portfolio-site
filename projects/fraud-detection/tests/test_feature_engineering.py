"""Tests for the feature engineering module."""

import numpy as np
import pandas as pd
import pytest

from src.data_processing.ingest import generate_synthetic_data
from src.feature_engineering.features import (
    add_behavioral_features,
    add_frequency_features,
    add_temporal_features,
    engineer_features,
    get_feature_columns,
)


class TestTemporalFeatures:
    """Tests for temporal feature engineering."""

    def test_adds_expected_columns(self):
        df = generate_synthetic_data(n_samples=100)
        result = add_temporal_features(df)
        assert "hour_of_day" in result.columns
        assert "hour_sin" in result.columns
        assert "hour_cos" in result.columns
        assert "is_night" in result.columns

    def test_cyclical_encoding_range(self):
        df = generate_synthetic_data(n_samples=100)
        result = add_temporal_features(df)
        assert result["hour_sin"].between(-1, 1).all()
        assert result["hour_cos"].between(-1, 1).all()

    def test_is_night_binary(self):
        df = generate_synthetic_data(n_samples=100)
        result = add_temporal_features(df)
        assert set(result["is_night"].unique()).issubset({0, 1})


class TestFrequencyFeatures:
    """Tests for frequency-based features."""

    def test_adds_expected_columns(self):
        df = generate_synthetic_data(n_samples=100)
        result = add_frequency_features(df)
        assert "log_amount" in result.columns
        assert "amount_percentile" in result.columns
        assert "is_high_value" in result.columns

    def test_log_amount_non_negative(self):
        df = generate_synthetic_data(n_samples=100)
        result = add_frequency_features(df)
        assert (result["log_amount"] >= 0).all()


class TestBehavioralFeatures:
    """Tests for behavioral features."""

    def test_adds_expected_columns(self):
        df = generate_synthetic_data(n_samples=100)
        result = add_behavioral_features(df)
        assert "v_mean" in result.columns
        assert "v_std" in result.columns
        assert "v_max_abs" in result.columns
        assert "v_outlier_count" in result.columns

    def test_handles_missing_v_columns(self):
        df = pd.DataFrame({"Amount": [10, 20], "Class": [0, 1]})
        result = add_behavioral_features(df)
        assert "v_mean" not in result.columns


class TestFullPipeline:
    """Tests for the complete feature engineering pipeline."""

    def test_engineer_features_increases_columns(self):
        df = generate_synthetic_data(n_samples=100)
        original_cols = len(df.columns)
        result = engineer_features(df)
        assert len(result.columns) > original_cols

    def test_get_feature_columns_excludes_target(self):
        df = generate_synthetic_data(n_samples=100)
        df = engineer_features(df)
        feature_cols = get_feature_columns(df)
        assert "Class" not in feature_cols
        assert "Time" not in feature_cols

    def test_no_nan_in_features(self):
        df = generate_synthetic_data(n_samples=100)
        result = engineer_features(df)
        feature_cols = get_feature_columns(result)
        assert not result[feature_cols].isna().any().any()
