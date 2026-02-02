"""
Event Stream Service for Real-Time Agent Activity

This module provides Redis-based event streaming for real-time
agent activity updates using Server-Sent Events (SSE).
"""

import redis.asyncio as redis
import json
import logging
from app.config import settings

logger = logging.getLogger(__name__)


async def publish_event_async(task_id: str, event_data: dict):
    """
    Publish an event to Redis for a specific task.
    
    Args:
        task_id: The Celery task ID
        event_data: Dictionary containing event information
    """
    try:
        r = redis.from_url(settings.REDIS_BROKER)
        channel = f"analysis_events:{task_id}"
        await r.publish(channel, json.dumps(event_data))
        await r.close()
        logger.debug(f"Published event to {channel}: {event_data.get('action', 'unknown')}")
    except Exception as e:
        logger.error(f"Failed to publish event for task {task_id}: {e}")


async def event_generator(task_id: str):
    """
    Generate Server-Sent Events for a specific task.
    
    Args:
        task_id: The Celery task ID to subscribe to
        
    Yields:
        SSE-formatted event strings
    """
    r = None
    pubsub = None
    
    try:
        r = redis.from_url(settings.REDIS_BROKER)
        pubsub = r.pubsub()
        channel = f"analysis_events:{task_id}"
        
        await pubsub.subscribe(channel)
        logger.info(f"Client subscribed to {channel}")
        
        # Send initial connection message
        yield f"data: {json.dumps({'type': 'connected', 'task_id': task_id})}\n\n"
        
        async for message in pubsub.listen():
            if message["type"] == "message":
                data = message["data"].decode('utf-8')
                yield f"data: {data}\n\n"
                
    except Exception as e:
        logger.error(f"Error in event generator for task {task_id}: {e}")
        yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
        
    finally:
        if pubsub:
            await pubsub.unsubscribe()
        if r:
            await r.close()
        logger.info(f"Client disconnected from analysis_events:{task_id}")
