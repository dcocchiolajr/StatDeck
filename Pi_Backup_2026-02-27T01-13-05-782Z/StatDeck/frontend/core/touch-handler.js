/**
 * Touch Handler v20
 *
 * Hybrid event model:
 *   mousedown → instant tap + tap-flash animation (proven working)
 *   touchstart → start long press timer (touch events hold duration)
 *   touchend → cancel long press timer, clear visual classes
 *
 * VoCore touchscreen fires mouseup immediately after mousedown
 * (no sustained hold), but touchstart/touchend correctly track
 * finger-down duration.
 *
 * Requires: .tile * { pointer-events: none } in CSS
 */

class TouchHandler {
    constructor() {
        this.eventHandlers = {};
        this.longPressThreshold = 800;

        this.longPressTimer = null;
        this.longPressFired = false;
        this.currentTile = null;

        this.lastSendTime = 0;
        this.sendCooldown = 300;

        this.isGlow = false;
        this.tilesMap = null;
    }

    detectGlowTheme() {
        var theme = document.body.getAttribute('data-theme') || '';
        var glowThemes = ['synthwave', 'cyberpunk', 'neon', 'matrix',
                         'ember', 'arctic', 'midnight', 'ocean_deep',
                         'dracula', 'amber_terminal'];
        this.isGlow = glowThemes.includes(theme);
    }

    applyGlowClass(element) {
        if (this.isGlow) {
            element.classList.add('glow-theme');
        } else {
            element.classList.remove('glow-theme');
        }
    }

    registerTiles(tilesMap) {
        this.detectGlowTheme();
        this.tilesMap = tilesMap;
        var self = this;

        tilesMap.forEach(function(tile, tileId) {
            var element = tile.element;
            self.applyGlowClass(element);

            // ===========================================
            // MOUSEDOWN: Instant tap + tap animation
            // ===========================================
            element.addEventListener('mousedown', function(e) {
                var now = Date.now();
                if (now - self.lastSendTime < self.sendCooldown) return;

                self.longPressFired = false;

                // Fire tap immediately
                console.log('Tap: ' + tileId);
                self.lastSendTime = now;
                try { self.emit('tap', tileId); }
                catch (err) { console.error('Tap error:', err); }

                // Tap animation classes
                element.classList.add('tap-flash');
                element.classList.add('tap-active');

                setTimeout(function() {
                    element.classList.remove('tap-flash');
                    element.classList.remove('tap-active');
                }, 300);
            });

            // ===========================================
            // TOUCHSTART: Begin long press timer
            // Touch events maintain hold duration on VoCore
            // ===========================================
            element.addEventListener('touchstart', function(e) {
                // Don't preventDefault — let mousedown still fire for tap
                self.currentTile = tileId;
                self.longPressFired = false;

                // Clear any existing timer
                if (self.longPressTimer) clearTimeout(self.longPressTimer);

                // Start long press timer
                self.longPressTimer = setTimeout(function() {
                    self.longPressFired = true;

                    // Visual feedback
                    element.classList.add('long-press-ready');
                    element.classList.add('tap-active');

                    var lpNow = Date.now();
                    if (lpNow - self.lastSendTime >= self.sendCooldown) {
                        console.log('Long press: ' + tileId);
                        self.lastSendTime = lpNow;
                        try { self.emit('long_press', tileId); }
                        catch (err) { console.error('LP error:', err); }
                    }
                }, self.longPressThreshold);
            }, { passive: true });

            // ===========================================
            // TOUCHEND: Cancel long press, clear classes
            // ===========================================
            element.addEventListener('touchend', function(e) {
                if (self.longPressTimer) {
                    clearTimeout(self.longPressTimer);
                    self.longPressTimer = null;
                }

                // Clear visual classes
                element.classList.remove('long-pressing');
                element.classList.remove('long-press-ready');
                element.classList.remove('tap-active');

                self.currentTile = null;
            }, { passive: true });

            // ===========================================
            // TOUCHCANCEL: Same as touchend
            // ===========================================
            element.addEventListener('touchcancel', function(e) {
                if (self.longPressTimer) {
                    clearTimeout(self.longPressTimer);
                    self.longPressTimer = null;
                }
                element.classList.remove('long-pressing');
                element.classList.remove('long-press-ready');
                element.classList.remove('tap-active');
                self.currentTile = null;
            }, { passive: true });

            // Block click and context menu
            element.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
            });

            element.addEventListener('contextmenu', function(e) {
                e.preventDefault();
            });
        });

        // Theme change listener
        document.addEventListener('themeChanged', function() {
            self.detectGlowTheme();
            if (self.tilesMap) {
                self.tilesMap.forEach(function(tile) {
                    self.applyGlowClass(tile.element);
                });
            }
        });
    }

    on(event, handler) {
        if (!this.eventHandlers[event]) this.eventHandlers[event] = [];
        this.eventHandlers[event].push(handler);
    }

    emit(event) {
        var args = Array.prototype.slice.call(arguments, 1);
        if (this.eventHandlers[event]) {
            this.eventHandlers[event].forEach(function(handler) {
                try { handler.apply(null, args); }
                catch (err) { console.error('Emit error:', err); }
            });
        }
    }
}
