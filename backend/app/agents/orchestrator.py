"""
Agent Orchestrator

This module coordinates the execution of multiple agents and manages
their communication and data flow. It ensures agents run in the correct
order and handles dependencies between agents.
"""

import asyncio
from typing import Dict, Any, List, Optional
from datetime import datetime
import logging

from .base_agent import BaseAgent, AgentStatus, AgentActivity
from .data_profiler import DataProfilerAgent
from .insight_discovery import InsightDiscoveryAgent
from .visualization import VisualizationAgent
from .recommendation import RecommendationAgent

logger = logging.getLogger(__name__)


class AgentOrchestrator:
    """
    Orchestrates the execution of multiple agents.
    
    Responsibilities:
    - Manage agent lifecycle
    - Coordinate agent execution order
    - Handle inter-agent communication
    - Aggregate results from all agents
    - Emit combined activity stream
    """
    
    def __init__(self):
        """Initialize the orchestrator with all available agents"""
        self.agents: Dict[str, BaseAgent] = {}
        self.activities: List[AgentActivity] = []
        self.results: Dict[str, Any] = {}
        self.status = AgentStatus.IDLE
        
        # Register agents
        self._register_agents()
        
        logger.info("Agent Orchestrator initialized")
    
    def _register_agents(self):
        """Register all available agents"""
        # Phase 2 agents
        self.agents["data_profiler"] = DataProfilerAgent()
        self.agents["insight_discovery"] = InsightDiscoveryAgent()
        self.agents["visualization"] = VisualizationAgent()
        self.agents["recommendation"] = RecommendationAgent()
        
        # Future agents:
        # self.agents["query"] = QueryAgent()  # Phase 3: LLM-powered Q&A
        
        logger.info(f"Registered {len(self.agents)} agents")
    
    async def analyze(
        self,
        data: Any,
        context: Optional[Dict[str, Any]] = None,
        agents_to_run: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Run analysis using specified agents or all agents.
        
        Args:
            data: Data to analyze (DataFrame or file path)
            context: Additional context and parameters
            agents_to_run: List of agent names to run (None = all agents)
            
        Returns:
            Dictionary containing results from all agents
        """
        self.status = AgentStatus.RUNNING
        start_time = datetime.utcnow()
        context = context or {}
        
        logger.info(f"Starting orchestrated analysis with {len(self.agents)} agents")
        
        try:
            # Determine which agents to run
            if agents_to_run:
                agents = {name: self.agents[name] for name in agents_to_run if name in self.agents}
            else:
                agents = self.agents
            
            # Run agents in sequence (some agents depend on others)
            results = {}
            
            # Phase 1: Data Profiler (foundational)
            if "data_profiler" in agents:
                logger.info("Running Data Profiler Agent")
                profiler_result = await agents["data_profiler"].execute(data, context)
                results["data_profiler"] = profiler_result
                self._collect_activities(agents["data_profiler"])
                
                # Add profiler results to context for other agents
                context["profiler_results"] = profiler_result.get("results", {})
            
            # Phase 2: Insight Discovery (uses profiler results)
            if "insight_discovery" in agents:
                logger.info("Running Insight Discovery Agent")
                insight_result = await agents["insight_discovery"].execute(data, context)
                results["insight_discovery"] = insight_result
                self._collect_activities(agents["insight_discovery"])
                
                # Add insights to context
                context["insights"] = insight_result.get("results", {})
            
            # Phase 3: Visualization (uses profiler + insights)
            if "visualization" in agents:
                logger.info("Running Visualization Agent")
                viz_result = await agents["visualization"].execute(data, context)
                results["visualization"] = viz_result
                self._collect_activities(agents["visualization"])
            
            # Phase 4: Recommendations (uses all previous results)
            if "recommendation" in agents:
                logger.info("Running Recommendation Agent")
                rec_result = await agents["recommendation"].execute(data, context)
                results["recommendation"] = rec_result
                self._collect_activities(agents["recommendation"])
            
            # Query agent can run anytime (independent) - Phase 3
            # if "query" in agents:
            #     logger.info("Running Query Agent")
            #     query_result = await agents["query"].execute(data, context)
            #     results["query"] = query_result
            #     self._collect_activities(agents["query"])
            
            self.results = results
            self.status = AgentStatus.COMPLETED
            
            end_time = datetime.utcnow()
            duration = (end_time - start_time).total_seconds()
            
            logger.info(f"Orchestrated analysis completed in {duration:.2f}s")
            
            return {
                "status": "completed",
                "duration": duration,
                "agents_run": list(results.keys()),
                "results": results,
                "activities": self.get_all_activities(),
                "summary": self._create_summary(results)
            }
            
        except Exception as e:
            self.status = AgentStatus.FAILED
            logger.error(f"Orchestrated analysis failed: {str(e)}", exc_info=True)
            
            return {
                "status": "failed",
                "error": str(e),
                "agents_run": list(results.keys()) if 'results' in locals() else [],
                "results": results if 'results' in locals() else {},
                "activities": self.get_all_activities()
            }
    
    def _collect_activities(self, agent: BaseAgent):
        """Collect activities from an agent"""
        self.activities.extend(agent.activities)
    
    def get_all_activities(self) -> List[Dict[str, Any]]:
        """Get all activities from all agents"""
        return [activity.to_dict() for activity in self.activities]
    
    def get_agent_status(self, agent_name: str) -> Optional[Dict[str, Any]]:
        """Get status of a specific agent"""
        if agent_name in self.agents:
            return self.agents[agent_name].get_status()
        return None
    
    def get_all_agent_statuses(self) -> Dict[str, Dict[str, Any]]:
        """Get status of all agents"""
        return {
            name: agent.get_status()
            for name, agent in self.agents.items()
        }
    
    def reset(self):
        """Reset all agents and orchestrator state"""
        for agent in self.agents.values():
            agent.reset()
        
        self.activities = []
        self.results = {}
        self.status = AgentStatus.IDLE
        
        logger.info("Orchestrator reset")
    
    def _create_summary(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Create a summary of all agent results"""
        summary = {
            "total_agents": len(results),
            "successful_agents": len([r for r in results.values() if r.get("status") == "completed"]),
            "failed_agents": len([r for r in results.values() if r.get("status") == "failed"]),
            "total_activities": len(self.activities),
        }
        
        # Add specific summaries from each agent
        if "data_profiler" in results:
            profiler_data = results["data_profiler"].get("results", {})
            summary["data_quality_score"] = profiler_data.get("quality_score")
            summary["quality_issues"] = len(profiler_data.get("quality_issues", []))
        
        if "insight_discovery" in results:
            insight_data = results["insight_discovery"].get("results", {})
            summary["insights_found"] = len(insight_data.get("insights", []))
            summary["correlations_found"] = len(insight_data.get("correlations", []))
            summary["trends_found"] = len(insight_data.get("trends", []))
        
        if "visualization" in results:
            viz_data = results["visualization"].get("results", {})
            summary["charts_generated"] = len(viz_data.get("charts", []))
        
        if "recommendation" in results:
            rec_data = results["recommendation"].get("results", {})
            summary["recommendations_count"] = len(rec_data.get("recommendations", []))
        
        return summary
    
    async def run_single_agent(
        self,
        agent_name: str,
        data: Any,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Run a single agent independently.
        
        Args:
            agent_name: Name of the agent to run
            data: Data to analyze
            context: Additional context
            
        Returns:
            Agent execution results
        """
        if agent_name not in self.agents:
            raise ValueError(f"Agent '{agent_name}' not found")
        
        context = context or {}
        agent = self.agents[agent_name]
        
        logger.info(f"Running single agent: {agent_name}")
        
        result = await agent.execute(data, context)
        self._collect_activities(agent)
        
        return result
    
    def get_available_agents(self) -> List[Dict[str, str]]:
        """Get list of available agents with their descriptions"""
        return [
            {
                "name": name,
                "description": agent.description,
                "status": agent.status.value
            }
            for name, agent in self.agents.items()
        ]


# Global orchestrator instance
_orchestrator_instance: Optional[AgentOrchestrator] = None


def get_orchestrator() -> AgentOrchestrator:
    """Get or create the global orchestrator instance"""
    global _orchestrator_instance
    
    if _orchestrator_instance is None:
        _orchestrator_instance = AgentOrchestrator()
    
    return _orchestrator_instance
