/**
 * Touch Handler v14
 *
 * Animations applied via INLINE STYLES (element.style) instead of CSS classes.
 * Inline styles always beat any stylesheet rule, solving the specificity war
 * with injectThemeCSS()'s !important box-shadow on all tiles.
 *
 * Reads theme colors from CSS custom properties for theme-aware glows.
 *
 * Requires: .tile * { pointer-events: none } in CSS
 */

class TouchHandler {
    constructor() {
        this.eventHandlers = {};
        this.longPressThreshold = 800;

        // State
        this.longPressTimer = null;
        this.longPressFired = false;
        this.currentTile = null;
        this.animTimer = null;

        // USB flood protection
        this.lastSendTime = 0;
        this.sendCooldown = 300;

        // Theme colors (read once, update on theme change)
        this.colors = { primary: '#00ff88', secondary: '#4ecdc4', accent: '#ff6b6b' };
        this.isGlow = false;
    }

    readThemeColors() {
        var root = document.documentElement;
        var cs = getComputedStyle(root);

        this.colors.primary = cs.getPropertyValue('--theme-primary').trim() || '#00ff88';
        this.colors.secondary = cs.getPropertyValue('--theme-secondary').trim() || '#4ecdc4';
        this.colors.accent = cs.getPropertyValue('--theme-accent').trim() || '#ff6b6b';

        var theme = document.body.getAttribute('data-theme') || '';
        var glowThemes = ['synthwave', 'cyberpunk', 'neon', 'matrix',
                         'ember', 'arctic', 'midnight', 'ocean_deep',
                         'dracula', 'amber_terminal'];
        this.isGlow = glowThemes.includes(theme);
        this.themeName = theme;
    }

    hexToRgba(hex, alpha) {
        hex = hex.replace('#', '');
        if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
        var r = parseInt(hex.substring(0,2), 16);
        var g = parseInt(hex.substring(2,4), 16);
        var b = parseInt(hex.substring(4,6), 16);
        return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
    }

    getTapGlow() {
        var p = this.colors.primary;
        var s = this.colors.secondary;
        var a = this.colors.accent;

        // Theme-specific overrides
        switch(this.themeName) {
            case 'cyberpunk':
                return '0 0 30px rgba(0,255,249,0.9), 0 0 60px rgba(255,46,151,0.7), 0 0 15px rgba(255,237,0,0.5), inset 0 0 20px rgba(0,255,249,0.15)';
            case 'synthwave':
                return '0 0 35px rgba(255,0,255,0.9), 0 0 70px rgba(0,255,255,0.6), inset 0 0 15px rgba(255,0,255,0.1)';
            case 'matrix':
                return '0 0 30px rgba(0,255,65,0.9), 0 0 60px rgba(0,255,65,0.5), inset 0 0 15px rgba(0,255,65,0.1)';
            case 'neon':
                return '0 0 30px rgba(57,255,20,0.9), 0 0 60px rgba(255,0,255,0.6), 0 0 10px rgba(255,255,0,0.3)';
            case 'ember':
                return '0 0 30px rgba(251,146,60,0.8), 0 0 60px rgba(239,68,68,0.5), inset 0 0 10px rgba(251,146,60,0.1)';
            case 'arctic':
                return '0 0 25px rgba(34,211,238,0.8), 0 0 50px rgba(96,165,250,0.5), inset 0 0 10px rgba(34,211,238,0.1)';
            case 'pixel':
                return '0 0 0 4px rgba(139,172,15,0.9), 0 0 0 8px rgba(155,188,15,0.4), 6px 6px 0 rgba(15,56,15,0.8)';
            case 'ocean_deep':
                return '0 0 30px rgba(0,188,212,0.8), 0 0 60px rgba(0,105,148,0.5), inset 0 0 15px rgba(0,188,212,0.1)';
            case 'dracula':
                return '0 0 30px rgba(189,147,249,0.8), 0 0 60px rgba(80,250,123,0.5), inset 0 0 10px rgba(189,147,249,0.1)';
            case 'amber_terminal':
                return '0 0 30px rgba(255,176,0,0.8), 0 0 60px rgba(255,140,0,0.5), inset 0 0 10px rgba(255,176,0,0.1)';
            case 'midnight':
                return '0 0 25px rgba(99,102,241,0.7), 0 0 50px rgba(139,92,246,0.4), inset 0 0 10px rgba(99,102,241,0.1)';
            case 'light':
                return '0 0 20px rgba(59,130,246,0.5), 0 0 40px rgba(139,92,246,0.3)';
            case '3d':
                return '0 1px 3px rgba(0,0,0,0.5), inset 0 2px 4px rgba(0,0,0,0.3)';
            default:
                // Use theme colors dynamically
                if (this.isGlow) {
                    return '0 0 30px ' + this.hexToRgba(a, 0.8) + ', 0 0 60px ' + this.hexToRgba(p, 0.5) + ', 0 0 8px ' + this.hexToRgba(s, 0.3);
                } else {
                    return '0 0 20px ' + this.hexToRgba(a, 0.6) + ', 0 0 40px ' + this.hexToRgba(p, 0.3);
                }
        }
    }

