/**
 * USB Manager
 * Handles USB serial communication with Raspberry Pi
 */

class USBManager {
    constructor(app) {
        this.app = app;
        this.port = null;
        this.connected = false;
        this.init();
    }
    
    init() {
        // Try to auto-connect to common COM ports
        this.autoConnect();
    }
    
    async autoConnect() {
        // Try likely Pi ports first (COM7-COM10), then scan rest
        const priorityPorts = [7, 8, 9, 10];
        const allPorts = [...priorityPorts];
        
        // Add remaining ports (20→1, skipping already tried)
        for (let i = 20; i >= 1; i--) {
            if (!priorityPorts.includes(i)) {
                allPorts.push(i);
            }
        }
        
        for (const portNum of allPorts) {
            const portPath = `COM${portNum}`;
            console.log(`Trying ${portPath}...`);
            
            const success = await this.connect(portPath);
            if (success) {
                // Wait a moment for connection to stabilize
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Verify it's still connected
                if (this.port && this.port.isOpen) {
                    console.log(`Auto-connected to ${portPath}`);
                    return true;
                }
            }
        }
        
        console.log('No Pi device found on any COM port');
        this.updateStatus();
        return false;
    }
    
    async connect(portPath) {
        try {
            const { SerialPort } = require('serialport');
            
            this.port = new SerialPort({
                path: portPath,
                baudRate: 115200
            });
            
            this.port.on('open', () => {
                this.connected = true;
                this.updateStatus();
                console.log('USB connected');
            });
            
            this.port.on('close', () => {
                this.connected = false;
                this.updateStatus();
                console.log('USB disconnected');
            });
            
            this.port.on('error', (err) => {
                console.error('USB error:', err);
            });
            
            return true;
        } catch (err) {
            console.error('Failed to connect USB:', err);
            return false;
        }
    }
    
    disconnect() {
        if (this.port && this.port.isOpen) {
            this.port.close();
        }
    }
    
    sendConfig(layout) {
        if (!this.isConnected()) {
            console.warn('Cannot send config - not connected');
            return false;
        }
        
        const message = {
            type: 'config',
            layout: layout
        };
        
        const data = JSON.stringify(message) + '\n';
        this.port.write(data);
        
        return true;
    }
    
    /**
     * Request current layout from Pi
     */
    async getLayoutFromPi() {
        return new Promise((resolve, reject) => {
            if (!this.isConnected()) {
                reject(new Error('Not connected to Pi'));
                return;
            }

            // Set up one-time listener for layout response
            const timeout = setTimeout(() => {
                this.port.removeListener('data', handleData);
                reject(new Error('Timeout waiting for layout from Pi'));
            }, 10000); // Increased to 10 seconds

            let buffer = '';
            const handleData = (data) => {
                try {
                    buffer += data.toString();
                    
                    // Check if we have a complete message (ends with newline)
                    if (buffer.includes('\n')) {
                        const lines = buffer.split('\n');
                        buffer = lines.pop(); // Keep incomplete line in buffer
                        
                        for (const line of lines) {
                            if (line.trim()) {
                                const message = JSON.parse(line);
                                
                                if (message.type === 'layout_response') {
                                    clearTimeout(timeout);
                                    this.port.removeListener('data', handleData);
                                    console.log('Received layout from Pi');
                                    resolve(message.layout);
                                    return;
                                }
                            }
                        }
                    }
                } catch (err) {
                    console.error('Parse error:', err);
                    // Continue listening, might be partial data
                }
            };

            this.port.on('data', handleData);

            // Send request to Pi
            const request = JSON.stringify({
                type: 'get_layout',
                timestamp: Date.now()
            }) + '\n';
            
            console.log('Sending get_layout request to Pi');
            this.port.write(request);
        });
    }
    
    isConnected() {
        return this.connected;
    }
    
    updateStatus() {
        const status = this.connected ? 'Connected' : 'Disconnected';
        document.getElementById('status-usb').textContent = `USB: ${status}`;
    }
}
