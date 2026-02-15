/**
 * Base Tile Class
 * All tile types inherit from this
 */

class BaseTile {
    constructor(config) {
        this.config = config;
        this.id = config.id;
        this.type = config.type;
        this.dataSource = config.data_source;
        this.style = config.style || {};
        this.tileConfig = config.config || {};
        this.element = null;
        
        this.createElement();
        this.applyStyles();
    }
    
    createElement() {
        this.element = document.createElement('div');
        this.element.className = 'tile';
        this.element.id = `tile-${this.id}`;
        this.element.dataset.tileId = this.id;
        
        // Set grid span
        const size = this.config.size;
        const pos = this.config.position;
        this.element.style.gridColumn = `${pos.x + 1} / span ${size.w}`;
        this.element.style.gridRow = `${pos.y + 1} / span ${size.h}`;
        this.element.style.setProperty('--tile-width', size.w);
        this.element.style.setProperty('--tile-height', size.h);
        this.element.dataset.width = size.w;
        this.element.dataset.height = size.h;
        
        // Add long-press indicator
        const indicator = document.createElement('div');
        indicator.className = 'long-press-indicator';
        this.element.appendChild(indicator);
    }
    
    applyStyles() {
        // Apply background (if custom set)
        if (this.style.background) {
            this.element.style.background = this.style.background;
        }
        
        // Apply color (if custom set)
        if (this.style.color) {
            this.element.style.color = this.style.color;
        }
        
        // Apply font scale - NEW
        if (this.style.fontScale && this.style.fontScale !== 100) {
            const scale = this.style.fontScale / 100;
            this.element.style.fontSize = `${scale}em`;
        }
    }
    
    updateData(statsData) {
        // Override in subclasses
    }
    
    getValue(statsData) {
        if (!this.dataSource) return null;
        
        // Parse dot-notation path
        const path = this.dataSource.split('.');
        let value = statsData;
        
        for (const key of path) {
            if (value && value.hasOwnProperty(key)) {
                value = value[key];
            } else {
                return null;
            }
        }
        
        return value;
    }
}
