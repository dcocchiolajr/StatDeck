"""
RAM statistics collector using psutil.
"""

import psutil
from .base_collector import BaseCollector


class RAMCollector(BaseCollector):
    """Collects RAM usage statistics."""
    
    def collect(self):
        """
        Collect RAM statistics.
        
        Returns:
            dict: RAM stats including used, total, and percentage
        """
        mem = psutil.virtual_memory()
        
        stats = {
            'used': round(mem.used / (1024**2), 0),      # MB
            'total': round(mem.total / (1024**2), 0),    # MB
            'percent': round(mem.percent, 1),
            'available': round(mem.available / (1024**2), 0)  # MB
        }
        
        return stats
