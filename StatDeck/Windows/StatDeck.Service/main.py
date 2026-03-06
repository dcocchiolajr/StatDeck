"""
StatDeck Windows Service
Main entry point for the background service that collects hardware stats
and communicates with the Raspberry Pi display over USB Gadget Mode (Network).
"""

import time
import json
import socket
import logging
import threading
import sys
import os
import subprocess
import winreg
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

import pystray
from PIL import Image, ImageDraw


# 1. Get the path to the user's Documents/StatDeck folder
docs_folder = os.path.join(os.path.expanduser('~'), 'Documents', 'StatDeck')

# 2. Make sure the folder exists so it doesn't crash on the first run
os.makedirs(docs_folder, exist_ok=True)

# 3. Define the exact path for the log file
log_file_path = os.path.join(docs_folder, 'statdeck_service.log')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file_path), # <--- Now safely writes to Documents
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

# TCP config server port for Config App IPC
CONFIG_SERVER_PORT = 5555

# ==================================================================
# High-Speed TCP Network Manager
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
            self.sock.settimeout(0.01)
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
# MAIN STATDECK SERVICE
# ==================================================================


def get_documents_dir():
    r"""Finds or creates C:\Users\YourName\Documents\StatDeck"""
    documents_dir = os.path.join(os.path.expanduser('~'), 'Documents')
    statdeck_dir = os.path.join(documents_dir, 'StatDeck')
    if not os.path.exists(statdeck_dir):
        os.makedirs(statdeck_dir)
        os.makedirs(os.path.join(statdeck_dir, 'layouts'))
    return statdeck_dir

class StatDeckService:
    def __init__(self, config_path='config.json'):
        # Universal Documents Routing
        self.app_dir = get_documents_dir()
        self.config_path = os.path.join(self.app_dir, 'config.json')
        self.config = self.load_config()
        
        self.collectors = {
            'cpu': CPUCollector(),
            'gpu': GPUCollector(),
            'ram': RAMCollector(),
            'disk': DiskCollector(),
            'network': NetworkCollector(),
            'system': SystemCollector()
        }
        
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
        self.is_paused = False
        self.update_interval = self.config.get('update_interval', 0.5)
        
    def load_config(self):
        try:
            with open(self.config_path, 'r') as f:
                return json.load(f)
        except FileNotFoundError:
            logger.warning(f"Config file {self.config_path} not found, using defaults")
            return {'pi_host': 'missioncontrol.local', 'update_interval': 0.5, 'layout': {}}
        
    def broadcast_layout(self, layout_data, profile_name):
            logger.info(f"Switching to profile: {profile_name}")
            try:
                layout_path = os.path.join(self.app_dir, 'layouts', f"{profile_name}.json")
                if os.path.exists(layout_path):
                    with open(layout_path, 'r', encoding='utf-8') as f:
                        layout_data = json.load(f) 
            except Exception as e:
                logger.error(f"Error reading layout file: {e}")

            if hasattr(self, 'usb') and self.usb:
                self.usb.send_message({"type": "config", "layout": layout_data})
            if hasattr(self, 'action_executor'):
                self.action_executor.update_layout(layout_data)
    
    def collect_stats(self):
        stats = {}
        for name, collector in self.collectors.items():
            try: stats[name] = collector.collect()
            except Exception: stats[name] = {}
        return stats
    
    def send_stats(self, stats):
        self.usb.send_message({
            'type': 'stats',
            'timestamp': int(datetime.now().timestamp() * 1000),
            'data': stats
        })
    
    def handle_pi_message(self, message):
        msg_type = message.get('type')
        if msg_type == 'action':
            try: self.action_executor.execute(message.get('tile_id'), message.get('action_type'))
            except Exception as e: logger.error(f"Error executing action: {e}")
        elif msg_type == 'config_request':
            self.send_config()
        elif msg_type == 'layout_response':
            layout = message.get('layout', {})
            if layout:
                with self.layout_lock:
                    self.layout_cache = layout
                    self.config['layout'] = layout
                self.action_executor.update_layout(layout)
    
    def send_config(self):
        with self.layout_lock:
            layout = self.layout_cache
        self.usb.send_message({'type': 'config', 'layout': layout})

    def start_config_server(self):
        try:
            self.config_server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.config_server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
            self.config_server.settimeout(1.0)
            self.config_server.bind(('127.0.0.1', CONFIG_SERVER_PORT))
            self.config_server.listen(2)
            self.config_server_thread = Thread(target=self._config_server_loop, daemon=True)
            self.config_server_thread.start()
        except Exception as e:
            logger.error(f"Failed to start config server: {e}")
    
    def _config_server_loop(self):
        while self.running:
            try:
                client, addr = self.config_server.accept()
                Thread(target=self._handle_config_client, args=(client,), daemon=True).start()
            except socket.timeout: continue
            except OSError: break
    
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
                except socket.timeout: continue
                except ConnectionResetError: break
        finally:
            client.close()
    
    def _process_config_message(self, client, line):
            try: message = json.loads(line)
            except Exception: return
        
            msg_type = message.get('type')
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
                    with open(self.config_path, 'w') as f: json.dump(self.config, f, indent=4)
                except Exception: pass
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
        
        if not self.usb.connect():
            logger.error("Failed to connect to Pi Network.")
        else:
            self.usb.send_message({'type': 'get_layout', 'timestamp': int(datetime.now().timestamp() * 1000)})
            time.sleep(0.5)
        
        self.running = True
        self.start_config_server()
        last_update = 0
        
        try:
            while self.running:
                # FIXED: Only collect stats if not paused, but ALWAYS keep reading Pi messages
                if not self.is_paused:
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

