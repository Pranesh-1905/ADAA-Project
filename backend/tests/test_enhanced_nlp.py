"""
Tests for Enhanced NLP Utilities
"""

import sys
import os
import pytest

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.agents.enhanced_nlp import nlp, intent_classifier


class TestEnhancedNLP:
    
    def test_fuzzy_match(self):
        """Test fuzzy string matching."""
        assert nlp.fuzzy_match("data science", "Data Science")
        assert nlp.fuzzy_match("missing values", "missing valus")
        assert not nlp.fuzzy_match("apple", "orange")
    
    def test_extract_numbers(self):
        """Test number extraction."""
        text = "Values between 10 and 20, with 50% confidence"
        numbers = nlp.extract_numbers(text)
        
        assert len(numbers) >= 2
        
        # Check range
        ranges = [n for n in numbers if n['type'] == 'range']
        assert len(ranges) == 1
        assert ranges[0]['value'] == (10.0, 20.0)
        
        # Check percentage
        percentages = [n for n in numbers if n['type'] == 'percentage']
        assert len(percentages) == 1
        assert percentages[0]['value'] == 50.0
    
    def test_extract_column_names(self):
        """Test column name extraction."""
        columns = ["Age", "First Name", "Salary"]
        
        # Exact match
        matches = nlp.extract_column_names("Show me Age", columns)
        assert len(matches) > 0
        assert matches[0][0] == "Age"
        assert matches[0][1] == 1.0
        
        # Fuzzy match
        matches = nlp.extract_column_names("average salry", columns)
        assert len(matches) > 0
        assert matches[0][0] == "Salary"
        assert matches[0][1] > 0.8
    
    def test_extract_operators(self):
        """Test operator extraction."""
        text = "Show sales greater than 1000 and average cost"
        operators = nlp.extract_operators(text)
        
        assert ">" in operators
        assert "AVG" in operators


class TestIntentClassifier:
    
    def test_classify_exact_intent(self):
        """Test exact intent classification."""
        intent, conf = intent_classifier.classify("how many rows in the dataset")
        assert intent == "dataset_size"
        assert conf > 0.9
    
    def test_classify_keyword_intent(self):
        """Test keyword-based intent classification."""
        intent, conf = intent_classifier.classify("show me missing values")
        assert intent == "missing_values"
        assert conf > 0.7
    
    def test_classify_fuzzy_intent(self):
        """Test fuzzy intent classification."""
        intent, conf = intent_classifier.classify("find unusual data points")
        assert intent == "outliers"
        assert conf > 0.6
    
    def test_classify_unknown(self):
        """Test unknown intent."""
        intent, conf = intent_classifier.classify("what is the meaning of life")
        # Should return general or low confidence
        if intent != 'general':
            assert conf < 0.6
