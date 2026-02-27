/**
 * Properties Panel Component - FIXED
 * WITH: Style selectors + Z-Index support (with safety checks)
 */

class PropertiesPanel {
    constructor(app) {
        this.app = app;
        this.currentTile = null;
        this.init();
    }
    
    init() {
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Position & Size
        document.getElementById('prop-x').addEventListener('change', (e) => this.updatePosition('x', parseInt(e.target.value)));
        document.getElementById('prop-y').addEventListener('change', (e) => this.updatePosition('y', parseInt(e.target.value)));
        document.getElementById('prop-width').addEventListener('change', (e) => this.updateSize('w', parseInt(e.target.value)));
        document.getElementById('prop-height').addEventListener('change', (e) => this.updateSize('h', parseInt(e.target.value)));
        
        // Z-Index (Layer Order) - ONLY if element exists
        const zIndexInput = document.getElementById('prop-zindex');
        if (zIndexInput) {
            zIndexInput.addEventListener('change', (e) => this.updateZIndex(parseInt(e.target.value)));
        }
        
        // Data Source
        document.getElementById('prop-data-source').addEventListener('change', (e) => {
            this.updateConfig({ data_source: e.target.value });
        });
        
        // Colors
        const colorInput = document.getElementById('prop-color');
        const colorHex = document.getElementById('prop-color-hex');
        
        colorInput.addEventListener('input', (e) => {
            colorHex.value = e.target.value;
            this.updateStyle({ color: e.target.value });
        });
        
        colorHex.addEventListener('change', (e) => {
            colorInput.value = e.target.value;
            this.updateStyle({ color: e.target.value });
        });
        
        const bgInput = document.getElementById('prop-background');
        const bgHex = document.getElementById('prop-background-hex');
        
        bgInput.addEventListener('input', (e) => {
            bgHex.value = e.target.value;
            this.updateStyle({ background: e.target.value });
        });
        
        bgHex.addEventListener('change', (e) => {
            bgInput.value = e.target.value;
            this.updateStyle({ background: e.target.value });
        });
        
        // Actions
        document.getElementById('btn-edit-tap').addEventListener('click', () => {
            this.app.actionEditor.open(this.currentTile, 'tap');
        });
        
        document.getElementById('btn-edit-longpress').addEventListener('click', () => {
            this.app.actionEditor.open(this.currentTile, 'long_press');
        });
        
        // Delete
        document.getElementById('btn-delete-tile').addEventListener('click', () => {
            if (this.currentTile) {
                this.app.gridCanvas.deleteTile(this.currentTile.id);
            }
        });
    }
    
    showTileProperties(tileConfig) {
        this.currentTile = tileConfig;
        
        document.getElementById('no-selection').style.display = 'none';
        document.getElementById('tile-properties').style.display = 'block';
        
        // Populate fields
        document.getElementById('prop-type').value = tileConfig.type;
        document.getElementById('prop-id').value = tileConfig.id;
        
        document.getElementById('prop-x').value = tileConfig.position.x;
        document.getElementById('prop-y').value = tileConfig.position.y;
        document.getElementById('prop-width').value = tileConfig.size.w;
        document.getElementById('prop-height').value = tileConfig.size.h;
        
        // Z-Index (ONLY if element exists in HTML)
        const zIndexInput = document.getElementById('prop-zindex');
        if (zIndexInput) {
            zIndexInput.value = tileConfig.style.zIndex || 0;
        }
        
        // Set max values based on grid
        document.getElementById('prop-x').max = this.app.layout.grid.cols - 1;
        document.getElementById('prop-y').max = this.app.layout.grid.rows - 1;
        document.getElementById('prop-width').max = this.app.layout.grid.cols - tileConfig.position.x;
        document.getElementById('prop-height').max = this.app.layout.grid.rows - tileConfig.position.y;
        
        document.getElementById('prop-data-source').value = tileConfig.data_source || '';
        
        const color = tileConfig.style.color || '#00ff88';
        const bg = tileConfig.style.background || '#1a1a2e';
        
        document.getElementById('prop-color').value = color;
        document.getElementById('prop-color-hex').value = color;
        document.getElementById('prop-background').value = bg;
        document.getElementById('prop-background-hex').value = bg;
        
        // Update action previews
        this.updateActionPreview('tap', tileConfig.actions?.tap);
        this.updateActionPreview('longpress', tileConfig.actions?.long_press);
        
        // Load tile-specific configuration (STYLE SELECTORS)
        this.loadTileConfig(tileConfig);
    }
    
