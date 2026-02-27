"""
Network statistics collector using psutil.
"""

import psutil
import time
from .base_collector import BaseCollector


class NetworkCollector(BaseCollector):
    """Collects network upload/download statistics."""
    
    def __init__(self):
        super().__init__()
        self.last_net = None
        self.last_time = None
    
    def collect(self):
        """
        Collect network statistics.
        
        Returns:
            dict: Network stats including upload and download speeds
        """
        # Get network I/O counters
        net = psutil.net_io_counters()
        current_time = time.time()
        
        # Calculate speeds
        upload_speed = 0
        download_speed = 0
        
        if self.last_net and self.last_time:
            time_delta = current_time - self.last_time
            if time_delta > 0:
                sent_delta = net.bytes_sent - self.last_net.bytes_sent
                recv_delta = net.bytes_recv - self.last_net.bytes_recv
                
                upload_speed = (sent_delta / time_delta) / 1024      # KB/s
                download_speed = (recv_delta / time_delta) / 1024    # KB/s
        
        self.last_net = net
        self.last_time = current_time
        
        stats = {
            'upload_speed': round(upload_speed, 1),
            'download_speed': round(download_speed, 1)
        }
        
        return stats
