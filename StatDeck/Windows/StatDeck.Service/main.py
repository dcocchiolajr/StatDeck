"""
StatDeck Windows Service
Main entry point for the background service that collects hardware stats
and communicates with the Raspberry Pi display over USB.

v2 - Added TCP config server on localhost:5555 so Config App can connect
     simultaneously without fighting over the COM port.
     Serial protocol is UNCHANGED - raw JSON, no prefixes.
     Pi side requires ZERO changes.
"""

import time
import json
import socket
import logging
from datetime import datetime
from threading import Thread, Lock
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

# TCP config server port for Config App IPC
CONFIG_SERVER_PORT = 5555


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
        
        # Initialize HTTP server for Config App live preview
        self.http_server = StatsHTTPServer(port=8080)
        
        # Layout cache - holds the current layout from Pi
        self.layout_cache = self.config.get('layout', {})
        self.layout_lock = Lock()
        
        # TCP config server for Config App IPC
        self.config_server = None
        self.config_server_thread = None
        
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
        
        elif msg_type == 'layout_response':
            # Pi sent us its current layout (we requested it on startup)
            layout = message.get('layout', {})
            if layout:
                tile_count = len(layout.get('tiles', []))
                logger.info(f"Received layout from Pi with {tile_count} tiles")
                with self.layout_lock:
                    self.layout_cache = layout
                    self.config['layout'] = layout
                self.action_executor.update_layout(layout)
            else:
                logger.warning("Received empty layout from Pi")
        
        elif msg_type == 'status':
            # Status heartbeat from Pi
            logger.debug(f"Pi status: {message}")
        
        else:
            logger.warning(f"Unknown message type from Pi: {msg_type}")
    
    def send_config(self):
        """Send current layout configuration to Pi."""
        with self.layout_lock:
            layout = self.layout_cache
        
        message = {
            'type': 'config',
            'layout': layout
        }
        
        try:
            self.usb.send_message(message)
            logger.info("Configuration sent to Pi")
        except Exception as e:
            logger.error(f"Error sending config: {e}")

    # ==================================================================
    # TCP CONFIG SERVER - Allows Config App to connect simultaneously
    # ==================================================================

    def start_config_server(self):
        """Start TCP server on localhost:5555 for Config App IPC."""
        try:
            self.config_server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.config_server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            self.config_server.settimeout(1.0)  # Allow checking self.running
            self.config_server.bind(('127.0.0.1', CONFIG_SERVER_PORT))
            self.config_server.listen(2)
            
            self.config_server_thread = Thread(
                target=self._config_server_loop,
                daemon=True
            )
            self.config_server_thread.start()
            
            logger.info(f"Config server listening on localhost:{CONFIG_SERVER_PORT}")
            print(f"✓ Config server running on localhost:{CONFIG_SERVER_PORT}")
            
        except Exception as e:
            logger.error(f"Failed to start config server: {e}")
            print(f"✗ Config server failed: {e}")
    
    def _config_server_loop(self):
        """Accept incoming Config App connections."""
        while self.running:
            try:
                client, addr = self.config_server.accept()
                logger.info(f"Config App connected from {addr}")
                
                # Handle each client in its own thread
                client_thread = Thread(
                    target=self._handle_config_client,
                    args=(client,),
                    daemon=True
                )
                client_thread.start()
                
            except socket.timeout:
                continue  # Check self.running again
            except OSError:
                break  # Socket was closed
            except Exception as e:
                if self.running:
                    logger.error(f"Config server error: {e}")
    
    def _handle_config_client(self, client):
        """
        Handle a single Config App TCP connection.
        
        Protocol (newline-delimited JSON, same as USB):
          Config App sends:
            {"type": "get_layout"}           -> Service replies with layout
            {"type": "config", "layout": {}} -> Service forwards to Pi via USB
            {"type": "get_status"}           -> Service replies with connection status
          
          Service sends:
            {"type": "layout_data", "layout": {...}}
            {"type": "config_ack", "success": true/false}
            {"type": "status", "usb_connected": true/false, "pi_layout_tiles": N}
        """
        client.settimeout(0.5)
        buffer = ''
        
        try:
            while self.running:
                # Read data from Config App
                try:
                    data = client.recv(4096)
                    if not data:
                        break  # Client disconnected
                    
                    buffer += data.decode('utf-8')
                    
                    # Process complete lines
                    while '\n' in buffer:
                        line, buffer = buffer.split('\n', 1)
                        line = line.strip()
                        if line:
                            self._process_config_message(client, line)
                
                except socket.timeout:
                    continue  # Normal - just loop back
                except ConnectionResetError:
                    break
                    
        except Exception as e:
            logger.error(f"Config client error: {e}")
        finally:
            try:
                client.close()
            except Exception:
                pass
            logger.info("Config App disconnected")
    
    def _process_config_message(self, client, line):
        """Process a single message from the Config App."""
        try:
            message = json.loads(line)
        except json.JSONDecodeError as e:
            logger.warning(f"Invalid JSON from Config App: {e}")
            return
        
        msg_type = message.get('type')
        
        if msg_type == 'get_layout':
            # Config App wants the current layout
            with self.layout_lock:
                layout = self.layout_cache
            
            response = {
                'type': 'layout_data',
                'layout': layout,
                'timestamp': int(datetime.now().timestamp() * 1000)
            }
            self._send_to_config_client(client, response)
            logger.info("Sent layout to Config App")
        
        elif msg_type == 'config':
            # Config App is pushing a new layout - forward to Pi via USB
            layout = message.get('layout', {})
            
            if layout:
                # Update our cache
                with self.layout_lock:
                    self.layout_cache = layout
                    self.config['layout'] = layout
                self.action_executor.update_layout(layout)
                
                # Forward to Pi as-is (raw JSON, no prefix)
                usb_message = {
                    'type': 'config',
                    'layout': layout
                }
                
                try:
                    success = self.usb.send_message(usb_message)
                    if success:
                        logger.info("Config forwarded to Pi from Config App")
                    else:
                        logger.warning("Failed to forward config to Pi (USB not connected?)")
                except Exception as e:
                    logger.error(f"Error forwarding config to Pi: {e}")
                    success = False
                
                # Acknowledge to Config App
                ack = {
                    'type': 'config_ack',
                    'success': success if isinstance(success, bool) else False
                }
                self._send_to_config_client(client, ack)
            else:
                logger.warning("Empty layout received from Config App")
                ack = {'type': 'config_ack', 'success': False, 'error': 'Empty layout'}
                self._send_to_config_client(client, ack)
        
        elif msg_type == 'get_status':
            # Config App wants connection status
            with self.layout_lock:
                tile_count = len(self.layout_cache.get('tiles', []))
            
            status = {
                'type': 'status',
                'usb_connected': self.usb.is_connected(),
                'pi_layout_tiles': tile_count,
                'timestamp': int(datetime.now().timestamp() * 1000)
            }
            self._send_to_config_client(client, status)
        
        else:
            logger.warning(f"Unknown message type from Config App: {msg_type}")
    
    def _send_to_config_client(self, client, message):
        """Send a JSON message to a Config App TCP client."""
        try:
            data = json.dumps(message) + '\n'
            client.sendall(data.encode('utf-8'))
        except (BrokenPipeError, ConnectionResetError, OSError) as e:
            logger.warning(f"Failed to send to Config App: {e}")

    # ==================================================================
    # MAIN SERVICE LOOP
    # ==================================================================
    
    def run(self):
        """Main service loop."""
        logger.info("StatDeck Service starting...")
        
        # Start HTTP server for Config App live preview
        self.http_server.start()
        
        # Connect to Pi
        if not self.usb.connect():
            logger.error("Failed to connect to Pi. Retrying...")
        else:
            # Request current layout from Pi
            logger.info("Requesting layout from Pi...")
            self.usb.send_message({
                'type': 'get_layout',
                'timestamp': int(datetime.now().timestamp() * 1000)
            })
            time.sleep(0.5)  # Give Pi time to respond
        
        self.running = True
        
        # Start TCP config server for Config App IPC
        self.start_config_server()
        
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
        
        # Stop config server
        if self.config_server:
            try:
                self.config_server.close()
            except Exception:
                pass
        
        self.http_server.stop()
        self.usb.disconnect()
        logger.info("Service stopped")


if __name__ == '__main__':
    service = StatDeckService()
    service.run()