    loadTileConfig(tileConfig) {
        const container = document.getElementById('tile-config-container');
        container.innerHTML = '';
        
        // Add style selector based on tile type
        if (tileConfig.type === 'cpu_graph') {
            this.addGraphStyleSelector(container, tileConfig);
        } else if (tileConfig.type === 'network_graph') {
            this.addNetworkStyleSelector(container, tileConfig);
        } else if (tileConfig.type === 'gauge') {
            this.addGaugeStyleSelector(container, tileConfig);
        } else if (tileConfig.type === 'text_display') {
            this.addDisplayStyleSelector(container, tileConfig);
        } else if (tileConfig.type === 'button') {
            this.addButtonConfigSelector(container, tileConfig);
        }
    }
    
    // ===== STYLE SELECTORS =====
    
    addGraphStyleSelector(container, config) {
        const currentStyle = config.style?.graphStyle || 'bar';
        
        const html = `
            <div class="property-group">
                <label>Graph Style</label>
                <select id="graph-style-select" class="toolbar-select">
                    <option value="bar" ${currentStyle === 'bar' ? 'selected' : ''}>📊 Bar Chart</option>
                    <option value="line" ${currentStyle === 'line' ? 'selected' : ''}>📈 Line Graph</option>
                    <option value="area" ${currentStyle === 'area' ? 'selected' : ''}>📉 Area Chart</option>
                </select>
            </div>
        `;
        
        container.innerHTML = html;
        
        document.getElementById('graph-style-select').addEventListener('change', (e) => {
            this.updateStyle({ graphStyle: e.target.value });
        });
    }
    
