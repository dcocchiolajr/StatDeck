/**
 * Properties Panel Component
 * Right sidebar for editing selected tile properties
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
        this.updateActionPreviews();
    }
    
    hideProperties() {
        this.currentTile = null;
        document.getElementById('no-selection').style.display = 'flex';
        document.getElementById('tile-properties').style.display = 'none';
    }
    
    updatePosition(axis, value) {
        if (!this.currentTile) return;
        
        const max = axis === 'x' ? this.app.layout.grid.cols - this.currentTile.size.w : this.app.layout.grid.rows - this.currentTile.size.h;
        value = Math.max(0, Math.min(max, value));
        
        this.currentTile.position[axis] = value;
        this.app.gridCanvas.updateTileElement(this.currentTile.id);
        this.app.markModified();
    }
    
    updateSize(dimension, value) {
        if (!this.currentTile) return;
        
        const isWidth = dimension === 'w';
        const max = isWidth ? this.app.layout.grid.cols - this.currentTile.position.x : this.app.layout.grid.rows - this.currentTile.position.y;
        value = Math.max(1, Math.min(max, value));
        
        this.currentTile.size[dimension] = value;
        this.app.gridCanvas.updateTileElement(this.currentTile.id);
        this.app.markModified();
    }
    
    updateSizeInputs(width, height) {
        document.getElementById('prop-width').value = width;
        document.getElementById('prop-height').value = height;
    }
    
    updateConfig(updates) {
        if (!this.currentTile) return;
        Object.assign(this.currentTile, updates);
        this.app.markModified();
    }
    
    updateStyle(updates) {
        if (!this.currentTile) return;
        Object.assign(this.currentTile.style, updates);
        this.app.gridCanvas.updateTileElement(this.currentTile.id);
        this.app.markModified();
    }
    
    updateActionPreviews() {
        if (!this.currentTile) return;
        
        const tapAction = this.currentTile.actions.tap;
        const longPressAction = this.currentTile.actions.long_press;
        
        document.getElementById('action-tap-preview').textContent = tapAction ? this.formatAction(tapAction) : 'None';
        document.getElementById('action-longpress-preview').textContent = longPressAction ? this.formatAction(longPressAction) : 'None';
    }
    
    formatAction(action) {
        if (!action || !action.type) return 'None';
        
        switch (action.type) {
            case 'launch_app':
                return `Launch: ${action.target ? action.target.split('\\').pop() : 'App'}`;
            case 'hotkey':
                return `Hotkey: ${action.keys || 'None'}`;
            case 'run_script':
                return `Script: ${action.script ? action.script.split('\\').pop() : 'Script'}`;
            case 'open_url':
                return `URL: ${action.url || 'URL'}`;
            default:
                return action.type;
        }
    }
}
