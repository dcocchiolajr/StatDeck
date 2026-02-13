"""
USB communication manager for serial connection to Raspberry Pi.
"""

import serial
import serial.tools.list_ports
import json
import logging
import time
from threading import Thread, Lock

logger = logging.getLogger(__name__)


class USBManager:
    """Manages USB serial communication with the Raspberry Pi."""
    
    def __init__(self, port=None, baud_rate=115200):
        """
        Initialize USB manager.
        
        Args:
            port: Serial port (e.g., 'COM3' on Windows). If None, auto-detect.
            baud_rate: Baud rate for serial communication
        """
        self.port = port
        self.baud_rate = baud_rate
        self.serial = None
        self.connected = False
        self.lock = Lock()
        self.receive_buffer = []
    
    def find_pi_serial_port(self):
        """
        Auto-detect the Raspberry Pi USB serial port.
        
        Looks for USB serial devices that match common Pi gadget identifiers.
        
        Returns:
            str: COM port name, or None if not found
        """
        logger.info("Scanning for Raspberry Pi USB serial device...")
        
        ports = serial.tools.list_ports.comports()
        
        for port in ports:
            # Check for Linux Foundation USB gadget
            # VID 0x0525 = Linux Foundation, commonly used for USB gadgets
            # Or check for description containing "USB Serial" or "Gadget"
            if port.vid == 0x0525 or 'USB Serial' in port.description or 'Gadget' in port.description:
                logger.info(f"Found potential Pi device: {port.device} - {port.description}")
                return port.device
        
        # If no specific match, look for any generic USB serial device
        # This is a fallback in case the VID/PID doesn't match
        for port in ports:
            if 'USB' in port.description and 'Serial' in port.description:
                logger.warning(f"Using generic USB serial device: {port.device} - {port.description}")
                return port.device
        
        logger.error("No Raspberry Pi USB serial device found")
        return None
        
    def connect(self):
        """
        Establish connection to Pi.
        
        Returns:
            bool: True if connected successfully
        """
        # Auto-detect port if not specified
        if not self.port:
            self.port = self.find_pi_serial_port()
            if not self.port:
                logger.error("Could not auto-detect Pi serial port")
                return False
        
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
            # Reset port for next attempt
            self.port = None
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
                json_str = json.dumps(message) + '\n'
                
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
