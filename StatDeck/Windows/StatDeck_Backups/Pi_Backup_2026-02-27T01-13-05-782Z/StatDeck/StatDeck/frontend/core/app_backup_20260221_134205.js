/**
 * Main Application Controller - StatDeck Display
 * VERSION: v4.0 — Multi-Page Support
 * 
 * PAGES ARCHITECTURE:
 *   Layout format: { pages: [{ id, name, grid, tiles }, ...], theme, themeData }
 *   Backward compat: flat { grid, tiles } treated as single page
 *   Page nav tiles (page_prev/page_next) handled LOCALLY — no USB round-trip
 *   Each page can have its own grid size
 *   Wrap-around: last→first, first→last
 *
 * ALL themes flow through Config App → dynamic CSS injection.
 * Enhanced CSS generation for rich visual effects.
 */

class StatDeckApp {
    constructor() {
        this.config = null;
        this.usbClient = new USBClient();
        this.tileManager = null;
        this.layoutEngine = null;
        this.touchHandler = new TouchHandler();
        
        // === PAGES STATE ===
        this.pages = [];            // Array of page objects: { id, name, grid, tiles }
        this.currentPageIndex = 0;  // Which page is displayed
        this.themeData = null;      // Shared across all pages
        this.themeId = null;        // Shared across all pages
        
        this.init();
    }
    
    init() {
        console.log('StatDeck v4.0 initializing (multi-page)...');
        
        this.usbClient.on('connected', () => {
            console.log('Connected to backend');
            this.hideDisconnectedOverlay();
        });
        
        this.usbClient.on('disconnected', () => {
            console.log('Disconnected from backend');
            this.showDisconnectedOverlay();
        });
        
        this.usbClient.on('config', (layout) => {
            console.log('Received configuration');
            this.loadConfig(layout);
        });
        
        this.usbClient.on('stats', (data) => {
            this.updateStats(data);
        });
        
        // Touch handler events — tap/long_press go through handleTileAction
        this.touchHandler.on('tap', (tileId) => {
            this.handleTileAction(tileId, 'tap');
        });
        
        this.touchHandler.on('long_press', (tileId) => {
            this.handleTileAction(tileId, 'long_press');
        });
        
        this.usbClient.connect();
    }
    
    // =========================================================================
    // CONFIGURATION LOADING
    // =========================================================================
    
    /**
         * Precision Profile Switch - StatDeck v4.1
         * Reuses theme-dependent transitions for seamless environment changes.
         */
    async loadConfig(layout) {
        // If this is the very first load (no existing config), skip animation
        if (!this.config) {
            this.executeConfigSwap(layout);
            return;
        }

        // 1. ENVIRONMENT MORPH: Tween both body AND the app container
        if (layout.themeData && layout.themeData.colors) {
            const transRule = `background ${this.TRANSITION_EXIT_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`;
            document.body.style.transition = transRule;

            const appDiv = document.getElementById('app');
            if (appDiv) appDiv.style.transition = transRule;

            // CRITICAL FIX: Force the browser to register the transition before changing the color
            void document.body.offsetHeight;

            // Set the target color so the CSS tween begins immediately
            document.body.style.setProperty('background', layout.themeData.colors.background, 'important');
            if (appDiv) appDiv.style.setProperty('background', layout.themeData.colors.background, 'important');
        }
        // 2. TRIGGER THEME EXIT
        let grid = document.getElementById('tile-grid');
        const exitClass = 'page-exit-next';
        if (grid) grid.classList.add(exitClass);

        // 3. PRECISION WAIT
        // Wait for the exit animation to finish before destroying old tiles
        await new Promise(resolve => setTimeout(resolve, this.TRANSITION_EXIT_MS));

        // 4. DATA SWAP (The Stage is Empty)
        if (grid) grid.classList.remove(exitClass);
        this.executeConfigSwap(layout);

        // 5. TRIGGER THEME INTRO
        // Re-query the grid because renderCurrentPage() may have rebuilt the DOM
        grid = document.getElementById('tile-grid');
        if (grid) {
            void grid.offsetHeight; // Force browser reflow so it paints the 0-opacity frame
            const enterClass = 'page-enter-next';
            requestAnimationFrame(() => {
                grid.classList.add(enterClass);
                setTimeout(() => {
                    grid.classList.remove(enterClass);
                }, this.TRANSITION_ENTER_MS);
            });
        }
    }

