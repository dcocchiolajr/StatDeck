"""
StatDeck HTTP Server
Provides HTTP endpoint for the Config App to fetch real stats
Runs alongside the main USB service
"""

import json
import logging
from http.server import HTTPServer, BaseHTTPRequestHandler
from threading import Thread
from collectors.cpu_collector import CPUCollector
from collectors.gpu_collector import GPUCollector
from collectors.ram_collector import RAMCollector
from collectors.disk_collector import DiskCollector
from collectors.network_collector import NetworkCollector
from collectors.system_collector import SystemCollector

logger = logging.getLogger(__name__)


class StatsHTTPHandler(BaseHTTPRequestHandler):
    """HTTP request handler for stats endpoint."""
    
    # Class variable to hold collectors (set by server)
    collectors = None
    
    def do_GET(self):
        """Handle GET requests."""
        if self.path == '/stats':
            self.send_stats()
        else:
            self.send_error(404, "Not Found")
    
    def send_stats(self):
        """Collect and send current stats as JSON."""
        try:
            stats = {}
            
            for name, collector in self.collectors.items():
                try:
                    stats[name] = collector.collect()
                except Exception as e:
                    logger.error(f"Error collecting {name}: {e}")
                    stats[name] = {}
            
            # Send response
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')  # Allow CORS
            self.end_headers()
            
            response = json.dumps(stats)
            self.wfile.write(response.encode())
            
        except Exception as e:
            logger.error(f"Error sending stats: {e}")
            self.send_error(500, str(e))
    
    def log_message(self, format, *args):
        """Override to reduce logging noise."""
        pass  # Comment this out if you want to see HTTP requests


class StatsHTTPServer:
    """HTTP server that provides real-time stats."""
    
    def __init__(self, port=8080):
        self.port = port
        self.server = None
        self.thread = None
        
        # Initialize collectors
        self.collectors = {
            'cpu': CPUCollector(),
            'gpu': GPUCollector(),
            'ram': RAMCollector(),
            'disk': DiskCollector(),
            'network': NetworkCollector()
        }
        
        # Set collectors for handler
        StatsHTTPHandler.collectors = self.collectors
    
    def start(self):
        """Start the HTTP server in a background thread."""
        try:
            self.server = HTTPServer(('localhost', self.port), StatsHTTPHandler)
            self.thread = Thread(target=self.server.serve_forever, daemon=True)
            self.thread.start()
            logger.info(f"HTTP server started on http://localhost:{self.port}")
            print(f"✓ HTTP server running on http://localhost:{self.port}/stats")
            return True
        except Exception as e:
            logger.error(f"Failed to start HTTP server: {e}")
            print(f"✗ Failed to start HTTP server: {e}")
            return False
    
    def stop(self):
        """Stop the HTTP server."""
        if self.server:
            self.server.shutdown()
            logger.info("HTTP server stopped")


if __name__ == '__main__':
    # Run standalone HTTP server for testing
    import logging
    logging.basicConfig(level=logging.INFO)
    
    server = StatsHTTPServer(port=8080)
    
    if server.start():
        print("\n" + "="*60)
        print("StatDeck HTTP Server Running")
        print("="*60)
        print(f"Stats endpoint: http://localhost:8080/stats")
        print("Press Ctrl+C to stop")
        print("="*60 + "\n")
        
        try:
            # Keep running
            import time
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\nStopping server...")
            server.stop()
