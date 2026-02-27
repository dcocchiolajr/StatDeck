"""
CPU statistics collector using psutil.
"""

import psutil
from .base_collector import BaseCollector


class CPUCollector(BaseCollector):
    """Collects CPU usage and temperature statistics."""
    
    def __init__(self):
        super().__init__()
        self.core_count = psutil.cpu_count(logical=True)
    
    def collect(self):
        """
        Collect CPU statistics.
        
        Returns:
            dict: CPU stats including usage, temp, and per-core usage
        """
        # Get overall CPU usage
        cpu_percent = psutil.cpu_percent(interval=0.1)
        
        # Get per-core usage
        per_core = psutil.cpu_percent(interval=0.1, percpu=True)
        
        # Get CPU temperature (if available)
        temp = self._get_temperature()
        
        stats = {
            'usage': round(cpu_percent, 1),
            'cores': [round(c, 1) for c in per_core],
            'temp': temp,
            'core_count': self.core_count
        }
        
        return stats
    
    def _get_temperature(self):
        """
        Get CPU temperature.
        
        Returns:
            float: Temperature in Celsius, or None if unavailable
        """
        try:
            # Try to get temperature from sensors
            temps = psutil.sensors_temperatures()
            
            # Different systems report temps differently
            # Try common sensor names
            for name in ['coretemp', 'k10temp', 'zenpower', 'cpu_thermal']:
                if name in temps:
                    # Get the first temperature reading
                    if temps[name]:
                        return round(temps[name][0].current, 1)
            
            # If no specific sensor found, try first available
            for sensor_list in temps.values():
                if sensor_list:
                    return round(sensor_list[0].current, 1)
        
        except (AttributeError, KeyError):
            # sensors_temperatures not available on this system
            pass
        
        return None
