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
            
            // Check and fix duplicate tile IDs
            this.fixDuplicateTileIds(layout);
            
            return layout;
        } catch (err) {
            throw new Error(`Failed to load layout: ${err.message}`);
        }
    }
    
    /**
     * Check for and fix duplicate tile IDs in the layout
     */
    fixDuplicateTileIds(layout) {
        if (!layout.tiles || layout.tiles.length === 0) return;
        
        const seenIds = new Set();
        let nextId = this.getMaxTileId(layout.tiles) + 1;
        
        for (const tile of layout.tiles) {
            if (seenIds.has(tile.id)) {
                // Duplicate found - generate new ID
                const oldId = tile.id;
                tile.id = `tile_${nextId}`;
                nextId++;
                console.warn(`ConfigLoader: Fixed duplicate tile ID "${oldId}" -> "${tile.id}"`);
            }
            seenIds.add(tile.id);
        }
    }
    
    /**
     * Get the highest numeric tile ID from the tiles array
     */
    getMaxTileId(tiles) {
        let maxId = 0;
        
        for (const tile of tiles) {
            const match = tile.id.match(/^tile_(\d+)$/);
            if (match) {
                const num = parseInt(match[1], 10);
                if (num > maxId) {
                    maxId = num;
                }
            }
        }
        
        return maxId;
    }
    
    save(layout) {
        try {
            // Validate before saving
            const validation = this.validate(layout);
            if (!validation.valid) {
                console.warn(`Layout validation warning: ${validation.error}`);
            }
            
            return JSON.stringify(layout, null, 2);
        } catch (err) {
            throw new Error(`Failed to save layout: ${err.message}`);
        }
    }
    
    validate(layout) {
        // Check for duplicate IDs
        const ids = layout.tiles.map(t => t.id);
        const uniqueIds = new Set(ids);
        if (ids.length !== uniqueIds.size) {
            const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
            return { valid: false, error: `Duplicate tile IDs found: ${duplicates.join(', ')}` };
        }
        
        // Check for overlapping tiles
        const grid = layout.grid;
        const occupiedCells = new Map(); // Changed to Map to track which tile occupies each cell
        
        for (const tile of layout.tiles) {
            for (let x = tile.position.x; x < tile.position.x + tile.size.w; x++) {
                for (let y = tile.position.y; y < tile.position.y + tile.size.h; y++) {
                    const key = `${x},${y}`;
                    if (occupiedCells.has(key)) {
                        const existingTile = occupiedCells.get(key);
                        return { 
                            valid: false, 
                            error: `Tiles "${existingTile}" and "${tile.id}" overlap at (${x}, ${y})` 
                        };
                    }
                    occupiedCells.set(key, tile.id);
                }
            }
            
            // Check bounds
            if (tile.position.x < 0 || tile.position.y < 0) {
                return { valid: false, error: `Tile ${tile.id} has negative position` };
            }
            
            if (tile.position.x + tile.size.w > grid.cols || tile.position.y + tile.size.h > grid.rows) {
                return { valid: false, error: `Tile ${tile.id} exceeds grid bounds` };
            }
        }
        
        return { valid: true };
    }
}
