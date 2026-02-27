/**
 * StatDeck Config App - Main Renderer Process
 * VERSION: v4.5 — Added Portable SSH Theme Push Automation
 */

const { ipcRenderer } = require('electron');

class StatDeckApp {
    constructor() {
        this.currentFile = null;
        this.modified = false;
        this.layout = this.getDefaultLayout();
        this.currentPageIndex = 0;

        this.themeManager = new ThemeManager();
        this.iconLoader = new IconLoader();
        window.iconLoader = this.iconLoader;

        this.gridCanvas = new GridCanvas(this);
        this.tilePalette = new TilePalette(this);
        this.propertiesPanel = new PropertiesPanel(this);
        this.actionEditor = new ActionEditor(this);
        this.usbManager = new USBManager(this);
        this.configLoader = new ConfigLoader(this);
        this.undoManager = new UndoManager(this);
        this.livePreview = new LivePreviewBridge(this);
        this.themeBuilder = new ThemeBuilder(this);
        this.settingsPanel = new SettingsPanel(this);
        this.init();
    }

    async init() {
        console.log('StatDeck Config App v4.5 initializing...');

        if (this.livePreview && !this.livePreview.renderPageNav) {
            this.livePreview.renderPageNav = function (tile) { };
        }

        this.setupToolbar();
        this.setupMenuHandlers();
        this.setupGridControls();
        this.setupPageTabs();
        this.setupProfileUI();
        this.setupThemePushControls(); // <-- NEW: Wires up the SSH Push functionality!

        this.renderPageTabs();
        this.updateUI();
    }

    // ==========================================
    // THEME PUSH AUTOMATION (node-ssh)
    // ==========================================

    setupThemePushControls() {
        // 1. Listen for logging output from the backend to display in your UI terminal
        ipcRenderer.on('terminal-log', (event, message) => {
            const terminalOutput = document.getElementById('push-log-window');
            if (terminalOutput) {
                terminalOutput.value += message;
                terminalOutput.scrollTop = terminalOutput.scrollHeight;
            }
        });

        // 2. The Button Click Event
        const btnPushThemes = document.getElementById('btn-push-themes');
        if (btnPushThemes) {
            btnPushThemes.addEventListener('click', async () => {
                // Safely grab values, falling back to defaults if inputs are empty
                const ipInput = document.getElementById('pi-ip');
                const userInput = document.getElementById('pi-username');
                const passInput = document.getElementById('pi-password');

                const credentials = {
                    ip: ipInput && ipInput.value ? ipInput.value : '192.168.1.84',
                    username: userInput && userInput.value ? userInput.value : 'pi',
                    password: passInput ? passInput.value : ''
                };

                if (!credentials.password) {
                    await ipcRenderer.invoke('show-message', {
                        type: 'warning', buttons: ['OK'], title: 'Password Required',
                        message: "Please enter the Raspberry Pi's SSH password in the settings first!"
                    });
                    return;
                }

                // Lock the button during transfer
                btnPushThemes.disabled = true;
                btnPushThemes.textContent = 'Pushing...';

                // Send the credentials to main.js to perform the secure push
                await ipcRenderer.invoke('push-themes-only', credentials);

                // Unlock the button
                btnPushThemes.disabled = false;
                btnPushThemes.textContent = 'Push Themes to Pi';
            });
        }
    }

    // ==========================================
    // PROFILE MANAGEMENT
    // ==========================================

