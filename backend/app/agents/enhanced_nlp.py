"""
Enhanced Query Agent Utilities
Provides improved intent classification, entity extraction, and pattern matching.
"""

import re
from typing import Dict, Any, List, Tuple
from difflib import SequenceMatcher
import numpy as np


class EnhancedNLP:
    """Enhanced NLP utilities for better question understanding."""
    
    @staticmethod
    def fuzzy_match(text1: str, text2: str, threshold: float = 0.8) -> bool:
        """
        Fuzzy string matching with configurable threshold.
        
        Args:
            text1: First string
            text2: Second string
            threshold: Similarity threshold (0-1)
            
        Returns:
            True if similarity >= threshold
        """
        similarity = SequenceMatcher(None, text1.lower(), text2.lower()).ratio()
        return similarity >= threshold
    
    @staticmethod
    def extract_numbers(text: str) -> List[Dict[str, Any]]:
        """
        Extract numbers with context (integers, floats, percentages, ranges).
        
        Args:
            text: Input text
            
        Returns:
            List of extracted numbers with metadata
        """
        numbers = []
        
        # Extract percentages
        for match in re.finditer(r'(\d+(?:\.\d+)?)\s*%', text):
            numbers.append({
                'value': float(match.group(1)),
                'type': 'percentage',
                'raw': match.group(0)
            })
        
        # Extract ranges (e.g., "10-20", "10 to 20", "10 and 20")
        for match in re.finditer(r'(\d+(?:\.\d+)?)\s*(?:-|to|and)\s*(\d+(?:\.\d+)?)', text):
            numbers.append({
                'value': (float(match.group(1)), float(match.group(2))),
                'type': 'range',
                'raw': match.group(0)
            })
        
        # Extract floats
        for match in re.finditer(r'\b(\d+\.\d+)\b', text):
            if not any(n['raw'] == match.group(0) for n in numbers):
                numbers.append({
                    'value': float(match.group(1)),
                    'type': 'float',
                    'raw': match.group(0)
                })
        
        # Extract integers
        for match in re.finditer(r'\b(\d+)\b', text):
            if not any(n['raw'] == match.group(0) for n in numbers):
                numbers.append({
                    'value': int(match.group(1)),
                    'type': 'integer',
                    'raw': match.group(0)
                })
        
        return numbers
    
    @staticmethod
    def extract_column_names(text: str, available_columns: List[str], threshold: float = 0.8) -> List[Tuple[str, float]]:
        """
        Extract column names with fuzzy matching and confidence scores.
        
        Args:
            text: Input text
            available_columns: List of available column names
            threshold: Minimum similarity threshold
            
        Returns:
            List of (column_name, confidence) tuples
        """
        matches = []
        text_lower = text.lower()
        # Split text into tokens for better matching against short column names
        text_tokens = re.findall(r'\b\w+\b', text_lower)
        
        for col in available_columns:
            col_lower = col.lower()
            
            # 1. Exact match in text
            if len(col) < 4:
                # Use word boundary for short columns
                if re.search(r'\b' + re.escape(col_lower) + r'\b', text_lower):
                    matches.append((col, 1.0))
                    continue
            else:
                if col_lower in text_lower:
                    matches.append((col, 1.0))
                    continue
            
            # 2. Token-based fuzzy match
            # Check if any word in the text fuzzily matches the column name
            best_token_ratio = 0.0
            for token in text_tokens:
                ratio = SequenceMatcher(None, col_lower, token).ratio()
                if ratio > best_token_ratio:
                    best_token_ratio = ratio
            
            if best_token_ratio >= threshold:
                matches.append((col, best_token_ratio))
                continue

            # 3. Multi-word column match
            # If column has multiple words, check if they appear in text (order not enforced strictly here for simplicity)
            col_words = re.findall(r'\b\w+\b', col_lower)
            if len(col_words) > 1:
                # Count how many words of the column are in the text (fuzzy match)
                matched_words_count = 0
                for col_word in col_words:
                    for token in text_tokens:
                        if SequenceMatcher(None, col_word, token).ratio() >= 0.85:
                            matched_words_count += 1
                            break
                            
                if matched_words_count >= len(col_words) * 0.7:  # 70% of words matched
                    confidence = matched_words_count / len(col_words)
                    matches.append((col, confidence))
                    continue

            # 4. Fallback: n-gram comparison for finding misspellings of the column in the phrase
            # Sliding window of text with size roughly equal to column length
            # Only do this if column is long enough to avoid noise
            if len(col) >= 4:
                # Window size: len(col) +/- 2
                best_window_score = 0.0
                target_len = len(col)
                window_range = range(max(1, target_len - 2), target_len + 3)
                
                for window_len in window_range:
                    for i in range(len(text_lower) - window_len + 1):
                        window = text_lower[i : i + window_len]
                        ratio = SequenceMatcher(None, col_lower, window).ratio()
                        if ratio > best_window_score:
                            best_window_score = ratio
                
                if best_window_score >= threshold:
                    matches.append((col, best_window_score))

        
        # Deduplicate matches (keep highest score)
        unique_matches = {}
        for col, score in matches:
            if col not in unique_matches or score > unique_matches[col]:
                unique_matches[col] = score
                
        final_matches = list(unique_matches.items())
        final_matches.sort(key=lambda x: x[1], reverse=True)
        
        return final_matches
    
    @staticmethod
    def extract_operators(text: str) -> List[str]:
        """
        Extract comparison and aggregation operators.
        
        Args:
            text: Input text
            
        Returns:
            List of operators found
        """
        operators = []
        
        # Comparison operators
        comparisons = {
            r'\b(greater|more|higher|above|over)\b': '>',
            r'\b(less|fewer|lower|below|under)\b': '<',
            r'\b(equal|same|exactly)\b': '==',
            r'\b(not equal|different)\b': '!=',
            r'\b(between)\b': 'BETWEEN',
            r'\b(in|within)\b': 'IN'
        }
        
        for pattern, op in comparisons.items():
            if re.search(pattern, text, re.IGNORECASE):
                operators.append(op)
        
        # Aggregation operators
        aggregations = {
            r'\b(average|mean|avg)\b': 'AVG',
            r'\b(sum|total)\b': 'SUM',
            r'\b(count|number of|how many)\b': 'COUNT',
            r'\b(max|maximum|highest)\b': 'MAX',
            r'\b(min|minimum|lowest)\b': 'MIN',
            r'\b(median|middle)\b': 'MEDIAN',
            r'\b(std|standard deviation)\b': 'STD'
        }
        
        for pattern, op in aggregations.items():
            if re.search(pattern, text, re.IGNORECASE):
                operators.append(op)
        
        return operators