    addNetworkStyleSelector(container, config) {
        const currentStyle = config.style?.networkStyle || 'bar';
        const upColor = config.style?.upload_color || '#ff6b6b';
        const downColor = config.style?.download_color || '#4ecdc4';
        
        const html = `
            <div class="property-group">
                <label>Network Style</label>
                <select id="network-style-select" class="toolbar-select">
                    <option value="bar" ${currentStyle === 'bar' ? 'selected' : ''}>📊 Dual Bar</option>
                    <option value="dual_line" ${currentStyle === 'dual_line' ? 'selected' : ''}>📈 Dual Line</option>
                </select>
            </div>
            <div class="property-group">
                <label>Upload Color</label>
                <div class="color-picker-wrapper">
                    <input type="color" id="upload-color" value="${upColor}">
                    <input type="text" id="upload-color-hex" value="${upColor}">
                </div>
            </div>
            <div class="property-group">
                <label>Download Color</label>
                <div class="color-picker-wrapper">
                    <input type="color" id="download-color" value="${downColor}">
                    <input type="text" id="download-color-hex" value="${downColor}">
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        
        document.getElementById('network-style-select').addEventListener('change', (e) => {
            this.updateStyle({ networkStyle: e.target.value });
        });
        
        // Upload color
        const uploadInput = document.getElementById('upload-color');
        const uploadHex = document.getElementById('upload-color-hex');
        
        uploadInput.addEventListener('input', (e) => {
            uploadHex.value = e.target.value;
            this.updateStyle({ upload_color: e.target.value });
        });
        
        uploadHex.addEventListener('change', (e) => {
            uploadInput.value = e.target.value;
            this.updateStyle({ upload_color: e.target.value });
        });
        
        // Download color
        const downloadInput = document.getElementById('download-color');
        const downloadHex = document.getElementById('download-color-hex');
        
        downloadInput.addEventListener('input', (e) => {
            downloadHex.value = e.target.value;
            this.updateStyle({ download_color: e.target.value });
        });
        
        downloadHex.addEventListener('change', (e) => {
            downloadInput.value = e.target.value;
            this.updateStyle({ download_color: e.target.value });
        });
    }
    
    addGaugeStyleSelector(container, config) {
        const currentStyle = config.style?.gaugeStyle || 'circle';
        
        const html = `
            <div class="property-group">
                <label>Gauge Style</label>
                <select id="gauge-style-select" class="toolbar-select">
                    <option value="circle" ${currentStyle === 'circle' ? 'selected' : ''}>⭕ Circular</option>
                    <option value="semi" ${currentStyle === 'semi' ? 'selected' : ''}>🌙 Semi-Circle</option>
                    <option value="linear" ${currentStyle === 'linear' ? 'selected' : ''}>▬ Linear Bar</option>
                </select>
            </div>
        `;
        
        container.innerHTML = html;
        
        document.getElementById('gauge-style-select').addEventListener('change', (e) => {
            this.updateStyle({ gaugeStyle: e.target.value });
        });
    }
    
    addDisplayStyleSelector(container, config) {
        const currentStyle = config.style?.displayStyle || 'number';
        
        const html = `
            <div class="property-group">
                <label>Display Style</label>
                <select id="display-style-select" class="toolbar-select">
                    <option value="number" ${currentStyle === 'number' ? 'selected' : ''}>💯 Big Number</option>
                    <option value="sparkline" ${currentStyle === 'sparkline' ? 'selected' : ''}>⚡ Sparkline</option>
                    <option value="icon" ${currentStyle === 'icon' ? 'selected' : ''}>🎯 Icon + Value</option>
                    <option value="multi" ${currentStyle === 'multi' ? 'selected' : ''}>📊 Multi-Value</option>
                </select>
            </div>
        `;
        
        container.innerHTML = html;
        
        document.getElementById('display-style-select').addEventListener('change', (e) => {
            this.updateStyle({ displayStyle: e.target.value });
        });
    }
    
    addButtonConfigSelector(container, config) {
        const buttonConfig = config.config || {};
        const iconType = buttonConfig.icon_type || 'emoji';
        const icon = buttonConfig.icon || 'app';
        const iconPath = buttonConfig.icon_path || '';
        const label = buttonConfig.label || '';
        const showLabel = buttonConfig.show_label !== false;
        
        const html = `
            <div class="property-group">
                <label>Button Label</label>
                <input type="text" id="button-label" value="${label}" placeholder="Button">
            </div>
            
            <div class="property-group">
                <label>
                    <input type="checkbox" id="button-show-label" ${showLabel ? 'checked' : ''}>
                    Show Label
                </label>
            </div>
            
            <div class="property-group">
                <label>Icon Type</label>
                <select id="button-icon-type" class="toolbar-select">
                    <option value="emoji" ${iconType === 'emoji' ? 'selected' : ''}>📱 Emoji</option>
                    <option value="file" ${iconType === 'file' ? 'selected' : ''}>🖼️ Custom Image</option>
                </select>
            </div>
            
            <div class="property-group" id="emoji-selector" style="display: ${iconType === 'emoji' ? 'block' : 'none'}">
                <label>Emoji Icon</label>
                <select id="button-emoji-icon" class="toolbar-select">
                    <option value="app" ${icon === 'app' ? 'selected' : ''}>📱 App</option>
                    <option value="settings" ${icon === 'settings' ? 'selected' : ''}>⚙️ Settings</option>
                    <option value="folder" ${icon === 'folder' ? 'selected' : ''}>📁 Folder</option>
                    <option value="browser" ${icon === 'browser' ? 'selected' : ''}>🌐 Browser</option>
                    <option value="terminal" ${icon === 'terminal' ? 'selected' : ''}>💻 Terminal</option>
                    <option value="game" ${icon === 'game' ? 'selected' : ''}>🎮 Game</option>
                    <option value="code" ${icon === 'code' ? 'selected' : ''}>💻 Code</option>
                    <option value="music" ${icon === 'music' ? 'selected' : ''}>🎵 Music</option>
                    <option value="video" ${icon === 'video' ? 'selected' : ''}>🎬 Video</option>
                    <option value="photo" ${icon === 'photo' ? 'selected' : ''}>📷 Photo</option>
                    <option value="play" ${icon === 'play' ? 'selected' : ''}>▶️ Play</option>
                    <option value="stop" ${icon === 'stop' ? 'selected' : ''}>⏹️ Stop</option>
                    <option value="refresh" ${icon === 'refresh' ? 'selected' : ''}>🔄 Refresh</option>
                </select>
            </div>
            
            <div class="property-group" id="file-selector" style="display: ${iconType === 'file' ? 'block' : 'none'}">
                <label>Icon File Path</label>
                <input type="text" id="button-icon-path" value="${iconPath}" placeholder="C:\\path\\to\\icon.ico">
                <button id="btn-browse-icon" style="margin-top: 5px; padding: 5px 10px; font-size: 11px;">📁 Browse...</button>
                <div style="font-size: 10px; color: #666; margin-top: 4px;">
                    Supports: .ico, .png, or .exe files
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        
        // Event listeners
        document.getElementById('button-label').addEventListener('input', (e) => {
            this.updateButtonConfig({ label: e.target.value });
        });
        
        document.getElementById('button-show-label').addEventListener('change', (e) => {
            this.updateButtonConfig({ show_label: e.target.checked });
        });
        
        document.getElementById('button-icon-type').addEventListener('change', (e) => {
            const type = e.target.value;
            document.getElementById('emoji-selector').style.display = type === 'emoji' ? 'block' : 'none';
            document.getElementById('file-selector').style.display = type === 'file' ? 'block' : 'none';
            this.updateButtonConfig({ icon_type: type });
        });
        
        document.getElementById('button-emoji-icon').addEventListener('change', (e) => {
            this.updateButtonConfig({ icon: e.target.value });
        });
        
        document.getElementById('button-icon-path').addEventListener('input', (e) => {
            this.updateButtonConfig({ icon_path: e.target.value });
        });
        
        document.getElementById('btn-browse-icon').addEventListener('click', () => {
            this.browseForIcon();
        });
    }
    
