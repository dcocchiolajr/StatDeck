/**
 * StatDeck Pi Backend Server
 * * Express server that:
 * - Receives stats from Windows PC via High-Speed TCP Network (Gadget Mode)
 * - Serves the frontend web UI
 * - Manages WebSocket connections for real-time updates
 * - Handles configuration loading
 */

const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const net = require('net'); // NEW: Built-in TCP networking
const ConfigLoader = require('./config-loader');

// Configuration
const HTTP_PORT = 3000;
const WS_PORT = 3001;
const TCP_PORT = 5556; // NEW: The port main.py is throwing stats at

// Initialize Express app
const app = express();
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/api/debug', (req, res) => {
    const msg = req.query.msg || 'no message';
    fs.appendFileSync('/tmp/statdeck-debug.log', new Date().toISOString() + ' ' + msg + '\n');
    res.json({ ok: true });
});

app.get('/api/config', (req, res) => {
    res.json(ConfigLoader.load());
});

const httpServer = app.listen(HTTP_PORT, () => {
    console.log(`HTTP server listening on port ${HTTP_PORT}`);
});

// Initialize WebSocket server (for Frontend UI)
const wss = new WebSocket.Server({ port: WS_PORT });
console.log(`WebSocket server listening on port ${WS_PORT}`);
let clients = new Set();

wss.on('connection', (ws) => {
    clients.add(ws);
    ws.send(JSON.stringify({ type: 'config', layout: ConfigLoader.load() }));

    ws.on('message', (data) => {
        try { handleFrontendMessage(JSON.parse(data.toString())); }
        catch (err) { console.error('Error parsing frontend message:', err); }
    });

    ws.on('close', () => clients.delete(ws));
    ws.on('error', (err) => clients.delete(ws));
});

function broadcastToClients(message) {
    const data = JSON.stringify(message);
    clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) client.send(data);
    });
}

// ==================================================================
// NEW: High-Speed TCP Server (Replaces USB serial handler)
// ==================================================================
let activePcConnection = null;

const tcpServer = net.createServer((socket) => {
    console.log('⚡ Windows PC Connected via USB Network Socket!');
    activePcConnection = socket;
    let buffer = '';

    // Ask for config if Pi is empty
    const currentLayout = ConfigLoader.load();
    if (!currentLayout || !currentLayout.tiles || currentLayout.tiles.length === 0) {
        console.log('No layout found, requesting from PC');
        sendToPC({ type: 'config_request', timestamp: Date.now() });
    }

    socket.on('data', (data) => {
        buffer += data.toString();
        let split = buffer.split('\n');

        // Process complete JSON strings
        while (split.length > 1) {
            let line = split.shift().trim();
            if (line) {
                try { handlePCMessage(JSON.parse(line)); }
                catch (e) { console.error('Error parsing PC message:', e); }
            }
        }
        buffer = split[0]; // Keep leftover partial data for next chunk
    });

    socket.on('close', () => {
        console.log('Disconnected from Windows PC');
        activePcConnection = null;
        broadcastToClients({ type: 'pc_disconnected' });
    });

    socket.on('error', (err) => {
        console.error('TCP Socket error:', err);
    });
});

tcpServer.listen(TCP_PORT, () => {
    console.log(`TCP Server listening for PC stats on port ${TCP_PORT}`);
});

function sendToPC(msg) {
    if (activePcConnection) {
        try { activePcConnection.write(JSON.stringify(msg) + '\n'); }
        catch (e) { console.error('Error sending to PC:', e); }
    }
}

// ==================================================================

function handlePCMessage(message) {
    const msgType = message.type;

    if (msgType === 'stats') {
        broadcastToClients({ type: 'stats', data: message.data, timestamp: message.timestamp });
    }
    else if (msgType === 'config') {
        ConfigLoader.save(message.layout);
        broadcastToClients({ type: 'config', layout: message.layout });
        console.log('Configuration updated from PC');
    }
    else if (msgType === 'get_layout') {
        sendToPC({ type: 'layout_response', layout: ConfigLoader.load(), timestamp: Date.now() });
    }
}

function handleFrontendMessage(message) {
    if (message.type === 'action') {
        sendToPC({
            type: 'action',
            tile_id: message.tile_id,
            action_type: message.action_type,
            timestamp: Date.now()
        });
    }
}

setInterval(() => {
    sendToPC({
        type: 'status',
        connected: true,
        config_loaded: ConfigLoader.isLoaded(),
        tiles_active: ConfigLoader.getTileCount(),
        timestamp: Date.now()
    });
}, 5000);

process.on('SIGINT', () => {
    console.log('\nShutting down...');
    clients.forEach(c => c.close());
    tcpServer.close();
    httpServer.close(() => process.exit(0));
});