    /**
     * Helper to perform the actual data update during the "dark" phase of transition
     */
    executeConfigSwap(layout) {
        this.config = layout;
        this.pages = this.parsePagesFromLayout(layout);
        this.currentPageIndex = 0;

        this.themeData = layout.themeData || null;
        this.themeId = layout.theme || (this.themeData && this.themeData.id) || 'custom';

        if (this.themeData && this.themeData.colors) {
            document.body.setAttribute('data-theme', this.themeId);
            this.applyThemeData(this.themeData);
            this.injectThemeCSS(this.themeData, this.themeId);
        } else if (layout.theme) {
            document.body.setAttribute('data-theme', layout.theme);
        }

        this.renderCurrentPage();
        console.log(`Profile Switched: ${this.themeId}`);
    }
    
    /**
     * Parse layout into pages array.
     * Supports both new format (pages array) and legacy flat format.
     *
     * New format:
     *   { pages: [{ id: 'page_1', name: 'Main', grid: {...}, tiles: [...] }, ...] }
     *
     * Legacy flat format:
     *   { grid: {...}, tiles: [...] }
     *   → Converted to single page
     */
    parsePagesFromLayout(layout) {
        if (layout.pages && Array.isArray(layout.pages) && layout.pages.length > 0) {
            // New multi-page format
            return layout.pages.map((page, i) => ({
                id: page.id || `page_${i + 1}`,
                name: page.name || `Page ${i + 1}`,
                grid: page.grid || layout.grid || { cols: 4, rows: 3, gap: 10 },
                tiles: page.tiles || []
            }));
        }
        
        // Legacy flat format — wrap in single page
        return [{
            id: 'page_1',
            name: 'Page 1',
            grid: layout.grid || { cols: 4, rows: 3, gap: 10 },
            tiles: layout.tiles || []
        }];
    }
    
    // =========================================================================
    // PAGE RENDERING
    // =========================================================================
    
    /**
     * Render the current page — tears down existing tiles and builds new ones.
     * Each page has its own grid config, so layout engine is re-applied.
     */
    renderCurrentPage() {
        const page = this.pages[this.currentPageIndex];
        if (!page) {
            console.error(`No page at index ${this.currentPageIndex}`);
            return;
        }
        
        console.log(`Rendering page ${this.currentPageIndex + 1}/${this.pages.length}: "${page.name}"`);
        
        // Inject theme colors into this page's tiles
        if (this.themeData && this.themeData.colors) {
            this.injectThemeColorsIntoTiles(page.tiles, this.themeData);
        }
        
        // Apply grid layout for this page (each page can have different grid)
        this.layoutEngine = new LayoutEngine(page.grid);
        this.layoutEngine.apply();
        
        // Create tiles for this page
        this.tileManager = new TileManager(page.tiles);
        this.tileManager.createTiles();
        
        // Register tiles with touch handler
        this.touchHandler.registerTiles(this.tileManager.tiles);
        
        // Dispatch event so touch-animations and other systems can react
        document.dispatchEvent(new CustomEvent('pageChanged', {
            detail: {
                pageIndex: this.currentPageIndex,
                pageCount: this.pages.length,
                pageName: page.name
            }
        }));
        
        // Update the page dots indicator
        this.updatePageIndicator();
    }
    
    // =========================================================================
    // PAGE NAVIGATION (with theme-dependent transitions)
    // =========================================================================
    
    /**
     * Transition timing constants (ms).
     * CSS animations must match these durations.
     */
    get TRANSITION_EXIT_MS() { return 350; }
    get TRANSITION_ENTER_MS() { return 650; }
    
