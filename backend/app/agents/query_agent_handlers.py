def _handle_missing_values(self, question, data_summary, context, entities):
    """Handle missing values questions."""
    data_profiler = context.get('data_profiler', {})
    missing_info = data_profiler.get('missing_values', {})
    
    if missing_info:
        total_missing = sum(missing_info.values())
        if total_missing > 0:
            # Get top columns with missing values
            sorted_missing = sorted(missing_info.items(), key=lambda x: x[1], reverse=True)
            top_missing = [(col, count) for col, count in sorted_missing[:5] if count > 0]
            
            missing_details = "\n".join([f"• **{col}**: {count:,} missing ({count/data_summary.get('num_rows', 1)*100:.1f}%)" 
                                        for col, count in top_missing])
            
            return f"""🔍 **Missing Values Analysis:**

**Total Missing:** {total_missing:,} values across dataset

**Top Columns with Missing Data:**
{missing_details}

💡 **Impact:** Missing data can affect analysis accuracy. Check the **Data Quality** tab for detailed recommendations on handling these gaps."""
        else:
            return """✅ **Excellent News!**

Your dataset has **no missing values**! This indicates high data quality and completeness.

**Benefits:**
• More reliable analysis results
• No need for imputation
• Better statistical power
• Ready for modeling"""
    
    return """📊 **Missing Value Analysis:**

Missing value analysis is being processed. This will show:
• Which columns have missing data
• Percentage of missing values
• Recommendations for handling gaps

Check back in the **Data Quality** tab shortly!"""

def _handle_data_quality(self, question, data_summary, context, entities):
    """Handle data quality questions."""
    data_profiler = context.get('data_profiler', {})
    quality_score = data_profiler.get('quality_score')
    
    if quality_score is not None:
        quality_pct = int(quality_score * 100)
        
        # Determine quality level
        if quality_score >= 0.9:
            quality_label = "Excellent ⭐⭐⭐"
            emoji = "🎉"
            message = "Your data is in excellent condition!"
        elif quality_score >= 0.7:
            quality_label = "Good ⭐⭐"
            emoji = "👍"
            message = "Your data quality is good with minor issues."
        elif quality_score >= 0.5:
            quality_label = "Fair ⭐"
            emoji = "⚠️"
            message = "Your data has some quality issues to address."
        else:
            quality_label = "Needs Improvement"
            emoji = "🔧"
            message = "Significant data quality improvements recommended."
        
        # Get quality metrics
        missing_count = sum(data_profiler.get('missing_values', {}).values())
        outlier_info = data_profiler.get('outliers', {})
        
        return f"""{emoji} **Data Quality Assessment:**

**Overall Score:** {quality_pct}% ({quality_label})

{message}

**Quality Metrics:**
• Missing Values: {missing_count:,}
• Outliers Detected: {len(outlier_info)} columns affected
• Data Completeness: {100 - (missing_count/data_summary.get('num_rows', 1)*100):.1f}%

**Next Steps:**
Check the **Data Quality** tab for detailed metrics and the **Recommendations** tab for improvement suggestions."""
    
    return """📊 **Data Quality Analysis:**

Quality assessment is being calculated based on:
• Data completeness (missing values)
• Data consistency (outliers, anomalies)
• Data types and formats
• Statistical properties

Check the **Data Quality** tab for your comprehensive quality score!"""

