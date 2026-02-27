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
        if (this.style.background) {
            this.element.style.background = this.style.background;
        }
        if (this.style.color) {
            this.element.style.color = this.style.color;
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
