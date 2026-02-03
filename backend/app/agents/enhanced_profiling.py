"""
Enhanced Data Profiling Utilities
Provides improved data type detection, outlier detection, and quality scoring.
"""

import pandas as pd
import numpy as np
from typing import Dict, Any, List, Tuple, Optional
from datetime import datetime
import re


class EnhancedDataTyping:
    """Enhanced data type detection with smart inference."""
    
    @staticmethod
    def infer_data_type(series: pd.Series) -> Dict[str, Any]:
        """
        Infer detailed data type with confidence and metadata.
        
        Args:
            series: Pandas Series to analyze
            
        Returns:
            Dictionary with type, confidence, and metadata
        """
        result = {
            'type': 'unknown',
            'subtype': None,
            'confidence': 0.0,
            'metadata': {}
        }
        
        # Remove null values for analysis
        non_null = series.dropna()
        if len(non_null) == 0:
            result['type'] = 'null'
            result['confidence'] = 1.0
            return result
        
        # Check for boolean
        if EnhancedDataTyping._is_boolean(non_null):
            result['type'] = 'boolean'
            result['confidence'] = 1.0
            result['metadata']['unique_values'] = non_null.unique().tolist()
            return result
        
        # Check for datetime
        datetime_result = EnhancedDataTyping._is_datetime(non_null)
        if datetime_result['is_datetime']:
            result['type'] = 'datetime'
            result['subtype'] = datetime_result['format']
            result['confidence'] = datetime_result['confidence']
            result['metadata'] = datetime_result['metadata']
            return result
        
        # Check for numeric
        if pd.api.types.is_numeric_dtype(series):
            if pd.api.types.is_integer_dtype(series):
                result['type'] = 'numeric'
                result['subtype'] = 'integer'
                result['confidence'] = 1.0
            else:
                result['type'] = 'numeric'
                result['subtype'] = 'float'
                result['confidence'] = 1.0
            
            result['metadata'] = {
                'min': float(non_null.min()),
                'max': float(non_null.max()),
                'mean': float(non_null.mean()),
                'median': float(non_null.median())
            }
            return result
        
        # Check for categorical
        categorical_result = EnhancedDataTyping._is_categorical(non_null)
        if categorical_result['is_categorical']:
            result['type'] = 'categorical'
            result['confidence'] = categorical_result['confidence']
            result['metadata'] = categorical_result['metadata']
            return result
        
        # Default to text
        result['type'] = 'text'
        result['subtype'] = 'long' if non_null.str.len().mean() > 50 else 'short'
        result['confidence'] = 0.8
        result['metadata'] = {
            'avg_length': float(non_null.str.len().mean()),
            'max_length': int(non_null.str.len().max())
        }
        
        return result
    
    @staticmethod
    def _is_boolean(series: pd.Series) -> bool:
        """Check if series is boolean."""
        unique_values = series.unique()
        if len(unique_values) > 2:
            return False
        
        # Check for common boolean representations
        bool_values = {
            True, False, 'true', 'false', 'yes', 'no', 'y', 'n',
            '1', '0', 1, 0, 't', 'f', 'True', 'False', 'Yes', 'No'
        }
        
        return all(val in bool_values for val in unique_values)
    
    @staticmethod
    def _is_datetime(series: pd.Series) -> Dict[str, Any]:
        """Check if series contains datetime values."""
        result = {
            'is_datetime': False,
            'format': None,
            'confidence': 0.0,
            'metadata': {}
        }
        
        # Try common datetime formats
        formats = [
            '%Y-%m-%d',
            '%Y/%m/%d',
            '%d-%m-%Y',
            '%d/%m/%Y',
            '%Y-%m-%d %H:%M:%S',
            '%Y/%m/%d %H:%M:%S',
            '%d-%m-%Y %H:%M:%S',
            '%m/%d/%Y',
            '%Y%m%d'
        ]
        
        sample = series.head(100)
        for fmt in formats:
            try:
                parsed = pd.to_datetime(sample, format=fmt, errors='coerce')
                success_rate = parsed.notna().sum() / len(sample)
                
                if success_rate >= 0.9:
                    result['is_datetime'] = True
                    result['format'] = fmt
                    result['confidence'] = success_rate
                    
                    # Get date range
                    all_parsed = pd.to_datetime(series, format=fmt, errors='coerce')
                    valid_dates = all_parsed.dropna()
                    if len(valid_dates) > 0:
                        result['metadata'] = {
                            'min_date': str(valid_dates.min()),
                            'max_date': str(valid_dates.max()),
                            'range_days': (valid_dates.max() - valid_dates.min()).days
                        }
                    return result
            except:
                continue
        
        return result
    
    @staticmethod
    def _is_categorical(series: pd.Series) -> Dict[str, Any]:
        """Check if series should be treated as categorical."""
        result = {
            'is_categorical': False,
            'confidence': 0.0,
            'metadata': {}
        }
        
        unique_count = series.nunique()
        total_count = len(series)
        
        # Calculate cardinality ratio
        cardinality_ratio = unique_count / total_count
        
        # Categorical if:
        # 1. Less than 10% unique values
        # 2. Or less than 50 unique values (for small datasets)
        # 3. Or all values are strings with low cardinality
        
        if cardinality_ratio < 0.1 or unique_count < 50:
            result['is_categorical'] = True
            result['confidence'] = 1.0 - cardinality_ratio
            result['metadata'] = {
                'unique_count': unique_count,
                'cardinality_ratio': cardinality_ratio,
                'top_values': series.value_counts().head(10).to_dict()
            }
        
        return result


