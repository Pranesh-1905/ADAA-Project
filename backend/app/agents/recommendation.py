"""
Recommendation Agent

This agent generates actionable recommendations based on analysis results
from all other agents. It suggests next steps, data improvements, and
analysis directions.
"""

import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging

from .base_agent import BaseAgent, AgentStatus

logger = logging.getLogger(__name__)


class RecommendationAgent(BaseAgent):
    """
    Agent responsible for generating actionable recommendations.
    
    Capabilities:
    - Next-step suggestions
    - Data quality improvements
    - Analysis recommendations
    - Feature engineering suggestions
    - Model recommendations
    """
    
    def __init__(self):
        super().__init__(
            name="recommendation",
            description="Actionable recommendations and next steps"
        )
        self.priority_levels = ["critical", "high", "medium", "low"]
    
    async def analyze(self, data: Any, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate recommendations based on all previous analysis.
        
        Args:
            data: DataFrame or file path
            context: Results from all other agents
            
        Returns:
            Dictionary containing recommendations
        """
        # Convert to DataFrame if needed
        if isinstance(data, str):
            df = pd.read_csv(data)
        elif isinstance(data, pd.DataFrame):
            df = data
        else:
            raise ValueError(f"Unsupported data type: {type(data)}")
        
        self.emit_activity(
            action="Generating recommendations",
            status=AgentStatus.RUNNING
        )
        
        recommendations = []
        
        # Get results from other agents
        profiler_results = context.get("profiler_results", {})
        insights = context.get("insights", {})
        
        # Generate different types of recommendations
        recommendations.extend(self._data_quality_recommendations(profiler_results))
        recommendations.extend(self._analysis_recommendations(insights, df))
        recommendations.extend(self._feature_engineering_recommendations(df, profiler_results))
        recommendations.extend(self._next_steps_recommendations(profiler_results, insights))
        
        # Sort by priority
        priority_order = {p: i for i, p in enumerate(self.priority_levels)}
        recommendations.sort(key=lambda x: priority_order.get(x["priority"], 999))
        
        results = {
            "recommendations": recommendations,
            "summary": {
                "total": len(recommendations),
                "by_priority": self._count_by_priority(recommendations),
                "by_category": self._count_by_category(recommendations)
            }
        }
        
        self.emit_activity(
            action="Recommendations generated",
            status=AgentStatus.COMPLETED,
            details=results["summary"]
        )
        
        return results
    
    def _data_quality_recommendations(
        self,
        profiler_results: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate data quality improvement recommendations"""
        recommendations = []
        
        quality_score = profiler_results.get("quality_score", 1.0)
        missing_values = profiler_results.get("missing_values", {})
        outliers = profiler_results.get("outliers", {})
        
        # Low quality score
        if quality_score < 0.7:
            recommendations.append({
                "id": "dq_001",
                "category": "data_quality",
                "priority": "critical",
                "title": "Improve overall data quality",
                "description": f"Data quality score is {quality_score:.1%}. Address missing values and outliers before proceeding with analysis.",
                "action": "Review and clean data",
                "estimated_impact": "high",
                "effort": "medium",
                "steps": [
                    "Identify columns with high missing rates",
                    "Decide on imputation or removal strategy",
                    "Handle outliers appropriately",
                    "Re-run analysis after cleaning"
                ]
            })
        
        # Missing values
        overall_missing = missing_values.get("overall_missing_percentage", 0)
        if overall_missing > 0.1:
            columns_affected = missing_values.get("columns_affected", 0)
            recommendations.append({
                "id": "dq_002",
                "category": "data_quality",
                "priority": "high",
                "title": "Handle missing values",
                "description": f"{overall_missing:.1%} of data is missing across {columns_affected} columns.",
                "action": "Implement missing value strategy",
                "estimated_impact": "high",
                "effort": "low",
                "steps": [
                    "For numeric columns: Consider mean/median imputation",
                    "For categorical columns: Consider mode or 'Unknown' category",
                    "Consider removing columns with >50% missing",
                    "Document imputation decisions"
                ]
            })
        
        # Outliers
        outlier_cols = outliers.get("total_outlier_columns", 0)
        if outlier_cols > 0:
            recommendations.append({
                "id": "dq_003",
                "category": "data_quality",
                "priority": "medium",
                "title": "Investigate outliers",
                "description": f"Outliers detected in {outlier_cols} columns.",
                "action": "Review outlier values",
                "estimated_impact": "medium",
                "effort": "low",
                "steps": [
                    "Verify if outliers are data errors or valid extreme values",
                    "Consider winsorization or capping for extreme values",
                    "Document outlier handling decisions",
                    "Consider robust statistical methods"
                ]
            })
        
        return recommendations
    
    def _analysis_recommendations(
        self,
        insights: Dict[str, Any],
        df: pd.DataFrame
    ) -> List[Dict[str, Any]]:
        """Generate analysis-focused recommendations"""
        recommendations = []
        
        correlations = insights.get("correlations", [])
        trends = insights.get("trends", [])
        
        # Strong correlations found
        if len(correlations) > 0:
            strong_corrs = [c for c in correlations if abs(c.get("correlation", 0)) > 0.7]
            if strong_corrs:
                recommendations.append({
                    "id": "an_001",
                    "category": "analysis",
                    "priority": "high",
                    "title": "Investigate strong correlations",
                    "description": f"Found {len(strong_corrs)} strong correlations that warrant deeper investigation.",
                    "action": "Perform causal analysis",
                    "estimated_impact": "high",
                    "effort": "medium",
                    "steps": [
                        "Review correlation pairs for causation vs correlation",
                        "Consider time-lagged relationships",
                        "Look for confounding variables",
                        "Build predictive models if appropriate"
                    ],
                    "related_insights": [c["column1"] + " vs " + c["column2"] for c in strong_corrs[:3]]
                })
        
        # Trends detected
        if len(trends) > 0:
            recommendations.append({
                "id": "an_002",
                "category": "analysis",
                "priority": "medium",
                "title": "Analyze detected trends",
                "description": f"Found {len(trends)} significant trends in your data.",
                "action": "Perform trend analysis",
                "estimated_impact": "medium",
                "effort": "low",
                "steps": [
                    "Forecast future values using trend lines",
                    "Identify trend drivers",
                    "Check for seasonality",
                    "Consider external factors affecting trends"
                ],
                "related_insights": [t["column"] for t in trends[:3]]
            })
        
        # Suggest segmentation
        categorical_cols = df.select_dtypes(include=['object', 'category']).columns
        if len(categorical_cols) > 0:
            recommendations.append({
                "id": "an_003",
                "category": "analysis",
                "priority": "low",
                "title": "Perform segmentation analysis",
                "description": f"Categorical columns detected. Consider segmenting data for deeper insights.",
                "action": "Create segments",
                "estimated_impact": "medium",
                "effort": "medium",
                "steps": [
                    "Group data by categorical variables",
                    "Compare metrics across segments",
                    "Identify high-performing segments",
                    "Look for segment-specific patterns"
                ]
            })
        
        return recommendations
    
    def _feature_engineering_recommendations(
        self,
        df: pd.DataFrame,
        profiler_results: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate feature engineering recommendations"""
        recommendations = []
        
        data_types = profiler_results.get("data_types", {})
        type_dist = data_types.get("type_distribution", {})
        
        # Categorical encoding
        if type_dist.get("categorical", 0) > 0:
            recommendations.append({
                "id": "fe_001",
                "category": "feature_engineering",
                "priority": "medium",
                "title": "Encode categorical variables",
                "description": f"Found {type_dist['categorical']} categorical columns that may need encoding for modeling.",
                "action": "Apply encoding techniques",
                "estimated_impact": "high",
                "effort": "low",
                "steps": [
                    "Use one-hot encoding for low cardinality (<10 categories)",
                    "Use label encoding for ordinal variables",
                    "Consider target encoding for high cardinality",
                    "Handle rare categories appropriately"
                ]
            })
        
        # Feature scaling
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        if len(numeric_cols) > 1:
            # Check if scales vary significantly
            ranges = {col: df[col].max() - df[col].min() for col in numeric_cols if not df[col].isnull().all()}
            if ranges and max(ranges.values()) / min(ranges.values()) > 100:
                recommendations.append({
                    "id": "fe_002",
                    "category": "feature_engineering",
                    "priority": "medium",
                    "title": "Normalize numeric features",
                    "description": "Numeric columns have significantly different scales.",
                    "action": "Apply feature scaling",
                    "estimated_impact": "high",
                    "effort": "low",
                    "steps": [
                        "Use StandardScaler for normally distributed features",
                        "Use MinMaxScaler for bounded features",
                        "Use RobustScaler if outliers are present",
                        "Document scaling decisions"
                    ]
                })
        
        # Datetime features
        if type_dist.get("datetime", 0) > 0:
            recommendations.append({
                "id": "fe_003",
                "category": "feature_engineering",
                "priority": "low",
                "title": "Extract datetime features",
                "description": "Datetime columns detected. Extract temporal features for better analysis.",
                "action": "Create time-based features",
                "estimated_impact": "medium",
                "effort": "low",
                "steps": [
                    "Extract year, month, day, day of week",
                    "Create is_weekend, is_holiday flags",
                    "Calculate time differences",
                    "Consider cyclical encoding for periodic features"
                ]
            })
        
        return recommendations
    
    def _next_steps_recommendations(
        self,
        profiler_results: Dict[str, Any],
        insights: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate next steps recommendations"""
        recommendations = []
        
        quality_score = profiler_results.get("quality_score", 1.0)
        insights_found = len(insights.get("insights", []))
        
        # Ready for modeling
        if quality_score > 0.8 and insights_found > 3:
            recommendations.append({
                "id": "ns_001",
                "category": "next_steps",
                "priority": "high",
                "title": "Ready for predictive modeling",
                "description": "Data quality is good and insights are available. Consider building predictive models.",
                "action": "Build models",
                "estimated_impact": "high",
                "effort": "high",
                "steps": [
                    "Define prediction target",
                    "Split data into train/test sets",
                    "Try multiple algorithms",
                    "Evaluate and compare models",
                    "Deploy best performing model"
                ]
            })
        
        # Need more data
        num_rows = profiler_results.get("overview", {}).get("rows", 0)
        if num_rows < 100:
            recommendations.append({
                "id": "ns_002",
                "category": "next_steps",
                "priority": "medium",
                "title": "Collect more data",
                "description": "Dataset is small. Consider collecting more data for robust analysis.",
                "action": "Expand dataset",
                "estimated_impact": "high",
                "effort": "high",
                "steps": [
                    "Identify additional data sources",
                    "Ensure data consistency",
                    "Validate new data quality",
                    "Re-run analysis with expanded dataset"
                ]
            })
        
        # Export and share
        recommendations.append({
            "id": "ns_003",
            "category": "next_steps",
            "priority": "low",
            "title": "Export and share results",
            "description": "Analysis complete. Export results for stakeholders.",
            "action": "Create reports",
            "estimated_impact": "medium",
            "effort": "low",
            "steps": [
                "Export charts and visualizations",
                "Create executive summary",
                "Document key findings",
                "Share with stakeholders"
            ]
        })
        
        return recommendations
    
    def _count_by_priority(self, recommendations: List[Dict[str, Any]]) -> Dict[str, int]:
        """Count recommendations by priority"""
        counts = {priority: 0 for priority in self.priority_levels}
        for rec in recommendations:
            priority = rec.get("priority", "low")
            counts[priority] = counts.get(priority, 0) + 1
        return counts
    
    def _count_by_category(self, recommendations: List[Dict[str, Any]]) -> Dict[str, int]:
        """Count recommendations by category"""
        counts = {}
        for rec in recommendations:
            category = rec.get("category", "other")
            counts[category] = counts.get(category, 0) + 1
        return counts
