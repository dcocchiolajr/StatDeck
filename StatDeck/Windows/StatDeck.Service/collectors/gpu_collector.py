"""
GPU statistics collector using nvidia-smi.
Works on Windows with WDDM drivers where pynvml may fail.
"""

from .base_collector import BaseCollector
import subprocess
import re


class GPUCollector(BaseCollector):
    """
    Collects GPU usage and temperature statistics using nvidia-smi.
    This approach works on Windows with WDDM drivers.
    """
    
    def __init__(self):
        super().__init__()
        self.gpu_available = self._check_nvidia_smi()
    
    def _check_nvidia_smi(self):
        """Check if nvidia-smi is available."""
        try:
            result = subprocess.run(['nvidia-smi'], 
                                  capture_output=True, 
                                  text=True, 
                                  timeout=2)
            return result.returncode == 0
        except (FileNotFoundError, subprocess.TimeoutExpired):
            return False
    
    def collect(self):
        """
        Collect GPU statistics using nvidia-smi.
        
        Returns:
            dict: GPU stats including usage, temp, and VRAM
        """
        if not self.gpu_available:
            return {
                'usage': 0,
                'temp': 0,
                'vram_used': 0,
                'vram_total': 0
            }
        
        try:
            # Query nvidia-smi for specific metrics
            # Format: gpu_util, memory_util, temperature, memory.used, memory.total
            result = subprocess.run([
                'nvidia-smi',
                '--query-gpu=utilization.gpu,utilization.memory,temperature.gpu,memory.used,memory.total',
                '--format=csv,noheader,nounits'
            ], capture_output=True, text=True, timeout=2)
            
            if result.returncode != 0:
                return self._get_zero_stats()
            
            # Parse output: "9, 8, 27, 2070, 24564"
            values = result.stdout.strip().split(',')
            
            if len(values) < 5:
                return self._get_zero_stats()
            
            gpu_util = int(values[0].strip())
            temp = int(values[2].strip())
            vram_used = int(values[3].strip())
            vram_total = int(values[4].strip())
            
            return {
                'usage': gpu_util,
                'temp': temp,
                'vram_used': vram_used,
                'vram_total': vram_total
            }
            
        except Exception as e:
            print(f"GPU collection error: {e}")
            return self._get_zero_stats()
    
    def _get_zero_stats(self):
        """Return zero stats when GPU is unavailable."""
        return {
            'usage': 0,
            'temp': 0,
            'vram_used': 0,
            'vram_total': 0
        }