def _handle_outliers(self, question, data_summary, context, entities):
    """Handle outlier questions."""
    data_profiler = context.get('data_profiler', {})
    outliers = data_profiler.get('outliers', {})
    
    if outliers:
        # Handle different outlier data structures
        outlier_details = []
        total_outliers = 0
        
        # Check if it's the new nested structure
        if 'columns_with_outliers' in outliers:
            columns_with_outliers = outliers.get('columns_with_outliers', {})
            total_columns = len(columns_with_outliers)
            
            if columns_with_outliers:
                for col, info in list(columns_with_outliers.items())[:5]:
                    if isinstance(info, dict):
                        count = info.get('count', 0)
                        percentage = info.get('percentage', 0) * 100
                        severity = info.get('severity', 'unknown').upper()
                        total_outliers += count
                        outlier_details.append(
                            f"**{col}**\n"
                            f"  • Count: {count} outliers ({percentage:.1f}%)\n"
                            f"  • Severity: {severity}"
                        )
                
                return f"""🔍 **Outlier Detection Results:**

**Outliers Found in {total_columns} Column(s)**

{chr(10).join(outlier_details)}

**Total Outliers:** {total_outliers:,} data points

💡 **What are outliers?**
Outliers are values that differ significantly from other observations. They can indicate:
• Data entry errors
• Measurement errors
• Genuine extreme values
• Interesting anomalies worth investigating

Check the **Data Quality** tab for detailed analysis and handling recommendations."""
            else:
                return """✅ **No Significant Outliers Detected**

Your data appears to be well-distributed without extreme values.

**This means:**
• More reliable statistical analysis
• Better model performance
• Consistent data patterns"""
        
        # Handle simple structure
        else:
            for col, vals in list(outliers.items())[:5]:
                if vals:
                    count = len(vals) if isinstance(vals, (list, tuple)) else vals
                    outlier_details.append(f"• **{col}**: {count} outliers")
                    total_outliers += count
            
            if outlier_details:
                return f"""🔍 **Outlier Detection:**

{chr(10).join(outlier_details)}

**Total:** {total_outliers:,} outlier data points detected

💡 Outliers can indicate data quality issues or interesting patterns. Review the **Data Quality** tab for details."""
    
    return """✅ **No Significant Outliers**

Your data distribution appears normal without extreme values."""

def _handle_insights(self, question, data_summary, context, entities):
    """Handle insights questions."""
    insights = context.get('insight_discovery', {}).get('insights', [])
    
    if insights:
        # Group insights by type
        by_type = {}
        for ins in insights:
            ins_type = ins.get('type', 'general')
            by_type.setdefault(ins_type, []).append(ins)
        
        # Create summary
        type_summary = "\n".join([f"• **{t.title()}**: {len(items)} insights" 
                                    for t, items in by_type.items()])
        
        # Show top insights
        top_insights = "\n\n".join([
            f"**{i+1}. {ins.get('type', 'Insight').title()}**\n{ins.get('description', 'N/A')}\n*Confidence: {ins.get('confidence', 0)*100:.0f}%*"
            for i, ins in enumerate(insights[:3])
        ])
        
        return f"""💡 **Key Insights Discovered ({len(insights)} total):**

**Insight Categories:**
{type_summary}

**Top Insights:**
{top_insights}

🔍 **View all insights** in the **Insights** tab for complete analysis with evidence and recommendations."""
    
    return """💡 **Insight Discovery:**

The insight discovery agent is analyzing your data for:
• Correlations between variables
• Trends and patterns
• Anomalies and outliers
• Statistical relationships

Check the **Insights** tab for discovered patterns!"""

def _handle_correlations(self, question, data_summary, context, entities):
    """Handle correlation questions."""
    correlations = context.get('insight_discovery', {}).get('correlations', [])
    
    if correlations:
        # Sort by correlation strength
        sorted_corr = sorted(correlations, key=lambda x: abs(x.get('correlation', 0)), reverse=True)
        
        corr_list = "\n".join([
            f"• **{c.get('column1', '')}** ↔ **{c.get('column2', '')}**: {c.get('correlation', 0):.3f} "
            f"({'Strong' if abs(c.get('correlation', 0)) > 0.7 else 'Moderate' if abs(c.get('correlation', 0)) > 0.4 else 'Weak'})"
            for c in sorted_corr[:5]
        ])
        
        return f"""📊 **Correlation Analysis:**

**Top Correlations Found:**
{corr_list}

**Understanding Correlations:**
• **+1.0**: Perfect positive correlation
• **0.0**: No correlation
• **-1.0**: Perfect negative correlation
• **>0.7**: Strong relationship
• **0.4-0.7**: Moderate relationship
• **<0.4**: Weak relationship

🔍 View the correlation heatmap in the **Charts** tab for visual analysis!"""
    
    return """📊 **Correlation Analysis:**

Correlation analysis examines relationships between numerical columns.

**What to expect:**
• Pearson correlation coefficients
• Strength of relationships
• Visual correlation matrix

Check the **Insights** tab for discovered correlations!"""

