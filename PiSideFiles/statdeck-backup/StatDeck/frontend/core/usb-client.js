/**
 * USB Client - WebSocket connection to backend
 * Handles communication with the Pi backend server
 */

class USBClient {
    constructor() {
        this.ws = null;
        this.eventHandlers = {};
        this.reconnectInterval = 3000;
        this.reconnectTimer = null;
    }
    
    connect() {
        const wsUrl = `ws://${window.location.hostname}:3001`;
        console.log('Connecting to backend:', wsUrl);
        
        try {
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('WebSocket connected');
                this.emit('connected');
                
                if (this.reconnectTimer) {
                    clearTimeout(this.reconnectTimer);
                    this.reconnectTimer = null;
                }
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.handleMessage(message);
                } catch (err) {
                    console.error('Error parsing message:', err);
                }
            };
            
            this.ws.onclose = () => {
                console.log('WebSocket disconnected');
                this.emit('disconnected');
                this.scheduleReconnect();
            };
            
            this.ws.onerror = (err) => {
                console.error('WebSocket error:', err);
            };
            
        } catch (err) {
            console.error('Failed to create WebSocket:', err);
            this.scheduleReconnect();
        }
    }
    
    scheduleReconnect() {
        if (!this.reconnectTimer) {
            this.reconnectTimer = setTimeout(() => {
                console.log('Attempting to reconnect...');
                this.connect();
            }, this.reconnectInterval);
        }
    }
    
    handleMessage(message) {
        const type = message.type;
        
        if (type === 'stats') {
            this.emit('stats', message.data, message.timestamp);
        }
        else if (type === 'config') {
            this.emit('config', message.layout);
        }
        else if (type === 'pc_disconnected') {
            this.emit('pc_disconnected');
        }
    }
    
    sendAction(tileId, actionType) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const message = {
                type: 'action',
                tile_id: tileId,
                action_type: actionType,
                timestamp: Date.now()
            };
            
            this.ws.send(JSON.stringify(message));
        }
    }
    
    on(event, handler) {
        if (!this.eventHandlers[event]) {
            this.eventHandlers[event] = [];
        }
        this.eventHandlers[event].push(handler);
    }
    
    emit(event, ...args) {
        if (this.eventHandlers[event]) {
            this.eventHandlers[event].forEach(handler => {
                handler(...args);
            });
        }
    }
}