    /**
     * Switch to the next page with transition animation. Wraps around.
     */
    nextPage() {
        if (this.pages.length <= 1) return;
        if (this._transitioning) return; // block double-tap during animation
        
        const newIndex = (this.currentPageIndex + 1) % this.pages.length;
        this.transitionToPage(newIndex, 'next');
    }
    
    /**
     * Switch to the previous page with transition animation. Wraps around.
     */
    prevPage() {
        if (this.pages.length <= 1) return;
        if (this._transitioning) return;
        
        const newIndex = (this.currentPageIndex - 1 + this.pages.length) % this.pages.length;
        this.transitionToPage(newIndex, 'prev');
    }
    
    /**
     * Jump to a specific page by index (0-based).
     */
    goToPage(index) {
        if (index < 0 || index >= this.pages.length) return;
        if (index === this.currentPageIndex) return;
        if (this._transitioning) return;
        
        const direction = index > this.currentPageIndex ? 'next' : 'prev';
        this.transitionToPage(index, direction);
    }
    
    /**
     * Perform a page transition with theme-dependent CSS animation.
     * 
     * Flow:
     *   1. Add .page-exit-[direction] → exit animation plays on #tile-grid
     *   2. After exit duration, clear DOM + rebuild tiles (renderCurrentPage)
     *   3. Force a reflow so browser sees the "fresh" state
     *   4. Add .page-enter-[direction] → enter animation plays
     *   5. After enter duration, clean up classes
     *
     * Key: requestAnimationFrame between DOM rebuild and enter class
     * ensures the browser paints the initial frame (opacity:0) before
     * the animation begins. Without this, the browser batches the
     * innerHTML='' and class add into one frame, skipping the animation.
     */
    transitionToPage(newIndex, direction) {
        this._transitioning = true;
        const grid = document.getElementById('tile-grid');
        if (!grid) {
            this._transitioning = false;
            return;
        }
        
        // 1. Exit animation
        const exitClass = 'page-exit-' + direction;
        grid.classList.add(exitClass);
        
        setTimeout(() => {
            // 2. Remove exit class, swap page content
            grid.classList.remove(exitClass);
            this.currentPageIndex = newIndex;
            this.renderCurrentPage();
            
            // 3. Force reflow — browser must paint the new DOM at its
            //    initial state (opacity:0 per CSS) before we animate in.
            //    Reading offsetHeight forces a synchronous layout.
            void grid.offsetHeight;
            
            // 4. Enter animation — use rAF to guarantee we're in the next paint
            const enterClass = 'page-enter-' + direction;
            requestAnimationFrame(() => {
                grid.classList.add(enterClass);
                
                setTimeout(() => {
                    // 5. Clean up
                    grid.classList.remove(enterClass);
                    this._transitioning = false;
                    console.log('Page ' + (this.currentPageIndex + 1) + '/' + this.pages.length);
                }, this.TRANSITION_ENTER_MS);
            });
            
        }, this.TRANSITION_EXIT_MS);
    }
    
    // =========================================================================
    // TILE ACTIONS
    // =========================================================================
    
    /**
     * Handle tile action — page nav tiles are handled LOCALLY,
     * all other actions are sent to the PC via USB.
     */
    handleTileAction(tileId, actionType) {
        console.log(`Tile action: ${tileId}.${actionType}`);
        
        // Look up the tile to check its type
        const tile = this.tileManager ? this.tileManager.getTile(tileId) : null;
        
        if (tile && actionType === 'tap') {
            // Page navigation — handle locally, no USB round-trip
            if (tile.type === 'page_prev') {
                this.prevPage();
                return;
            }
            if (tile.type === 'page_next') {
                this.nextPage();
                return;
            }
        }
        
        // All other actions → send to backend (which forwards to PC)
        this.usbClient.sendAction(tileId, actionType);
    }
    
    // =========================================================================
    // STATS UPDATE
    // =========================================================================
    
