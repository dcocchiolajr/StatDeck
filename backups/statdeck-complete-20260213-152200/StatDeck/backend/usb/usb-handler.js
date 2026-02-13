/**
 * USB Serial Handler
 * 
 * Manages serial communication with Windows PC over USB.
 */

const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const EventEmitter = require('events');

class USBHandler extends EventEmitter {
    constructor(port = '/dev/ttyGS0', baudRate = 115200) {
        super();
        
        this.portPath = port;
        this.baudRate = baudRate;
        this.port = null;
        this.parser = null;
        this.connected = false;
        
        this.connect();
    }
    
    connect() {
        try {
            // Open serial port
            this.port = new SerialPort({
                path: this.portPath,
                baudRate: this.baudRate,
                autoOpen: false
            });
            
            // Create line parser (messages are newline-delimited)
            this.parser = this.port.pipe(new ReadlineParser({ delimiter: '\n' }));
            
            // Handle incoming data
            this.parser.on('data', (line) => {
                try {
                    const message = JSON.parse(line);
                    this.emit('message', message);
                } catch (err) {
                    console.error('Error parsing USB message:', err);
                }
            });
            
            // Handle connection events
            this.port.on('open', () => {
                console.log(`USB serial port ${this.portPath} opened`);
                this.connected = true;
                this.emit('connected');
            });
            
            this.port.on('close', () => {
                console.log('USB serial port closed');
                this.connected = false;
                this.emit('disconnected');
                
                // Try to reconnect after 5 seconds
                setTimeout(() => this.reconnect(), 5000);
            });
            
            this.port.on('error', (err) => {
                console.error('USB serial port error:', err);
                this.emit('error', err);
            });
            
            // Open the port
            this.port.open();
            
        } catch (err) {
            console.error('Failed to initialize USB serial:', err);
            this.emit('error', err);
            
            // Retry connection
            setTimeout(() => this.reconnect(), 5000);
        }
    }
    
    reconnect() {
        console.log('Attempting to reconnect USB...');
        
        if (this.port && this.port.isOpen) {
            this.port.close();
        }
        
        this.connect();
    }
    
    send(message) {
        if (!this.connected || !this.port || !this.port.isOpen) {
            console.warn('Cannot send - USB not connected');
            return false;
        }
        
        try {
            // Convert to JSON and add newline
            const data = JSON.stringify(message) + '\n';
            
            this.port.write(data, (err) => {
                if (err) {
                    console.error('Error writing to USB:', err);
                }
            });
            
            return true;
        } catch (err) {
            console.error('Error sending USB message:', err);
            return false;
        }
    }
    
    close() {
        if (this.port && this.port.isOpen) {
            this.port.close();
        }
    }
    
    isConnected() {
        return this.connected;
    }
}

module.exports = USBHandler;
