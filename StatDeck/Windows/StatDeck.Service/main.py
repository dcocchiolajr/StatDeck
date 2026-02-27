"""
StatDeck Windows Service
Main entry point for the background service that collects hardware stats
and communicates with the Raspberry Pi display over USB Gadget Mode (Network).
"""

import time
import json
import socket
import logging
from datetime import datetime
from threading import Thread, Lock
from collectors.cpu_collector import CPUCollector
from collectors.system_collector import SystemCollector
from profile_manager import ProfileManager
from collectors.gpu_collector import GPUCollector
from collectors.ram_collector import RAMCollector
from collectors.disk_collector import DiskCollector
from collectors.network_collector import NetworkCollector
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

# ==================================================================
# NEW: High-Speed TCP Network Manager (Replaces USBManager)
# ==================================================================
class PiNetworkManager:
    """Handles direct TCP communication with the Pi over USB Gadget Mode."""
    def __init__(self, host='missioncontrol.local', port=5556):
        self.host = host
        self.port = port
        self.sock = None
        self.buffer = ""

    def is_connected(self):
        return self.sock is not None

    def connect(self):
        try:
            self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.sock.settimeout(2.0)
            self.sock.connect((self.host, self.port))
            self.sock.settimeout(0.01)  # Fast timeout for reading non-blocking
            logger.info(f"Connected to Pi Network at {self.host}:{self.port}")
            return True
        except Exception as e:
            self.sock = None
            return False

    def disconnect(self):
        if self.sock:
            try:
                self.sock.close()
            except:
                pass
            self.sock = None

    def send_message(self, message):
        if not self.is_connected():
            if not self.connect():
                return False
        try:
            data = json.dumps(message) + '\n'
            self.sock.sendall(data.encode('utf-8'))
            return True
        except Exception:
            self.disconnect()
            return False

    def receive_message(self):
        if not self.is_connected():
            return None
        try:
            data = self.sock.recv(4096).decode('utf-8')
            if not data:
                self.disconnect()
                return None
            self.buffer += data
            if '\n' in self.buffer:
                line, self.buffer = self.buffer.split('\n', 1)
                if line.strip():
                    return json.loads(line.strip())
        except socket.timeout:
            return None
        except Exception:
            self.disconnect()
            return None
        return None

# ==================================================================