    updateStats(data) {
        if (this.tileManager) {
            this.tileManager.updateAllTiles(data);
        }
    }
    
    // =========================================================================
    // THEME SYSTEM (unchanged from v3.1, included for completeness)
    // =========================================================================
    
    applyThemeData(themeData) {
        const root = document.documentElement;
        const c = themeData.colors;
        
        root.style.setProperty('--theme-primary', c.primary);
        root.style.setProperty('--theme-secondary', c.secondary);
        root.style.setProperty('--theme-accent', c.accent);
        root.style.setProperty('--theme-background', c.background);
        root.style.setProperty('--theme-surface', c.surface);
        root.style.setProperty('--theme-text', c.text);
        root.style.setProperty('--theme-text-secondary', c.textSecondary);
        root.style.setProperty('--theme-border', c.border);
        
        if (themeData.fonts) {
            root.style.setProperty('--theme-font-main', themeData.fonts.main);
            root.style.setProperty('--font-main', themeData.fonts.main);
            root.style.setProperty('--font-mono', themeData.fonts.mono);
            document.body.style.fontFamily = themeData.fonts.main;
        }
        
        document.body.style.setProperty('background', c.background, 'important');
        document.getElementById('app').style.setProperty('background', c.background, 'important');
    }
    
    injectThemeColorsIntoTiles(tiles, themeData) {
        const c = themeData.colors;
        const valueColor = c.valueColor || c.primary;
        
        tiles.forEach(tile => {
            if (!tile.style) tile.style = {};
            if (!tile.style.color || tile.style.color === '') {
                tile.style.color = valueColor;
            }
            if (!tile.style.background || tile.style.background === '') {
                tile.style.background = c.surface;
            }
            if (!tile.style.labelColor || tile.style.labelColor === '') {
                tile.style.labelColor = c.textSecondary;
            }
        });
    }
    
