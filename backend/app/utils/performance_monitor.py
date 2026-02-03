"""
Performance Monitor - Track agent performance metrics
"""

import time
import logging
from functools import wraps
from typing import Dict, Any, List
from collections import defaultdict
from datetime import datetime

logger = logging.getLogger(__name__)


class PerformanceMonitor:
    """Monitor and track agent performance metrics."""
    
    def __init__(self):
        self.metrics = defaultdict(list)
        self.operation_counts = defaultdict(int)
        self.error_counts = defaultdict(int)
    
    def track_time(self, operation: str):
        """Decorator to track operation execution time."""
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                start_time = time.time()
                error_occurred = False
                
                try:
                    result = func(*args, **kwargs)
                    return result
                except Exception as e:
                    error_occurred = True
                    self.error_counts[operation] += 1
                    raise
                finally:
                    duration = time.time() - start_time
                    self.metrics[operation].append(duration)
                    self.operation_counts[operation] += 1
                    
                    if not error_occurred:
                        logger.info(f"{operation}: {duration:.3f}s")
                    else:
                        logger.error(f"{operation} failed after {duration:.3f}s")
            
            return wrapper
        return decorator
    
    def get_stats(self) -> Dict[str, Any]:
        """Get performance statistics for all operations."""
        stats = {}
        
        for operation, times in self.metrics.items():
            if times:
                stats[operation] = {
                    'count': len(times),
                    'avg_time': sum(times) / len(times),
                    'min_time': min(times),
                    'max_time': max(times),
                    'total_time': sum(times),
                    'errors': self.error_counts.get(operation, 0),
                    'success_rate': ((len(times) - self.error_counts.get(operation, 0)) / len(times)) * 100
                }
        
        return stats
    
    def get_summary(self) -> str:
        """Get a human-readable summary of performance."""
        stats = self.get_stats()
        
        if not stats:
            return "No performance data available."
        
        summary = ["Performance Summary:", "=" * 50]
        
        for operation, data in sorted(stats.items()):
            summary.append(f"\n{operation}:")
            summary.append(f"  Calls: {data['count']}")
            summary.append(f"  Avg Time: {data['avg_time']:.3f}s")
            summary.append(f"  Min/Max: {data['min_time']:.3f}s / {data['max_time']:.3f}s")
            summary.append(f"  Success Rate: {data['success_rate']:.1f}%")
            if data['errors'] > 0:
                summary.append(f"  Errors: {data['errors']}")
        
        return "\n".join(summary)
    
    def reset(self):
        """Reset all metrics."""
        self.metrics.clear()
        self.operation_counts.clear()
        self.error_counts.clear()


# Global performance monitor instance
performance_monitor = PerformanceMonitor()


def track_performance(operation: str):
    """Convenience decorator for tracking performance."""
    return performance_monitor.track_time(operation)
