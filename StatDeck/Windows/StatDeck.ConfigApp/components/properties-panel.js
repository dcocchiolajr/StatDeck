/**
 * Properties Panel Component
 * WITH: Style selectors, Z-Index, Label Color, Theme-aware defaults
 * VERSION: v3.1 Unified Theme System
 */

class PropertiesPanel {
    constructor(app) {
        this.app = app;
        this.currentTile = null;
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        
        // Listen for theme changes to update color defaults
        document.addEventListener('themeChanged', () => {
            this.refreshColorInputs();
        });
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
        
        // Value Color picker
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
        
        // Label Color picker
        const labelColorInput = document.getElementById('prop-label-color');
        const labelColorHex = document.getElementById('prop-label-color-hex');
        
        if (labelColorInput && labelColorHex) {
            labelColorInput.addEventListener('input', (e) => {
                labelColorHex.value = e.target.value;
                this.updateStyle({ labelColor: e.target.value });
            });
            
            labelColorHex.addEventListener('change', (e) => {
                if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                    labelColorInput.value = e.target.value;
                    this.updateStyle({ labelColor: e.target.value });
                }
            });
        }
        
        // Background picker
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
        
        // Font Scale
        const fontScaleInput = document.getElementById('prop-font-scale');
        const fontScaleValue = document.getElementById('font-scale-value');
        
        fontScaleInput.addEventListener('input', (e) => {
            const scale = parseInt(e.target.value);
            fontScaleValue.textContent = `${scale}%`;
            this.updateStyle({ fontScale: scale });
        });
        
