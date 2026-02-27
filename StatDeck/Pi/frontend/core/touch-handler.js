/**
 * Touch Handler
 * Manages touch events and gestures for tiles
 */

class TouchHandler {
    constructor() {
        this.eventHandlers = {};
        this.touchStartTime = null;
        this.longPressThreshold = 800; // ms
        this.longPressTimer = null;
        this.currentTile = null;
    }
    
    registerTiles(tilesMap) {
        tilesMap.forEach((tile, tileId) => {
            const element = tile.element;
            
            // Touch events
            element.addEventListener('touchstart', (e) => {
                this.handleTouchStart(e, tileId, element);
            });
            
            element.addEventListener('touchend', (e) => {
                this.handleTouchEnd(e, tileId, element);
            });
            
            element.addEventListener('touchcancel', (e) => {
                this.handleTouchCancel(e, tileId, element);
            });
            
            // Mouse events (for testing)
            element.addEventListener('mousedown', (e) => {
                this.handleTouchStart(e, tileId, element);
            });
            
            element.addEventListener('mouseup', (e) => {
                this.handleTouchEnd(e, tileId, element);
            });
        });
    }
    
    handleTouchStart(e, tileId, element) {
        e.preventDefault();
        
        this.currentTile = { id: tileId, element: element };
        this.touchStartTime = Date.now();
        
        // Start long press timer
        element.classList.add('long-pressing');
        this.longPressTimer = setTimeout(() => {
            this.emit('long_press', tileId);
            element.classList.remove('long-pressing');
            this.longPressTimer = null;
        }, this.longPressThreshold);
    }
    
    handleTouchEnd(e, tileId, element) {
        e.preventDefault();
        
        const touchDuration = Date.now() - this.touchStartTime;
        
        // Clear long press timer
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
            element.classList.remove('long-pressing');
            
            // If released before long press, it's a tap
            if (touchDuration < this.longPressThreshold) {
                this.emit('tap', tileId);
            }
        }
        
        this.currentTile = null;
    }
    
    handleTouchCancel(e, tileId, element) {
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
            element.classList.remove('long-pressing');
        }
        this.currentTile = null;
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