# ==================================================================
# SYSTEM TRAY & REGISTRY INTEGRATION
# ==================================================================
APP_NAME = "StatDeckService"
REG_PATH = r"Software\Microsoft\Windows\CurrentVersion\Run"
statdeck_service = None

def is_startup_enabled():
    try:
        registry_key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, REG_PATH, 0, winreg.KEY_READ)
        winreg.QueryValueEx(registry_key, APP_NAME)
        winreg.CloseKey(registry_key)
        return True
    except WindowsError: return False

def toggle_startup(icon, item):
    enabled = is_startup_enabled()
    try:
        registry_key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, REG_PATH, 0, winreg.KEY_SET_VALUE)
        if enabled:
            winreg.DeleteValue(registry_key, APP_NAME)
        else:
            if getattr(sys, 'frozen', False): app_path = sys.executable
            else: app_path = os.path.abspath(__file__)
            winreg.SetValueEx(registry_key, APP_NAME, 0, winreg.REG_SZ, f'"{app_path}"')
        winreg.CloseKey(registry_key)
    except WindowsError as e: print(f"Tray Error: Failed to toggle startup: {e}")

def resource_path(relative_path):
    """Get absolute path to resource, works for dev and for PyInstaller"""
    try: base_path = sys._MEIPASS
    except Exception: base_path = os.path.abspath(".")
    return os.path.join(base_path, relative_path)

def create_image():
    """Loads icon.ico if it exists, otherwise draws a placeholder square."""
    try:
        return Image.open(resource_path("icon.ico"))
    except Exception:
        image = Image.new('RGB', (64, 64), color=(0, 255, 136))
        draw = ImageDraw.Draw(image)
        draw.rectangle((16, 16, 48, 48), fill=(0, 0, 0))
        return image

def open_settings(icon, item):
    """Looks for StatDeckConfig.exe in the same folder and runs it."""
    if getattr(sys, 'frozen', False): base_dir = os.path.dirname(sys.executable)
    else: base_dir = os.path.dirname(os.path.abspath(__file__))
    
    config_app_path = os.path.join(base_dir, "StatDeckConfig.exe")
    if os.path.exists(config_app_path): subprocess.Popen([config_app_path])
    else: print(f"Tray Error: Could not find {config_app_path}")

def run_service_in_background():
    global statdeck_service
    statdeck_service = StatDeckService()
    statdeck_service.run()

def on_start(icon, item):
    global statdeck_service
    if statdeck_service: statdeck_service.is_paused = False

def on_stop(icon, item):
    global statdeck_service
    if statdeck_service: statdeck_service.is_paused = True

def on_exit(icon, item):
    global statdeck_service
    if statdeck_service: statdeck_service.stop()
    icon.stop()

if __name__ == '__main__':
    engine_thread = threading.Thread(target=run_service_in_background, daemon=True)
    engine_thread.start()
    
    menu = pystray.Menu(
        pystray.MenuItem('Open Settings', open_settings, default=True), # Opens your Config app!
        pystray.Menu.SEPARATOR,
        pystray.MenuItem('Start Service', on_start),
        pystray.MenuItem('Stop Service', on_stop),
        pystray.MenuItem('Run on Startup', toggle_startup, checked=lambda item: is_startup_enabled()),
        pystray.Menu.SEPARATOR,
        pystray.MenuItem('Exit StatDeck', on_exit)
    )
    
    tray_icon = pystray.Icon("StatDeck", create_image(), "StatDeck Service", menu)
    tray_icon.run()