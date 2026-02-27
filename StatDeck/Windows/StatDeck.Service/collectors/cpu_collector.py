"""
Improved CPU statistics collector with better temperature detection
"""

from .base_collector import BaseCollector
import psutil


class CPUCollector(BaseCollector):
    """Collects CPU usage, temperature, and core information."""
    
    def __init__(self):
        super().__init__()
        self.temp_sensor = self._find_temp_sensor()
    
    def _find_temp_sensor(self):
        """Try to find CPU temperature sensor."""
        if not hasattr(psutil, 'sensors_temperatures'):
            return None
        
        try:
            temps = psutil.sensors_temperatures()
            if not temps:
                return None
            
            # Try common sensor names for CPU temp
            # Different motherboards use different names
            possible_sensors = [
                'coretemp',      # Intel
                'k10temp',       # AMD
                'cpu_thermal',   # Generic
                'cpu-thermal',   # Generic
                'zenpower',      # AMD Ryzen
                'it8792',        # ITE chip (common on MSI boards)
                'nct6798',       # Nuvoton chip (common on high-end boards)
                'nct6791',
                'nct6795'
            ]
            
            # Check each possible sensor
            for sensor_name in possible_sensors:
                if sensor_name in temps:
                    entries = temps[sensor_name]
                    for entry in entries:
                        # Look for entries with "Package" or "Tdie" or "Tctl" in label
                        if entry.label and ('Package' in entry.label or 
                                          'Tdie' in entry.label or 
                                          'Tctl' in entry.label or
                                          'CPU' in entry.label):
                            return (sensor_name, entry.label)
                    # If no specific label found, use first entry
                    if entries:
                        return (sensor_name, entries[0].label)
            
            # If nothing specific found, try first available sensor
            first_sensor = list(temps.keys())[0]
            if temps[first_sensor]:
                return (first_sensor, temps[first_sensor][0].label)
                
        except Exception as e:
            print(f"Error finding temp sensor: {e}")
        
        return None
    
    def collect(self):
        """
        Collect CPU statistics.
        
        Returns:
            dict: CPU stats including usage, temp, cores
        """
        # Get CPU usage
        cpu_percent = psutil.cpu_percent(interval=0.1)
        
        # Get per-core usage
        per_core = psutil.cpu_percent(interval=0.1, percpu=True)
        
        # Get core count
        core_count = psutil.cpu_count(logical=True)
        
        # Try to get temperature
        temp = self._get_temperature()
        
        return {
            'usage': round(cpu_percent, 1),
            'cores': [round(c, 1) for c in per_core],
            'temp': temp,
            'core_count': core_count
        }
    
    def _get_temperature(self):
        """Get CPU temperature if available."""
        if not self.temp_sensor:
            return None
        
        try:
            temps = psutil.sensors_temperatures()
            sensor_name, label = self.temp_sensor
            
            if sensor_name in temps:
                for entry in temps[sensor_name]:
                    if entry.label == label:
                        return round(entry.current, 1)
                # Fallback to first entry
                if temps[sensor_name]:
                    return round(temps[sensor_name][0].current, 1)
        except Exception:
            pass
        
        return None
