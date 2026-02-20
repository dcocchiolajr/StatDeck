/**
 * StatDeck Config App - Main Renderer Process
 * VERSION: v4.0 — Multi-Page Support
 * 
 * PAGES ARCHITECTURE:
 *   layout.pages = [{ id, name, grid, tiles }, ...]
 *   Each page has its own grid size and tile set
 *   Theme is shared across all pages
 *   currentPageIndex tracks which page is being edited
 *   Push sends ALL pages at once
 *
 * WITH: Live Preview, Theme Builder, Page Tabs
 */

const { ipcRenderer } = require('electron');

class StatDeckApp {
    constructor() {
        this.currentFile = null;
        this.modified = false;
        this.layout = this.getDefaultLayout();
        this.currentPageIndex = 0;
        
        // Initialize utilities first
        this.themeManager = new ThemeManager();
        this.iconLoader = new IconLoader();
        
        // Make icon loader globally available
        window.iconLoader = this.iconLoader;
        
        // Initialize components
        this.gridCanvas = new GridCanvas(this);
        this.tilePalette = new TilePalette(this);
        this.propertiesPanel = new PropertiesPanel(this);
        this.actionEditor = new ActionEditor(this);
        this.usbManager = new USBManager(this);
        this.configLoader = new ConfigLoader(this);
        this.undoManager = new UndoManager(this);
        this.livePreview = new LivePreviewBridge(this);
        this.themeBuilder = new ThemeBuilder(this);
        
        this.init();
    }
    
    async init() {
        console.log('StatDeck Config App v4.0 initializing (multi-page)...');
        
        // Setup UI event listeners
        this.setupToolbar();
        this.setupMenuHandlers();
        this.setupGridControls();
        this.setupPageTabs();
        
        // Wait for USB auto-connect to complete (max 5 seconds)
        console.log('Waiting for USB connection...');
        const connected = await this.waitForUSBConnection(5000);
        console.log('USB connected:', connected);
        
        // Try to load from Pi if connected
        if (connected) {
            console.log('Showing load dialog...');
            const loadFromPi = await ipcRenderer.invoke('show-message', {
                type: 'question',
                buttons: ['Load from Pi', 'Start Fresh'],
                title: 'Load Layout',
                message: 'Pi is connected. Load current layout from Pi or start fresh?'
            });
            
            console.log('User chose:', loadFromPi.response === 0 ? 'Load from Pi' : 'Start Fresh');
            
            if (loadFromPi.response === 0) {
                try {
                    this.setStatus('Loading layout from Pi...');
                    console.log('Requesting layout from Pi...');
                    const rawLayout = await this.usbManager.getLayoutFromPi();
                    console.log('Received layout:', rawLayout);
                    
                    if (rawLayout && (rawLayout.tiles || rawLayout.pages)) {
                        const layout = this.configLoader.load(rawLayout);
                        this.layout = layout;
                        this.currentPageIndex = 0;
                        this.gridCanvas.loadLayout(layout);
                        
                        if (layout.theme) {
                            document.getElementById('theme-selector').value = layout.theme;
                            this.themeManager.setTheme(layout.theme);
                        }
                        
                        this.modified = false;
                        this.renderPageTabs();
                        this.switchToPage(0);
                        this.updateUI();
                        this.setStatus('Layout loaded from Pi');
                    } else {
                        throw new Error('Invalid layout received');
                    }
                } catch (err) {
                    console.error('Load from Pi error:', err);
                    await ipcRenderer.invoke('show-error', 'Error', `Failed to load from Pi: ${err.message}`);
                    this.loadDefaultLayout();
                }
            } else {
                this.loadDefaultLayout();
            }
        } else {
            console.log('USB not connected, loading default layout');
            this.loadDefaultLayout();
        }
        
        // Render page tabs and update UI
        this.renderPageTabs();
        this.updateUI();
        
        console.log('\u2714 App initialized');
    }
    
    // =========================================================================
    // DEFAULT LAYOUT (now uses pages array)
    // =========================================================================
    
    getDefaultLayout() {
        return {
            version: '2.0',
            theme: 'dark',
            pages: [
                {
                    id: 'page_1',
                    name: 'Page 1',
                    grid: {
                        cols: 4,
                        rows: 3,
                        cell_width: 180,
                        cell_height: 120,
                        gap: 10
                    },
                    tiles: []
                }
            ]
        };
    }
    