class ImprovedIntentClassifier:
    """Improved intent classification with multi-level matching."""
    
    def __init__(self):
        # Enhanced patterns with weights
        self.intent_patterns = {
            'dataset_size': {
                'exact': ['how many rows', 'dataset size', 'number of rows', 'row count'],
                'keywords': ['rows', 'size', 'count', 'records', 'entries', 'observations'],
                'weight': 1.0
            },
            'columns': {
                'exact': ['what columns', 'column names', 'list columns', 'show columns'],
                'keywords': ['columns', 'fields', 'variables', 'attributes'],
                'weight': 1.0
            },
            'missing_values': {
                'exact': ['missing values', 'missing data', 'null values', 'empty values'],
                'keywords': ['missing', 'null', 'nan', 'empty', 'blank', 'incomplete'],
                'weight': 1.0
            },
            'data_quality': {
                'exact': ['data quality', 'quality score', 'data health'],
                'keywords': ['quality', 'health', 'validity', 'accuracy', 'completeness'],
                'weight': 1.0
            },
            'outliers': {
                'exact': ['outliers', 'anomalies', 'unusual values', 'unusual data'],
                'keywords': ['outlier', 'anomaly', 'unusual', 'extreme', 'abnormal'],
                'weight': 1.0
            },
            'insights': {
                'exact': ['key insights', 'main insights', 'discoveries', 'findings'],
                'keywords': ['insight', 'finding', 'discovery', 'pattern', 'trend'],
                'weight': 1.0
            },
            'correlations': {
                'exact': ['correlations', 'relationships', 'associations'],
                'keywords': ['correlation', 'relationship', 'association', 'connection', 'related'],
                'weight': 1.0
            },
            'recommendations': {
                'exact': ['recommendations', 'suggestions', 'advice'],
                'keywords': ['recommend', 'suggest', 'advice', 'should', 'improve'],
                'weight': 1.0
            },
            'charts': {
                'exact': ['charts', 'visualizations', 'graphs', 'plots'],
                'keywords': ['chart', 'visualization', 'graph', 'plot', 'visual'],
                'weight': 1.0
            },
            'summary': {
                'exact': ['summary', 'overview', 'summarize'],
                'keywords': ['summary', 'overview', 'brief', 'quick'],
                'weight': 1.0
            },
            'statistics': {
                'exact': ['statistics', 'stats', 'statistical analysis'],
                'keywords': ['statistics', 'stats', 'mean', 'median', 'std', 'distribution'],
                'weight': 1.0
            },
            'comparison': {
                'exact': ['compare', 'difference between', 'versus'],
                'keywords': ['compare', 'comparison', 'difference', 'versus', 'vs', 'between'],
                'weight': 1.0
            }
        }
    
    def classify(self, question: str, context: Dict[str, Any] = None) -> Tuple[str, float]:
        """
        Classify question intent with confidence score.
        
        Args:
            question: Normalized question
            context: Optional context for better classification
            
        Returns:
            Tuple of (intent, confidence)
        """
        scores = {}
        
        for intent, patterns in self.intent_patterns.items():
            score = 0.0
            
            # Check exact phrase matches (highest weight)
            for phrase in patterns['exact']:
                if phrase in question:
                    score += 10.0 * patterns['weight']
                    break
            
            # Check keyword matches
            keyword_matches = sum(1 for kw in patterns['keywords'] if kw in question)
            if keyword_matches > 0:
                score += keyword_matches * 2.0 * patterns['weight']
            
            # Fuzzy matching for exact phrases
            if score == 0:  # Only if no exact match
                for phrase in patterns['exact']:
                    similarity = SequenceMatcher(None, phrase, question).ratio()
                    if similarity >= 0.85:
                        score += similarity * 8.0 * patterns['weight']
            
            scores[intent] = score
        
        # Get best match
        if scores:
            best_intent = max(scores, key=scores.get)
            max_score = scores[best_intent]
            
            if max_score > 0:
                # Normalize confidence to 0-1
                confidence = min(max_score / 10.0, 1.0)
                return best_intent, confidence
        
        return 'general', 0.5


# Singleton instances
nlp = EnhancedNLP()
intent_classifier = ImprovedIntentClassifier()
