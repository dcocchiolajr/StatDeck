"""
Base collector class that all specific collectors inherit from.
"""

from abc import ABC, abstractmethod


class BaseCollector(ABC):
    """Abstract base class for all hardware stat collectors."""
    
    def __init__(self):
        """Initialize the collector."""
        self.last_value = None
    
    @abstractmethod
    def collect(self):
        """
        Collect current hardware statistics.
        
        Returns:
            dict: Dictionary containing collected stats
        """
        pass
    
    def get_delta(self, current, previous):
        """
        Calculate delta between current and previous value.
        
        Args:
            current: Current value
            previous: Previous value
        
        Returns:
            Difference between values
        """
        if previous is None:
            return 0
        return current - previous