    browseForIcon() {
        // Use Electron dialog to browse for icon file
        if (typeof require !== 'undefined') {
            const { dialog } = require('electron').remote || require('@electron/remote');
            
            dialog.showOpenDialog({
                title: 'Select Icon File',
                filters: [
                    { name: 'Icon Files', extensions: ['ico', 'png'] },
                    { name: 'Executable Files', extensions: ['exe'] },
                    { name: 'All Files', extensions: ['*'] }
                ],
                properties: ['openFile']
            }).then(result => {
                if (!result.canceled && result.filePaths.length > 0) {
                    const filePath = result.filePaths[0];
                    document.getElementById('button-icon-path').value = filePath;
                    this.updateButtonConfig({ icon_path: filePath });
                }
            });
        }
    }
    
    updateButtonConfig(updates) {
        if (!this.currentTile) return;
        
        if (!this.currentTile.config) {
            this.currentTile.config = {};
        }
        
        Object.assign(this.currentTile.config, updates);
        this.app.gridCanvas.updateTileElement(this.currentTile);
        this.app.markModified();
    }
    
    // ===== UPDATE METHODS =====
    
    hideProperties() {
        this.currentTile = null;
        document.getElementById('no-selection').style.display = 'block';
        document.getElementById('tile-properties').style.display = 'none';
    }
    
    updatePosition(axis, value) {
        if (!this.currentTile) return;
        
        this.currentTile.position[axis] = value;
        this.app.gridCanvas.updateTileElement(this.currentTile);
        this.app.markModified();
    }
    
    updateSize(dim, value) {
        if (!this.currentTile) return;
        
        this.currentTile.size[dim] = value;
        this.app.gridCanvas.updateTileElement(this.currentTile);
        this.app.markModified();
    }
    
    updateZIndex(value) {
        if (!this.currentTile) return;
        
        // Initialize style.zIndex if it doesn't exist
        if (!this.currentTile.style.zIndex) {
            this.currentTile.style.zIndex = 0;
        }
        
        this.currentTile.style.zIndex = value;
        
        // Apply z-index to the actual element
        const tileData = this.app.gridCanvas.tiles.get(this.currentTile.id);
        if (tileData && tileData.element) {
            tileData.element.style.zIndex = value;
        }
        
        this.app.markModified();
    }
    
    updateConfig(updates) {
        if (!this.currentTile) return;
        
        Object.assign(this.currentTile, updates);
        this.app.gridCanvas.updateTileElement(this.currentTile);
        this.app.markModified();
    }
    
    updateStyle(updates) {
        if (!this.currentTile) return;
        
        Object.assign(this.currentTile.style, updates);
        this.app.gridCanvas.updateTileElement(this.currentTile);
        this.app.markModified();
    }
    
    updateActionPreview(actionType, action) {
        const previewId = actionType === 'tap' ? 'action-tap-preview' : 'action-longpress-preview';
        const preview = document.getElementById(previewId);
        
        if (!preview) return;
        
        if (!action || !action.type) {
            preview.textContent = 'None';
            preview.className = 'action-preview';
            return;
        }
        
        let text = '';
        switch (action.type) {
            case 'launch_app':
                text = `Launch: ${action.config.target}`;
                break;
            case 'hotkey':
                text = `Hotkey: ${action.config.keys}`;
                break;
            case 'run_script':
                text = `Script: ${action.config.script_path}`;
                break;
            case 'open_url':
                text = `URL: ${action.config.url}`;
                break;
        }
        
        preview.textContent = text;
        preview.className = 'action-preview action-set';
    }
}
