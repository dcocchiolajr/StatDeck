/**
 * Touch Handler
 * Manages touch events and gestures for tiles
 * 
 * DESIGN:
 * - Shows visual feedback during hold
 * - Fires action on RELEASE only
 * - If held < 800ms = tap
 * - If held >= 800ms = long_press  
 * - Cooldown prevents rapid-fire crashes
 * - Cooldown blocks at TOUCH START to prevent queueing
 */

class TouchHandler {
    constructor() {
        this.eventHandlers = {};
        this.touchStartTime = null;
        this.longPressThreshold = 800; // ms
        this.currentTile = null;
        this.lastActionTime = 0;
        this.cooldown = 1500; // ms between actions - prevents USB serial crash
        this.longPressReached = false;
        this.inCooldown = false;
    }
    
    registerTiles(tilesMap) {
        tilesMap.forEach((tile, tileId) => {
            const element = tile.element;
            
            // Touch events
            element.addEventListener('touchstart', (e) => {
                this.handleTouchStart(e, tileId, element);
            }, { passive: false });
            
            element.addEventListener('touchend', (e) => {
                this.handleTouchEnd(e, tileId, element);
            }, { passive: false });
            
            element.addEventListener('touchcancel', (e) => {
                this.handleTouchCancel(e, tileId, element);
            }, { passive: false });
            
            // Mouse events (for testing)
            element.addEventListener('mousedown', (e) => {
                this.handleTouchStart(e, tileId, element);
            });
            
            element.addEventListener('mouseup', (e) => {
                this.handleTouchEnd(e, tileId, element);
            });
            
            // Prevent context menu on long press
            element.addEventListener('contextmenu', (e) => {
                e.preventDefault();
            });
        });
    }
    
    handleTouchStart(e, tileId, element) {
        e.preventDefault();
        
        // Check cooldown at START - don't even begin tracking if in cooldown
        const now = Date.now();
        if (now - this.lastActionTime < this.cooldown) {
            console.log('Touch blocked by cooldown');
            this.inCooldown = true;
            return;
        }
        
        this.inCooldown = false;
        
        // Store start state
        this.currentTile = { id: tileId, element: element };
        this.touchStartTime = Date.now();
        this.longPressReached = false;
        
        // Start visual indicator (CSS animation)
        element.classList.add('long-pressing');
        
        // Set timer to mark when long press threshold is reached
        this.longPressTimer = setTimeout(() => {
            this.longPressReached = true;
            // Visual feedback that long press is ready
            element.classList.remove('long-pressing');
            element.classList.add('long-press-ready');
        }, this.longPressThreshold);
    }
    
    handleTouchEnd(e, tileId, element) {
        e.preventDefault();
        
        // Clear timer if still running
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
        
        // Remove visual classes
        element.classList.remove('long-pressing');
        element.classList.remove('long-press-ready');
        
        // If we were in cooldown during start, ignore this release
        if (this.inCooldown) {
            this.resetState();
            return;
        }
        
        // Determine action type based on hold duration
        if (this.touchStartTime) {
            const now = Date.now();
            const holdDuration = now - this.touchStartTime;
            
            if (holdDuration >= this.longPressThreshold) {
                // Long press
                console.log(`Long press released: ${tileId}`);
                this.lastActionTime = now;
                try {
                    this.emit('long_press', tileId);
                } catch (err) {
                    console.error('Error in long_press handler:', err);
                }
            } else {
                // Tap
                console.log(`Tap released: ${tileId}`);
                this.lastActionTime = now;
                try {
                    this.emit('tap', tileId);
                } catch (err) {
                    console.error('Error in tap handler:', err);
                }
            }
        }
        
        this.resetState();
    }
    
    handleTouchCancel(e, tileId, element) {
        // Clear timer
        if (this.longPressTimer) {
            clearTimeout(this.longPressTimer);
            this.longPressTimer = null;
        }
        
        // Remove visual classes
        element.classList.remove('long-pressing');
        element.classList.remove('long-press-ready');
        
        this.resetState();
    }
    
    resetState() {
        this.currentTile = null;
        this.touchStartTime = null;
        this.longPressReached = false;
        this.inCooldown = false;
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
                try {
                    handler(...args);
                } catch (err) {
                    console.error(`Error in ${event} handler:`, err);
                }
            });
        }
    }
}
