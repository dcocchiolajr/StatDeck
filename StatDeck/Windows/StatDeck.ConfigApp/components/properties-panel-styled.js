/**
 * Properties Panel - WITH STYLE SELECTORS
 * Allows choosing graph/gauge/display styles
 */

class PropertiesPanel {
    constructor(app) {
        this.app = app;
        this.selectedTile = null;
        this.init();
    }
    
    init() {
        // Color picker sync
        const colorInput = document.getElementById('prop-color');
        const colorHex = document.getElementById('prop-color-hex');
        const bgInput = document.getElementById('prop-background');
        const bgHex = document.getElementById('prop-background-hex');
        
        if (colorInput && colorHex) {
            colorInput.addEventListener('input', () => {
                colorHex.value = colorInput.value;
                this.updateProperty('style.color', colorInput.value);
            });
            
            colorHex.addEventListener('input', () => {
                if (/^#[0-9A-F]{6}$/i.test(colorHex.value)) {
                    colorInput.value = colorHex.value;
                    this.updateProperty('style.color', colorHex.value);
                }
            });
        }
        
        if (bgInput && bgHex) {
            bgInput.addEventListener('input', () => {
                bgHex.value = bgInput.value;
                this.updateProperty('style.background', bgInput.value);
            });
            
            bgHex.addEventListener('input', () => {
                if (/^#[0-9A-F]{6}$/i.test(bgHex.value)) {
                    bgInput.value = bgHex.value;
                    this.updateProperty('style.background', bgHex.value);
                }
            });
        }
        
        // Property change listeners
        const properties = ['prop-x', 'prop-y', 'prop-width', 'prop-height', 'prop-data-source'];
        properties.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', () => this.handlePropertyChange(id));
            }
        });
    }
    
    showTileProperties(tile) {
        this.selectedTile = tile;
        const config = tile.config;
        
        document.getElementById('no-selection').style.display = 'none';
        document.getElementById('tile-properties').style.display = 'block';
        
        // Basic info
        document.getElementById('prop-type').value = config.type;
        document.getElementById('prop-id').value = config.id;
        
        // Position & Size
        document.getElementById('prop-x').value = config.x;
        document.getElementById('prop-y').value = config.y;
        document.getElementById('prop-width').value = config.width;
        document.getElementById('prop-height').value = config.height;
        
        // Data Source
        document.getElementById('prop-data-source').value = config.data_source || '';
        
        // Colors
        const color = config.style?.color || '#00ff88';
        const bg = config.style?.background || '#1a1a2e';
        document.getElementById('prop-color').value = color;
        document.getElementById('prop-color-hex').value = color;
        document.getElementById('prop-background').value = bg;
        document.getElementById('prop-background-hex').value = bg;
        
        // Show tile-specific config
        this.showTileSpecificConfig(config);
    }
    
    showTileSpecificConfig(config) {
        const container = document.getElementById('tile-config-container');
        container.innerHTML = '';
        
        // Add style selector based on tile type
        if (config.type === 'graph' || config.type === 'cpu_graph') {
            this.addGraphStyleSelector(container, config);
        } else if (config.type === 'network_graph') {
            this.addNetworkStyleSelector(container, config);
        } else if (config.type === 'gauge') {
            this.addGaugeStyleSelector(container, config);
        } else if (config.type === 'text_display') {
            this.addDisplayStyleSelector(container, config);
        }
    }
    
    addGraphStyleSelector(container, config) {
        const currentStyle = config.style?.graphStyle || 'bar';
        
        const html = `
            <div class="property-group">
                <label>Graph Style</label>
                <select id="graph-style-select" class="toolbar-select">
                    <option value="bar" ${currentStyle === 'bar' ? 'selected' : ''}>Bar Chart</option>
                    <option value="line" ${currentStyle === 'line' ? 'selected' : ''}>Line Graph</option>
                    <option value="area" ${currentStyle === 'area' ? 'selected' : ''}>Area Chart</option>
                </select>
                <div style="font-size:11px;color:#666;margin-top:4px">
                    Bar: Vertical bars | Line: Smooth curve | Area: Filled gradient
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        
        document.getElementById('graph-style-select').addEventListener('change', (e) => {
            this.updateProperty('style.graphStyle', e.target.value);
            // Update the style property used by renderer
            if (this.selectedTile) {
                this.selectedTile.config.style = this.selectedTile.config.style || {};
                // Store as both graphStyle and style for renderer
                this.app.gridCanvas.tiles.forEach((tile, id) => {
                    if (tile === this.selectedTile) {
                        tile.config.style = e.target.value; // For renderer
                    }
                });
            }
            this.app.markModified();
        });
    }
    
    addNetworkStyleSelector(container, config) {
        const currentStyle = config.style?.networkStyle || 'bar';
        
        const html = `
            <div class="property-group">
                <label>Network Style</label>
                <select id="network-style-select" class="toolbar-select">
                    <option value="bar" ${currentStyle === 'bar' ? 'selected' : ''}>Dual Bar</option>
                    <option value="dual_line" ${currentStyle === 'dual_line' ? 'selected' : ''}>Dual Line</option>
                </select>
                <div style="font-size:11px;color:#666;margin-top:4px">
                    Dual Bar: Side-by-side bars | Dual Line: Two line graphs
                </div>
            </div>
            <div class="property-group">
                <label>Upload Color</label>
                <div class="color-picker-wrapper">
                    <input type="color" id="upload-color" value="${config.style?.upload_color || '#ff6b6b'}">
                    <input type="text" id="upload-color-hex" value="${config.style?.upload_color || '#ff6b6b'}">
                </div>
            </div>
            <div class="property-group">
                <label>Download Color</label>
                <div class="color-picker-wrapper">
                    <input type="color" id="download-color" value="${config.style?.download_color || '#4ecdc4'}">
                    <input type="text" id="download-color-hex" value="${config.style?.download_color || '#4ecdc4'}">
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        
        document.getElementById('network-style-select').addEventListener('change', (e) => {
            if (this.selectedTile) {
                this.selectedTile.config.style = e.target.value;
            }
            this.app.markModified();
        });
        
        // Color pickers
        ['upload', 'download'].forEach(type => {
            const colorInput = document.getElementById(`${type}-color`);
            const hexInput = document.getElementById(`${type}-color-hex`);
            
            colorInput.addEventListener('input', () => {
                hexInput.value = colorInput.value;
                this.updateProperty(`style.${type}_color`, colorInput.value);
            });
            
            hexInput.addEventListener('input', () => {
                if (/^#[0-9A-F]{6}$/i.test(hexInput.value)) {
                    colorInput.value = hexInput.value;
                    this.updateProperty(`style.${type}_color`, hexInput.value);
                }
            });
        });
    }
    
    addGaugeStyleSelector(container, config) {
        const currentStyle = config.style?.gaugeStyle || 'circle';
        
        const html = `
            <div class="property-group">
                <label>Gauge Style</label>
                <select id="gauge-style-select" class="toolbar-select">
                    <option value="circle" ${currentStyle === 'circle' ? 'selected' : ''}>Circular</option>
                    <option value="semi" ${currentStyle === 'semi' ? 'selected' : ''}>Semi-Circle</option>
                    <option value="linear" ${currentStyle === 'linear' ? 'selected' : ''}>Linear Bar</option>
                </select>
                <div style="font-size:11px;color:#666;margin-top:4px">
                    Circular: Full circle | Semi: Speedometer | Linear: Progress bar
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        
        document.getElementById('gauge-style-select').addEventListener('change', (e) => {
            if (this.selectedTile) {
                this.selectedTile.config.style = e.target.value;
            }
            this.app.markModified();
        });
    }
    
    addDisplayStyleSelector(container, config) {
        const currentStyle = config.style?.displayStyle || 'number';
        
        const html = `
            <div class="property-group">
                <label>Display Style</label>
                <select id="display-style-select" class="toolbar-select">
                    <option value="number" ${currentStyle === 'number' ? 'selected' : ''}>Big Number</option>
                    <option value="sparkline" ${currentStyle === 'sparkline' ? 'selected' : ''}>Sparkline</option>
                    <option value="icon" ${currentStyle === 'icon' ? 'selected' : ''}>Icon + Value</option>
                    <option value="multi" ${currentStyle === 'multi' ? 'selected' : ''}>Multi-Value</option>
                </select>
                <div style="font-size:11px;color:#666;margin-top:4px">
                    Number: Large value | Sparkline: Mini graph | Icon: Emoji + value | Multi: Related stats
                </div>
            </div>
        `;
        
        container.innerHTML = html;
        
        document.getElementById('display-style-select').addEventListener('change', (e) => {
            if (this.selectedTile) {
                this.selectedTile.config.style = e.target.value;
            }
            this.app.markModified();
        });
    }
    
    hideTileProperties() {
        this.selectedTile = null;
        document.getElementById('no-selection').style.display = 'block';
        document.getElementById('tile-properties').style.display = 'none';
    }
    
    handlePropertyChange(propertyId) {
        if (!this.selectedTile) return;
        
        const value = document.getElementById(propertyId).value;
        const config = this.selectedTile.config;
        
        switch(propertyId) {
            case 'prop-x':
                config.x = parseInt(value);
                this.app.gridCanvas.updateTilePosition(this.selectedTile);
                break;
            case 'prop-y':
                config.y = parseInt(value);
                this.app.gridCanvas.updateTilePosition(this.selectedTile);
                break;
            case 'prop-width':
                config.width = parseInt(value);
                this.app.gridCanvas.updateTileSize(this.selectedTile);
                break;
            case 'prop-height':
                config.height = parseInt(value);
                this.app.gridCanvas.updateTileSize(this.selectedTile);
                break;
            case 'prop-data-source':
                config.data_source = value;
                break;
        }
        
        this.app.markModified();
    }
    
    updateProperty(path, value) {
        if (!this.selectedTile) return;
        
        const keys = path.split('.');
        let obj = this.selectedTile.config;
        
        for (let i = 0; i < keys.length - 1; i++) {
            if (!obj[keys[i]]) obj[keys[i]] = {};
            obj = obj[keys[i]];
        }
        
        obj[keys[keys.length - 1]] = value;
        this.app.markModified();
    }
}