    setupProfileUI() {
        const selector = document.getElementById('profile-selector');
        const btnAdd = document.getElementById('btn-add-profile');
        const btnSaveProfile = document.getElementById('btn-save-profile');
        const btnDelete = document.getElementById('btn-delete-profile');
        const btnRefresh = document.getElementById('btn-refresh-profiles');

        if (selector) selector.addEventListener('change', (e) => this.switchProfile(e.target.value));
        if (btnAdd) btnAdd.addEventListener('click', () => this.createNewProfile());

        if (btnSaveProfile) btnSaveProfile.addEventListener('click', () => this.saveLayoutAs());
        const mainSaveBtn = document.getElementById('btn-save');
        if (mainSaveBtn) {
            const newSaveBtn = mainSaveBtn.cloneNode(true);
            mainSaveBtn.parentNode.replaceChild(newSaveBtn, mainSaveBtn);
            newSaveBtn.addEventListener('click', () => this.saveLayoutAs());
        }

        if (btnDelete) btnDelete.addEventListener('click', () => this.deleteCurrentProfile());
        if (btnRefresh) btnRefresh.addEventListener('click', () => this.loadProfileList());

        setTimeout(() => this.loadProfileList('default'), 500);
    }

    async loadProfileList(selectName = null) {
        const result = await ipcRenderer.invoke('list-profiles');
        if (result.success && result.profiles) {
            const selector = document.getElementById('profile-selector');
            if (!selector) return;

            selector.innerHTML = '';
            result.profiles.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p; opt.textContent = p;
                selector.appendChild(opt);
            });

            if (selectName && result.profiles.includes(selectName)) {
                selector.value = selectName;
            } else if (result.profiles.includes('default')) {
                selector.value = 'default';
            }

