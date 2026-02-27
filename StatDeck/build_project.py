#!/usr/bin/env python3
"""
StatDeck Project Builder
This script generates all the foundational code files for the StatDeck project.
Run this script to create the complete project structure with all code files.
"""

import os
import json

BASE_DIR = "/home/claude/StatDeck"

# All file contents as a dictionary
FILES = {}

# ===== PYTHON SERVICE FILES =====

FILES["Windows/StatDeck.Service/collectors/gpu_collector.py"] = '''"""
GPU statistics collector.
Note: GPU monitoring requires additional libraries based on GPU vendor.
This is a placeholder implementation.
"""

from .base_collector import BaseCollector


class GPUCollector(BaseCollector):
    """
    Collects GPU usage and temperature statistics.
    
    Note: This is a placeholder. Real implementation would use:
    - pynvml (nvidia-ml-py3) for NVIDIA GPUs
    - pyadl for AMD GPUs
    - Or parse output from tools like GPU-Z, MSI Afterburner
    """
    
    def __init__(self):
        super().__init__()
        self.gpu_available = self._check_gpu()
    
    def _check_gpu(self):
        """Check if GPU monitoring is available."""
        try:
            # Try to import NVIDIA library
            import pynvml
            pynvml.nvmlInit()
            self.gpu_type = 'nvidia'
            return True
        except (ImportError, Exception):
            pass
        
        # Add AMD support here if needed
        
        return False
    
    def collect(self):
        """
        Collect GPU statistics.
        
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
        
        if self.gpu_type == 'nvidia':
            return self._collect_nvidia()
        
        return {}
    
    def _collect_nvidia(self):
        """Collect stats from NVIDIA GPU."""
        try:
            import pynvml
            
            handle = pynvml.nvmlDeviceGetHandleByIndex(0)
            
            # Get utilization
            util = pynvml.nvmlDeviceGetUtilizationRates(handle)
            
            # Get temperature
            temp = pynvml.nvmlDeviceGetTemperature(handle, pynvml.NVML_TEMPERATURE_GPU)
            
            # Get memory info
            mem = pynvml.nvmlDeviceGetMemoryInfo(handle)
            
            return {
                'usage': round(util.gpu, 1),
                'temp': round(temp, 1),
                'vram_used': round(mem.used / (1024**2), 0),  # MB
                'vram_total': round(mem.total / (1024**2), 0)  # MB
            }
        
        except Exception as e:
            return {
                'usage': 0,
                'temp': 0,
                'vram_used': 0,
                'vram_total': 0
            }
'''

FILES["Windows/StatDeck.Service/collectors/ram_collector.py"] = '''"""
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
'''

FILES["Windows/StatDeck.Service/collectors/disk_collector.py"] = '''"""
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
            disk_usage = psutil.disk_usage('C:\\\\')
            usage_percent = disk_usage.percent
        except:
            usage_percent = 0
        
        stats = {
            'read_speed': round(read_speed, 2),
            'write_speed': round(write_speed, 2),
            'usage_percent': round(usage_percent, 1)
        }
        
        return stats
'''

FILES["Windows/StatDeck.Service/collectors/network_collector.py"] = '''"""
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
'''

# USB Manager
FILES["Windows/StatDeck.Service/usb/__init__.py"] = "# USB communication package\\n"

FILES["Windows/StatDeck.Service/usb/usb_manager.py"] = '''"""
USB communication manager for serial connection to Raspberry Pi.
"""

import serial
import json
import logging
import time
from threading import Thread, Lock

logger = logging.getLogger(__name__)


class USBManager:
    """Manages USB serial communication with the Raspberry Pi."""
    
    def __init__(self, port='COM3', baud_rate=115200):
        """
        Initialize USB manager.
        
        Args:
            port: Serial port (e.g., 'COM3' on Windows)
            baud_rate: Baud rate for serial communication
        """
        self.port = port
        self.baud_rate = baud_rate
        self.serial = None
        self.connected = False
        self.lock = Lock()
        self.receive_buffer = []
        
    def connect(self):
        """
        Establish connection to Pi.
        
        Returns:
            bool: True if connected successfully
        """
        try:
            self.serial = serial.Serial(
                port=self.port,
                baudrate=self.baud_rate,
                timeout=1,
                write_timeout=1
            )
            
            self.connected = True
            logger.info(f"Connected to Pi on {self.port} at {self.baud_rate} baud")
            
            # Clear any stale data
            self.serial.reset_input_buffer()
            self.serial.reset_output_buffer()
            
            return True
            
        except serial.SerialException as e:
            logger.error(f"Failed to connect to {self.port}: {e}")
            self.connected = False
            return False
    
    def disconnect(self):
        """Close the serial connection."""
        if self.serial and self.serial.is_open:
            self.serial.close()
            self.connected = False
            logger.info("Disconnected from Pi")
    
    def send_message(self, message):
        """
        Send a JSON message to the Pi.
        
        Args:
            message: Dictionary to send as JSON
        
        Returns:
            bool: True if sent successfully
        """
        if not self.connected or not self.serial:
            logger.warning("Cannot send message - not connected")
            return False
        
        try:
            with self.lock:
                # Convert to JSON and add newline
                json_str = json.dumps(message) + '\\n'
                
                # Send as bytes
                self.serial.write(json_str.encode('utf-8'))
                self.serial.flush()
                
                return True
                
        except (serial.SerialException, OSError) as e:
            logger.error(f"Error sending message: {e}")
            self.connected = False
            return False
    
    def receive_message(self):
        """
        Receive a JSON message from the Pi (non-blocking).
        
        Returns:
            dict: Received message, or None if no message available
        """
        if not self.connected or not self.serial:
            return None
        
        try:
            # Check if data is available
            if self.serial.in_waiting > 0:
                with self.lock:
                    # Read until newline
                    line = self.serial.readline().decode('utf-8').strip()
                    
                    if line:
                        # Parse JSON
                        message = json.loads(line)
                        logger.debug(f"Received from Pi: {message.get('type')}")
                        return message
            
            return None
            
        except (serial.SerialException, OSError) as e:
            logger.error(f"Error receiving message: {e}")
            self.connected = False
            return None
        except json.JSONDecodeError as e:
            logger.warning(f"Invalid JSON received: {e}")
            return None
    
    def is_connected(self):
        """
        Check if connection is active.
        
        Returns:
            bool: True if connected
        """
        return self.connected and self.serial and self.serial.is_open
'''

# Write a function that will generate all files
def build_project():
    """Create all project files."""
    print("Building StatDeck project structure...")
    print(f"Base directory: {BASE_DIR}\\n")
    
    file_count = 0
    for filepath, content in FILES.items():
        full_path = os.path.join(BASE_DIR, filepath)
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        
        # Write file
        with open(full_path, 'w') as f:
            f.write(content)
        
        file_count += 1
        print(f"✓ {filepath}")
    
    print(f"\\n{file_count} files created successfully!")
    print("\\nRun this script again to add more files as they're defined.")

if __name__ == "__main__":
    build_project()