    getLongPressGlow() {
        var p = this.colors.primary;
        var a = this.colors.accent;
        if (this.isGlow) {
            return '0 0 35px ' + this.hexToRgba(a, 0.9) + ', 0 0 70px ' + this.hexToRgba(p, 0.6);
        } else {
            return '0 0 25px ' + this.hexToRgba(a, 0.6) + ', 0 0 50px ' + this.hexToRgba(p, 0.3);
        }
    }

    playTapAnimation(element) {
        var self = this;
        var glow = this.getTapGlow();
        var isPixel = this.themeName === 'pixel';
        var is3d = this.themeName === '3d';
        var isCyber = this.themeName === 'cyberpunk';

        // Frame 1: shrink + glow
        element.style.transform = isCyber ? 'scale(0.90) translateX(2px)' :
                                  is3d ? 'scale(0.93) translateY(3px)' :
                                  'scale(0.92)';
        element.style.boxShadow = glow;
        element.style.opacity = '0.85';

        // Frame 2: bounce back
        setTimeout(function() {
            element.style.transform = isCyber ? 'scale(1.02) translateX(-1px)' :
                                      'scale(1.02)';
            element.style.opacity = '1';
        }, isPixel ? 60 : 100);

        // Frame 3: settle
        setTimeout(function() {
            element.style.transform = '';
            element.style.boxShadow = '';
            element.style.opacity = '';
        }, isPixel ? 200 : 300);
    }

    registerTiles(tilesMap) {
        this.readThemeColors();
        var self = this;

        tilesMap.forEach(function(tile, tileId) {
            var element = tile.element;

            // --- MOUSEDOWN: Instant tap + start long press timer ---
            element.addEventListener('mousedown', function(e) {
                var now = Date.now();

                if (now - self.lastSendTime < self.sendCooldown) {
                    return;
                }

                self.currentTile = tileId;
                self.longPressFired = false;

                // INSTANT TAP
                console.log('Tap: ' + tileId);
                self.lastSendTime = now;

                try {
                    self.emit('tap', tileId);
                } catch (err) {
                    console.error('Error in tap handler:', err);
                }

                // Play animation via inline styles
                self.playTapAnimation(element);

                // Start long press timer
                if (self.longPressTimer) clearTimeout(self.longPressTimer);
                self.longPressTimer = setTimeout(function() {
                    self.longPressFired = true;

                    // Long press visual: scale down + pulsing glow
                    element.style.transform = 'scale(0.94)';
                    element.style.boxShadow = self.getLongPressGlow();
                    element.style.opacity = '0.8';

                    var lpNow = Date.now();
                    if (lpNow - self.lastSendTime >= self.sendCooldown) {
                        console.log('Long press: ' + tileId);
                        self.lastSendTime = lpNow;
                        try {
                            self.emit('long_press', tileId);
                        } catch (err) {
                            console.error('Error in long_press handler:', err);
                        }
                    }
                }, self.longPressThreshold);
            });

            // --- MOUSEUP: Clear timer, reset styles ---
            element.addEventListener('mouseup', function(e) {
                if (self.longPressTimer) {
                    clearTimeout(self.longPressTimer);
                    self.longPressTimer = null;
                }

                // Reset inline styles (let CSS take over again)
                element.style.transform = '';
                element.style.boxShadow = '';
                element.style.opacity = '';

                self.currentTile = null;
            });

            // --- CLICK: Block ---
            element.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
            });

            element.addEventListener('contextmenu', function(e) {
                e.preventDefault();
            });
        });

        // Theme change: re-read colors
        document.addEventListener('themeChanged', function() {
            self.readThemeColors();
        });
    }

    on(event, handler) {
        if (!this.eventHandlers[event]) {
            this.eventHandlers[event] = [];
        }
        this.eventHandlers[event].push(handler);
    }

    emit(event) {
        var args = Array.prototype.slice.call(arguments, 1);
        if (this.eventHandlers[event]) {
            this.eventHandlers[event].forEach(function(handler) {
                try {
                    handler.apply(null, args);
                } catch (err) {
                    console.error('Error in ' + event + ' handler:', err);
                }
            });
        }
    }
}