    /**
     * Generate rich, theme-quality CSS dynamically.
     * Replaces old hardcoded per-theme rules in themes.css.
     */
    injectThemeCSS(themeData, themeId) {
        const c = themeData.colors;
        const eff = themeData.effects || {};
        const valueColor = c.valueColor || c.primary;
        const surfaceDark = this.darkenColor(c.surface, 15);
        const surfaceLight = this.lightenColor(c.surface, 10);
        
        let styleTag = document.getElementById('dynamic-theme-style');
        if (!styleTag) {
            styleTag = document.createElement('style');
            styleTag.id = 'dynamic-theme-style';
            document.head.appendChild(styleTag);
        }
        
        const sel = `body[data-theme="${themeId}"]`;
        const allTiles = `${sel} .tile, ${sel} .cpu-graph-tile, ${sel} .gauge-tile, ${sel} .text-display-tile, ${sel} .button-tile, ${sel} .network-graph-tile, ${sel} .page-nav-tile`;
        let css = '';
        
        // ── TILE BACKGROUNDS AND BORDERS ──
        if (eff.glow) {
            css += `
                ${allTiles} {
                    background: linear-gradient(135deg, ${c.surface} 0%, ${surfaceDark} 100%) !important;
                    border: 2px solid ${c.primary} !important;
                    box-shadow: 
                        0 0 20px ${c.primary}80,
                        0 0 40px ${c.secondary ? c.secondary + '50' : c.primary + '30'},
                        inset 0 0 30px ${c.primary}15 !important;
                }
            `;
        } else if (eff.bevel) {
            css += `
                ${allTiles} {
                    background: linear-gradient(180deg, ${surfaceLight} 0%, ${c.surface} 50%, ${surfaceDark} 100%) !important;
                    border: none !important;
                    border-radius: 4px !important;
                    box-shadow: 
                        inset 2px 2px 0 rgba(255,255,255,0.3),
                        inset -2px -2px 0 rgba(0,0,0,0.3),
                        inset 3px 3px 0 rgba(255,255,255,0.15),
                        inset -3px -3px 0 rgba(0,0,0,0.15),
                        3px 3px 6px rgba(0,0,0,0.25) !important;
                }
                ${sel} .tile:active, ${sel} .button-tile:active {
                    box-shadow: 
                        inset 2px 2px 0 rgba(0,0,0,0.3),
                        inset -2px -2px 0 rgba(255,255,255,0.3),
                        1px 1px 3px rgba(0,0,0,0.15) !important;
                    transform: translate(1px, 1px);
                }
            `;
        } else {
            css += `
                ${allTiles} {
                    background: linear-gradient(135deg, ${surfaceLight} 0%, ${c.surface} 100%) !important;
                    border: 1px solid ${c.border} !important;
                    box-shadow: 
                        0 2px 8px rgba(0,0,0,0.3),
                        inset 0 1px 0 ${surfaceLight}40 !important;
                }
            `;
        }
        
        // ── VALUE TEXT ──
        if (eff.glow) {
            css += `
                ${sel} .tile-value, ${sel} .gauge-value, ${sel} .text-display-value {
                    color: ${valueColor} !important;
                    text-shadow: 
                        0 0 10px ${valueColor},
                        0 0 20px ${valueColor},
                        0 0 30px ${valueColor}80;
                    font-weight: 700;
                }
            `;
        } else if (eff.bevel) {
            css += `
                ${sel} .tile-value, ${sel} .gauge-value, ${sel} .text-display-value {
                    color: ${valueColor} !important;
                    font-weight: 700;
                    text-shadow: 
                        -1px -1px 0 rgba(255,255,255,0.4),
                        1px 1px 0 rgba(0,0,0,0.3);
                }
            `;
        } else {
            css += `
                ${sel} .tile-value, ${sel} .gauge-value, ${sel} .text-display-value {
                    color: ${valueColor} !important;
                }
            `;
        }
        
        // ── LABEL TEXT ──
        if (eff.glow) {
            css += `
                ${sel} .tile-label, ${sel} .gauge-label, ${sel} .text-display-label {
                    color: ${c.textSecondary} !important;
                    text-shadow: 
                        0 0 10px ${c.textSecondary},
                        0 0 20px ${c.textSecondary}80;
                    text-transform: uppercase;
                    letter-spacing: 2px;
                }
            `;
        } else if (eff.bevel) {
            css += `
                ${sel} .tile-label, ${sel} .gauge-label, ${sel} .text-display-label {
                    color: ${c.textSecondary} !important;
                    text-shadow: 
                        1px 1px 0 rgba(255,255,255,0.4),
                        -1px -1px 0 rgba(0,0,0,0.2);
                }
            `;
        } else {
            css += `
                ${sel} .tile-label, ${sel} .gauge-label, ${sel} .text-display-label {
                    color: ${c.textSecondary} !important;
                }
            `;
        }
        
        // ── SVG GAUGE STYLING ──
        css += `
            ${sel} .gauge-svg circle[stroke="#333"],
            ${sel} .gauge-svg path[stroke="#333"] {
                stroke: ${this.darkenColor(c.surface, 25)} !important;
            }
        `;
        if (eff.glow) {
            css += `
                ${sel} .gauge-svg circle:not([stroke="#333"]),
                ${sel} .gauge-svg path:not([stroke="#333"]) {
                    filter: drop-shadow(0 0 6px ${valueColor}) drop-shadow(0 0 12px ${valueColor}80);
                }
            `;
        }
        
        // ── GRAPH LINE STYLING ──
        if (eff.glow) {
            css += `
                ${sel} .cpu-graph path, ${sel} .network-graph path {
                    filter: drop-shadow(0 0 6px ${valueColor});
                }
            `;
        }
        
        // ── SCANLINES EFFECT ──
        if (eff.scanlines) {
            css += `
                ${sel}::after {
                    content: '';
                    position: fixed;
                    top: 0; left: 0;
                    width: 100%; height: 100%;
                    background: repeating-linear-gradient(
                        0deg,
                        rgba(0,0,0,0.15),
                        rgba(0,0,0,0.15) 1px,
                        transparent 1px,
                        transparent 2px
                    );
                    pointer-events: none;
                    z-index: 9999;
                }
            `;
        }
        
        // ── PIXELATED EFFECT ──
        if (eff.pixelated) {
            css += `
                ${sel}, ${sel} .tile {
                    image-rendering: pixelated;
                    image-rendering: -moz-crisp-edges;
                }
                ${sel} * {
                    font-smooth: never;
                    -webkit-font-smoothing: none;
                }
                ${sel} .tile { border-radius: 0 !important; }
            `;
        }
        
        // ── FONT OVERRIDE ──
        if (themeData.fonts && themeData.fonts.main) {
            css += `
                ${sel}, ${sel} .tile, ${sel} .tile-label, ${sel} .tile-value,
                ${sel} .gauge-label, ${sel} .gauge-value,
                ${sel} .text-display-label, ${sel} .text-display-value {
                    font-family: ${themeData.fonts.main} !important;
                }
            `;
        }
        
        // ── LINEAR GAUGE BAR GLOW ──
        if (eff.glow) {
            css += `
                ${sel} .gauge-container div div {
                    box-shadow: 0 0 10px ${valueColor}80;
                }
            `;
        }
        
        // ── PAGE INDICATOR ──
        css += `
            .page-indicator {
                position: fixed;
                bottom: 4px;
                left: 50%;
                transform: translateX(-50%);
                display: flex;
                gap: 6px;
                z-index: 9998;
                pointer-events: none;
                opacity: 0.6;
            }
            .page-dot {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                background: ${c.textSecondary || '#888'};
                transition: all 0.3s ease;
            }
            .page-dot.active {
                background: ${c.primary || '#00ff88'};
                transform: scale(1.3);
                opacity: 1;
            }
        `;
        
        styleTag.textContent = css;
        
        // Update page indicator dots
        this.updatePageIndicator();
    }
    
