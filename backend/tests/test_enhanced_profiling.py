"""
Tests for Enhanced Profiling Utilities
"""

import sys
import os
import pytest
import pandas as pd
import numpy as np

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.agents.enhanced_profiling import data_typing, outlier_detection, quality_scoring


class TestDataTyping:
    
    def test_infer_numeric(self):
        """Test numeric type inference."""
        series = pd.Series([1, 2, 3, 4, 5])
        result = data_typing.infer_data_type(series)
        assert result['type'] == 'numeric'
        assert result['subtype'] == 'integer'
        assert result['confidence'] == 1.0
        
        series_float = pd.Series([1.1, 2.2, 3.3])
        result = data_typing.infer_data_type(series_float)
        assert result['type'] == 'numeric'
        assert result['subtype'] == 'float'
    
    def test_infer_datetime(self):
        """Test datetime type inference."""
        series = pd.Series(['2023-01-01', '2023-01-02', '2023-01-03'])
        result = data_typing.infer_data_type(series)
        assert result['type'] == 'datetime'
        assert result['confidence'] > 0.9
        assert 'min_date' in result['metadata']
    
    def test_infer_categorical(self):
        """Test categorical type inference."""
        # Low cardinality
        series = pd.Series(['A', 'B', 'A', 'C', 'B'] * 20)
        result = data_typing.infer_data_type(series)
        assert result['type'] == 'categorical'
    
    def test_infer_boolean(self):
        """Test boolean type inference."""
        series = pd.Series([True, False, True])
        result = data_typing.infer_data_type(series)
        assert result['type'] == 'boolean'
        
        series_str = pd.Series(['yes', 'no', 'yes'])
        result = data_typing.infer_data_type(series_str)
        assert result['type'] == 'boolean'


class TestOutlierDetection:
    
    def test_detect_outliers(self):
        """Test outlier detection."""
        # Create data with obvious outliers
        data = [10, 11, 10, 12, 10, 11, 1000, 10, 11]
        series = pd.Series(data)
        
        result = outlier_detection.detect_outliers(series)
        
        assert result['outlier_count'] == 1
        assert result['outliers'][0][1] == 1000
        assert result['severity'] in ['medium', 'high']
    
    def test_no_outliers(self):
        """Test data with no outliers."""
        series = pd.Series(np.random.normal(0, 1, 100))
        result = outlier_detection.detect_outliers(series)
        
        # Should have few or no outliers for normal distribution
        # Z-score > 3 is rare
        assert result['outlier_count'] < 5


class TestQualityScoring:
    
    def test_perfect_quality(self):
        """Test scoring for perfect data."""
        df = pd.DataFrame({
            'A': [1, 2, 3, 4, 5],
            'B': [1.1, 2.2, 3.3, 4.4, 5.5],
            'C': ['a', 'b', 'c', 'd', 'e']
        })
        
        scores = quality_scoring.calculate_quality_score(df)
        assert scores['overall'] > 95.0
        assert scores['completeness'] == 100.0
    
    def test_poor_quality(self):
        """Test scoring for poor quality data (missing values)."""
        df = pd.DataFrame({
            'A': [1, None, None, 4, 5],
            'B': [None, None, 3, None, 5]
        })
        
        scores = quality_scoring.calculate_quality_score(df)
        assert scores['completeness'] < 60.0
        assert scores['overall'] < 90.0
