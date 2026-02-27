/**
 * Layout Engine
 * Manages the CSS Grid layout based on configuration
 */

class LayoutEngine {
    constructor(gridConfig) {
        this.config = gridConfig;
        this.gridElement = document.getElementById('tile-grid');
    }
    
    apply() {
        // Set CSS custom properties for grid
        const root = document.documentElement;
        root.style.setProperty('--grid-cols', this.config.cols);
        root.style.setProperty('--grid-rows', this.config.rows);
        
        // Apply gap
        this.gridElement.style.gap = `${this.config.gap}px`;
        
        console.log(`Layout: ${this.config.cols}x${this.config.rows} grid`);
    }
}