    /**
     * Show dots at bottom of screen indicating current page.
     * Only visible when there are multiple pages.
     */
    updatePageIndicator() {
        let indicator = document.getElementById('page-indicator');
        
        if (this.pages.length <= 1) {
            // Single page — remove indicator
            if (indicator) indicator.remove();
            return;
        }
        
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'page-indicator';
            indicator.className = 'page-indicator';
            document.getElementById('app').appendChild(indicator);
        }
        
        indicator.innerHTML = '';
        for (let i = 0; i < this.pages.length; i++) {
            const dot = document.createElement('div');
            dot.className = 'page-dot' + (i === this.currentPageIndex ? ' active' : '');
            indicator.appendChild(dot);
        }
    }
    
    // =========================================================================
    // HELPER METHODS
    // =========================================================================
    
    lightenColor(hex, percent) {
        try {
            const num = parseInt(hex.replace('#', ''), 16);
            const r = Math.min(255, (num >> 16) + Math.round(2.55 * percent));
            const g = Math.min(255, ((num >> 8) & 0x00FF) + Math.round(2.55 * percent));
            const b = Math.min(255, (num & 0x0000FF) + Math.round(2.55 * percent));
            return '#' + (0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1);
        } catch (e) { return hex; }
    }
    
    darkenColor(hex, percent) {
        try {
            const num = parseInt(hex.replace('#', ''), 16);
            const r = Math.max(0, (num >> 16) - Math.round(2.55 * percent));
            const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.round(2.55 * percent));
            const b = Math.max(0, (num & 0x0000FF) - Math.round(2.55 * percent));
            return '#' + (0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1);
        } catch (e) { return hex; }
    }
    
    showDisconnectedOverlay() {
        document.getElementById('disconnected-overlay').classList.remove('hidden');
    }
    
    hideDisconnectedOverlay() {
        document.getElementById('disconnected-overlay').classList.add('hidden');
    }
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { window.app = new StatDeckApp(); });
} else {
    window.app = new StatDeckApp();
}