            if (selector.value) await this.switchProfile(selector.value);
        }
    }

    async switchProfile(profileName) {
        if (this.modified) {
            const result = await ipcRenderer.invoke('show-message', {
                type: 'warning', buttons: ['Discard Changes', 'Cancel'], title: 'Unsaved Changes',
                message: 'You have unsaved changes! Switch anyway and lose them?'
            });
            if (result.response !== 0) {
                const selector = document.getElementById('profile-selector');
                if (selector) selector.value = this.currentFile ? this.currentFile.replace('.json', '') : 'default';
                return;
            }
        }

        const result = await ipcRenderer.invoke('load-profile-layout', profileName);
        if (result.success && result.data) {
            try {
                const data = JSON.parse(result.data);
                if (!data.pages) {
                    this.layout = this.getDefaultLayout();
                    this.layout.pages[0].tiles = data.tiles || [];
                    this.layout.theme = data.theme || 'dark';
                } else {
                    this.layout = data;
                }
            } catch (e) { this.layout = this.getDefaultLayout(); }
        } else {
            this.layout = this.getDefaultLayout();
        }

        this.currentPageIndex = 0;
        this.currentFile = profileName + '.json';
        this.modified = false;

        if (this.layout.theme) {
            const themeSel = document.getElementById('theme-selector');
            if (themeSel) themeSel.value = this.layout.theme;
            this.themeManager.setTheme(this.layout.theme);
        }

        this.gridCanvas.loadPage(this.getCurrentPage());
        this.renderPageTabs();
        this.updateUI();
        this.setStatus('Loaded: ' + profileName);
    }

    async createNewProfile() {
        const result = await ipcRenderer.invoke('open-exe-dialog');
        if (!result.canceled && result.filePaths.length > 0) {
            const exePath = result.filePaths[0];
            const profileName = require('path').basename(exePath, '.exe').toLowerCase();
            this.layout = this.getDefaultLayout();
            const data = JSON.stringify(this.layout, null, 2);
            await ipcRenderer.invoke('save-profile-layout', profileName, data);
            await this.loadProfileList(profileName);
        }
    }

    async deleteCurrentProfile() {
        const selector = document.getElementById('profile-selector');
        if (!selector || selector.value === 'default') {
            await ipcRenderer.invoke('show-message', { type: 'info', message: 'Cannot delete default profile.' });
            return;
        }
        const resp = await ipcRenderer.invoke('show-message', {
            type: 'warning', buttons: ['Delete', 'Cancel'], title: 'Delete',
            message: `Delete the ` + selector.value + ` profile?`
        });
        if (resp && resp.response === 0) {
            const fs = require('fs');
            const path = require('path');
            const LAYOUTS_DIR = path.join(require('electron').app.getAppPath(), '..', 'StatDeck.Service', 'layouts');
            try { fs.unlinkSync(path.join(LAYOUTS_DIR, selector.value + '.json')); } catch (e) { }
            await this.loadProfileList('default');
        }
    }

    // ==========================================
    // MANUAL SAVING AND FILE OPERATIONS
    // ==========================================

    syncCanvasToLayout() {
        try {
            // 1. Force a refresh of the internal tiles array from the live GridCanvas component
            if (this.gridCanvas && this.gridCanvas.tiles) {
                // Map the live component data back to a clean JSON array
                const liveTiles = this.gridCanvas.tiles.map(t => t.serialize ? t.serialize() : t.data);
                this.getCurrentPage().tiles = liveTiles;
            }

            // 2. V2 Compatibility Shim: Temporarily map the grid for the old configLoader
            this.layout.grid = this.getCurrentPage().grid;
            this.layout.tiles = this.getCurrentPage().tiles;

            // 3. Let the configLoader finalize the save data
            const rawData = this.configLoader.save(this.layout);
            const parsedData = JSON.parse(rawData);

            if (parsedData && parsedData.tiles !== undefined) {
                this.getCurrentPage().tiles = parsedData.tiles;
            }

            // 4. Clean up shims
            delete this.layout.grid;
            delete this.layout.tiles;
        } catch (e) {
            console.error("Failed to sync canvas:", e);
        }
    }

    async saveLayoutAs() {
        const result = await ipcRenderer.invoke('save-dialog', this.currentFile || 'layout.json');
        if (!result.canceled && result.filePath) {
            await this.saveToFile(result.filePath);

            const newProfileName = require('path').basename(result.filePath, '.json');
            const selector = document.getElementById('profile-selector');
            if (selector) {
                const exists = Array.from(selector.options).some(opt => opt.value === newProfileName);
                if (!exists) {
                    const opt = document.createElement('option');
                    opt.value = newProfileName;
                    opt.textContent = newProfileName;
                    selector.appendChild(opt);
                }
                selector.value = newProfileName;
            }
        }
    }

    async saveToFile(filepath) {
        this.syncCanvasToLayout();

        this.layout.theme = this.themeManager.currentTheme;
        this.layout.themeData = this.themeManager.getThemeDataForPush();

        // Strip the compatibility shims before saving so the file stays v4 pure
        const saveLayout = { ...this.layout };
        delete saveLayout.grid;
        delete saveLayout.tiles;

        const data = JSON.stringify(saveLayout, null, 2);
        const result = await ipcRenderer.invoke('write-file', filepath, data);

        if (result.success) {
            this.currentFile = require('path').basename(filepath);
            this.modified = false;
            this.updateUI();
            this.setStatus(`Saved: ${this.currentFile}`);
        } else {
            await ipcRenderer.invoke('show-error', 'Error', `Failed to save: ${result.error}`);
        }
    }

    async exportToPi() {
        if (!this.usbManager.isConnected()) {
            await ipcRenderer.invoke('show-message', {
                type: 'warning', buttons: ['OK'], title: 'USB Not Connected',
                message: 'Pi is not connected via USB.'
            });
            return;
        }

        this.syncCanvasToLayout();

        // Strip the compatibility shims before pushing so the Pi receives v4 pure
        const layoutWithTheme = {
            ...this.layout,
            theme: this.themeManager.currentTheme,
            themeData: this.themeManager.getThemeDataForPush()
        };
        delete layoutWithTheme.grid;
        delete layoutWithTheme.tiles;

        this.usbManager.sendConfig(layoutWithTheme);
        this.setStatus(`Pushed to Pi`);
    }

    // ==========================================
    // V4 PAGES & LAYOUT LOGIC
    // ==========================================

    getDefaultLayout() {
        return {
            version: '4.0', theme: 'dark',
            pages: [{
                id: 'page_1', name: 'Main',
                grid: { cols: 4, rows: 3, cell_width: 180, cell_height: 120, gap: 10 },
                tiles: []
            }]
        };
    }

    getCurrentPage() {
        if (!this.layout.pages || this.layout.pages.length === 0) {
            this.layout.pages = [this.getDefaultLayout().pages[0]];
            this.currentPageIndex = 0;
        }
        const page = this.layout.pages[this.currentPageIndex];

        // V2 COMPATIBILITY SHIM: Older JS files look for layout.grid at the root.
        // This dynamically aliases the root grid/tiles to the current page every time it loads.
        this.layout.grid = page.grid;
        this.layout.tiles = page.tiles;

        return page;
    }

    get currentGrid() { return this.getCurrentPage().grid; }
    get currentTiles() { return this.getCurrentPage().tiles; }

    setupPageTabs() {
        const addPageBtn = document.getElementById('btn-add-page');
        if (addPageBtn) addPageBtn.addEventListener('click', () => this.addPage());
    }

    renderPageTabs() {
        const tabBar = document.getElementById('page-tab-bar');
        if (!tabBar) return;
        tabBar.innerHTML = '';

        this.layout.pages.forEach((page, index) => {
            const tab = document.createElement('div');
            tab.className = 'page-tab' + (index === this.currentPageIndex ? ' active' : '');

            const label = document.createElement('span');
            label.className = 'page-tab-label';
            label.textContent = page.name || `Page ${index + 1}`;
            label.addEventListener('dblclick', (e) => { e.stopPropagation(); this.startRenameTab(tab, index); });
            tab.appendChild(label);

            if (this.layout.pages.length > 1) {
                const closeBtn = document.createElement('span');
                closeBtn.className = 'page-tab-close';
                closeBtn.textContent = '\u00D7';
                closeBtn.addEventListener('click', (e) => { e.stopPropagation(); this.deletePage(index); });
                tab.appendChild(closeBtn);
            }
            tab.addEventListener('click', () => this.switchToPage(index));
            tabBar.appendChild(tab);
        });

        const newAddBtn = document.createElement('div');
        newAddBtn.id = 'btn-add-page';
        newAddBtn.className = 'page-tab page-tab-add';
        newAddBtn.textContent = '+';
        newAddBtn.addEventListener('click', () => this.addPage());
        tabBar.appendChild(newAddBtn);
    }

    switchToPage(index) {
        if (index < 0 || index >= this.layout.pages.length) return;
        this.currentPageIndex = index;
        const page = this.getCurrentPage();
        document.getElementById('grid-cols').value = page.grid.cols;
        document.getElementById('grid-rows').value = page.grid.rows;
        this.gridCanvas.loadPage(page);
        this.propertiesPanel.hideProperties();
        this.renderPageTabs();
        this.updateUI();
    }

    addPage() {
        const currentGrid = this.getCurrentPage().grid;
        this.layout.pages.push({
            id: `page_${Date.now()}`, name: `Page ${this.layout.pages.length + 1}`,
            grid: { ...currentGrid }, tiles: []
        });
        this.switchToPage(this.layout.pages.length - 1);
        this.markModified();
    }

    async deletePage(index) {
        if (this.layout.pages.length <= 1) return;
        const page = this.layout.pages[index];
        const result = await ipcRenderer.invoke('show-message', {
            type: 'warning', buttons: ['Delete', 'Cancel'], title: 'Delete Page',
            message: `Delete "${page.name}"?`
        });
        if (result.response !== 0) return;
        this.layout.pages.splice(index, 1);
        if (this.currentPageIndex >= this.layout.pages.length) this.currentPageIndex = this.layout.pages.length - 1;
        this.switchToPage(this.currentPageIndex);
        this.markModified();
    }

    startRenameTab(tabElement, pageIndex) {
        const label = tabElement.querySelector('.page-tab-label');
        const page = this.layout.pages[pageIndex];
        const input = document.createElement('input');
        input.type = 'text'; input.className = 'page-tab-rename-input'; input.value = page.name;
        input.style.cssText = 'width:80px;font-size:11px;padding:1px 4px;border:1px solid #00ff88;background:#1a1a2e;color:#fff;border-radius:3px;outline:none';
        label.replaceWith(input);
        input.focus(); input.select();

        const finishRename = () => { page.name = input.value.trim() || `Page ${pageIndex + 1}`; this.renderPageTabs(); this.markModified(); };
        input.addEventListener('blur', finishRename);
        input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); else if (e.key === 'Escape') { input.value = page.name; input.blur(); } });
    }

    setGridSize(cols, rows) {
        const page = this.getCurrentPage();
        page.grid.cols = cols; page.grid.rows = rows;
        document.getElementById('grid-cols').value = cols; document.getElementById('grid-rows').value = rows;
        this.gridCanvas.updateGridSize(cols, rows);
        this.markModified();
    }

    // ==========================================
    // TOOLBAR & UI
    // ==========================================

    setupToolbar() {
        document.getElementById('btn-new').addEventListener('click', () => this.newLayout());
        document.getElementById('btn-open').addEventListener('click', () => this.openLayout());
        document.getElementById('btn-undo').addEventListener('click', () => this.undo());
        document.getElementById('btn-redo').addEventListener('click', () => this.redo());
        document.getElementById('btn-export').addEventListener('click', () => this.exportToPi());
        document.getElementById('btn-open-settings').addEventListener('click', () => this.settingsPanel.show());
        document.getElementById('btn-live-preview').addEventListener('click', () => {
            const enabled = this.livePreview.toggle();
            this.updateLivePreviewUI(enabled);
        });
    }

    updateLivePreviewUI(enabled) {
        const btn = document.getElementById('btn-live-preview');
        const status = document.getElementById('preview-status');
        if (enabled) {
            btn.innerHTML = '<span>🔴</span> Live Preview'; btn.style.background = 'rgba(0, 255, 136, 0.1)'; btn.style.borderColor = '#00ff88';
            if (status) status.style.display = 'inline';
        } else {
            btn.innerHTML = '<span>🔴</span> Live Preview'; btn.style.background = ''; btn.style.borderColor = '';
            if (status) status.style.display = 'none';
        }
    }

    setupMenuHandlers() {
        ipcRenderer.on('menu-new', () => this.newLayout());
        ipcRenderer.on('menu-save', () => this.saveLayoutAs());
        ipcRenderer.on('menu-export', () => this.exportToPi());
        ipcRenderer.on('menu-undo', () => this.undo());
        ipcRenderer.on('menu-redo', () => this.redo());
        ipcRenderer.on('menu-delete', () => this.gridCanvas.deleteSelected());
        ipcRenderer.on('menu-clear', () => { this.getCurrentPage().tiles = []; this.gridCanvas.loadPage(this.getCurrentPage()); this.markModified(); });
        ipcRenderer.on('menu-toggle-grid', () => { const cb = document.getElementById('toggle-grid'); if (cb) { cb.checked = !cb.checked; this.gridCanvas.toggleGridLines(cb.checked); } });
        ipcRenderer.on('menu-grid-size', (e, size) => this.setGridSize(size.cols, size.rows));
    }

    async setupGridControls() {
        const colsSelect = document.getElementById('grid-cols');
        const rowsSelect = document.getElementById('grid-rows');
        const toggleGrid = document.getElementById('toggle-grid');

        if (colsSelect) colsSelect.addEventListener('change', () => this.setGridSize(parseInt(colsSelect.value), this.getCurrentPage().grid.rows));
        if (rowsSelect) rowsSelect.addEventListener('change', () => this.setGridSize(this.getCurrentPage().grid.cols, parseInt(rowsSelect.value)));
        if (toggleGrid) toggleGrid.addEventListener('change', () => this.gridCanvas.toggleGridLines(toggleGrid.checked));

        await this.themeManager.populateDropdown('theme-selector');
        const themeSelector = document.getElementById('theme-selector');
        if (themeSelector) {
            themeSelector.addEventListener('change', async () => {
                this.themeManager.setTheme(themeSelector.value);
                this.layout.theme = themeSelector.value;
                this.markModified();
            });
        }

        const btnNew = document.getElementById('btn-theme-new');
        if (btnNew) btnNew.addEventListener('click', () => this.themeBuilder.open());
        const btnEdit = document.getElementById('btn-theme-edit');
        if (btnEdit) btnEdit.addEventListener('click', () => this.themeBuilder.open(themeSelector ? themeSelector.value : null));
        const btnImport = document.getElementById('btn-theme-import');
        if (btnImport) btnImport.addEventListener('click', () => this.themeBuilder.importTheme());
    }

    async newLayout() {
        if (this.modified) {
            const result = await ipcRenderer.invoke('show-message', {
                type: 'question', buttons: ['Save', "Don't Save", 'Cancel'], title: 'Unsaved Changes',
                message: 'Save changes to the current layout?'
            });
            if (result.response === 0) await this.saveLayoutAs();
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
            const filepath = result.filePaths[0];
            const res = await ipcRenderer.invoke('read-file', filepath);
            if (res.success) {
                try {
                    this.layout = this.configLoader.load(res.data);
                    this.currentFile = filepath;
                    this.modified = false;
                    this.currentPageIndex = 0;
                    this.gridCanvas.loadPage(this.getCurrentPage());
                    this.renderPageTabs();
                    this.updateUI();
                    this.setStatus(`Loaded: ${filepath}`);
                } catch (err) { await ipcRenderer.invoke('show-error', 'Error', `Invalid file: ${err.message}`); }
            }
        }
    }

    undo() { this.undoManager.undo(); }
    redo() { this.undoManager.redo(); }
    markModified() { this.modified = true; this.updateUI(); }

    updateUI() {
        const filename = this.currentFile ? require('path').basename(this.currentFile) : 'Untitled Layout';
        const fileEl = document.getElementById('status-file');
        if (fileEl) fileEl.textContent = filename + (this.modified ? ' •' : '');

        const page = this.getCurrentPage();
        const totalTiles = this.layout.pages.reduce((sum, p) => sum + p.tiles.length, 0);
        const countEl = document.getElementById('tile-count');
        if (countEl) countEl.textContent = this.layout.pages.length > 1 ? `${page.tiles.length} tiles (${totalTiles} total)` : `${page.tiles.length} tiles`;

        const width = page.grid.cols * (page.grid.cell_width || 180);
        const height = page.grid.rows * (page.grid.cell_height || 120);
        const dimEl = document.getElementById('canvas-dimensions');
        if (dimEl) dimEl.textContent = `${width} × ${height} px`;

        const btnUndo = document.getElementById('btn-undo');
        if (btnUndo) btnUndo.disabled = !this.undoManager.canUndo();
        const btnRedo = document.getElementById('btn-redo');
        if (btnRedo) btnRedo.disabled = !this.undoManager.canRedo();
    }

    setStatus(message) {
        const msgEl = document.getElementById('status-message');
        if (msgEl) {
            msgEl.textContent = message;
            setTimeout(() => { msgEl.textContent = 'Ready'; }, 3000);
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.app = new StatDeckApp());
} else { window.app = new StatDeckApp(); }

// ==========================================
// TUNING UPGRADES (Final Bridge)
// ==========================================
document.addEventListener('statdeck-update-tuning', async (e) => {
    const tuningData = e.detail;
    const payload = {
        type: 'update_tuning',
        stats_rate_ms: tuningData.stats_rate_ms,
        debounce_ms: tuningData.debounce_ms
    };

    console.log("Pushing tuning to main.py via Electron Bridge...");

    // This calls the handler we just added to main.js
    const success = await ipcRenderer.invoke('send-to-local-service', payload);

    if (success) {
        window.app.setStatus("⚡ Tuning Applied & Saved!");
        console.log("Tuning success!");
    } else {
        window.app.setStatus("❌ Failed to reach Service (Check main.py)");
    }
});