    /**
     * Get the currently active page object.
     */
    getCurrentPage() {
        if (!this.layout.pages || this.layout.pages.length === 0) {
            // Safety: ensure at least one page exists
            this.layout.pages = [this.getDefaultLayout().pages[0]];
            this.currentPageIndex = 0;
        }
        return this.layout.pages[this.currentPageIndex];
    }
    
    /**
     * COMPATIBILITY SHIM: layout.grid points to current page's grid
     * Many existing components read this.app.layout.grid directly.
     */
    get currentGrid() {
        return this.getCurrentPage().grid;
    }
    
    /**
     * COMPATIBILITY SHIM: layout.tiles points to current page's tiles
     * Many existing components read this.app.layout.tiles directly.
     */
    get currentTiles() {
        return this.getCurrentPage().tiles;
    }
    
    // =========================================================================
    // PAGE TABS UI
    // =========================================================================
    
    setupPageTabs() {
        // Add Page button
        const addPageBtn = document.getElementById('btn-add-page');
        if (addPageBtn) {
            addPageBtn.addEventListener('click', () => this.addPage());
        }
    }
    
    /**
     * Render the page tab bar below the toolbar.
     */
    renderPageTabs() {
        const tabBar = document.getElementById('page-tab-bar');
        if (!tabBar) return;
        
        // Clear existing tabs (keep the add button)
        const addBtn = document.getElementById('btn-add-page');
        tabBar.innerHTML = '';
        
        // Create tabs
        this.layout.pages.forEach((page, index) => {
            const tab = document.createElement('div');
            tab.className = 'page-tab' + (index === this.currentPageIndex ? ' active' : '');
            tab.dataset.pageIndex = index;
            
            // Tab label (editable on double-click)
            const label = document.createElement('span');
            label.className = 'page-tab-label';
            label.textContent = page.name || `Page ${index + 1}`;
            label.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                this.startRenameTab(tab, index);
            });
            
            tab.appendChild(label);
            
            // Close button (only if more than 1 page)
            if (this.layout.pages.length > 1) {
                const closeBtn = document.createElement('span');
                closeBtn.className = 'page-tab-close';
                closeBtn.textContent = '\u00D7';
                closeBtn.title = 'Delete page';
                closeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.deletePage(index);
                });
                tab.appendChild(closeBtn);
            }
            
            // Click to switch page
            tab.addEventListener('click', () => {
                this.switchToPage(index);
            });
            
            tabBar.appendChild(tab);
        });
        
        // Re-add the "+" button
        const newAddBtn = document.createElement('div');
        newAddBtn.id = 'btn-add-page';
        newAddBtn.className = 'page-tab page-tab-add';
        newAddBtn.textContent = '+';
        newAddBtn.title = 'Add new page';
        newAddBtn.addEventListener('click', () => this.addPage());
        tabBar.appendChild(newAddBtn);
    }
    
    /**
     * Switch to editing a different page.
     */
    switchToPage(index) {
        if (index < 0 || index >= this.layout.pages.length) return;
        
        this.currentPageIndex = index;
        const page = this.getCurrentPage();
        
        // Update grid controls to reflect this page's grid
        document.getElementById('grid-cols').value = page.grid.cols;
        document.getElementById('grid-rows').value = page.grid.rows;
        
        // Reload canvas with this page's tiles
        this.gridCanvas.loadPage(page);
        
        // Deselect any tile
        this.propertiesPanel.hideProperties();
        
        // Update tab visuals
        this.renderPageTabs();
        this.updateUI();
        
        console.log(`Switched to page ${index + 1}: "${page.name}"`);
    }
    
    /**
     * Add a new page.
     */
    addPage() {
        const newId = `page_${Date.now()}`;
        const pageNum = this.layout.pages.length + 1;
        
        // New page starts with same grid as current page
        const currentGrid = this.getCurrentPage().grid;
        
        const newPage = {
            id: newId,
            name: `Page ${pageNum}`,
            grid: {
                cols: currentGrid.cols,
                rows: currentGrid.rows,
                cell_width: currentGrid.cell_width || 180,
                cell_height: currentGrid.cell_height || 120,
                gap: currentGrid.gap || 10
            },
            tiles: []
        };
        
        this.layout.pages.push(newPage);
        this.switchToPage(this.layout.pages.length - 1);
        this.markModified();
        this.setStatus(`Added "${newPage.name}"`);
    }
    
    /**
     * Delete a page by index. Requires confirmation.
     */
    async deletePage(index) {
        if (this.layout.pages.length <= 1) return;
        
        const page = this.layout.pages[index];
        const tileCount = page.tiles.length;
        
        const result = await ipcRenderer.invoke('show-message', {
            type: 'warning',
            buttons: ['Delete', 'Cancel'],
            title: 'Delete Page',
            message: `Delete "${page.name}"${tileCount > 0 ? ` with ${tileCount} tile(s)` : ''}? This cannot be undone.`
        });
        
        if (result.response !== 0) return;
        
        this.layout.pages.splice(index, 1);
        
        // Adjust current page index
        if (this.currentPageIndex >= this.layout.pages.length) {
            this.currentPageIndex = this.layout.pages.length - 1;
        }
        
        this.switchToPage(this.currentPageIndex);
        this.markModified();
        this.setStatus(`Deleted "${page.name}"`);
    }
    
    /**
     * Start inline editing of a page tab name.
     */
    startRenameTab(tabElement, pageIndex) {
        const label = tabElement.querySelector('.page-tab-label');
        const page = this.layout.pages[pageIndex];
        
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'page-tab-rename-input';
        input.value = page.name;
        input.style.cssText = 'width:80px;font-size:11px;padding:1px 4px;border:1px solid #00ff88;background:#1a1a2e;color:#fff;border-radius:3px;outline:none';
        
        label.replaceWith(input);
        input.focus();
        input.select();
        
        const finishRename = () => {
            const newName = input.value.trim() || `Page ${pageIndex + 1}`;
            page.name = newName;
            this.renderPageTabs();
            this.markModified();
        };
        
        input.addEventListener('blur', finishRename);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                input.blur();
            } else if (e.key === 'Escape') {
                input.value = page.name;
                input.blur();
            }
        });
    }
    
    // =========================================================================
    // GRID SIZE (per-page)
    // =========================================================================
    
    setGridSize(cols, rows) {
        const page = this.getCurrentPage();
        page.grid.cols = cols;
        page.grid.rows = rows;
        document.getElementById('grid-cols').value = cols;
        document.getElementById('grid-rows').value = rows;
        this.gridCanvas.updateGridSize(cols, rows);
        this.markModified();
    }
    
    // =========================================================================
    // FILE OPERATIONS (updated for pages format)
    // =========================================================================
    
    async waitForUSBConnection(timeout = 5000) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            if (this.usbManager.isConnected()) return true;
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return false;
    }
    
    setupToolbar() {
        document.getElementById('btn-new').addEventListener('click', () => this.newLayout());
        document.getElementById('btn-open').addEventListener('click', () => this.openLayout());
        document.getElementById('btn-save').addEventListener('click', () => this.saveLayout());
        
        document.getElementById('btn-undo').addEventListener('click', () => this.undo());
        document.getElementById('btn-redo').addEventListener('click', () => this.redo());
        
        document.getElementById('btn-export').addEventListener('click', () => this.exportToPi());
        
        document.getElementById('btn-live-preview').addEventListener('click', () => {
            const enabled = this.livePreview.toggle();
            this.updateLivePreviewUI(enabled);
        });
    }
    
    updateLivePreviewUI(enabled) {
        const btn = document.getElementById('btn-live-preview');
        const status = document.getElementById('preview-status');
        
        if (enabled) {
            btn.innerHTML = '<span>\uD83D\uDFE2</span> Live Preview';
            btn.style.background = 'rgba(0, 255, 136, 0.1)';
            btn.style.borderColor = '#00ff88';
            status.style.display = 'inline';
        } else {
            btn.innerHTML = '<span>\uD83D\uDD34</span> Live Preview';
            btn.style.background = '';
            btn.style.borderColor = '';
            status.style.display = 'none';
            
            this.gridCanvas.tiles.forEach(tile => {
                const preview = tile.element.querySelector('.tile-live-preview');
                if (preview) preview.remove();
            });
        }
    }
    
    setupMenuHandlers() {
        ipcRenderer.on('menu-new', () => this.newLayout());
        ipcRenderer.on('menu-open', async (e, filepath) => {
            if (filepath) {
                await this.loadLayoutFromFile(filepath);
            } else {
                await this.openLayout();
            }
        });
        ipcRenderer.on('menu-save', () => this.saveLayout());
        ipcRenderer.on('menu-save-as', () => this.saveLayoutAs());
        ipcRenderer.on('menu-export', () => this.exportToPi());
        
        ipcRenderer.on('menu-undo', () => this.undo());
        ipcRenderer.on('menu-redo', () => this.redo());
        ipcRenderer.on('menu-delete', () => this.gridCanvas.deleteSelected());
        ipcRenderer.on('menu-clear', () => this.clearLayout());
        
        ipcRenderer.on('menu-toggle-grid', () => this.toggleGrid());
        ipcRenderer.on('menu-grid-size', (e, size) => this.setGridSize(size.cols, size.rows));
    }
    
    setupGridControls() {
        const colsSelect = document.getElementById('grid-cols');
        const rowsSelect = document.getElementById('grid-rows');
        const toggleGrid = document.getElementById('toggle-grid');
        
        colsSelect.addEventListener('change', () => {
            this.setGridSize(parseInt(colsSelect.value), this.getCurrentPage().grid.rows);
        });
        
        rowsSelect.addEventListener('change', () => {
            this.setGridSize(this.getCurrentPage().grid.cols, parseInt(rowsSelect.value));
        });
        
        toggleGrid.addEventListener('change', () => {
            this.gridCanvas.toggleGridLines(toggleGrid.checked);
        });
        
        // Populate theme dropdown dynamically
        this.themeManager.populateDropdown('theme-selector');
        
        // Theme selector
        const themeSelector = document.getElementById('theme-selector');
        themeSelector.addEventListener('change', async () => {
            const newTheme = themeSelector.value;
            const currentTheme = this.layout.theme || 'dark';
            
            if (this.modified && newTheme !== currentTheme) {
                const result = await ipcRenderer.invoke('show-message', {
                    type: 'warning',
                    buttons: ['Push & Change', 'Change Anyway', 'Cancel'],
                    title: 'Theme Change Warning',
                    message: 'Changing theme will reset tile colors to theme defaults. Push current layout first?'
                });
                
                if (result.response === 0) {
                    await this.exportToPi();
                } else if (result.response === 2) {
                    themeSelector.value = currentTheme;
                    return;
                }
            }
            
            this.themeManager.setTheme(newTheme);
            this.layout.theme = newTheme;
            this.markModified();
        });
        
        // Theme builder buttons
        document.getElementById('btn-theme-new').addEventListener('click', () => {
            this.themeBuilder.open();
        });
        
        document.getElementById('btn-theme-edit').addEventListener('click', () => {
            const currentId = themeSelector.value;
            this.themeBuilder.open(currentId);
        });
        
        document.getElementById('btn-theme-import').addEventListener('click', () => {
            this.themeBuilder.importTheme();
        });
        
        // Apply saved theme
        if (this.layout.theme) {
            themeSelector.value = this.layout.theme;
            this.themeManager.setTheme(this.layout.theme);
        } else {
            this.themeManager.setTheme('dark');
        }
    }
    
    async newLayout() {
        if (this.modified) {
            const result = await ipcRenderer.invoke('show-message', {
                type: 'question',
                buttons: ['Save', 'Don\'t Save', 'Cancel'],
                title: 'Unsaved Changes',
                message: 'Do you want to save changes to the current layout?'
            });
            
            if (result.response === 0) await this.saveLayout();
            else if (result.response === 2) return;
        }
        
        this.layout = this.getDefaultLayout();
        this.currentFile = null;
        this.modified = false;
        this.currentPageIndex = 0;
        this.gridCanvas.loadPage(this.getCurrentPage());
        this.renderPageTabs();
        this.updateUI();
        this.setStatus('New layout created');
    }
    
    async openLayout() {
        const result = await ipcRenderer.invoke('open-dialog');
        if (!result.canceled && result.filePaths.length > 0) {
            await this.loadLayoutFromFile(result.filePaths[0]);
        }
    }
    
    async loadLayoutFromFile(filepath) {
        const result = await ipcRenderer.invoke('read-file', filepath);
        
        if (result.success) {
            try {
                const layout = this.configLoader.load(result.data);
                this.layout = layout;
                this.currentFile = filepath;
                this.modified = false;
                this.currentPageIndex = 0;
                this.gridCanvas.loadPage(this.getCurrentPage());
                this.renderPageTabs();
                this.updateUI();
                this.setStatus(`Loaded: ${filepath}`);
            } catch (err) {
                await ipcRenderer.invoke('show-error', 'Error', `Invalid layout file: ${err.message}`);
            }
        } else {
            await ipcRenderer.invoke('show-error', 'Error', `Failed to open file: ${result.error}`);
        }
    }
    
    async saveLayout() {
        if (this.currentFile) {
            await this.saveToFile(this.currentFile);
        } else {
            await this.saveLayoutAs();
        }
    }
    
    async saveLayoutAs() {
        const result = await ipcRenderer.invoke('save-dialog', this.currentFile || 'layout.json');
        if (!result.canceled && result.filePath) {
            await this.saveToFile(result.filePath);
        }
    }
    
    async saveToFile(filepath) {
        const data = this.configLoader.save(this.layout);
        const result = await ipcRenderer.invoke('write-file', filepath, data);
        
        if (result.success) {
            this.currentFile = filepath;
            this.modified = false;
            this.updateUI();
            this.setStatus(`Saved: ${filepath}`);
        } else {
            await ipcRenderer.invoke('show-error', 'Error', `Failed to save: ${result.error}`);
        }
    }
    
    async exportToPi() {
        if (!this.usbManager.isConnected()) {
            const proceed = await ipcRenderer.invoke('show-message', {
                type: 'warning',
                buttons: ['OK', 'Cancel'],
                title: 'USB Not Connected',
                message: 'Pi is not connected via USB. Save to file instead?'
            });
            
            if (proceed.response === 0) await this.saveLayoutAs();
            return;
        }
        
        // Build the full layout with theme data for push
        const layoutWithTheme = {
            ...this.layout,
            theme: this.themeManager.currentTheme,
            themeData: this.themeManager.getThemeDataForPush()
        };
        
        this.usbManager.sendConfig(layoutWithTheme);
        this.setStatus(`Configuration sent to Pi (${this.layout.pages.length} page(s))`);
    }
    
    loadDefaultLayout() {
        const examplePath = require('path').join(__dirname, '../../Shared/example-layout.json');
        const fs = require('fs');
        
        try {
            if (fs.existsSync(examplePath)) {
                const data = fs.readFileSync(examplePath, 'utf8');
                const layout = this.configLoader.load(data);
                this.layout = layout;
                this.currentPageIndex = 0;
                this.gridCanvas.loadPage(this.getCurrentPage());
                this.renderPageTabs();
            }
        } catch (err) {
            console.log('No example layout found, using default:', err.message);
        }
    }
    
    clearLayout() {
        // Clear only current page's tiles
        this.getCurrentPage().tiles = [];
        this.gridCanvas.loadPage(this.getCurrentPage());
        this.markModified();
    }
    
    toggleGrid() {
        const checkbox = document.getElementById('toggle-grid');
        checkbox.checked = !checkbox.checked;
        this.gridCanvas.toggleGridLines(checkbox.checked);
    }
    
    undo() { this.undoManager.undo(); }
    redo() { this.undoManager.redo(); }
    
    markModified() {
        this.modified = true;
        this.updateUI();
    }
    
    updateUI() {
        // Title
        const filename = this.currentFile ? require('path').basename(this.currentFile) : 'Untitled Layout';
        const modified = this.modified ? ' \u2022' : '';
        document.getElementById('status-file').textContent = filename + modified;
        
        // Tile count (current page)
        const page = this.getCurrentPage();
        const totalTiles = this.layout.pages.reduce((sum, p) => sum + p.tiles.length, 0);
        document.getElementById('tile-count').textContent = 
            this.layout.pages.length > 1 
                ? `${page.tiles.length} tiles (${totalTiles} total)`
                : `${page.tiles.length} tiles`;
        
        // Canvas dimensions
        const width = page.grid.cols * (page.grid.cell_width || 180);
        const height = page.grid.rows * (page.grid.cell_height || 120);
        document.getElementById('canvas-dimensions').textContent = `${width} \u00D7 ${height} px`;
        
        // Undo/redo
        document.getElementById('btn-undo').disabled = !this.undoManager.canUndo();
        document.getElementById('btn-redo').disabled = !this.undoManager.canRedo();
    }
    
    setStatus(message) {
        document.getElementById('status-message').textContent = message;
        setTimeout(() => {
            document.getElementById('status-message').textContent = 'Ready';
        }, 3000);
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.app = new StatDeckApp();
    });
} else {
    window.app = new StatDeckApp();
}