class StatDeckService:
    """Main service class that orchestrates stats collection and communication."""
    
    def __init__(self, config_path='config.json'):
        self.config_path = config_path
        self.config = self.load_config()
        
        self.collectors = {
            'cpu': CPUCollector(),
            'gpu': GPUCollector(),
            'ram': RAMCollector(),
            'disk': DiskCollector(),
            'network': NetworkCollector(),
            'system': SystemCollector()
        }
        
        # NEW: Initialize Network connection instead of Serial COM Port
        self.usb = PiNetworkManager(
            host=self.config.get('pi_host', 'missioncontrol.local'),
            port=5556
        )
        
        self.profile_mgr = ProfileManager(on_switch=self.broadcast_layout)
        self.action_executor = ActionExecutor(self.config.get('layout', {}))
        self.http_server = StatsHTTPServer(port=8080)
        
        self.layout_cache = self.config.get('layout', {})
        self.layout_lock = Lock()
        
        self.config_server = None
        self.config_server_thread = None
        
        self.running = False
        self.update_interval = self.config.get('update_interval', 0.5)
        
    def load_config(self):
        try:
            with open(self.config_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            logger.warning(f"Config file {self.config_path} not found, using defaults")
            return {
                'pi_host': 'missioncontrol.local',
                'update_interval': 0.5,
                'layout': {}
            }
        
    def broadcast_layout(self, layout_data, profile_name):
            import os
            logger.info(f"Switching to profile: {profile_name}")
            try:
                layout_path = os.path.join('layouts', f"{profile_name}.json")
                if os.path.exists(layout_path):
                    with open(layout_path, 'r', encoding='utf-8') as f:
                        layout_data = json.load(f) 
            except Exception as e:
                logger.error(f"Error reading layout file: {e}")

            if hasattr(self, 'usb') and self.usb:
                payload = {
                    "type": "config",
                    "layout": layout_data
                }
                self.usb.send_message(payload)
            
            if hasattr(self, 'action_executor'):
                self.action_executor.update_layout(layout_data)
    
    def collect_stats(self):
        stats = {}
        for name, collector in self.collectors.items():
            try:
                stats[name] = collector.collect()
            except Exception as e:
                stats[name] = {}
        return stats
    
    def send_stats(self, stats):
        message = {
            'type': 'stats',
            'timestamp': int(datetime.now().timestamp() * 1000),
            'data': stats
        }
        self.usb.send_message(message)
    
    def handle_pi_message(self, message):
        msg_type = message.get('type')
        if msg_type == 'action':
            try:
                self.action_executor.execute(message.get('tile_id'), message.get('action_type'))
            except Exception as e:
                logger.error(f"Error executing action: {e}")
        elif msg_type == 'config_request':
            self.send_config()
        elif msg_type == 'layout_response':
            layout = message.get('layout', {})
            if layout:
                with self.layout_lock:
                    self.layout_cache = layout
                    self.config['layout'] = layout
                self.action_executor.update_layout(layout)
        elif msg_type == 'status':
            logger.debug(f"Pi status: {message}")
    
    def send_config(self):
        with self.layout_lock:
            layout = self.layout_cache
        message = {'type': 'config', 'layout': layout}
        self.usb.send_message(message)

    # TCP CONFIG SERVER for Config App (Unchanged)
    def start_config_server(self):
        try:
            self.config_server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.config_server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            self.config_server.settimeout(1.0)
            self.config_server.bind(('127.0.0.1', CONFIG_SERVER_PORT))
            self.config_server.listen(2)
            self.config_server_thread = Thread(target=self._config_server_loop, daemon=True)
            self.config_server_thread.start()
            logger.info(f"Config server listening on localhost:{CONFIG_SERVER_PORT}")
        except Exception as e:
            logger.error(f"Failed to start config server: {e}")
    
    def _config_server_loop(self):
        while self.running:
            try:
                client, addr = self.config_server.accept()
                Thread(target=self._handle_config_client, args=(client,), daemon=True).start()
            except socket.timeout:
                continue
            except OSError:
                break
    
    def _handle_config_client(self, client):
        client.settimeout(0.5)
        buffer = ''
        try:
            while self.running:
                try:
                    data = client.recv(4096)
                    if not data: break
                    buffer += data.decode('utf-8')
                    while '\n' in buffer:
                        line, buffer = buffer.split('\n', 1)
                        if line.strip(): self._process_config_message(client, line.strip())
                except socket.timeout:
                    continue
                except ConnectionResetError:
                    break
        finally:
            client.close()
    
    def _process_config_message(self, client, line):
            # DEBUG: Print exactly what raw text just arrived
            print(f"DEBUG: Raw data received from Config App: {line}")
        
            try: 
                message = json.loads(line)
            except Exception as e:
                print(f"DEBUG: JSON Parse Error: {e}")
                return
        
            msg_type = message.get('type')
            print(f"DEBUG: Message Type detected: {msg_type}") # Confirm it's 'update_tuning'

            if msg_type == 'get_layout':
                with self.layout_lock: layout = self.layout_cache
                self._send_to_config_client(client, {'type': 'layout_data', 'layout': layout})
            elif msg_type == 'config':
                layout = message.get('layout', {})
                if layout:
                    with self.layout_lock:
                        self.layout_cache = layout
                        self.config['layout'] = layout
                    self.action_executor.update_layout(layout)
                    success = self.usb.send_message({'type': 'config', 'layout': layout})
                    self._send_to_config_client(client, {'type': 'config_ack', 'success': bool(success)})
        
            elif msg_type == 'update_tuning':
                rate_ms = message.get('stats_rate_ms', 500)
                debounce_ms = message.get('debounce_ms', 1500)
            
                safe_rate_ms = max(100, int(rate_ms))
                safe_debounce_ms = max(500, int(debounce_ms))
            
                self.update_interval = safe_rate_ms / 1000.0
                if hasattr(self, 'profile_mgr'):
                    self.profile_mgr.debounce_time = safe_debounce_ms / 1000.0
                
                self.config['update_interval'] = self.update_interval
                self.config['profile_debounce'] = safe_debounce_ms / 1000.0
            
                try:
                    with open(self.config_path, 'w') as f:
                        json.dump(self.config, f, indent=4)
                    print(f"SUCCESS: Tuning updated! Rate={safe_rate_ms}ms, Debounce={safe_debounce_ms}ms")
                except Exception as e:
                    print(f"ERROR: Failed to save config: {e}")
                
                self._send_to_config_client(client, {'type': 'tuning_ack', 'success': True})        
        
            elif msg_type == 'get_status':
                with self.layout_lock: tiles = len(self.layout_cache.get('tiles', []))
                self._send_to_config_client(client, {'type': 'status', 'usb_connected': self.usb.is_connected(), 'pi_layout_tiles': tiles})
    
    def _send_to_config_client(self, client, message):
        try: client.sendall((json.dumps(message) + '\n').encode('utf-8'))
        except: pass
    
    def run(self):
        logger.info("StatDeck Service starting...")
        self.http_server.start()
        
        # Connect to Pi over Network
        if not self.usb.connect():
            logger.error("Failed to connect to Pi Network. Will keep trying in background...")
        else:
            self.usb.send_message({'type': 'get_layout', 'timestamp': int(datetime.now().timestamp() * 1000)})
            time.sleep(0.5)
        
        self.running = True
        self.start_config_server()
        last_update = 0
        
        try:
            while self.running:
                current_time = time.time()
                if current_time - last_update >= self.update_interval:
                    stats = self.collect_stats()
                    if hasattr(self, 'profile_mgr'):
                        self.profile_mgr.update(stats.get('system', {}))
                    self.send_stats(stats)
                    last_update = current_time
                
                message = self.usb.receive_message()
                if message:
                    self.handle_pi_message(message)
                time.sleep(0.01)
        except KeyboardInterrupt:
            pass
        finally:
            self.stop()
    
    def stop(self):
        self.running = False
        if self.config_server:
            try: self.config_server.close()
            except: pass
        self.http_server.stop()
        self.usb.disconnect()

if __name__ == '__main__':
    service = StatDeckService()
    service.run()