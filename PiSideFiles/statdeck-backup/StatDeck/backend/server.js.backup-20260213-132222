/**
 * StatDeck Pi Backend Server
 * 
 * Express server that:
 * - Receives stats from Windows PC via USB serial
 * - Serves the frontend web UI
 * - Manages WebSocket connections for real-time updates
 * - Handles configuration loading
 */

const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const USBHandler = require('./usb/usb-handler');
const ConfigLoader = require('./config-loader');

// Configuration
const HTTP_PORT = 3000;
const WS_PORT = 3001;
const USB_PORT = '/dev/ttyGS0';  // USB gadget serial port

// Initialize Express app
const app = express();

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

// API endpoint for current config
app.get('/api/config', (req, res) => {
    const config = ConfigLoader.load();
    res.json(config);
});

// Start HTTP server
const httpServer = app.listen(HTTP_PORT, () => {
    console.log(`HTTP server listening on port ${HTTP_PORT}`);
    console.log(`Open http://localhost:${HTTP_PORT} in browser`);
});

// Initialize WebSocket server
const wss = new WebSocket.Server({ port: WS_PORT });

console.log(`WebSocket server listening on port ${WS_PORT}`);

// Track connected clients
let clients = new Set();

wss.on('connection', (ws) => {
    console.log('Frontend client connected');
    clients.add(ws);
    
    // Send current config on connect
    const config = ConfigLoader.load();
    ws.send(JSON.stringify({
        type: 'config',
        layout: config
    }));
    
    // Handle messages from frontend
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());
            handleFrontendMessage(message);
        } catch (err) {
            console.error('Error parsing frontend message:', err);
        }
    });
    
    ws.on('close', () => {
        console.log('Frontend client disconnected');
        clients.delete(ws);
    });
    
    ws.on('error', (err) => {
        console.error('WebSocket error:', err);
        clients.delete(ws);
    });
});

// Initialize USB communication
const usb = new USBHandler(USB_PORT);

// Handle incoming messages from Windows PC
usb.on('message', (message) => {
    const msgType = message.type;
    
    if (msgType === 'stats') {
        // Broadcast stats to all connected frontend clients
        broadcastToClients({
            type: 'stats',
            data: message.data,
            timestamp: message.timestamp
        });
    }
    else if (msgType === 'config') {
        // New configuration from PC
        const layout = message.layout;
        
        // Save configuration
        ConfigLoader.save(layout);
        
        // Broadcast to frontend
        broadcastToClients({
            type: 'config',
            layout: layout
        });
        
        console.log('Configuration updated from PC');
    }
    else {
        console.log('Unknown message type from PC:', msgType);
    }
});

// Handle errors
usb.on('error', (err) => {
    console.error('USB error:', err);
});

// USB connection events
usb.on('connected', () => {
    console.log('Connected to Windows PC');
    
    // Request current configuration
    usb.send({
        type: 'config_request',
        timestamp: Date.now()
    });
});

usb.on('disconnected', () => {
    console.log('Disconnected from Windows PC');
    
    // Notify frontend
    broadcastToClients({
        type: 'pc_disconnected'
    });
});

// Handle messages from frontend
function handleFrontendMessage(message) {
    const msgType = message.type;
    
    if (msgType === 'action') {
        // Forward action to PC
        usb.send({
            type: 'action',
            tile_id: message.tile_id,
            action_type: message.action_type,
            timestamp: Date.now()
        });
        
        console.log(`Action: ${message.tile_id}.${message.action_type}`);
    }
    else if (msgType === 'status') {
        // Frontend status update (could use for heartbeat monitoring)
        console.log('Frontend status:', message);
    }
}

// Broadcast message to all connected frontend clients
function broadcastToClients(message) {
    const data = JSON.stringify(message);
    
    clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(data);
        }
    });
}

// Send status heartbeat to PC every 5 seconds
setInterval(() => {
    usb.send({
        type: 'status',
        connected: true,
        config_loaded: ConfigLoader.isLoaded(),
        tiles_active: ConfigLoader.getTileCount(),
        timestamp: Date.now()
    });
}, 5000);

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down...');
    
    // Close all WebSocket connections
    clients.forEach(client => client.close());
    
    // Close USB connection
    usb.close();
    
    // Close HTTP server
    httpServer.close(() => {
        console.log('Server shut down');
        process.exit(0);
    });
});

console.log('StatDeck Pi Backend started');
