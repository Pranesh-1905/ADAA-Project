"""
Query Agent - Enhanced LLM-powered natural language question answering agent.

This agent uses OpenAI's GPT models with advanced NLP techniques to answer
questions about analyzed data. Features include:
- Fuzzy matching for better question understanding
- Response caching for improved performance
- Semantic similarity for intent detection
- Context-aware responses with citations
- Natural conversational tone
"""

import os
import json
import re
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timedelta
from functools import lru_cache
import pandas as pd

from .base_agent import BaseAgent

# Try to import OpenAI, but make it optional
try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    print("Warning: OpenAI library not installed. Query Agent will use fallback mode.")

# Enhanced utilities
try:
    from .enhanced_nlp import nlp, intent_classifier
    ENHANCED_NLP_AVAILABLE = True
except ImportError:
    ENHANCED_NLP_AVAILABLE = False
    print("Warning: Enhanced NLP not available. using basic fallback.")

try:
    from app.utils.performance_monitor import track_performance
    from app.utils.cache_manager import cached
    PERFORMANCE_TOOLS_AVAILABLE = True
except ImportError:
    PERFORMANCE_TOOLS_AVAILABLE = False
    print("Warning: Performance tools not available.")

# Response cache for frequently asked questions
RESPONSE_CACHE = {}
CACHE_EXPIRY = timedelta(minutes=30)


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
        Initialize Enhanced Query Agent.
        
        Args:
            api_key: OpenAI API key (optional, will try env var)
            model: OpenAI model to use (default: gpt-3.5-turbo)
        """
        super().__init__(
            name="Enhanced Query Agent",
            description="Advanced NLP-powered question answering with caching and fuzzy matching"
        )
        
        # Try to get API key from parameter or environment
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.model = model
        
        # Initialize OpenAI client if available and API key exists
        self.client = None
        if OPENAI_AVAILABLE and self.api_key:
            try:
                self.client = OpenAI(api_key=self.api_key)
            except Exception as e:
                pass
        
        # Initialize NLP components
        self.question_patterns = self._build_question_patterns()
        self.response_cache = {}
    
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
    
    @track_performance("answer_question")
    def answer_question(
        self, 
        question: str, 
        data: Optional[pd.DataFrame] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Answer a natural language question about the data with enhanced NLP.
        
        Args:
            question: User's question
            data: The dataset (optional, uses stored summary if not provided)
            context: Additional context (optional, uses stored context if not provided)
            
        Returns:
            Answer with confidence, sources, and metadata
        """
        # Normalize and preprocess question
        normalized_question = self._normalize_question(question)
        
        # Check cache first
        cache_key = self._get_cache_key(normalized_question, context)
        cached_response = self._get_cached_response(cache_key)
        if cached_response:
            cached_response['from_cache'] = True
            return cached_response
        
        # Use stored context if not provided
        if context is None:
            context = getattr(self, 'analysis_context', {})
        
        # Create data summary if data provided
        if data is not None:
            data_summary = self._create_data_summary(data)
        else:
            data_summary = getattr(self, 'data_summary', {})
        
        # Classify question intent
        intent = self._classify_question(normalized_question)
        
        # Use LLM if available, otherwise use enhanced fallback
        if self.client:
            answer = self._llm_answer(normalized_question, data_summary, context, intent)
        else:
            answer = self._enhanced_fallback_answer(normalized_question, data_summary, context, intent)
        
        # Cache the response
        self._cache_response(cache_key, answer)
        
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
    
    # ===================================================================
    # ENHANCED NLP METHODS
    # ===================================================================
    
    def _normalize_question(self, question: str) -> str:
        """
        Normalize question for better matching.
        
        Args:
            question: Raw question
            
        Returns:
            Normalized question
        """
        # Remove extra whitespace
        question = ' '.join(question.split())
        
        # Remove trailing question marks and punctuation
        question = question.rstrip('?!.,')
        
        # Convert to lowercase for matching
        return question.lower().strip()
    
    def _get_cache_key(self, question: str, context: Dict[str, Any]) -> str:
        """
        Generate cache key for question.
        
        Args:
            question: Normalized question
            context: Analysis context
            
        Returns:
            Cache key
        """
        # Use question + context hash for cache key
        context_hash = hash(json.dumps(context.get('filename', ''), sort_keys=True))
        return f"{question}_{context_hash}"
    
    def _get_cached_response(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """
        Get cached response if available and not expired.
        
        Args:
            cache_key: Cache key
            
        Returns:
            Cached response or None
        """
        if cache_key in self.response_cache:
            cached_data = self.response_cache[cache_key]
            if datetime.now() - cached_data['timestamp'] < CACHE_EXPIRY:
                return cached_data['response']
            else:
                # Expired, remove from cache
                del self.response_cache[cache_key]
        return None
    
    def _cache_response(self, cache_key: str, response: Dict[str, Any]) -> None:
        """
        Cache response for future use.
        
        Args:
            cache_key: Cache key
            response: Response to cache
        """
        self.response_cache[cache_key] = {
            'response': response,
            'timestamp': datetime.now()
        }
    
    def _build_question_patterns(self) -> Dict[str, List[str]]:
        """
        Build comprehensive question patterns for intent classification.
        
        Returns:
            Dictionary of intent patterns
        """
        return {
            'dataset_size': [
                'how many rows', 'how many records', 'dataset size', 'data size',
                'number of rows', 'row count', 'record count', 'how big',
                'size of dataset', 'how much data'
            ],
            'columns': [
                'what columns', 'list columns', 'column names', 'features',
                'variables', 'fields', 'what fields', 'column list',
                'show columns', 'available columns'
            ],
            'missing_values': [
                'missing', 'null', 'empty', 'nan', 'missing values',
                'null values', 'incomplete', 'gaps in data', 'missing data'
            ],
            'data_quality': [
                'quality', 'data quality', 'quality score', 'how good',
                'data health', 'quality metrics', 'data condition'
            ],
            'outliers': [
                'outlier', 'anomal', 'unusual', 'strange', 'weird',
                'abnormal', 'exceptional', 'extreme values'
            ],
            'insights': [
                'insight', 'finding', 'discover', 'trend', 'pattern',
                'what did you find', 'key findings', 'main insights',
                'important findings', 'discoveries'
            ],
            'correlations': [
                'correlation', 'relationship', 'related', 'connected',
                'association', 'linked', 'dependency', 'connection'
            ],
            'recommendations': [
                'recommend', 'suggestion', 'should', 'what next',
                'advice', 'improve', 'what to do', 'next steps'
            ],
            'charts': [
                'chart', 'graph', 'visual', 'plot', 'visualization',
                'diagram', 'figure', 'show me'
            ],
            'summary': [
                'summary', 'overview', 'tell me about', 'describe',
                'what is', 'explain', 'give me', 'show me everything'
            ],
            'statistics': [
                'average', 'mean', 'median', 'mode', 'std', 'variance',
                'min', 'max', 'statistics', 'stats', 'distribution'
            ],
            'comparison': [
                'compare', 'difference', 'versus', 'vs', 'between',
                'contrast', 'which is better', 'higher', 'lower'
            ]
        }
    
    @cached()
    @track_performance("intent_classification")
    def _classify_question(self, question: str) -> str:
        """
        Classify question intent using enhanced NLP.
        
        Args:
            question: Normalized question
            
        Returns:
            Intent category
        """
        if ENHANCED_NLP_AVAILABLE:
            intent, confidence = intent_classifier.classify(question)
            return intent
            
        # Fallback to basic classification
        scores = {}
        for intent, patterns in self.question_patterns.items():
            score = 0
            for pattern in patterns:
                if pattern in question:
                    # Exact match gets higher score
                    score += 2
                elif any(word in question for word in pattern.split()):
                    # Partial match gets lower score
                    score += 1
            scores[intent] = score
        
        # Return intent with highest score
        if scores:
            max_intent = max(scores, key=scores.get)
            if scores[max_intent] > 0:
                return max_intent
        
        return 'general'
    
    def _extract_entities(self, question: str, data_summary: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract entities with enhanced NLP.
        
        Args:
            question: Normalized question
            data_summary: Data summary
            
        Returns:
            Extracted entities
        """
        columns = data_summary.get('columns', [])
        
        if ENHANCED_NLP_AVAILABLE:
            column_matches = nlp.extract_column_names(question, columns)
            numbers = nlp.extract_numbers(question)
            operators = nlp.extract_operators(question)
            
            return {
                'columns': [col for col, conf in column_matches],
                'column_confidences': {col: conf for col, conf in column_matches},
                'numbers': [n['value'] for n in numbers],
                'number_details': numbers,
                'operators': operators,
                'keywords': []
            }
            
        # Fallback extraction
        entities = {
            'columns': [],
            'numbers': [],
            'keywords': []
        }
        
        # Extract column names mentioned in question
        for col in columns:
            if col.lower() in question:
                entities['columns'].append(col)
        
        # Extract numbers
        numbers = re.findall(r'\d+', question)
        entities['numbers'] = [int(n) for n in numbers]
        
        return entities
    
    def _enhanced_fallback_answer(
        self,
        question: str,
        data_summary: Dict[str, Any],
        context: Dict[str, Any],
        intent: str
    ) -> Dict[str, Any]:
        """
        Enhanced fallback with intent-based routing and better responses.
        
        Args:
            question: Normalized question
            data_summary: Summary of the dataset
            context: Analysis context
            intent: Classified intent
            
        Returns:
            Enhanced answer
        """
        # Extract entities from question
        entities = self._extract_entities(question, data_summary)
        
        # Route to specialized handler based on intent
        handlers = {
            'dataset_size': self._handle_dataset_size,
            'columns': self._handle_columns,
            'missing_values': self._handle_missing_values,
            'data_quality': self._handle_data_quality,
            'outliers': self._handle_outliers,
            'insights': self._handle_insights,
            'correlations': self._handle_correlations,
            'recommendations': self._handle_recommendations,
            'charts': self._handle_charts,
            'summary': self._handle_summary,
            'statistics': self._handle_statistics,
            'comparison': self._handle_comparison,
        }
        
        handler = handlers.get(intent, self._handle_general)
        answer_text = handler(question, data_summary, context, entities)
        
        return {
            "answer": answer_text,
            "confidence": 0.85,  # Higher confidence for intent-based answers
            "source": "enhanced_rule_based",
            "model": "intent_classifier",
            "timestamp": datetime.now().isoformat(),
            "question": question,
            "intent": intent,
            "note": "Using advanced NLP with intent classification. Configure OpenAI API key for AI-powered responses."
        }
    
    # Intent-specific handlers
    def _handle_dataset_size(self, question, data_summary, context, entities):
        num_rows = data_summary.get('num_rows', 0)
        num_cols = data_summary.get('num_columns', 0)
        memory = data_summary.get('memory_usage', 'N/A')
        
        return f"""📊 **Dataset Size Overview:**

• **Rows:** {num_rows:,} records
• **Columns:** {num_cols} features
• **Memory Usage:** {memory}

This dataset contains a total of **{num_rows:,} data points** across **{num_cols} dimensions**."""
    
    def _handle_columns(self, question, data_summary, context, entities):
        columns = data_summary.get('columns', [])
        num_cols = len(columns)
        dtypes = data_summary.get('dtypes', {})
        
        # Group by data type
        type_groups = {}
        for col, dtype in dtypes.items():
            type_groups.setdefault(dtype, []).append(col)
        
        col_list = "\n".join([f"{i+1}. **{col}** ({dtypes.get(col, 'unknown')})" 
                              for i, col in enumerate(columns[:15])])
        
        type_summary = "\n".join([f"• {dtype}: {len(cols)} columns" 
                                  for dtype, cols in type_groups.items()])
        
        more = f"\n\n*...and {num_cols - 15} more columns*" if num_cols > 15 else ""
        
        return f"""📋 **Dataset Columns ({num_cols} total):**

**Column List:**
{col_list}{more}

**Data Type Distribution:**
{type_summary}"""
    
    def _handle_statistics(self, question, data_summary, context, entities):
        # Extract specific column if mentioned
        mentioned_cols = entities.get('columns', [])
        
        if mentioned_cols:
            col = mentioned_cols[0]
            return f"""📈 **Statistics for '{col}':**

To get detailed statistics for this column, check the **Summary Stats** tab in the analysis results.

**Available metrics:**
• Count, Mean, Median
• Standard Deviation
• Min, Max, Quartiles
• Distribution analysis"""
        
        return """📈 **Statistical Analysis:**

Your dataset has been analyzed with comprehensive statistics available in the **Summary Stats** tab.

**Key statistical measures include:**
• Central tendency (mean, median, mode)
• Dispersion (std, variance, range)
• Distribution shape
• Quartile analysis

Ask about a specific column for detailed statistics!"""
    
    def _handle_comparison(self, question, data_summary, context, entities):
        mentioned_cols = entities.get('columns', [])
        
        if len(mentioned_cols) >= 2:
            col1, col2 = mentioned_cols[0], mentioned_cols[1]
            return f"""🔄 **Comparing '{col1}' vs '{col2}':**

Check the **Insights** tab for correlation analysis between these columns.

**What to look for:**
• Correlation coefficient
• Scatter plot relationship
• Trend analysis
• Statistical significance"""
        
        return """🔄 **Column Comparison:**

To compare columns, check:
• **Insights** tab for correlations
• **Charts** tab for visual comparisons
• **Summary Stats** for statistical differences

Mention specific column names for targeted comparison!"""
    
    def _handle_general(self, question, data_summary, context, entities):
        num_rows = data_summary.get('num_rows', 0)
        num_cols = data_summary.get('num_columns', 0)
        
        insights = context.get('insight_discovery', {}).get('insights', [])
        recommendations = context.get('recommendation', {}).get('recommendations', [])
        
        return f"""💬 **I'm here to help!**

**About your data:**
• {num_rows:,} rows × {num_cols} columns
• {len(insights)} insights discovered
• {len(recommendations)} recommendations available

**Try asking:**
• "What are the main insights?"
• "What's the data quality score?"
• "Are there any missing values?"
• "What columns are in the dataset?"
• "Show me the correlations"
• "What recommendations do you have?"

I can help you understand patterns, trends, and quality issues in your data!"""

    def _handle_missing_values(self, question, data_summary, context, entities):
        """Handle missing values questions."""
        data_profiler = context.get('data_profiler', {})
        missing_info = data_profiler.get('missing_values', {})
        
        # Handle structured output
        if isinstance(missing_info, dict) and 'columns_with_missing' in missing_info:
            total_missing = missing_info.get('total_missing_cells', 0)
            columns_missing = missing_info.get('columns_with_missing', {})
            
            if total_missing > 0:
                # Format using structured info
                items = []
                for col, info in columns_missing.items():
                    count = info.get('count', 0) if isinstance(info, dict) else info
                    items.append((col, count))
                
                sorted_missing = sorted(items, key=lambda x: x[1], reverse=True)
                top_missing = sorted_missing[:5]
                
                missing_details = "\n".join([
                    f"• **{col}**: {count:,} missing" 
                     for col, count in top_missing
                ])
                
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
                             
        # Legacy/Simple fallback
        if missing_info:
            try:
                values = [v for v in missing_info.values() if isinstance(v, (int, float))]
                total_missing = sum(values)
                
                if total_missing > 0:
                    sorted_missing = sorted(
                        [(k, v) for k, v in missing_info.items() if isinstance(v, (int, float))], 
                        key=lambda x: x[1], 
                        reverse=True
                    )
                    top_missing = sorted_missing[:5]
                    
                    # ... reuse formatting if needed, simplified for fallback
                    return f"Found {total_missing} missing values. Top columns: " + ", ".join([f"{k} ({v})" for k, v in top_missing])
            except Exception as e:
                pass

        if not missing_info or (isinstance(missing_info, dict) and not missing_info):
             return """✅ **Excellent News!**

Your dataset appears to have **no missing values**!"""

        return """📊 **Missing Value Analysis:**

Missing value analysis data is available but in an unexpected format. Please check the Data Quality dashboard."""
        
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
            missing_info = data_profiler.get('missing_values', {})
            if isinstance(missing_info, dict) and 'total_missing_cells' in missing_info:
                missing_count = missing_info.get('total_missing_cells', 0)
            else:
                missing_count = sum(v for v in missing_info.values() if isinstance(v, (int, float)))
            
            outlier_info = data_profiler.get('outliers', {})
            if 'columns_with_outliers' in outlier_info:
                outlier_info = outlier_info.get('columns_with_outliers', {})
            
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
