"""
Query Agent - LLM-powered natural language question answering agent.

This agent uses OpenAI's GPT models to answer questions about analyzed data.
It provides context-aware responses based on the analysis results.
"""

import os
import json
from typing import Dict, Any, List, Optional
from datetime import datetime
import pandas as pd

from .base_agent import BaseAgent

# Try to import OpenAI, but make it optional
try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    print("Warning: OpenAI library not installed. Query Agent will use fallback mode.")


class QueryAgent(BaseAgent):
    """
    LLM-powered Query Agent for natural language question answering.
    
    Features:
    - Natural language question answering
    - Context-aware responses based on analysis results
    - Data-driven insights
    - Citation of sources
    - Fallback mode when API is unavailable
    """
    
    def __init__(self, api_key: Optional[str] = None, model: str = "gpt-3.5-turbo"):
        """
        Initialize Query Agent.
        
        Args:
            api_key: OpenAI API key (optional, will try env var)
            model: OpenAI model to use (default: gpt-3.5-turbo)
        """
        super().__init__(
            name="Query Agent",
            description="LLM-powered natural language question answering agent"
        )
        
        # Try to get API key from parameter or environment
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.model = model
        
        # Initialize OpenAI client if available and API key exists
        self.client = None
        if OPENAI_AVAILABLE and self.api_key:
            try:
                self.client = OpenAI(api_key=self.api_key)
                # Note: emit_activity is called after initialization
            except Exception as e:
                # Note: emit_activity is called after initialization
                pass
        # Note: Status messages will be logged during analyze() method
    
    def analyze(self, data: pd.DataFrame, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Prepare the agent for answering questions.
        
        Args:
            data: The dataset being analyzed
            context: Analysis context from other agents
            
        Returns:
            Agent status and capabilities
        """
        # Query Agent is ready for questions
        
        # Store data summary for context
        self.data_summary = self._create_data_summary(data)
        self.analysis_context = context
        
        result = {
            "status": "ready",
            "model": self.model if self.client else "fallback",
            "capabilities": {
                "natural_language_qa": True,
                "data_insights": True,
                "context_aware": True,
                "llm_powered": self.client is not None
            },
            "data_summary": self.data_summary
        }
        
        # Agent is ready
        return result
    
    def answer_question(
        self, 
        question: str, 
        data: Optional[pd.DataFrame] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Answer a natural language question about the data.
        
        Args:
            question: User's question
            data: The dataset (optional, uses stored summary if not provided)
            context: Additional context (optional, uses stored context if not provided)
            
        Returns:
            Answer with confidence, sources, and metadata
        """
        # Processing question
        
        # Use stored context if not provided
        if context is None:
            context = getattr(self, 'analysis_context', {})
        
        # Create data summary if data provided
        if data is not None:
            data_summary = self._create_data_summary(data)
        else:
            data_summary = getattr(self, 'data_summary', {})
        
        # Use LLM if available, otherwise use fallback
        if self.client:
            answer = self._llm_answer(question, data_summary, context)
        else:
            answer = self._fallback_answer(question, data_summary, context)
        
        # Question answered
        return answer
    
    def _llm_answer(
        self, 
        question: str, 
        data_summary: Dict[str, Any],
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Use LLM to answer the question.
        
        Args:
            question: User's question
            data_summary: Summary of the dataset
            context: Analysis context
            
        Returns:
            LLM-generated answer
        """
        try:
            # Build context for the LLM
            system_prompt = self._build_system_prompt(data_summary, context)
            
            # Call OpenAI API
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": question}
                ],
                temperature=0.7,
                max_tokens=500
            )
            
            answer_text = response.choices[0].message.content
            
            return {
                "answer": answer_text,
                "confidence": 0.85,  # Could be enhanced with confidence scoring
                "source": "llm",
                "model": self.model,
                "timestamp": datetime.now().isoformat(),
                "question": question
            }
            
        except Exception as e:
            # LLM error, using fallback
            return self._fallback_answer(question, data_summary, context)
    
    def _fallback_answer(
        self, 
        question: str, 
        data_summary: Dict[str, Any],
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Provide a rule-based answer when LLM is unavailable.
        
        Args:
            question: User's question
            data_summary: Summary of the dataset
            context: Analysis context
            
        Returns:
            Rule-based answer
        """
        question_lower = question.lower()
        
        # Extract useful information
        num_rows = data_summary.get('num_rows', 0)
        num_cols = data_summary.get('num_columns', 0)
        columns = data_summary.get('columns', [])
        
        # Get analysis results
        data_profiler = context.get('data_profiler', {})
        insights = context.get('insight_discovery', {}).get('insights', [])
        recommendations = context.get('recommendation', {}).get('recommendations', [])
        charts = context.get('visualization', {}).get('charts', [])
        
        # Question pattern matching with better responses
        
        # Dataset size questions
        if any(word in question_lower for word in ['how many rows', 'how many records', 'dataset size', 'data size', 'number of rows']):
            answer = f"Your dataset contains **{num_rows:,} rows** and **{num_cols} columns**."
        
        # Column questions
        elif any(word in question_lower for word in ['what columns', 'list columns', 'column names', 'features', 'variables']):
            if columns:
                col_list = "\n".join([f"{i+1}. {col}" for i, col in enumerate(columns)])
                answer = f"Your dataset has **{num_cols} columns**:\n\n{col_list}"
            else:
                answer = "Column information is not available."
        
        # Missing values questions
        elif any(word in question_lower for word in ['missing', 'null', 'empty', 'nan']):
            missing_info = data_profiler.get('missing_values', {})
            if missing_info:
                total_missing = sum(missing_info.values())
                if total_missing > 0:
                    missing_details = "\n".join([f"• {col}: {count} missing" for col, count in list(missing_info.items())[:5] if count > 0])
                    answer = f"Found **{total_missing:,} missing values** across the dataset:\n\n{missing_details}"
                else:
                    answer = "Great news! Your dataset has **no missing values**. ✓"
            else:
                answer = "Missing value analysis is not available yet."
        
        # Data quality questions
        elif any(word in question_lower for word in ['quality', 'data quality', 'quality score']):
            quality_score = data_profiler.get('quality_score')
            if quality_score is not None:
                quality_pct = int(quality_score * 100)
                if quality_score >= 0.9:
                    quality_label = "Excellent"
                elif quality_score >= 0.7:
                    quality_label = "Good"
                elif quality_score >= 0.5:
                    quality_label = "Fair"
                else:
                    quality_label = "Needs Improvement"
                
                answer = f"**Data Quality Score: {quality_pct}%** ({quality_label})\n\nThis score is based on factors like missing values, outliers, and data consistency."
            else:
                answer = "Data quality analysis is being processed. Try asking about specific quality metrics like missing values or outliers."
        
        # Outliers questions
        elif any(word in question_lower for word in ['outlier', 'anomal', 'unusual']):
            outliers = data_profiler.get('outliers', {})
            
            if outliers:
                # Handle different outlier data structures
                outlier_details = []
                total_outliers = 0
                
                # Check if it's the new nested structure
                if 'columns_with_outliers' in outliers:
                    columns_with_outliers = outliers.get('columns_with_outliers', {})
                    total_columns = outliers.get('total_outlier_columns', len(columns_with_outliers))
                    
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
                        
                        answer = f"""**Outliers Detected in {total_columns} Column(s):**

{chr(10).join(outlier_details)}

**Total Outliers:** {total_outliers} data points

💡 *Outliers are values that differ significantly from other observations. High severity outliers may indicate data quality issues or interesting anomalies worth investigating.*"""
                    else:
                        answer = "No significant outliers were detected in your dataset."
                
                # Handle simple structure (dict of lists or counts)
                else:
                    for col, vals in list(outliers.items())[:5]:
                        if vals:
                            # Handle both list and integer formats
                            count = len(vals) if isinstance(vals, (list, tuple)) else vals
                            outlier_details.append(f"• **{col}**: {count} outliers")
                            total_outliers += count
                    
                    if outlier_details:
                        answer = f"""**Outliers Detected:**

{chr(10).join(outlier_details)}

**Total:** {total_outliers} outlier data points

💡 *Outliers are values that differ significantly from other observations.*"""
                    else:
                        answer = "No significant outliers were detected in your dataset."
            else:
                answer = "No significant outliers were detected in your dataset."
        
        # Insights questions
        elif any(word in question_lower for word in ['insight', 'finding', 'discover', 'trend', 'pattern', 'what did you find']):
            if insights:
                insight_list = "\n\n".join([f"**{i+1}. {ins.get('type', 'Insight').title()}**\n{ins.get('description', 'N/A')}" for i, ins in enumerate(insights[:5])])
                answer = f"I discovered **{len(insights)} key insights** from your data:\n\n{insight_list}"
            else:
                answer = "The insight discovery analysis is still processing. Please check back in a moment."
        
        # Correlation questions
        elif any(word in question_lower for word in ['correlation', 'relationship', 'related', 'connected']):
            correlations = context.get('insight_discovery', {}).get('correlations', [])
            if correlations:
                corr_list = "\n".join([f"• {c.get('column1', '')} ↔ {c.get('column2', '')}: {c.get('correlation', 0):.2f}" for c in correlations[:5]])
                answer = f"**Correlations found** in your data:\n\n{corr_list}\n\nValues close to 1 or -1 indicate strong relationships."
            else:
                answer = "No significant correlations were found in the numerical columns."
        
        # Recommendations questions
        elif any(word in question_lower for word in ['recommend', 'suggestion', 'should', 'what next', 'advice', 'improve']):
            if recommendations:
                rec_list = "\n\n".join([f"**{i+1}. {rec.get('title', 'Recommendation')}** (Priority: {rec.get('priority', 'medium').title()})\n{rec.get('description', 'N/A')}" for i, rec in enumerate(recommendations[:5])])
                answer = f"I have **{len(recommendations)} recommendations** for you:\n\n{rec_list}"
            else:
                answer = "Recommendations are being generated based on your data analysis."
        
        # Chart/visualization questions
        elif any(word in question_lower for word in ['chart', 'graph', 'visual', 'plot']):
            if charts:
                chart_list = "\n".join([f"• {c.get('title', 'Chart')}" for c in charts[:5]])
                answer = f"**{len(charts)} visualizations** were created:\n\n{chart_list}\n\nCheck the 'Charts' tab to view them."
            else:
                answer = "Visualizations are being generated for your data."
        
        # Summary/overview questions
        elif any(word in question_lower for word in ['summary', 'overview', 'tell me about', 'describe', 'what is']):
            # Comprehensive overview
            quality_score = data_profiler.get('quality_score', 0)
            quality_pct = int(quality_score * 100) if quality_score else 0
            
            answer = f"""**Dataset Overview:**

📊 **Size:** {num_rows:,} rows × {num_cols} columns
📈 **Quality Score:** {quality_pct}%
🔍 **Insights:** {len(insights)} discovered
💡 **Recommendations:** {len(recommendations)} available
📉 **Charts:** {len(charts)} created

**Columns:** {', '.join(columns[:5])}{'...' if len(columns) > 5 else ''}

**Quick Stats:**
• Missing values: {sum(data_profiler.get('missing_values', {}).values())}
• Outliers detected: {sum(len(v) if isinstance(v, (list, tuple)) else v for v in data_profiler.get('outliers', {}).values() if v)}

Ask me specific questions about insights, recommendations, or data quality!"""
        
        # Help/what can you do questions
        elif any(word in question_lower for word in ['help', 'what can you', 'how to', 'guide']):
            answer = """**I can help you understand your data!** Here's what you can ask:

📊 **Dataset Information:**
• "How many rows are in the dataset?"
• "What columns are available?"

🔍 **Data Quality:**
• "What's the data quality score?"
• "Are there any missing values?"
• "Tell me about outliers"

💡 **Insights & Analysis:**
• "What are the main insights?"
• "What correlations exist?"
• "What trends did you find?"

✅ **Recommendations:**
• "What recommendations do you have?"
• "What should I do next?"

📈 **Visualizations:**
• "What charts were created?"

Just ask naturally - I'll do my best to help!"""
        
        # Default fallback
        else:
            answer = f"""I can help you with that! Here's what I know about your data:

**Dataset:** {num_rows:,} rows × {num_cols} columns
**Analysis:** {len(insights)} insights, {len(recommendations)} recommendations

**Try asking:**
• "What are the main insights?"
• "What's the data quality?"
• "What recommendations do you have?"
• "Tell me about missing values"
• "What columns are in the dataset?"

Or just ask me anything about your data!"""
        
        return {
            "answer": answer,
            "confidence": 0.75,  # Increased confidence for better responses
            "source": "rule_based",
            "model": "fallback",
            "timestamp": datetime.now().isoformat(),
            "question": question,
            "note": "Using intelligent rule-based responses. For AI-powered answers, configure OpenAI API key."
        }
    
    def _build_system_prompt(
        self, 
        data_summary: Dict[str, Any],
        context: Dict[str, Any]
    ) -> str:
        """
        Build the system prompt for the LLM.
        
        Args:
            data_summary: Summary of the dataset
            context: Analysis context
            
        Returns:
            System prompt string
        """
        prompt = f"""You are an expert data analyst assistant. You help users understand their data by answering questions based on analysis results.

Dataset Information:
- Rows: {data_summary.get('num_rows', 'unknown')}
- Columns: {data_summary.get('num_columns', 'unknown')}
- Column Names: {', '.join(data_summary.get('columns', [])[:10])}

"""
        
        # Add data quality info if available
        if 'data_profiler' in context:
            profiler = context['data_profiler']
            prompt += f"""Data Quality:
- Quality Score: {profiler.get('quality_score', 'N/A')}
- Missing Values: {json.dumps(profiler.get('missing_values', {}), indent=2)}
- Data Types: {json.dumps(profiler.get('data_types', {}), indent=2)}

"""
        
        # Add insights if available
        if 'insight_discovery' in context:
            insights = context['insight_discovery'].get('insights', [])
            if insights:
                prompt += f"""Key Insights Found:
"""
                for i, insight in enumerate(insights[:3], 1):
                    prompt += f"{i}. {insight.get('description', 'N/A')}\n"
                prompt += "\n"
        
        # Add recommendations if available
        if 'recommendation' in context:
            recommendations = context['recommendation'].get('recommendations', [])
            if recommendations:
                prompt += f"""Recommendations:
"""
                for i, rec in enumerate(recommendations[:3], 1):
                    prompt += f"{i}. {rec.get('title', 'N/A')}: {rec.get('description', 'N/A')}\n"
                prompt += "\n"
        
        prompt += """Instructions:
- Answer questions clearly and concisely
- Use the provided data and analysis results
- If you don't have specific information, say so
- Provide actionable insights when possible
- Be helpful and professional
"""
        
        return prompt
    
    def _create_data_summary(self, data: pd.DataFrame) -> Dict[str, Any]:
        """
        Create a summary of the dataset.
        
        Args:
            data: The dataset
            
        Returns:
            Summary dictionary
        """
        return {
            "num_rows": len(data),
            "num_columns": len(data.columns),
            "columns": data.columns.tolist(),
            "dtypes": {col: str(dtype) for col, dtype in data.dtypes.items()},
            "memory_usage": f"{data.memory_usage(deep=True).sum() / 1024 / 1024:.2f} MB"
        }
