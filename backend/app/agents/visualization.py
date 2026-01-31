"""
Visualization Agent

This agent automatically generates appropriate visualizations for the data.
It selects chart types, creates interactive plots, and provides visualization
recommendations.
"""

import pandas as pd
import numpy as np
import plotly.graph_objects as go
import plotly.express as px
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
import os
import logging

from .base_agent import BaseAgent, AgentStatus

logger = logging.getLogger(__name__)


class VisualizationAgent(BaseAgent):
    """
    Agent responsible for automatic chart generation and visualization.
    
    Capabilities:
    - Automatic chart type selection
    - Interactive Plotly chart generation
    - Chart recommendations
    - Dashboard layout optimization
    - Export to static images
    """
    
    def __init__(self, output_dir: str = "static/charts"):
        super().__init__(
            name="visualization",
            description="Chart generation and visualization"
        )
        self.output_dir = output_dir
        self.chart_types = {
            "numeric_single": ["histogram", "box", "violin"],
            "numeric_pair": ["scatter", "line"],
            "categorical_single": ["bar", "pie"],
            "categorical_numeric": ["bar", "box"],
            "time_series": ["line", "area"],
            "correlation": ["heatmap", "scatter_matrix"]
        }
    
    async def analyze(self, data: Any, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate visualizations for the data.
        
        Args:
            data: DataFrame or file path to analyze
            context: Additional parameters including profiler results
            
        Returns:
            Dictionary containing generated charts and recommendations
        """
        # Convert to DataFrame if needed
        if isinstance(data, str):
            df = pd.read_csv(data)
        elif isinstance(data, pd.DataFrame):
            df = data
        else:
            raise ValueError(f"Unsupported data type: {type(data)}")
        
        # Ensure output directory exists
        os.makedirs(self.output_dir, exist_ok=True)
        
        self.emit_activity(
            action="Analyzing data for visualization",
            status=AgentStatus.RUNNING,
            details={"rows": len(df), "columns": len(df.columns)}
        )
        
        results = {
            "charts": [],
            "recommendations": [],
            "summary": {}
        }
        
        # Get profiler results if available
        profiler_results = context.get("profiler_results", {})
        data_types = profiler_results.get("data_types", {})
        
        # Generate different types of charts
        results["charts"].extend(self._generate_distribution_charts(df, data_types))
        results["charts"].extend(self._generate_relationship_charts(df, data_types))
        results["charts"].extend(self._generate_categorical_charts(df, data_types))
        results["charts"].extend(self._generate_correlation_heatmap(df))
        
        # Generate recommendations
        results["recommendations"] = self._generate_viz_recommendations(df, results["charts"])
        
        # Create summary
        results["summary"] = {
            "total_charts": len(results["charts"]),
            "chart_types": list(set([c["type"] for c in results["charts"]])),
            "recommendations_count": len(results["recommendations"])
        }
        
        self.emit_activity(
            action="Visualization generation completed",
            status=AgentStatus.COMPLETED,
            details=results["summary"]
        )
        
        return results
    
    def _generate_distribution_charts(
        self,
        df: pd.DataFrame,
        data_types: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate distribution charts for numeric columns"""
        self.emit_activity(
            action="Generating distribution charts",
            status=AgentStatus.RUNNING
        )
        
        charts = []
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        
        for col in numeric_cols[:5]:  # Limit to 5 charts
            if df[col].isnull().all():
                continue
            
            # Histogram
            fig = px.histogram(
                df,
                x=col,
                title=f"Distribution of {col}",
                labels={col: col},
                template="plotly_white"
            )
            
            fig.update_layout(
                showlegend=False,
                height=400,
                margin=dict(l=50, r=50, t=50, b=50)
            )
            
            # Save chart
            chart_path = os.path.join(self.output_dir, f"hist_{col}.json")
            fig.write_json(chart_path)
            
            charts.append({
                "type": "histogram",
                "title": f"Distribution of {col}",
                "column": col,
                "path": chart_path,
                "config": fig.to_dict(),
                "description": f"Shows the frequency distribution of {col}"
            })
        
        return charts
    
    def _generate_relationship_charts(
        self,
        df: pd.DataFrame,
        data_types: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate scatter plots for numeric relationships"""
        self.emit_activity(
            action="Generating relationship charts",
            status=AgentStatus.RUNNING
        )
        
        charts = []
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        
        if len(numeric_cols) < 2:
            return charts
        
        # Generate scatter plots for top correlations
        # Limit to 3 scatter plots
        pairs_generated = 0
        for i, col1 in enumerate(numeric_cols):
            if pairs_generated >= 3:
                break
            
            for col2 in numeric_cols[i+1:]:
                if pairs_generated >= 3:
                    break
                
                # Calculate correlation
                corr = df[[col1, col2]].corr().iloc[0, 1]
                
                if abs(corr) > 0.5:  # Only strong correlations
                    fig = px.scatter(
                        df,
                        x=col1,
                        y=col2,
                        title=f"{col1} vs {col2} (r={corr:.2f})",
                        template="plotly_white"
                        # trendline="ols"  # Removed - requires statsmodels
                    )
                    
                    fig.update_layout(
                        height=400,
                        margin=dict(l=50, r=50, t=50, b=50)
                    )
                    
                    chart_path = os.path.join(self.output_dir, f"scatter_{col1}_{col2}.json")
                    fig.write_json(chart_path)
                    
                    charts.append({
                        "type": "scatter",
                        "title": f"{col1} vs {col2}",
                        "columns": [col1, col2],
                        "path": chart_path,
                        "config": fig.to_dict(),
                        "description": f"Relationship between {col1} and {col2} (correlation: {corr:.2f})"
                    })
                    
                    pairs_generated += 1
        
        return charts
    
    def _generate_categorical_charts(
        self,
        df: pd.DataFrame,
        data_types: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Generate charts for categorical data"""
        self.emit_activity(
            action="Generating categorical charts",
            status=AgentStatus.RUNNING
        )
        
        charts = []
        categorical_cols = df.select_dtypes(include=['object', 'category']).columns
        
        for col in categorical_cols[:3]:  # Limit to 3 charts
            if df[col].nunique() > 20:  # Skip high cardinality
                continue
            
            value_counts = df[col].value_counts().head(10)
            
            # Bar chart
            fig = px.bar(
                x=value_counts.index,
                y=value_counts.values,
                title=f"Distribution of {col}",
                labels={"x": col, "y": "Count"},
                template="plotly_white"
            )
            
            fig.update_layout(
                showlegend=False,
                height=400,
                margin=dict(l=50, r=50, t=50, b=50)
            )
            
            chart_path = os.path.join(self.output_dir, f"bar_{col}.json")
            fig.write_json(chart_path)
            
            charts.append({
                "type": "bar",
                "title": f"Distribution of {col}",
                "column": col,
                "path": chart_path,
                "config": fig.to_dict(),
                "description": f"Shows the frequency of each category in {col}"
            })
        
        return charts
    
    def _generate_correlation_heatmap(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Generate correlation heatmap for numeric columns"""
        self.emit_activity(
            action="Generating correlation heatmap",
            status=AgentStatus.RUNNING
        )
        
        charts = []
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        
        if len(numeric_cols) < 2:
            return charts
        
        # Calculate correlation matrix
        corr_matrix = df[numeric_cols].corr()
        
        # Create heatmap
        fig = go.Figure(data=go.Heatmap(
            z=corr_matrix.values,
            x=corr_matrix.columns,
            y=corr_matrix.columns,
            colorscale='RdBu',
            zmid=0,
            text=corr_matrix.values,
            texttemplate='%{text:.2f}',
            textfont={"size": 10},
            colorbar=dict(title="Correlation")
        ))
        
        fig.update_layout(
            title="Correlation Heatmap",
            template="plotly_white",
            height=500,
            margin=dict(l=100, r=50, t=50, b=100)
        )
        
        chart_path = os.path.join(self.output_dir, "correlation_heatmap.json")
        fig.write_json(chart_path)
        
        charts.append({
            "type": "heatmap",
            "title": "Correlation Heatmap",
            "columns": numeric_cols.tolist(),
            "path": chart_path,
            "config": fig.to_dict(),
            "description": "Shows correlations between all numeric variables"
        })
        
        return charts
    
    def _generate_viz_recommendations(
        self,
        df: pd.DataFrame,
        charts: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Generate visualization recommendations"""
        recommendations = []
        
        # Check for time series data
        for col in df.columns:
            try:
                df[col] = pd.to_datetime(df[col])
                recommendations.append({
                    "type": "time_series",
                    "priority": "high",
                    "title": f"Create time series visualization for {col}",
                    "description": f"Column '{col}' appears to be temporal. Consider line charts to show trends over time.",
                    "suggested_chart": "line"
                })
                break
            except:
                continue
        
        # Check for geographic data
        geo_keywords = ['country', 'state', 'city', 'region', 'location', 'lat', 'lon', 'latitude', 'longitude']
        geo_cols = [col for col in df.columns if any(keyword in col.lower() for keyword in geo_keywords)]
        
        if geo_cols:
            recommendations.append({
                "type": "geographic",
                "priority": "medium",
                "title": "Create geographic visualization",
                "description": f"Geographic columns detected: {', '.join(geo_cols)}. Consider map visualizations.",
                "suggested_chart": "map"
            })
        
        # Suggest additional charts if few were generated
        if len(charts) < 3:
            recommendations.append({
                "type": "exploration",
                "priority": "low",
                "title": "Explore more visualizations",
                "description": "Consider creating additional charts to explore different aspects of your data.",
                "suggested_chart": "various"
            })
        
        return recommendations