class EnhancedOutlierDetection:
    """Enhanced outlier detection with multiple methods."""
    
    @staticmethod
    def detect_outliers(series: pd.Series, methods: List[str] = None) -> Dict[str, Any]:
        """
        Detect outliers using multiple methods and combine results.
        
        Args:
            series: Pandas Series to analyze
            methods: List of methods to use ['iqr', 'zscore', 'isolation_forest']
            
        Returns:
            Dictionary with outlier information
        """
        if methods is None:
            methods = ['iqr', 'zscore']
        
        result = {
            'outliers': [],
            'outlier_count': 0,
            'outlier_percentage': 0.0,
            'methods_used': methods,
            'severity': 'none'
        }
        
        # Remove null values
        non_null = series.dropna()
        if len(non_null) == 0:
            return result
        
        # Only detect outliers for numeric data
        if not pd.api.types.is_numeric_dtype(series):
            return result
        
        outlier_masks = []
        
        # IQR method
        if 'iqr' in methods:
            iqr_outliers = EnhancedOutlierDetection._iqr_method(non_null)
            outlier_masks.append(iqr_outliers)
        
        # Z-score method
        if 'zscore' in methods:
            zscore_outliers = EnhancedOutlierDetection._zscore_method(non_null)
            outlier_masks.append(zscore_outliers)
        
        # Combine results (voting: outlier if detected by majority of methods)
        if outlier_masks:
            combined_mask = sum(outlier_masks) >= (len(outlier_masks) / 2)
            outlier_indices = non_null[combined_mask].index.tolist()
            outlier_values = non_null[combined_mask].tolist()
            
            result['outliers'] = list(zip(outlier_indices, outlier_values))
            result['outlier_count'] = len(outlier_indices)
            result['outlier_percentage'] = (len(outlier_indices) / len(non_null)) * 100
            
            # Determine severity
            if result['outlier_percentage'] > 10:
                result['severity'] = 'high'
            elif result['outlier_percentage'] > 5:
                result['severity'] = 'medium'
            elif result['outlier_percentage'] > 0:
                result['severity'] = 'low'
        
        return result
    
    @staticmethod
    def _iqr_method(series: pd.Series, factor: float = 1.5) -> pd.Series:
        """IQR-based outlier detection."""
        Q1 = series.quantile(0.25)
        Q3 = series.quantile(0.75)
        IQR = Q3 - Q1
        
        lower_bound = Q1 - factor * IQR
        upper_bound = Q3 + factor * IQR
        
        return (series < lower_bound) | (series > upper_bound)
    
    @staticmethod
    def _zscore_method(series: pd.Series, threshold: float = 3.0) -> pd.Series:
        """Z-score based outlier detection."""
        mean = series.mean()
        std = series.std()
        
        if std == 0:
            return pd.Series([False] * len(series), index=series.index)
        
        z_scores = np.abs((series - mean) / std)
        return z_scores > threshold


