/**
 * USB Manager v2
 * 
 * Instead of opening the COM port directly (which conflicts with main.py),
 * this connects to the StatDeck Service via TCP on localhost:5555.
 * The Service acts as a relay to/from the Pi over USB serial.
 * 
 * Pi side requires ZERO changes - serial protocol is unchanged.
 * 
 * Config App -> TCP localhost:5555 -> Service -> USB Serial -> Pi
 */

class USBManager {
    constructor(app) {
        this.app = app;
        this.socket = null;
        this.connected = false;
        this.buffer = '';
        this.pendingCallbacks = new Map(); // For request/response pairing
        this.init();
    }
    
    init() {
        this.connectToService();
    }
    
    /**
     * Connect to the StatDeck Service via TCP on localhost:5555
     */
    async connectToService() {
        const net = require('net');
        
        return new Promise((resolve) => {
            console.log('Connecting to StatDeck Service on localhost:5555...');
            
            this.socket = new net.Socket();
            
            // Connection timeout
            const connectTimeout = setTimeout(() => {
                if (!this.connected) {
                    console.warn('Service connection timeout - is main.py running?');
                    this.updateStatus();
                    resolve(false);
                }
            }, 5000);
            
            this.socket.connect(5555, '127.0.0.1', () => {
                clearTimeout(connectTimeout);
                this.connected = true;
                this.updateStatus();
                console.log('Connected to StatDeck Service');
                resolve(true);
            });
            
            // Handle incoming data from Service
            this.socket.on('data', (data) => {
                this.buffer += data.toString();
                
                // Process complete lines (newline-delimited JSON)
                while (this.buffer.includes('\n')) {
                    const newlineIdx = this.buffer.indexOf('\n');
                    const line = this.buffer.substring(0, newlineIdx).trim();
                    this.buffer = this.buffer.substring(newlineIdx + 1);
                    
                    if (line) {
                        try {
                            const message = JSON.parse(line);
                            this._handleServiceMessage(message);
                        } catch (err) {
                            console.error('Error parsing Service message:', err);
                        }
                    }
                }
            });
            
            this.socket.on('close', () => {
                console.log('Disconnected from StatDeck Service');
                this.connected = false;
                this.updateStatus();
                
                // Auto-reconnect after 3 seconds
                setTimeout(() => {
                    if (!this.connected) {
                        console.log('Attempting to reconnect to Service...');
                        this.connectToService();
                    }
                }, 3000);
            });
            
            this.socket.on('error', (err) => {
                clearTimeout(connectTimeout);
                
                if (err.code === 'ECONNREFUSED') {
                    console.warn('Service not running - start main.py first');
                } else {
                    console.error('Service connection error:', err.message);
                }
                
                this.connected = false;
                this.updateStatus();
                resolve(false);
            });
        });
    }
    
    /**
     * Handle messages received from the Service
     */
    _handleServiceMessage(message) {
        const msgType = message.type;
        
        if (msgType === 'layout_data') {
            // Response to get_layout request
            const callback = this.pendingCallbacks.get('get_layout');
            if (callback) {
                this.pendingCallbacks.delete('get_layout');
                callback.resolve(message.layout);
            }
        }
        else if (msgType === 'config_ack') {
            // Response to config push
            const callback = this.pendingCallbacks.get('config');
            if (callback) {
                this.pendingCallbacks.delete('config');
                callback.resolve(message.success);
            }
            
            if (message.success) {
                console.log('Config successfully pushed to Pi');
            } else {
                console.warn('Config push failed:', message.error || 'unknown error');
            }
        }
        else if (msgType === 'status') {
            // Status response
            const callback = this.pendingCallbacks.get('get_status');
            if (callback) {
                this.pendingCallbacks.delete('get_status');
                callback.resolve(message);
            }
        }
        else {
            console.log('Unknown message from Service:', msgType);
        }
    }
    
    /**
     * Send a JSON message to the Service via TCP
     */
    _sendToService(message) {
        if (!this.connected || !this.socket) {
            console.warn('Cannot send - not connected to Service');
            return false;
        }
        
        try {
            const data = JSON.stringify(message) + '\n';
            this.socket.write(data);
            return true;
        } catch (err) {
            console.error('Error sending to Service:', err);
            return false;
        }
    }
    
    /**
     * Push layout config to Pi (through the Service relay)
     * This replaces the old direct-serial sendConfig()
     */
    sendConfig(layout) {
        if (!this.isConnected()) {
            console.warn('Cannot send config - not connected to Service');
            return false;
        }
        
        const message = {
            type: 'config',
            layout: layout
        };
        
        return this._sendToService(message);
    }
    
    /**
     * Request current layout from Pi (through the Service relay)
     * This replaces the old direct-serial getLayoutFromPi()
     */
    async getLayoutFromPi() {
        return new Promise((resolve, reject) => {
            if (!this.isConnected()) {
                reject(new Error('Not connected to Service'));
                return;
            }
            
            // Set up timeout
            const timeout = setTimeout(() => {
                this.pendingCallbacks.delete('get_layout');
                reject(new Error('Timeout waiting for layout from Service'));
            }, 10000);
            
            // Register callback
            this.pendingCallbacks.set('get_layout', {
                resolve: (layout) => {
                    clearTimeout(timeout);
                    console.log('Received layout from Service');
                    resolve(layout);
                },
                reject: (err) => {
                    clearTimeout(timeout);
                    reject(err);
                }
            });
            
            // Send request to Service
            console.log('Requesting layout from Service...');
            this._sendToService({ type: 'get_layout' });
        });
    }
    
    /**
     * Disconnect from the Service
     */
    disconnect() {
        if (this.socket) {
            this.socket.destroy();
            this.socket = null;
        }
        this.connected = false;
        this.updateStatus();
    }
    
    isConnected() {
        return this.connected;
    }
    
    updateStatus() {
        const statusEl = document.getElementById('status-usb');
        if (statusEl) {
            const status = this.connected ? 'Connected (via Service)' : 'Disconnected';
            statusEl.textContent = `USB: ${status}`;
        }
    }
}
