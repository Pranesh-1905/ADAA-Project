"""
Data Profiler Agent

This agent performs comprehensive data quality assessment and profiling.
It analyzes datasets to detect data types, missing values, outliers, 
distributions, and overall data quality metrics.
"""

import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging

from .base_agent import BaseAgent, AgentStatus

# Import enhanced profiling utilities
try:
    from .enhanced_profiling import data_typing, outlier_detection, quality_scoring
    ENHANCED_PROFILING_AVAILABLE = True
except ImportError:
    ENHANCED_PROFILING_AVAILABLE = False


try:
    from app.utils.performance_monitor import track_performance
except ImportError:
    # Dummy decorator if not available
    def track_performance(name):
        return lambda x: x

logger = logging.getLogger(__name__)


class DataProfilerAgent(BaseAgent):
    """
    Agent responsible for data quality assessment and profiling.
    
    Capabilities:
    - Data type detection and validation
    - Missing value analysis
    - Outlier detection
    - Statistical profiling
    - Data distribution analysis
    - Quality score calculation
    """
    
    def __init__(self):
        super().__init__(
            name="data_profiler",
            description="Data quality and profiling analysis"
        )
        self.quality_thresholds = {
            "missing_threshold": 0.3,  # 30% missing is concerning
            "outlier_threshold": 0.05,  # 5% outliers is acceptable
            "min_quality_score": 0.7    # 70% minimum quality
        }
    
    @track_performance("data_profiling")
    async def analyze(self, data: Any, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Perform comprehensive data profiling.
        
        Args:
            data: DataFrame or file path to analyze
            context: Additional parameters (e.g., column_types, thresholds)
            
        Returns:
            Dictionary containing profiling results
        """
        # Convert to DataFrame if needed
        if isinstance(data, str):
            df = pd.read_csv(data)
        elif isinstance(data, pd.DataFrame):
            df = data
        else:
            raise ValueError(f"Unsupported data type: {type(data)}")
        
        self.emit_activity(
            action="Analyzing data structure",
            status=AgentStatus.RUNNING,
            details={"rows": len(df), "columns": len(df.columns)}
        )
        
        # Perform profiling steps
        results = {
            "overview": self._get_overview(df),
            "data_types": self._analyze_data_types(df),
            "missing_values": self._analyze_missing_values(df),
            "statistics": self._calculate_statistics(df),
            "outliers": self._detect_outliers(df),
            "distributions": self._analyze_distributions(df),
            "quality_score": 0.0,
            "quality_issues": [],
            "recommendations": []
        }
        
        # Calculate overall quality score
        # Use enhanced quality scoring if available
        if ENHANCED_PROFILING_AVAILABLE:
            quality_results = quality_scoring.calculate_quality_score(df)
            results["quality_score"] = quality_results["overall"]
            # Store detailed quality breakdown
            results["quality_breakdown"] = quality_results
        else:
            results["quality_score"] = self._calculate_quality_score_legacy(results)
        
        # Generate quality issues and recommendations
        results["quality_issues"] = self._identify_quality_issues(results)
        results["recommendations"] = self._generate_recommendations(results)
        
        self.emit_activity(
            action="Data profiling completed",
            status=AgentStatus.COMPLETED,
            details={
                "quality_score": results["quality_score"],
                "issues_found": len(results["quality_issues"])
            }
        )
        
        return results
    
    def _get_overview(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Get basic dataset overview"""
        return {
            "rows": len(df),
            "columns": len(df.columns),
            "memory_usage_mb": df.memory_usage(deep=True).sum() / 1024 / 1024,
            "column_names": df.columns.tolist(),
            "shape": df.shape
        }
    
    def _analyze_data_types(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze and infer data types using enhanced typing if available"""
        self.emit_activity(
            action="Analyzing data types",
            status=AgentStatus.RUNNING
        )
        
        type_info = {}
        type_counts = {
            "numeric": 0,
            "categorical": 0,
            "datetime": 0,
            "text": 0,
            "boolean": 0,
            "other": 0
        }
        
        for col in df.columns:
            dtype = str(df[col].dtype)
            
            if ENHANCED_PROFILING_AVAILABLE:
                # Use enhanced data typing
                inferred = data_typing.infer_data_type(df[col])
                semantic_type = inferred["type"]
                metadata = inferred["metadata"]
                confidence = inferred.get("confidence", 0.0)
            else:
                # Fallback to legacy
                semantic_type = self._infer_semantic_type_legacy(df[col])
                metadata = {}
                confidence = 1.0
            
            type_info[col] = {
                "pandas_dtype": dtype,
                "semantic_type": semantic_type,
                "confidence": confidence,
                "metadata": metadata,
                "unique_values": int(df[col].nunique()),
                "unique_ratio": float(df[col].nunique() / len(df))
            }
            
            if semantic_type in type_counts:
                type_counts[semantic_type] += 1
            else:
                type_counts["other"] = type_counts.get("other", 0) + 1
        
        return {
            "columns": type_info,
            "type_distribution": type_counts
        }
    
    def _infer_semantic_type_legacy(self, series: pd.Series) -> str:
        """Infer semantic type of a column (Legacy)"""
        dtype = series.dtype
        
        # Boolean
        if dtype == bool or series.nunique() == 2:
            return "boolean"
        
        # Numeric
        if pd.api.types.is_numeric_dtype(dtype):
            return "numeric"
        
        # Datetime
        if pd.api.types.is_datetime64_any_dtype(dtype):
            return "datetime"
        
        # Try to parse as datetime
        try:
            pd.to_datetime(series.dropna().head(100))
            return "datetime"
        except:
            pass
        
        # Categorical (low cardinality)
        if series.nunique() / len(series) < 0.05:
            return "categorical"
        
        # Default to text
        return "text"
    
    def _analyze_missing_values(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze missing values"""
        self.emit_activity(
            action="Analyzing missing values",
            status=AgentStatus.RUNNING
        )
        
        missing_info = {}
        total_cells = df.shape[0] * df.shape[1]
        total_missing = df.isnull().sum().sum()
        
        for col in df.columns:
            missing_count = int(df[col].isnull().sum())
            missing_pct = float(missing_count / len(df))
            
            if missing_count > 0:
                missing_info[col] = {
                    "count": missing_count,
                    "percentage": missing_pct,
                    "severity": "high" if missing_pct > 0.3 else "medium" if missing_pct > 0.1 else "low"
                }
        
        return {
            "total_missing_cells": int(total_missing),
            "total_cells": int(total_cells),
            "overall_missing_percentage": float(total_missing / total_cells),
            "columns_with_missing": missing_info,
            "columns_affected": len(missing_info)
        }
    
    def _calculate_statistics(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Calculate statistical summaries"""
        self.emit_activity(
            action="Calculating statistics",
            status=AgentStatus.RUNNING
        )
        
        stats = {}
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        
        for col in numeric_cols:
            col_stats = {
                "mean": float(df[col].mean()) if not df[col].isnull().all() else None,
                "median": float(df[col].median()) if not df[col].isnull().all() else None,
                "std": float(df[col].std()) if not df[col].isnull().all() else None,
                "min": float(df[col].min()) if not df[col].isnull().all() else None,
                "max": float(df[col].max()) if not df[col].isnull().all() else None,
                "q25": float(df[col].quantile(0.25)) if not df[col].isnull().all() else None,
                "q75": float(df[col].quantile(0.75)) if not df[col].isnull().all() else None,
            }
            stats[col] = col_stats
        
        return stats
    
    def _detect_outliers(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Detect outliers using enhanced detection if available"""
        self.emit_activity(
            action="Detecting outliers",
            status=AgentStatus.RUNNING
        )
        
        outliers = {}
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        
        for col in numeric_cols:
            if df[col].isnull().all():
                continue
            
            if ENHANCED_PROFILING_AVAILABLE:
                # Use enhanced outlier detection
                result = outlier_detection.detect_outliers(df[col])
                
                if result.get("outlier_count", 0) > 0:
                    outliers[col] = {
                        "count": result["outlier_count"],
                        "percentage": result["outlier_percentage"],
                        "severity": result["severity"],
                        "methods_used": result.get("methods_used", [])
                    }
            else:
                # Legacy IQR method
                Q1 = df[col].quantile(0.25)
                Q3 = df[col].quantile(0.75)
                IQR = Q3 - Q1
                
                lower_bound = Q1 - 1.5 * IQR
                upper_bound = Q3 + 1.5 * IQR
                
                outlier_mask = (df[col] < lower_bound) | (df[col] > upper_bound)
                outlier_count = int(outlier_mask.sum())
                
                if outlier_count > 0:
                    outliers[col] = {
                        "count": outlier_count,
                        "percentage": float(outlier_count / len(df)),
                        "lower_bound": float(lower_bound),
                        "upper_bound": float(upper_bound),
                        "severity": "high" if outlier_count / len(df) > 0.1 else "medium"
                    }
        
        return {
            "columns_with_outliers": outliers,
            "total_outlier_columns": len(outliers)
        }
    
    def _analyze_distributions(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Analyze data distributions"""
        self.emit_activity(
            action="Analyzing distributions",
            status=AgentStatus.RUNNING
        )
        
        distributions = {}
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        
        for col in numeric_cols:
            if df[col].isnull().all():
                continue
            
            # Calculate skewness and kurtosis
            skewness = float(df[col].skew())
            kurtosis = float(df[col].kurtosis())
            
            # Determine distribution shape
            if abs(skewness) < 0.5:
                shape = "symmetric"
            elif skewness > 0:
                shape = "right_skewed"
            else:
                shape = "left_skewed"
            
            distributions[col] = {
                "skewness": skewness,
                "kurtosis": kurtosis,
                "shape": shape,
                "is_normal": abs(skewness) < 0.5 and abs(kurtosis) < 3
            }
        
        return distributions
    
    def _calculate_quality_score_legacy(self, results: Dict[str, Any]) -> float:
        """Calculate overall data quality score (0-1) [Legacy Method]"""
        scores = []
        
        # Missing values score (lower is better)
        missing_pct = results["missing_values"]["overall_missing_percentage"]
        missing_score = max(0, 1 - (missing_pct / self.quality_thresholds["missing_threshold"]))
        scores.append(missing_score)
        
        # Outliers score
        outlier_cols = results["outliers"]["total_outlier_columns"]
        total_cols = results["overview"]["columns"]
        outlier_score = 1 - (outlier_cols / total_cols) if total_cols > 0 else 1
        scores.append(outlier_score)
        
        # Data type consistency score
        type_dist = results["data_types"]["type_distribution"]
        # Penalize if too many text columns (might indicate parsing issues)
        text_ratio = type_dist.get("text", 0) / total_cols if total_cols > 0 else 0
        type_score = 1 - (text_ratio * 0.5)  # 50% penalty for all text
        scores.append(type_score)
        
        # Calculate weighted average
        quality_score = sum(scores) / len(scores)
        
        return round(quality_score, 3)
    
    def _identify_quality_issues(self, results: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Identify data quality issues"""
        issues = []
        
        # Missing values issues
        for col, info in results["missing_values"]["columns_with_missing"].items():
            if info["severity"] in ["high", "medium"]:
                issues.append({
                    "type": "missing_values",
                    "severity": info["severity"],
                    "column": col,
                    "description": f"Column '{col}' has {info['percentage']:.1%} missing values",
                    "impact": "May affect analysis accuracy"
                })
        
        # Outlier issues
        for col, info in results["outliers"]["columns_with_outliers"].items():
            if info["severity"] == "high":
                issues.append({
                    "type": "outliers",
                    "severity": info["severity"],
                    "column": col,
                    "description": f"Column '{col}' has {info['count']} outliers ({info['percentage']:.1%})",
                    "impact": "May skew statistical analysis"
                })
        
        # Low quality score
        if results["quality_score"] < self.quality_thresholds["min_quality_score"]:
            issues.append({
                "type": "overall_quality",
                "severity": "high",
                "column": None,
                "description": f"Overall data quality score is {results['quality_score']:.1%}",
                "impact": "Dataset may require cleaning before analysis"
            })
        
        return issues
    
    def _generate_recommendations(self, results: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate actionable recommendations"""
        recommendations = []
        
        # Missing values recommendations
        if results["missing_values"]["overall_missing_percentage"] > 0.1:
            recommendations.append({
                "type": "data_cleaning",
                "priority": "high",
                "title": "Handle missing values",
                "description": "Consider imputation or removal of rows/columns with missing data",
                "action": "Review columns with high missing percentages"
            })
        
        # Outlier recommendations
        if results["outliers"]["total_outlier_columns"] > 0:
            recommendations.append({
                "type": "data_cleaning",
                "priority": "medium",
                "title": "Investigate outliers",
                "description": "Outliers detected in numeric columns. Verify if they are errors or valid extreme values",
                "action": "Review outlier detection results"
            })
        
        # Data type recommendations
        type_dist = results["data_types"]["type_distribution"]
        if type_dist.get("text", 0) > type_dist.get("numeric", 0):
            recommendations.append({
                "type": "data_transformation",
                "priority": "medium",
                "title": "Convert text to numeric",
                "description": "Many text columns detected. Consider encoding categorical variables",
                "action": "Apply one-hot encoding or label encoding"
            })
        
        return recommendations
