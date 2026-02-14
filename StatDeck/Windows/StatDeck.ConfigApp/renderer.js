/**
 * StatDeck Config App - Main Renderer Process (WITH LIVE PREVIEW)
 * Coordinates all components and handles app state
 */

const { ipcRenderer } = require('electron');

class StatDeckApp {
    constructor() {
        this.currentFile = null;
        this.modified = false;
        this.layout = this.getDefaultLayout();
        
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
        
        this.init();
    }
    
    async init() {
        console.log('StatDeck Config App initializing...');
        
        // Setup UI event listeners
        this.setupToolbar();
        this.setupMenuHandlers();
        this.setupGridControls();
        
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
                    
                    if (rawLayout && rawLayout.tiles) {
                        // Use configLoader to validate and fix any issues
                        const layout = this.configLoader.load(rawLayout);
                        this.layout = layout;
                        this.gridCanvas.loadLayout(layout);
                        
                        // Set theme if present
                        if (layout.theme) {
                            document.getElementById('theme-selector').value = layout.theme;
                            this.themeManager.setTheme(layout.theme);
                        }
                        
                        this.modified = false;
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
            // Not connected, load default
            console.log('USB not connected, loading default layout');
            this.loadDefaultLayout();
        }
        
        // Update UI
        this.updateUI();
        
        console.log('✓ App initialized');
    }
    
    /**
     * Wait for USB connection with timeout
     */
    async waitForUSBConnection(timeout = 5000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            if (this.usbManager.isConnected()) {
                return true;
            }
            // Check every 100ms
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        return false;
    }
    
    getDefaultLayout() {
        return {
            version: '1.0',
            grid: {
                cols: 4,
                rows: 3,
                cell_width: 180,
                cell_height: 120,
                gap: 10
            },
            tiles: []
        };
    }
    
    setupToolbar() {
        // File operations
        document.getElementById('btn-new').addEventListener('click', () => this.newLayout());
        document.getElementById('btn-open').addEventListener('click', () => this.openLayout());
        document.getElementById('btn-save').addEventListener('click', () => this.saveLayout());
        
        // Undo/Redo
        document.getElementById('btn-undo').addEventListener('click', () => this.undo());
        document.getElementById('btn-redo').addEventListener('click', () => this.redo());
        
        // Export
        document.getElementById('btn-export').addEventListener('click', () => this.exportToPi());
        
        // NEW: Live Preview Toggle
        document.getElementById('btn-live-preview').addEventListener('click', () => {
            const enabled = this.livePreview.toggle();
            this.updateLivePreviewUI(enabled);
        });
    }
    
    updateLivePreviewUI(enabled) {
        const btn = document.getElementById('btn-live-preview');
        const status = document.getElementById('preview-status');
        
        if (enabled) {
            btn.innerHTML = '<span>🟢</span> Live Preview';
            btn.style.background = 'rgba(0, 255, 136, 0.1)';
            btn.style.borderColor = '#00ff88';
            status.style.display = 'inline';
        } else {
            btn.innerHTML = '<span>🔴</span> Live Preview';
            btn.style.background = '';
            btn.style.borderColor = '';
            status.style.display = 'none';
            
            // Clear previews from tiles
            this.gridCanvas.tiles.forEach(tile => {
                const preview = tile.element.querySelector('.tile-live-preview');
                if (preview) preview.remove();
            });
        }
    }
    
    setupMenuHandlers() {
        // Menu events from main process
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
            this.setGridSize(parseInt(colsSelect.value), this.layout.grid.rows);
        });
        
        rowsSelect.addEventListener('change', () => {
            this.setGridSize(this.layout.grid.cols, parseInt(rowsSelect.value));
        });
        
        toggleGrid.addEventListener('change', () => {
            this.gridCanvas.toggleGridLines(toggleGrid.checked);
        });
        
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
                    // Push & Change
                    await this.exportToPi();
                } else if (result.response === 2) {
                    // Cancel
                    themeSelector.value = currentTheme;
                    return;
                }
            }
            
            this.themeManager.setTheme(newTheme);
            this.layout.theme = newTheme;
            this.markModified();
        });
        
        // Apply saved theme from layout
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
            
            if (result.response === 0) { // Save
                await this.saveLayout();
            } else if (result.response === 2) { // Cancel
                return;
            }
        }
        
        this.layout = this.getDefaultLayout();
        this.currentFile = null;
        this.modified = false;
        this.gridCanvas.loadLayout(this.layout);
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
                // Use configLoader to parse and validate/fix the layout
                const layout = this.configLoader.load(result.data);
                this.layout = layout;
                this.currentFile = filepath;
                this.modified = false;
                this.gridCanvas.loadLayout(layout);
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
        // Use configLoader to serialize (which also validates)
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
            
            if (proceed.response === 0) {
                await this.saveLayoutAs();
            }
            return;
        }
        
        // Add theme to layout before sending
        const layoutWithTheme = {
            ...this.layout,
            theme: this.themeManager.currentTheme
        };
        this.usbManager.sendConfig(layoutWithTheme);
        this.setStatus('Configuration sent to Pi');
    }
    
    loadDefaultLayout() {
        // Try to load example layout from shared folder
        const examplePath = require('path').join(__dirname, '../../Shared/example-layout.json');
        const fs = require('fs');
        
        try {
            if (fs.existsSync(examplePath)) {
                const data = fs.readFileSync(examplePath, 'utf8');
                // Use configLoader to parse and validate/fix the layout
                const layout = this.configLoader.load(data);
                this.layout = layout;
                this.gridCanvas.loadLayout(layout);
            }
        } catch (err) {
            console.log('No example layout found or error loading, using default:', err.message);
        }
    }
    
    clearLayout() {
        this.layout.tiles = [];
        this.gridCanvas.loadLayout(this.layout);
        this.markModified();
    }
    
    setGridSize(cols, rows) {
        this.layout.grid.cols = cols;
        this.layout.grid.rows = rows;
        document.getElementById('grid-cols').value = cols;
        document.getElementById('grid-rows').value = rows;
        this.gridCanvas.updateGridSize(cols, rows);
        this.markModified();
    }
    
    toggleGrid() {
        const checkbox = document.getElementById('toggle-grid');
        checkbox.checked = !checkbox.checked;
        this.gridCanvas.toggleGridLines(checkbox.checked);
    }
    
    undo() {
        this.undoManager.undo();
    }
    
    redo() {
        this.undoManager.redo();
    }
    
    markModified() {
        this.modified = true;
        this.updateUI();
    }
    
    updateUI() {
        // Update title
        const filename = this.currentFile ? require('path').basename(this.currentFile) : 'Untitled Layout';
        const modified = this.modified ? ' •' : '';
        document.getElementById('status-file').textContent = filename + modified;
        
        // Update tile count
        document.getElementById('tile-count').textContent = `${this.layout.tiles.length} tiles`;
        
        // Update canvas dimensions
        const width = this.layout.grid.cols * this.layout.grid.cell_width;
        const height = this.layout.grid.rows * this.layout.grid.cell_height;
        document.getElementById('canvas-dimensions').textContent = `${width} × ${height} px`;
        
        // Update undo/redo buttons
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