        // Reset to Theme Colors button (try both possible IDs)
        const resetBtn = document.getElementById('btn-reset-theme') || document.getElementById('btn-reset-colors');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetToThemeColors());
        }
        
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
    
    // ===== THEME COLOR METHODS =====
    
    /**
     * Get the current theme's default colors for tiles.
     * Uses valueColor (what the Pi actually displays for data values),
     * textSecondary (for labels), and surface (for backgrounds).
     */
    getThemeColors() {
        const theme = this.app.themeManager.getCurrentTheme();
        if (!theme) return { color: '#00ff88', labelColor: '#a0aec0', background: '#1a1a2e' };
        return {
            color: theme.colors.valueColor || theme.colors.primary,
            labelColor: theme.colors.textSecondary,
            background: theme.colors.surface
        };
    }
    
    /**
     * Refresh all color picker inputs to show current values.
     * Shows theme defaults for tiles with no custom color set.
     * Also called on theme change to update displayed defaults.
     */
    refreshColorInputs() {
        if (!this.currentTile) return;
        const themeColors = this.getThemeColors();
        
        // Use tile's custom color if set, otherwise theme default
        const tileColor = this.currentTile.style?.color;
        const tileBg = this.currentTile.style?.background;
        const tileLabelColor = this.currentTile.style?.labelColor;
        
        const color = (tileColor && tileColor !== '') ? tileColor : themeColors.color;
        const bg = (tileBg && tileBg !== '') ? tileBg : themeColors.background;
        const labelColor = (tileLabelColor && tileLabelColor !== '') ? tileLabelColor : themeColors.labelColor;
        
        const ci = document.getElementById('prop-color');
        const ch = document.getElementById('prop-color-hex');
        if (ci) ci.value = color;
        if (ch) ch.value = color;
        
        const li = document.getElementById('prop-label-color');
        const lh = document.getElementById('prop-label-color-hex');
        if (li) li.value = labelColor;
        if (lh) lh.value = labelColor;
        
        const bi = document.getElementById('prop-background');
        const bh = document.getElementById('prop-background-hex');
        if (bi) bi.value = bg;
        if (bh) bh.value = bg;
    }
    
    /**
     * Reset tile colors to theme defaults.
     * Clears custom color, labelColor, and background so tile uses theme values.
     */
    resetToThemeColors() {
        if (!this.currentTile) return;
        
        this.currentTile.style.color = '';
        this.currentTile.style.background = '';
        this.currentTile.style.labelColor = '';
        
        this.refreshColorInputs();
        this.app.gridCanvas.updateTileElement(this.currentTile.id);
        this.app.markModified();
    }
    
    // ===== SHOW/HIDE =====
    
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
        
        // Hide data source and font slider for page nav tiles AND buttons
        const isPageNav = tileConfig.type === 'page_prev' || tileConfig.type === 'page_next' || tileConfig.type === 'button';
        const dsSection = document.getElementById('prop-data-source').closest('.property-section');
        if (dsSection) dsSection.style.display = isPageNav ? 'none' : '';
        const fontGroup = document.getElementById('prop-font-scale');
        if (fontGroup) {
            const fontSection = fontGroup.closest('.property-group');
            if (fontSection) fontSection.style.display = isPageNav ? 'none' : '';
        }
        
        // Colors — use theme defaults when tile has no custom color
        const themeColors = this.getThemeColors();
        
        const tileColor = tileConfig.style.color;
        const tileBg = tileConfig.style.background;
        const tileLabelColor = tileConfig.style.labelColor;
        
        const color = (tileColor && tileColor !== '') ? tileColor : themeColors.color;
        const bg = (tileBg && tileBg !== '') ? tileBg : themeColors.background;
        const labelColor = (tileLabelColor && tileLabelColor !== '') ? tileLabelColor : themeColors.labelColor;
        
        document.getElementById('prop-color').value = color;
        document.getElementById('prop-color-hex').value = color;
        document.getElementById('prop-background').value = bg;
        document.getElementById('prop-background-hex').value = bg;
        
        const lcInput = document.getElementById('prop-label-color');
        const lcHex = document.getElementById('prop-label-color-hex');
        if (lcInput) lcInput.value = labelColor;
        if (lcHex) lcHex.value = labelColor;
        
        // Font scale
        const fontScale = tileConfig.style.fontScale || 100;
        document.getElementById('prop-font-scale').value = fontScale;
        document.getElementById('font-scale-value').textContent = `${fontScale}%`;
        
        // Update action previews
        this.updateActionPreview('tap', tileConfig.actions?.tap);
        this.updateActionPreview('longpress', tileConfig.actions?.long_press);
        
        // Load tile-specific configuration (STYLE SELECTORS)
        this.loadTileConfig(tileConfig);
    }
    
    hideProperties() {
        this.currentTile = null;
        document.getElementById('no-selection').style.display = 'block';
        document.getElementById('tile-properties').style.display = 'none';
    }
    
    // ===== TILE-SPECIFIC CONFIG SELECTORS =====
    
    loadTileConfig(tileConfig) {
        const container = document.getElementById('tile-config-container');
        container.innerHTML = '';

        if (tileConfig.type === 'cpu_graph') {
            this.addGraphStyleSelector(container, tileConfig);
        } else if (tileConfig.type === 'network_graph') {
            this.addNetworkStyleSelector(container, tileConfig);
        } else if (tileConfig.type === 'gauge') {
            this.addGaugeStyleSelector(container, tileConfig);
        } else if (tileConfig.type === 'text_display') {
            this.addDisplayStyleSelector(container, tileConfig);
        } else if (tileConfig.type === 'button') {
            // WE ADDED THIS LINE:
            this.addButtonConfigSelector(container, tileConfig);
        } else if (tileConfig.type === 'page_prev' || tileConfig.type === 'page_next') {
            this.addNavStyleSelector(container, tileConfig);
            this.addButtonConfigSelector(container, tileConfig);
        }
    }
    
    addGraphStyleSelector(container, config) {
        const currentStyle = config.style?.graphStyle || 'bar';
        
        container.innerHTML = `
            <div class="property-group">
                <label>Graph Style</label>
                <select id="graph-style-select" class="toolbar-select">
                    <option value="bar" ${currentStyle === 'bar' ? 'selected' : ''}>📊 Bar Chart</option>
                    <option value="line" ${currentStyle === 'line' ? 'selected' : ''}>📈 Line Graph</option>
                    <option value="area" ${currentStyle === 'area' ? 'selected' : ''}>📉 Area Chart</option>
                </select>
            </div>
        `;
        
        document.getElementById('graph-style-select').addEventListener('change', (e) => {
            this.updateStyle({ graphStyle: e.target.value });
        });
    }
    
    addNetworkStyleSelector(container, config) {
        const currentStyle = config.style?.networkStyle || 'bar';
        const upColor = config.style?.upload_color || '#ff6b6b';
        const downColor = config.style?.download_color || '#4ecdc4';
        
        container.innerHTML = `
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
                    <input type="color" id="network-up-color" value="${upColor}">
                </div>
            </div>
            <div class="property-group">
                <label>Download Color</label>
                <div class="color-picker-wrapper">
                    <input type="color" id="network-down-color" value="${downColor}">
                </div>
            </div>
        `;
        
        document.getElementById('network-style-select').addEventListener('change', (e) => {
            this.updateStyle({ networkStyle: e.target.value });
        });
        document.getElementById('network-up-color').addEventListener('input', (e) => {
            this.updateStyle({ upload_color: e.target.value });
        });
        document.getElementById('network-down-color').addEventListener('input', (e) => {
            this.updateStyle({ download_color: e.target.value });
        });
    }
    
    addGaugeStyleSelector(container, config) {
        const currentStyle = config.style?.gaugeStyle || 'circle';
        
        container.innerHTML = `
            <div class="property-group">
                <label>Gauge Style</label>
                <select id="gauge-style-select" class="toolbar-select">
                    <option value="circle" ${currentStyle === 'circle' ? 'selected' : ''}>⭕ Circular</option>
                    <option value="semi" ${currentStyle === 'semi' ? 'selected' : ''}>🌓 Semi-Circle</option>
                    <option value="linear" ${currentStyle === 'linear' ? 'selected' : ''}>📊 Linear Bar</option>
                </select>
            </div>
        `;
        
        document.getElementById('gauge-style-select').addEventListener('change', (e) => {
            this.updateStyle({ gaugeStyle: e.target.value });
        });
    }
    
    addDisplayStyleSelector(container, config) {
        const currentStyle = config.style?.displayStyle || 'number';
        
        container.innerHTML = `
            <div class="property-group">
                <label>Display Style</label>
                <select id="display-style-select" class="toolbar-select">
                    <option value="number" ${currentStyle === 'number' ? 'selected' : ''}>🔢 Big Number</option>
                    <option value="icon" ${currentStyle === 'icon' ? 'selected' : ''}>🖼️ Icon + Value</option>
                    <option value="multi" ${currentStyle === 'multi' ? 'selected' : ''}>📋 Multi-Line</option>
                    <option value="sparkline" ${currentStyle === 'sparkline' ? 'selected' : ''}>📈 Sparkline</option>
                </select>
            </div>
        `;
        
        document.getElementById('display-style-select').addEventListener('change', (e) => {
            this.updateStyle({ displayStyle: e.target.value });
        });
    }
    
    addButtonConfigSelector(container, config) {
        const buttonConfig = config.config || {};
        const icon = buttonConfig.icon || '⚡';
        const label = buttonConfig.label || 'Button';
        
        container.innerHTML = `
            <div class="property-group">
                <label>Button Icon</label>
                <input type="text" id="button-icon-input" value="${icon}" maxlength="4">
            </div>
            <div class="property-group">
                <label>Button Label</label>
                <input type="text" id="button-label-input" value="${label}">
            </div>
            <div class="property-group">
                <label>Custom Icon File</label>
                <button id="btn-select-icon" class="btn-secondary">Select Image...</button>
                <div id="icon-file-preview" style="font-size:10px;color:#666;margin-top:2px">
                    ${buttonConfig.iconPath ? buttonConfig.iconPath : 'No custom icon'}
                </div>
            </div>
        `;
        
        document.getElementById('button-icon-input').addEventListener('change', (e) => {
            this.updateButtonConfig({ icon: e.target.value });
        });
        
        document.getElementById('button-label-input').addEventListener('change', (e) => {
            this.updateButtonConfig({ label: e.target.value });
        });
        
        const selectIconBtn = document.getElementById('btn-select-icon');
        if (selectIconBtn) {
            selectIconBtn.addEventListener('click', async () => {
                const { ipcRenderer } = require('electron');
                const result = await ipcRenderer.invoke('open-file-dialog', {
                    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'svg', 'ico'] }]
                });
                if (result && result.filePath) {
                    this.updateButtonConfig({ iconPath: result.filePath });
                    document.getElementById('icon-file-preview').textContent = result.filePath;
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
    
    updatePosition(axis, value) {
        if (!this.currentTile) return;
        this.currentTile.position[axis] = value;
        this.app.gridCanvas.updateTileElement(this.currentTile.id);
        this.app.markModified();
    }
    
    updateSize(dim, value) {
        if (!this.currentTile) return;
        this.currentTile.size[dim] = value;
        this.app.gridCanvas.updateTileElement(this.currentTile.id);
        this.app.markModified();
    }
    
    updateSizeInputs(width, height) {
        document.getElementById('prop-width').value = width;
        document.getElementById('prop-height').value = height;
    }
    
    updateZIndex(value) {
        if (!this.currentTile) return;
        if (!this.currentTile.style.zIndex) {
            this.currentTile.style.zIndex = 0;
        }
        this.currentTile.style.zIndex = value;
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
        
        if (updates.fontScale !== undefined) {
            const tileElement = document.querySelector(`[data-tile-id="${this.currentTile.id}"]`);
            if (tileElement) {
                const preview = tileElement.querySelector('.tile-live-preview');
                if (preview) {
                    preview.style.fontSize = `${updates.fontScale}%`;
                }
            }
        }
        
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
                text = action.target ? `Launch: ${action.target}` : 'Launch App';
                break;
            case 'hotkey':
                text = action.keys ? `Hotkey: ${action.keys}` : 'Hotkey';
                break;
            case 'run_script':
                text = action.script ? `Script: ${action.script}` : 'Run Script';
                break;
            case 'open_url':
                text = action.url ? `URL: ${action.url}` : 'Open URL';
                break;
            default:
                text = action.type;
                break;
        }
        
        preview.textContent = text;
        preview.className = 'action-preview action-set';
    }


    addNavStyleSelector(container, config) {
        const currentStyle = config.style?.navStyle || 'arrow';
        const label = config.config?.label || '';
        
        const html = `
            <div class="property-group">
                <label>Nav Style</label>
                <select id="nav-style-select" class="toolbar-select">
                    <option value="arrow" ${currentStyle === 'arrow' ? 'selected' : ''}>➡️ Arrow</option>
                    <option value="text" ${currentStyle === 'text' ? 'selected' : ''}>📝 Text</option>
                    <option value="icon" ${currentStyle === 'icon' ? 'selected' : ''}>🎯 Icon</option>
                    <option value="minimal" ${currentStyle === 'minimal' ? 'selected' : ''}>· Minimal</option>
                </select>
            </div>
            <div class="property-group">
                <label>Label (optional)</label>
                <input type="text" id="nav-label-input" value="${label}" placeholder="e.g. Back, Next, Page 2">
            </div>
        `;
        
        container.innerHTML = html;
        
        document.getElementById('nav-style-select').addEventListener('change', (e) => {
            this.updateStyle({ navStyle: e.target.value });
        });
        document.getElementById('nav-label-input').addEventListener('change', (e) => {
            this.updateButtonConfig({ label: e.target.value });
        });
    }
}
