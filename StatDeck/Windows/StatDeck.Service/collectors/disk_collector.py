"""
Disk I/O statistics collector using psutil.
"""

import psutil
import time
from .base_collector import BaseCollector


class DiskCollector(BaseCollector):
    """Collects disk I/O and usage statistics."""
    
    def __init__(self):
        super().__init__()
        self.last_io = None
        self.last_time = None
    
    def collect(self):
        """
        Collect disk statistics.
        
        Returns:
            dict: Disk stats including read/write speeds and usage
        """
        # Get disk I/O counters
        io = psutil.disk_io_counters()
        current_time = time.time()
        
        # Calculate speeds
        read_speed = 0
        write_speed = 0
        
        if self.last_io and self.last_time:
            time_delta = current_time - self.last_time
            if time_delta > 0:
                read_delta = io.read_bytes - self.last_io.read_bytes
                write_delta = io.write_bytes - self.last_io.write_bytes
                
                read_speed = (read_delta / time_delta) / (1024**2)   # MB/s
                write_speed = (write_delta / time_delta) / (1024**2)  # MB/s
        
        self.last_io = io
        self.last_time = current_time
        
        # Get disk usage for C: drive (or main partition)
        try:
            disk_usage = psutil.disk_usage('C:\\')
            usage_percent = disk_usage.percent
        except:
            usage_percent = 0
        
        stats = {
            'read_speed': round(read_speed, 2),
            'write_speed': round(write_speed, 2),
            'usage_percent': round(usage_percent, 1)
        }
        
        return stats
