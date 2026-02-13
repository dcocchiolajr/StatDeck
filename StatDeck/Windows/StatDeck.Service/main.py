"""
StatDeck Windows Service
Main entry point for the background service that collects hardware stats
and communicates with the Raspberry Pi display over USB.
"""

import time
import json
import logging
from datetime import datetime
from collectors.cpu_collector import CPUCollector
from collectors.gpu_collector import GPUCollector
from collectors.ram_collector import RAMCollector
from collectors.disk_collector import DiskCollector
from collectors.network_collector import NetworkCollector
from usb.usb_manager import USBManager
from actions.action_executor import ActionExecutor
from http_server import StatsHTTPServer

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('statdeck_service.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)


class StatDeckService:
    """Main service class that orchestrates stats collection and communication."""
    
    def __init__(self, config_path='config.json'):
        """Initialize the service with configuration."""
        self.config_path = config_path
        self.config = self.load_config()
        
        # Initialize collectors
        self.collectors = {
            'cpu': CPUCollector(),
            'gpu': GPUCollector(),
            'ram': RAMCollector(),
            'disk': DiskCollector(),
            'network': NetworkCollector()
        }
        
        # Initialize USB communication
        self.usb = USBManager(
            port=self.config.get('usb_port', 'COM3'),
            baud_rate=self.config.get('baud_rate', 115200)
        )
        
        # Initialize action executor
        self.action_executor = ActionExecutor(self.config.get('layout', {}))
        
        # Initialize HTTP server for Config App
        self.http_server = StatsHTTPServer(port=8080)
        
        self.running = False
        self.update_interval = self.config.get('update_interval', 0.5)  # 500ms
        
    def load_config(self):
        """Load configuration from JSON file."""
        try:
            with open(self.config_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            logger.warning(f"Config file {self.config_path} not found, using defaults")
            return {
                'usb_port': 'COM3',
                'baud_rate': 115200,
                'update_interval': 0.5,
                'layout': {}
            }
    
    def collect_stats(self):
        """Collect all hardware statistics."""
        stats = {}
        
        for name, collector in self.collectors.items():
            try:
                stats[name] = collector.collect()
            except Exception as e:
                logger.error(f"Error collecting {name} stats: {e}")
                stats[name] = {}
        
        return stats
    
    def send_stats(self, stats):
        """Send stats to Pi over USB."""
        message = {
            'type': 'stats',
            'timestamp': int(datetime.now().timestamp() * 1000),
            'data': stats
        }
        
        try:
            self.usb.send_message(message)
        except Exception as e:
            logger.error(f"Error sending stats: {e}")
    
    def handle_pi_message(self, message):
        """Handle incoming messages from Pi."""
        msg_type = message.get('type')
        
        if msg_type == 'action':
            # Execute action based on tile interaction
            tile_id = message.get('tile_id')
            action_type = message.get('action_type')
            
            try:
                self.action_executor.execute(tile_id, action_type)
            except Exception as e:
                logger.error(f"Error executing action: {e}")
        
        elif msg_type == 'config_request':
            # Pi is requesting current configuration
            self.send_config()
        
        elif msg_type == 'status':
            # Status heartbeat from Pi
            logger.debug(f"Pi status: {message}")
        
        else:
            logger.warning(f"Unknown message type from Pi: {msg_type}")
    
    def send_config(self):
        """Send current layout configuration to Pi."""
        message = {
            'type': 'config',
            'layout': self.config.get('layout', {})
        }
        
        try:
            self.usb.send_message(message)
            logger.info("Configuration sent to Pi")
        except Exception as e:
            logger.error(f"Error sending config: {e}")
    
    def run(self):
        """Main service loop."""
        logger.info("StatDeck Service starting...")
        
        # Start HTTP server for Config App
        self.http_server.start()
        
        # Connect to Pi
        if not self.usb.connect():
            logger.error("Failed to connect to Pi. Retrying...")
        
        self.running = True
        last_update = 0
        
        try:
            while self.running:
                current_time = time.time()
                
                # Send stats at configured interval
                if current_time - last_update >= self.update_interval:
                    stats = self.collect_stats()
                    self.send_stats(stats)
                    last_update = current_time
                
                # Check for incoming messages from Pi
                message = self.usb.receive_message()
                if message:
                    self.handle_pi_message(message)
                
                # Small sleep to prevent CPU spinning
                time.sleep(0.01)
        
        except KeyboardInterrupt:
            logger.info("Service stopped by user")
        except Exception as e:
            logger.error(f"Service error: {e}", exc_info=True)
        finally:
            self.stop()
    
    def stop(self):
        """Stop the service and clean up."""
        logger.info("StatDeck Service stopping...")
        self.running = False
        self.http_server.stop()
        self.usb.disconnect()
        logger.info("Service stopped")


if __name__ == '__main__':
    service = StatDeckService()
    service.run()
