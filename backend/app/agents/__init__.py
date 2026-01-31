"""
Multi-Agent Data Analysis System

This package contains all the intelligent agents that power the data analysis platform.
Each agent has specialized capabilities and works together with others to provide
comprehensive insights.

Agents:
- BaseAgent: Abstract base class for all agents
- DataProfilerAgent: Data quality and profiling
- InsightDiscoveryAgent: Pattern and trend detection
- VisualizationAgent: Chart generation and recommendations (Coming soon)
- QueryAgent: Natural language question answering (Coming soon)
- RecommendationAgent: Next-step suggestions (Coming soon)

Orchestration:
- AgentOrchestrator: Coordinates agent execution and communication
- AgentRegistry: Manages agent discovery and health (Coming soon)
"""

from .base_agent import BaseAgent, AgentStatus, AgentActivity
from .data_profiler import DataProfilerAgent
from .insight_discovery import InsightDiscoveryAgent
from .visualization import VisualizationAgent
from .recommendation import RecommendationAgent
from .orchestrator import AgentOrchestrator, get_orchestrator

__all__ = [
    'BaseAgent',
    'AgentStatus',
    'AgentActivity',
    'DataProfilerAgent',
    'InsightDiscoveryAgent',
    'VisualizationAgent',
    'RecommendationAgent',
    'AgentOrchestrator',
    'get_orchestrator',
]