def _handle_recommendations(self, question, data_summary, context, entities):
    """Handle recommendation questions."""
    recommendations = context.get('recommendation', {}).get('recommendations', [])
    
    if recommendations:
        # Group by priority
        by_priority = {}
        for rec in recommendations:
            priority = rec.get('priority', 'medium')
            by_priority.setdefault(priority, []).append(rec)
        
        # Show high priority recommendations
        high_priority = by_priority.get('critical', []) + by_priority.get('high', [])
        
        if high_priority:
            rec_list = "\n\n".join([
                f"**{i+1}. {rec.get('title', 'Recommendation')}** (Priority: {rec.get('priority', 'medium').title()})\n"
                f"{rec.get('description', 'N/A')}"
                for i, rec in enumerate(high_priority[:3])
            ])
            
            return f"""💡 **Recommendations ({len(recommendations)} total):**

**High Priority Actions:**
{rec_list}

**Priority Breakdown:**
• Critical: {len(by_priority.get('critical', []))}
• High: {len(by_priority.get('high', []))}
• Medium: {len(by_priority.get('medium', []))}
• Low: {len(by_priority.get('low', []))}

🎯 View all recommendations in the **Recommendations** tab with detailed action steps!"""
        
        rec_list = "\n\n".join([
            f"**{i+1}. {rec.get('title', 'Recommendation')}**\n{rec.get('description', 'N/A')}"
            for i, rec in enumerate(recommendations[:3])
        ])
        
        return f"""💡 **Recommendations ({len(recommendations)} total):**

{rec_list}

🎯 View all recommendations in the **Recommendations** tab!"""
    
    return """💡 **Recommendations:**

The recommendation agent is generating suggestions based on:
• Data quality issues
• Analysis opportunities
• Feature engineering ideas
• Best practices

Check the **Recommendations** tab for actionable advice!"""

def _handle_charts(self, question, data_summary, context, entities):
    """Handle chart/visualization questions."""
    charts = context.get('visualization', {}).get('charts', [])
    
    if charts:
        chart_list = "\n".join([f"• {c.get('title', 'Chart')}" for c in charts[:8]])
        more = f"\n\n*...and {len(charts) - 8} more visualizations*" if len(charts) > 8 else ""
        
        return f"""📊 **Visualizations Created ({len(charts)} total):**

{chart_list}{more}

**Available Chart Types:**
• Distribution plots
• Correlation heatmaps
• Scatter plots
• Bar charts
• Time series (if applicable)

🎨 View all charts in the **Charts** tab. You can also create custom charts using the chart builder!"""
    
    return """📊 **Visualizations:**

Charts are being generated for your data including:
• Distribution analysis
• Correlation heatmaps
• Relationship plots
• Statistical visualizations

Check the **Charts** tab to view them!"""

def _handle_summary(self, question, data_summary, context, entities):
    """Handle summary/overview questions."""
    num_rows = data_summary.get('num_rows', 0)
    num_cols = data_summary.get('num_columns', 0)
    memory = data_summary.get('memory_usage', 'N/A')
    
    data_profiler = context.get('data_profiler', {})
    quality_score = data_profiler.get('quality_score', 0)
    quality_pct = int(quality_score * 100) if quality_score else 0
    
    insights = context.get('insight_discovery', {}).get('insights', [])
    recommendations = context.get('recommendation', {}).get('recommendations', [])
    charts = context.get('visualization', {}).get('charts', [])
    
    columns = data_summary.get('columns', [])
    missing_count = sum(data_profiler.get('missing_values', {}).values())
    
    return f"""📊 **Complete Dataset Overview:**

**Dataset Dimensions:**
• **Rows:** {num_rows:,} records
• **Columns:** {num_cols} features
• **Memory:** {memory}

**Data Quality:**
• **Quality Score:** {quality_pct}%
• **Missing Values:** {missing_count:,}
• **Completeness:** {100 - (missing_count/num_rows*100) if num_rows > 0 else 100:.1f}%
    
**Analysis Results:**
• 🔍 **Insights:** {len(insights)} discovered
• 💡 **Recommendations:** {len(recommendations)} available
• 📊 **Charts:** {len(charts)} created

**Sample Columns:**
{', '.join(columns[:5])}{'...' if len(columns) > 5 else ''}

**Explore More:**
• **Data Quality** tab for detailed metrics
• **Insights** tab for discovered patterns
• **Recommendations** tab for actionable advice
• **Charts** tab for visualizations

Ask me specific questions about any aspect of your data!"""
