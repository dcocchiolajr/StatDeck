/**
 * Main Application Controller - StatDeck Display
 * VERSION: v5.0 — Modular Theme Architecture
 * * PAGES ARCHITECTURE:
 * Layout format: { pages: [{ id, name, grid, tiles }, ...], theme, themeData }
 * Page nav tiles handled LOCALLY — no USB round-trip
 *
 * THEME ARCHITECTURE:
 * Themes are now fully decoupled. The app reads the theme ID and 
 * dynamically loads the specific stylesheet from the /themes/ folder.
 */

class StatDeckApp {
    constructor() {
        this.config = null;
        this.usbClient = new USBClient();
        this.tileManager = null;
        this.layoutEngine = null;
        this.touchHandler = new TouchHandler();

        // === PAGES STATE ===
        this.pages = [];
        this.currentPageIndex = 0;
        this.themeData = null;
        this.themeId = null;

        this.init();
    }

    init() {
        console.log('StatDeck initializing...');
        this.watchdogTimer = null;

        this.usbClient.on('connected', () => {
            console.log('Connected to local USB gadget proxy');
        });

        this.usbClient.on('disconnected', () => {
            console.log('Disconnected from local proxy');
            this.showDisconnectedOverlay();
            clearTimeout(this.watchdogTimer);
        });

        this.usbClient.on('config', (layout) => {
            console.log('Received configuration');
            this.loadConfig(layout);
        });

        this.usbClient.on('stats', (data) => {
            // 1. Ignore empty garbage data
            if (!data || Object.keys(data).length === 0) return;

            // 2. Real data arrived! Drop the screen and update tiles
            this.hideDisconnectedOverlay();
            this.updateStats(data);

            // 3. The Watchdog: Reset the 3-second timer every time a packet hits
            clearTimeout(this.watchdogTimer);
            this.watchdogTimer = setTimeout(() => {
                // If 3 seconds pass in total silence, Windows is gone. Put the screen up!
                console.log('Watchdog triggered: No stats received for 3 seconds.');
                this.showDisconnectedOverlay();
            }, 3000);
        });

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

    async loadConfig(layout) {
        if (!this.config) {
            this.executeConfigSwap(layout);
            return;
        }

        if (layout.themeData && layout.themeData.colors) {
            const transRule = `background ${this.TRANSITION_EXIT_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`;
            document.body.style.transition = transRule;

            const appDiv = document.getElementById('app');
            if (appDiv) appDiv.style.transition = transRule;

            void document.body.offsetHeight;

            document.body.style.setProperty('background', layout.themeData.colors.background, 'important');
            if (appDiv) appDiv.style.setProperty('background', layout.themeData.colors.background, 'important');
        }

        let grid = document.getElementById('tile-grid');
        const exitClass = 'page-exit-next';
        if (grid) grid.classList.add(exitClass);

        await new Promise(resolve => setTimeout(resolve, this.TRANSITION_EXIT_MS));

        if (grid) grid.classList.remove(exitClass);
        this.executeConfigSwap(layout);

        grid = document.getElementById('tile-grid');
        if (grid) {
            void grid.offsetHeight;
            const enterClass = 'page-enter-next';
            requestAnimationFrame(() => {
                grid.classList.add(enterClass);
                setTimeout(() => {
                    grid.classList.remove(enterClass);
                }, this.TRANSITION_ENTER_MS);
            });
        }
    }

    executeConfigSwap(layout) {
        this.config = layout;
        this.pages = this.parsePagesFromLayout(layout);
        this.currentPageIndex = 0;

        this.themeData = layout.themeData || null;
        this.themeId = layout.theme || (this.themeData && this.themeData.id) || 'dark';

        // 1. Set the data-theme attribute
        document.body.setAttribute('data-theme', this.themeId);

        // 2. Apply base colors (CSS Variables)
        if (this.themeData && this.themeData.colors) {
            this.applyThemeData(this.themeData);
        }

        // 3. LOAD THE MODULAR CSS FILE dynamically
        this.loadModularThemeCSS(this.themeId);

        this.renderCurrentPage();
        console.log(`Profile Switched: ${this.themeId}`);
    }

    parsePagesFromLayout(layout) {
        if (layout.pages && Array.isArray(layout.pages) && layout.pages.length > 0) {
            return layout.pages.map((page, i) => ({
                id: page.id || `page_${i + 1}`,
                name: page.name || `Page ${i + 1}`,
                grid: page.grid || layout.grid || { cols: 4, rows: 3, gap: 10 },
                tiles: page.tiles || []
            }));
        }
        return [{
            id: 'page_1',
            name: 'Page 1',
            grid: layout.grid || { cols: 4, rows: 3, gap: 10 },
            tiles: layout.tiles || []
        }];
    }

    // =========================================================================
    // PAGE RENDERING & NAVIGATION
    // =========================================================================

    renderCurrentPage() {
        const page = this.pages[this.currentPageIndex];
        if (!page) return;

        if (this.themeData && this.themeData.colors) {
            this.injectThemeColorsIntoTiles(page.tiles, this.themeData);
        }

        this.layoutEngine = new LayoutEngine(page.grid);
        this.layoutEngine.apply();

        this.tileManager = new TileManager(page.tiles);
        this.tileManager.createTiles();

        this.touchHandler.registerTiles(this.tileManager.tiles);

        document.dispatchEvent(new CustomEvent('pageChanged', {
            detail: {
                pageIndex: this.currentPageIndex,
                pageCount: this.pages.length,
                pageName: page.name
            }
        }));

        this.updatePageIndicator();
    }

    get TRANSITION_EXIT_MS() { return 400; }
    get TRANSITION_ENTER_MS() { return 650; }

    nextPage() {
        if (this.pages.length <= 1 || this._transitioning) return;
        const newIndex = (this.currentPageIndex + 1) % this.pages.length;
        this.transitionToPage(newIndex, 'next');
    }

    prevPage() {
        if (this.pages.length <= 1 || this._transitioning) return;
        const newIndex = (this.currentPageIndex - 1 + this.pages.length) % this.pages.length;
        this.transitionToPage(newIndex, 'prev');
    }

    transitionToPage(newIndex, direction) {
        this._transitioning = true;
        const grid = document.getElementById('tile-grid');
        if (!grid) { this._transitioning = false; return; }

        const exitClass = 'page-exit-' + direction;
        grid.classList.add(exitClass);

        setTimeout(() => {
            grid.classList.remove(exitClass);
            this.currentPageIndex = newIndex;
            this.renderCurrentPage();

            void grid.offsetHeight;

            const enterClass = 'page-enter-' + direction;
            requestAnimationFrame(() => {
                grid.classList.add(enterClass);
                setTimeout(() => {
                    grid.classList.remove(enterClass);
                    this._transitioning = false;
                }, this.TRANSITION_ENTER_MS);
            });
        }, this.TRANSITION_EXIT_MS);
    }

    // =========================================================================
    // MODULAR THEME SYSTEM (NEW v5.0)
    // =========================================================================

    /**
     * Dynamically loads the specific CSS file for the active theme
     * and removes any old injected styles.
     */
    loadModularThemeCSS(themeId) {
        // Clean up the old v4 math-generated style tag if it still exists
        const oldStyleTag = document.getElementById('dynamic-theme-style');
        if (oldStyleTag) oldStyleTag.remove();

        // Find or create our new dynamic stylesheet link
        let linkTag = document.getElementById('modular-theme-css');
        if (!linkTag) {
            linkTag = document.createElement('link');
            linkTag.id = 'modular-theme-css';
            linkTag.rel = 'stylesheet';
            document.head.appendChild(linkTag);
        }

        // Point it to the specific theme's CSS file
        // (e.g., /themes/synthwave.css)
        linkTag.href = `themes/${themeId}.css`;
    }

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

    updatePageIndicator() {
        let indicator = document.getElementById('page-indicator');
        if (this.pages.length <= 1) {
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
    // I/O & HELPERS
    // =========================================================================

    handleTileAction(tileId, actionType) {
        const tile = this.tileManager ? this.tileManager.getTile(tileId) : null;
        if (tile && actionType === 'tap') {
            if (tile.type === 'page_prev') { this.prevPage(); return; }
            if (tile.type === 'page_next') { this.nextPage(); return; }
        }
        this.usbClient.sendAction(tileId, actionType);
    }

    updateStats(data) {
        if (this.tileManager) this.tileManager.updateAllTiles(data);
    }

    showDisconnectedOverlay() { document.getElementById('disconnected-overlay').classList.remove('hidden'); }
    hideDisconnectedOverlay() { document.getElementById('disconnected-overlay').classList.add('hidden'); }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { window.app = new StatDeckApp(); });
} else {
    window.app = new StatDeckApp();
}