/**
 * Base Tile Class - Pi Display
 * VERSION: v3.2
 * 
 * Font scaling architecture:
 *   Grid density → --grid-font-scale (auto, set by LayoutEngine)
 *   Per-tile slider → --tile-font-scale (user, 0.5 to 2.0)
 *   CSS combines both: font-size: calc(Xem * var(--grid-font-scale) * var(--tile-font-scale))
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
        
        const size = this.config.size;
        this.element.style.setProperty('--tile-width', size.w);
        this.element.style.setProperty('--tile-height', size.h);
        this.element.dataset.width = size.w;
        this.element.dataset.height = size.h;
        
        const pos = this.config.position;
        if (pos) {
            this.element.style.gridColumn = `${pos.x + 1} / span ${size.w}`;
            this.element.style.gridRow = `${pos.y + 1} / span ${size.h}`;
        }
        
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
        
        // Font scale: slider is 50-200, convert to factor 0.5-2.0
        const rawScale = parseInt(this.style.fontScale);
        if (rawScale && rawScale !== 100) {
            this.element.style.setProperty('--tile-font-scale', (rawScale / 100).toFixed(2));
        }
    }
    
    getLabelColor() {
        return this.style.labelColor || '';
    }
    
    getValueColor() {
        return this.style.color || '';
    }
    
    updateData(statsData) {
        // Override in subclasses
    }
    
    getValue(statsData) {
        if (!this.dataSource || !statsData) return null;
        
        const path = this.dataSource.split('.');
        let value = statsData;
        
        for (const key of path) {
            if (value != null && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return null;
            }
        }
        
        if (value == null) return null;
        return value;
    }
}
