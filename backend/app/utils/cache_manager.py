"""
Cache Manager - Intelligent caching for agent operations
"""

import time
import hashlib
import json
import logging
from typing import Any, Dict, Optional
from collections import OrderedDict

logger = logging.getLogger(__name__)


class CacheManager:
    """Manage caching for agent operations with TTL and size limits."""
    
    def __init__(self, max_size: int = 1000, ttl: int = 1800):
        """
        Initialize cache manager.
        
        Args:
            max_size: Maximum number of cached items
            ttl: Time to live in seconds (default: 30 minutes)
        """
        self.cache = OrderedDict()
        self.max_size = max_size
        self.ttl = ttl
        self.hits = 0
        self.misses = 0
    
    def get_cache_key(self, *args, **kwargs) -> str:
        """
        Generate cache key from arguments.
        
        Args:
            *args: Positional arguments
            **kwargs: Keyword arguments
            
        Returns:
            MD5 hash of arguments as cache key
        """
        # Convert args and kwargs to JSON string
        key_data = json.dumps({
            'args': [str(arg) for arg in args],
            'kwargs': {k: str(v) for k, v in sorted(kwargs.items())}
        }, sort_keys=True)
        
        # Return MD5 hash
        return hashlib.md5(key_data.encode()).hexdigest()
    
    def get(self, key: str) -> Optional[Any]:
        """
        Get cached value if it exists and hasn't expired.
        
        Args:
            key: Cache key
            
        Returns:
            Cached value or None
        """
        if key in self.cache:
            value, timestamp = self.cache[key]
            
            # Check if expired
            if time.time() - timestamp < self.ttl:
                # Move to end (most recently used)
                self.cache.move_to_end(key)
                self.hits += 1
                logger.debug(f"Cache hit for key: {key[:8]}...")
                return value
            else:
                # Expired, remove it
                del self.cache[key]
                logger.debug(f"Cache expired for key: {key[:8]}...")
        
        self.misses += 1
        logger.debug(f"Cache miss for key: {key[:8]}...")
        return None
    
    def set(self, key: str, value: Any):
        """
        Set cached value with current timestamp.
        
        Args:
            key: Cache key
            value: Value to cache
        """
        # Remove oldest entry if cache is full
        if len(self.cache) >= self.max_size:
            oldest_key = next(iter(self.cache))
            del self.cache[oldest_key]
            logger.debug(f"Cache full, removed oldest entry: {oldest_key[:8]}...")
        
        # Add new entry
        self.cache[key] = (value, time.time())
        logger.debug(f"Cached value for key: {key[:8]}...")
    
    def invalidate(self, key: str):
        """
        Invalidate a specific cache entry.
        
        Args:
            key: Cache key to invalidate
        """
        if key in self.cache:
            del self.cache[key]
            logger.debug(f"Invalidated cache for key: {key[:8]}...")
    
    def clear(self):
        """Clear all cached entries."""
        self.cache.clear()
        self.hits = 0
        self.misses = 0
        logger.info("Cache cleared")
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Get cache statistics.
        
        Returns:
            Dictionary with cache stats
        """
        total_requests = self.hits + self.misses
        hit_rate = (self.hits / total_requests * 100) if total_requests > 0 else 0
        
        return {
            'size': len(self.cache),
            'max_size': self.max_size,
            'hits': self.hits,
            'misses': self.misses,
            'hit_rate': hit_rate,
            'ttl': self.ttl
        }
    
    def cleanup_expired(self):
        """Remove all expired entries from cache."""
        current_time = time.time()
        expired_keys = []
        
        for key, (value, timestamp) in self.cache.items():
            if current_time - timestamp >= self.ttl:
                expired_keys.append(key)
        
        for key in expired_keys:
            del self.cache[key]
        
        if expired_keys:
            logger.info(f"Cleaned up {len(expired_keys)} expired cache entries")


# Global cache manager instance
cache_manager = CacheManager(max_size=1000, ttl=1800)


def cached(cache_key_func=None):
    """
    Decorator for caching function results.
    
    Args:
        cache_key_func: Optional function to generate cache key
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            # Generate cache key
            if cache_key_func:
                key = cache_key_func(*args, **kwargs)
            else:
                key = cache_manager.get_cache_key(*args, **kwargs)
            
            # Try to get from cache
            cached_result = cache_manager.get(key)
            if cached_result is not None:
                return cached_result
            
            # Execute function
            result = func(*args, **kwargs)
            
            # Cache result
            cache_manager.set(key, result)
            
            return result
        
        return wrapper
    return decorator
