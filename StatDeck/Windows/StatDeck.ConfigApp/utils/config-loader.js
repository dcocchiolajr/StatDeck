/**
 * Config Loader
 * Handles loading and saving layout configurations
 */

class ConfigLoader {
    constructor(app) {
        this.app = app;
    }
    
    load(data) {
        try {
            const layout = typeof data === 'string' ? JSON.parse(data) : data;
            
            // Validate layout
            if (!layout.version || !layout.grid || !Array.isArray(layout.tiles)) {
                throw new Error('Invalid layout format');
            }
            
            return layout;
        } catch (err) {
            throw new Error(`Failed to load layout: ${err.message}`);
        }
    }
    
    save(layout) {
        try {
            return JSON.stringify(layout, null, 2);
        } catch (err) {
            throw new Error(`Failed to save layout: ${err.message}`);
        }
    }
    
    validate(layout) {
        // Check for overlapping tiles
        const grid = layout.grid;
        const occupiedCells = new Set();
        
        for (const tile of layout.tiles) {
            for (let x = tile.position.x; x < tile.position.x + tile.size.w; x++) {
                for (let y = tile.position.y; y < tile.position.y + tile.size.h; y++) {
                    const key = `${x},${y}`;
                    if (occupiedCells.has(key)) {
                        return { valid: false, error: `Tiles overlap at (${x}, ${y})` };
                    }
                    occupiedCells.add(key);
                }
            }
            
            // Check bounds
            if (tile.position.x + tile.size.w > grid.cols || tile.position.y + tile.size.h > grid.rows) {
                return { valid: false, error: `Tile ${tile.id} exceeds grid bounds` };
            }
        }
        
        return { valid: true };
    }
}
