"""
Insight Discovery Agent

This agent discovers patterns, trends, correlations, and anomalies in data.
It generates natural language insights that help users understand their data.
"""

import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
from scipy import stats
import logging

from .base_agent import BaseAgent, AgentStatus

logger = logging.getLogger(__name__)


class InsightDiscoveryAgent(BaseAgent):
    """
    Agent responsible for discovering insights, patterns, and trends.
    
    Capabilities:
    - Trend detection
    - Correlation analysis
    - Pattern recognition
    - Anomaly detection
    - Natural language insight generation
    - Statistical significance testing
    """
    
    def __init__(self):
        super().__init__(
            name="insight_discovery",
            description="Pattern and trend discovery"
        )
        self.confidence_threshold = 0.7
        self.correlation_threshold = 0.5
    
    async def analyze(self, data: Any, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Discover insights from the data.
        
        Args:
            data: DataFrame or file path to analyze
            context: Additional parameters
            
        Returns:
            Dictionary containing discovered insights
        """
        # Convert to DataFrame if needed
        if isinstance(data, str):
            df = pd.read_csv(data)
        elif isinstance(data, pd.DataFrame):
            df = data
        else:
            raise ValueError(f"Unsupported data type: {type(data)}")
        
        self.emit_activity(
            action="Starting insight discovery",
            status=AgentStatus.RUNNING,
            details={"rows": len(df), "columns": len(df.columns)}
        )
        
        results = {
            "insights": [],
            "correlations": [],
            "trends": [],
            "anomalies": [],
            "patterns": [],
            "summary": {}
        }
        
        # Discover different types of insights
        results["correlations"] = self._find_correlations(df)
        results["trends"] = self._detect_trends(df)
        results["anomalies"] = self._detect_anomalies(df)
        results["patterns"] = self._find_patterns(df)
        
        # Generate natural language insights
        results["insights"] = self._generate_insights(df, results)
        
        # Create summary
        results["summary"] = {
            "total_insights": len(results["insights"]),
            "high_confidence_insights": len([i for i in results["insights"] if i["confidence"] > 0.8]),
            "correlations_found": len(results["correlations"]),
            "trends_found": len(results["trends"]),
            "anomalies_found": len(results["anomalies"])
        }
        
        self.emit_activity(
            action="Insight discovery completed",
            status=AgentStatus.COMPLETED,
            details=results["summary"]
        )
        
        return results
    
    def _find_correlations(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Find significant correlations between numeric columns"""
        self.emit_activity(
            action="Analyzing correlations",
            status=AgentStatus.RUNNING
        )
        
        correlations = []
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        
        if len(numeric_cols) < 2:
            return correlations
        
        # Calculate correlation matrix
        corr_matrix = df[numeric_cols].corr()
        
        # Find significant correlations
        for i, col1 in enumerate(numeric_cols):
            for j, col2 in enumerate(numeric_cols):
                if i >= j:  # Skip diagonal and duplicates
                    continue
                
                corr_value = corr_matrix.loc[col1, col2]
                
                if abs(corr_value) >= self.correlation_threshold:
                    # Determine strength
                    if abs(corr_value) > 0.8:
                        strength = "strong"
                    elif abs(corr_value) > 0.6:
                        strength = "moderate"
                    else:
                        strength = "weak"
                    
                    # Determine direction
                    direction = "positive" if corr_value > 0 else "negative"
                    
                    correlations.append({
                        "column1": col1,
                        "column2": col2,
                        "correlation": float(corr_value),
                        "strength": strength,
                        "direction": direction,
                        "confidence": min(abs(corr_value), 0.95)
                    })
        
        # Sort by absolute correlation value
        correlations.sort(key=lambda x: abs(x["correlation"]), reverse=True)
        
        return correlations[:10]  # Return top 10
    
    def _detect_trends(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Detect trends in numeric columns"""
        self.emit_activity(
            action="Detecting trends",
            status=AgentStatus.RUNNING
        )
        
        trends = []
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        
        for col in numeric_cols:
            if df[col].isnull().all() or len(df[col].dropna()) < 3:
                continue
            
            # Create index for trend analysis
            x = np.arange(len(df))
            y = df[col].values
            
            # Remove NaN values
            mask = ~np.isnan(y)
            x_clean = x[mask]
            y_clean = y[mask]
            
            if len(x_clean) < 3:
                continue
            
            # Linear regression for trend
            slope, intercept, r_value, p_value, std_err = stats.linregress(x_clean, y_clean)
            
            # Determine if trend is significant
            if p_value < 0.05 and abs(r_value) > 0.3:
                # Calculate percentage change
                start_val = y_clean[0]
                end_val = y_clean[-1]
                pct_change = ((end_val - start_val) / start_val * 100) if start_val != 0 else 0
                
                trend_type = "increasing" if slope > 0 else "decreasing"
                
                trends.append({
                    "column": col,
                    "type": trend_type,
                    "slope": float(slope),
                    "r_squared": float(r_value ** 2),
                    "p_value": float(p_value),
                    "percentage_change": float(pct_change),
                    "confidence": float(abs(r_value)),
                    "significance": "high" if p_value < 0.01 else "medium"
                })
        
        return trends
    
    def _detect_anomalies(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Detect anomalies using statistical methods"""
        self.emit_activity(
            action="Detecting anomalies",
            status=AgentStatus.RUNNING
        )
        
        anomalies = []
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        
        for col in numeric_cols:
            if df[col].isnull().all():
                continue
            
            # Z-score method
            z_scores = np.abs(stats.zscore(df[col].dropna()))
            anomaly_indices = np.where(z_scores > 3)[0]
            
            if len(anomaly_indices) > 0:
                anomaly_values = df[col].iloc[anomaly_indices].tolist()
                
                anomalies.append({
                    "column": col,
                    "count": len(anomaly_indices),
                    "percentage": float(len(anomaly_indices) / len(df)),
                    "sample_values": [float(v) for v in anomaly_values[:5]],
                    "method": "z_score",
                    "threshold": 3.0,
                    "severity": "high" if len(anomaly_indices) / len(df) > 0.05 else "medium"
                })
        
        return anomalies
    
    def _find_patterns(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Find interesting patterns in the data"""
        self.emit_activity(
            action="Finding patterns",
            status=AgentStatus.RUNNING
        )
        
        patterns = []
        
        # Pattern 1: Categorical distributions
        categorical_cols = df.select_dtypes(include=['object', 'category']).columns
        
        for col in categorical_cols:
            if df[col].nunique() > 20:  # Skip high cardinality
                continue
            
            value_counts = df[col].value_counts()
            total = len(df)
            
            # Find dominant category
            if len(value_counts) > 0:
                dominant_value = value_counts.index[0]
                dominant_pct = value_counts.iloc[0] / total
                
                if dominant_pct > 0.5:  # More than 50%
                    patterns.append({
                        "type": "dominant_category",
                        "column": col,
                        "value": str(dominant_value),
                        "percentage": float(dominant_pct),
                        "description": f"'{dominant_value}' appears in {dominant_pct:.1%} of records",
                        "confidence": 0.9
                    })
        
        # Pattern 2: Numeric ranges
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        
        for col in numeric_cols:
            if df[col].isnull().all():
                continue
            
            min_val = df[col].min()
            max_val = df[col].max()
            mean_val = df[col].mean()
            
            # Check if values are concentrated in a range
            q1 = df[col].quantile(0.25)
            q3 = df[col].quantile(0.75)
            iqr = q3 - q1
            
            if iqr / (max_val - min_val) < 0.3:  # Concentrated distribution
                patterns.append({
                    "type": "concentrated_values",
                    "column": col,
                    "range": [float(q1), float(q3)],
                    "description": f"50% of values fall in narrow range [{q1:.2f}, {q3:.2f}]",
                    "confidence": 0.8
                })
        
        return patterns
    
    def _generate_insights(self, df: pd.DataFrame, results: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate natural language insights"""
        self.emit_activity(
            action="Generating insights",
            status=AgentStatus.RUNNING
        )
        
        insights = []
        
        # Insights from correlations
        for corr in results["correlations"][:5]:  # Top 5
            insight = {
                "type": "correlation",
                "title": f"{corr['strength'].title()} {corr['direction']} correlation detected",
                "description": f"'{corr['column1']}' and '{corr['column2']}' show a {corr['strength']} {corr['direction']} correlation (r={corr['correlation']:.2f})",
                "confidence": corr["confidence"],
                "evidence": {
                    "correlation_value": corr["correlation"],
                    "columns": [corr["column1"], corr["column2"]]
                },
                "actionable": True,
                "action": f"Investigate relationship between {corr['column1']} and {corr['column2']}"
            }
            insights.append(insight)
        
        # Insights from trends
        for trend in results["trends"][:3]:  # Top 3
            insight = {
                "type": "trend",
                "title": f"{trend['type'].title()} trend in {trend['column']}",
                "description": f"'{trend['column']}' shows a {trend['type']} trend with {abs(trend['percentage_change']):.1f}% change (R²={trend['r_squared']:.2f})",
                "confidence": trend["confidence"],
                "evidence": {
                    "percentage_change": trend["percentage_change"],
                    "r_squared": trend["r_squared"],
                    "p_value": trend["p_value"]
                },
                "actionable": True,
                "action": f"Monitor {trend['column']} for continued {trend['type']} pattern"
            }
            insights.append(insight)
        
        # Insights from anomalies
        for anomaly in results["anomalies"][:3]:  # Top 3
            if anomaly["severity"] == "high":
                insight = {
                    "type": "anomaly",
                    "title": f"Unusual values detected in {anomaly['column']}",
                    "description": f"Found {anomaly['count']} anomalous values in '{anomaly['column']}' ({anomaly['percentage']:.1%} of data)",
                    "confidence": 0.85,
                    "evidence": {
                        "count": anomaly["count"],
                        "sample_values": anomaly["sample_values"]
                    },
                    "actionable": True,
                    "action": f"Review anomalous values in {anomaly['column']} for data quality issues"
                }
                insights.append(insight)
        
        # Insights from patterns
        for pattern in results["patterns"][:3]:  # Top 3
            if pattern["type"] == "dominant_category":
                insight = {
                    "type": "pattern",
                    "title": f"Dominant category in {pattern['column']}",
                    "description": pattern["description"],
                    "confidence": pattern["confidence"],
                    "evidence": {
                        "value": pattern["value"],
                        "percentage": pattern["percentage"]
                    },
                    "actionable": False,
                    "action": None
                }
                insights.append(insight)
        
        # Sort by confidence
        insights.sort(key=lambda x: x["confidence"], reverse=True)
        
        return insights