class EnhancedQualityScoring:
    """Enhanced data quality scoring with multiple factors."""
    
    @staticmethod
    def calculate_quality_score(df: pd.DataFrame) -> Dict[str, Any]:
        """
        Calculate comprehensive data quality score.
        
        Args:
            df: DataFrame to analyze
            
        Returns:
            Dictionary with quality score and breakdown
        """
        scores = {
            'overall': 0.0,
            'completeness': 0.0,
            'consistency': 0.0,
            'accuracy': 0.0,
            'uniqueness': 0.0,
            'breakdown': {}
        }
        
        # Completeness (40% weight)
        completeness = EnhancedQualityScoring._calculate_completeness(df)
        scores['completeness'] = completeness
        
        # Consistency (20% weight)
        consistency = EnhancedQualityScoring._calculate_consistency(df)
        scores['consistency'] = consistency
        
        # Accuracy (20% weight)
        accuracy = EnhancedQualityScoring._calculate_accuracy(df)
        scores['accuracy'] = accuracy
        
        # Uniqueness (20% weight)
        uniqueness = EnhancedQualityScoring._calculate_uniqueness(df)
        scores['uniqueness'] = uniqueness
        
        # Calculate overall score
        scores['overall'] = (
            completeness * 0.4 +
            consistency * 0.2 +
            accuracy * 0.2 +
            uniqueness * 0.2
        )
        
        return scores
    
    @staticmethod
    def _calculate_completeness(df: pd.DataFrame) -> float:
        """Calculate completeness score (0-100)."""
        total_cells = df.shape[0] * df.shape[1]
        if total_cells == 0:
            return 100.0
        
        non_null_cells = df.count().sum()
        return (non_null_cells / total_cells) * 100
    
    @staticmethod
    def _calculate_consistency(df: pd.DataFrame) -> float:
        """Calculate consistency score (0-100)."""
        # Check data type consistency
        consistency_scores = []
        
        for col in df.columns:
            # Check if column has consistent data type
            non_null = df[col].dropna()
            if len(non_null) == 0:
                continue
            
            # For numeric columns, check if all values are valid numbers
            if pd.api.types.is_numeric_dtype(df[col]):
                consistency_scores.append(100.0)
            else:
                # For text columns, check format consistency
                if len(non_null) > 0:
                    # Simple heuristic: check if most values have similar length
                    lengths = non_null.astype(str).str.len()
                    cv = lengths.std() / lengths.mean() if lengths.mean() > 0 else 0
                    # Lower coefficient of variation = higher consistency
                    score = max(0, 100 - (cv * 50))
                    consistency_scores.append(score)
        
        return np.mean(consistency_scores) if consistency_scores else 100.0
    
    @staticmethod
    def _calculate_accuracy(df: pd.DataFrame) -> float:
        """Calculate accuracy score (0-100)."""
        # Heuristic: check for outliers and anomalies
        accuracy_scores = []
        
        for col in df.columns:
            if pd.api.types.is_numeric_dtype(df[col]):
                # Check outlier percentage
                outliers = EnhancedOutlierDetection.detect_outliers(df[col])
                outlier_pct = outliers['outlier_percentage']
                # Lower outlier percentage = higher accuracy
                score = max(0, 100 - (outlier_pct * 2))
                accuracy_scores.append(score)
        
        return np.mean(accuracy_scores) if accuracy_scores else 100.0
    
    @staticmethod
    def _calculate_uniqueness(df: pd.DataFrame) -> float:
        """Calculate uniqueness score (0-100)."""
        # Check for duplicate rows
        total_rows = len(df)
        if total_rows == 0:
            return 100.0
        
        unique_rows = len(df.drop_duplicates())
        return (unique_rows / total_rows) * 100


# Singleton instances
data_typing = EnhancedDataTyping()
outlier_detection = EnhancedOutlierDetection()
quality_scoring = EnhancedQualityScoring()
