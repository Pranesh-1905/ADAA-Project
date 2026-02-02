"""
Base Agent Class for Multi-Agent Data Analysis System

This module provides the abstract base class that all specialized agents inherit from.
It defines the common interface and shared functionality for all agents.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional, Callable
from datetime import datetime
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class AgentStatus(Enum):
    """Agent execution status"""
    IDLE = "idle"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class AgentActivity:
    """Represents a single agent activity/event"""
    
    def __init__(
        self,
        agent_name: str,
        action: str,
        status: AgentStatus,
        details: Optional[Dict[str, Any]] = None,
        timestamp: Optional[datetime] = None
    ):
        self.agent_name = agent_name
        self.action = action
        self.status = status
        self.details = details or {}
        self.timestamp = timestamp or datetime.utcnow()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert activity to dictionary for JSON serialization"""
        return {
            "agent_name": self.agent_name,
            "action": self.action,
            "status": self.status.value,
            "details": self.details,
            "timestamp": self.timestamp.isoformat()
        }


class BaseAgent(ABC):
    """
    Abstract base class for all agents in the system.
    
    All specialized agents (Data Profiler, Insight Discovery, etc.) 
    should inherit from this class and implement the required methods.
    """
    
    def __init__(self, name: str, description: str):
        """
        Initialize the base agent.
        
        Args:
            name: Unique identifier for the agent
            description: Human-readable description of agent's purpose
        """
        self.name = name
        self.description = description
        self.status = AgentStatus.IDLE
        self.activities: List[AgentActivity] = []
        self.results: Dict[str, Any] = {}
        self.error: Optional[str] = None
        self.start_time: Optional[datetime] = None
        self.end_time: Optional[datetime] = None
        self.on_activity: Optional[Callable[[AgentActivity], None]] = None
        
        logger.info(f"Initialized agent: {self.name}")
    
    @abstractmethod
    async def analyze(self, data: Any, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main analysis method that each agent must implement.
        
        Args:
            data: The data to analyze (DataFrame, file path, etc.)
            context: Additional context and parameters for analysis
            
        Returns:
            Dictionary containing analysis results
        """
        pass
    
    def emit_activity(
        self,
        action: str,
        status: AgentStatus,
        details: Optional[Dict[str, Any]] = None
    ):
        """
        Emit an activity event for tracking and monitoring.
        
        Args:
            action: Description of the action being performed
            status: Current status of the action
            details: Additional details about the activity
        """
        activity = AgentActivity(
            agent_name=self.name,
            action=action,
            status=status,
            details=details
        )
        self.activities.append(activity)
        logger.info(f"[{self.name}] {action} - {status.value}")
        
        # Call the event callback if registered (for real-time streaming)
        if self.on_activity:
            try:
                self.on_activity(activity)
            except Exception as e:
                logger.error(f"Error in on_activity callback: {e}")
    
    async def execute(self, data: Any, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute the agent's analysis with error handling and status tracking.
        
        Args:
            data: The data to analyze
            context: Additional context for analysis
            
        Returns:
            Dictionary containing analysis results and metadata
        """
        self.status = AgentStatus.RUNNING
        self.start_time = datetime.utcnow()
        self.error = None
        
        try:
            self.emit_activity(
                action=f"Starting {self.description}",
                status=AgentStatus.RUNNING
            )
            
            # Call the agent-specific analysis method
            results = await self.analyze(data, context)
            
            self.results = results
            self.status = AgentStatus.COMPLETED
            self.end_time = datetime.utcnow()
            
            self.emit_activity(
                action=f"Completed {self.description}",
                status=AgentStatus.COMPLETED,
                details={"duration_seconds": self.get_duration()}
            )
            
            return {
                "agent": self.name,
                "status": self.status.value,
                "results": results,
                "duration": self.get_duration(),
                "timestamp": self.end_time.isoformat()
            }
            
        except Exception as e:
            self.status = AgentStatus.FAILED
            self.error = str(e)
            self.end_time = datetime.utcnow()
            
            self.emit_activity(
                action=f"Failed: {str(e)}",
                status=AgentStatus.FAILED,
                details={"error": str(e)}
            )
            
            logger.error(f"[{self.name}] Analysis failed: {str(e)}", exc_info=True)
            
            return {
                "agent": self.name,
                "status": self.status.value,
                "error": self.error,
                "duration": self.get_duration(),
                "timestamp": self.end_time.isoformat() if self.end_time else None
            }
    
    def get_status(self) -> Dict[str, Any]:
        """
        Get current status of the agent.
        
        Returns:
            Dictionary containing agent status information
        """
        return {
            "name": self.name,
            "description": self.description,
            "status": self.status.value,
            "activities": [activity.to_dict() for activity in self.activities],
            "has_results": bool(self.results),
            "error": self.error,
            "duration": self.get_duration()
        }
    
    def get_results(self) -> Dict[str, Any]:
        """
        Get the results from the agent's analysis.
        
        Returns:
            Dictionary containing analysis results
        """
        return self.results
    
    def get_activities(self) -> List[Dict[str, Any]]:
        """
        Get all activities emitted by this agent.
        
        Returns:
            List of activity dictionaries
        """
        return [activity.to_dict() for activity in self.activities]
    
    def get_duration(self) -> Optional[float]:
        """
        Calculate the duration of the agent's execution.
        
        Returns:
            Duration in seconds, or None if not started/completed
        """
        if not self.start_time:
            return None
        
        end = self.end_time or datetime.utcnow()
        return (end - self.start_time).total_seconds()
    
    def set_event_callback(self, callback: Callable[[AgentActivity], None]):
        """
        Set a callback function to be called when activities are emitted.
        
        Args:
            callback: Function that takes an AgentActivity and publishes it
        """
        self.on_activity = callback
        logger.debug(f"Event callback registered for {self.name}")
    
    def reset(self):
        """Reset the agent to its initial state"""
        self.status = AgentStatus.IDLE
        self.activities = []
        self.results = {}
        self.error = None
        self.start_time = None
        self.end_time = None
        
        logger.info(f"Reset agent: {self.name}")
    
    def __repr__(self) -> str:
        return f"<{self.__class__.__name__}(name='{self.name}', status='{self.status.value}')>"
