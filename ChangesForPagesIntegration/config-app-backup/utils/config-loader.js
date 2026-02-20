/**
 * Config Loader — v4.0 Multi-Page Support
 * 
 * Handles loading/saving layout configurations.
 * Migrates legacy flat format ({ grid, tiles }) to pages format.
 * Validates pages, fixes duplicate tile IDs across all pages.
 */

class ConfigLoader {
    constructor(app) {
        this.app = app;
    }
    
    /**
     * Load and validate a layout. Accepts JSON string or object.
     * Automatically migrates legacy flat layouts to pages format.
     */
    load(data) {
        try {
            const layout = typeof data === 'string' ? JSON.parse(data) : data;
            
            // Migrate legacy flat format to pages
            if (!layout.pages || !Array.isArray(layout.pages)) {
                layout.pages = this.migrateToPages(layout);
                layout.version = '2.0';
                console.log('ConfigLoader: Migrated legacy layout to pages format');
            }
            
            // Validate pages
            if (layout.pages.length === 0) {
                throw new Error('Layout must have at least one page');
            }
            
            // Validate each page
            layout.pages.forEach((page, i) => {
                if (!page.id) page.id = `page_${i + 1}`;
                if (!page.name) page.name = `Page ${i + 1}`;
                if (!page.grid) page.grid = { cols: 4, rows: 3, cell_width: 180, cell_height: 120, gap: 10 };
                if (!Array.isArray(page.tiles)) page.tiles = [];
                
                // Ensure grid has all fields
                page.grid.cols = page.grid.cols || 4;
                page.grid.rows = page.grid.rows || 3;
                page.grid.cell_width = page.grid.cell_width || 180;
                page.grid.cell_height = page.grid.cell_height || 120;
                page.grid.gap = page.grid.gap !== undefined ? page.grid.gap : 10;
            });
            
            // Fix duplicate tile IDs across ALL pages
            this.fixDuplicateTileIds(layout);
            
            return layout;
        } catch (err) {
            throw new Error(`Failed to load layout: ${err.message}`);
        }
    }
    
    /**
     * Migrate a legacy flat layout to the new pages format.
     * Legacy: { version, grid, tiles, theme, themeData }
     * New:    { version, pages: [{ id, name, grid, tiles }], theme, themeData }
     */
    migrateToPages(layout) {
        const grid = layout.grid || { cols: 4, rows: 3, cell_width: 180, cell_height: 120, gap: 10 };
        const tiles = Array.isArray(layout.tiles) ? layout.tiles : [];
        
        return [{
            id: 'page_1',
            name: 'Page 1',
            grid: { ...grid },
            tiles: tiles
        }];
    }
    
    /**
     * Fix duplicate tile IDs across all pages.
     * IDs must be unique globally (not just per-page) because
     * the touch handler and stats system use tile IDs.
     */
    fixDuplicateTileIds(layout) {
        const seenIds = new Set();
        let nextId = this.getMaxTileId(layout) + 1;
        
        for (const page of layout.pages) {
            for (const tile of page.tiles) {
                if (seenIds.has(tile.id)) {
                    const oldId = tile.id;
                    tile.id = `tile_${nextId}`;
                    nextId++;
                    console.warn(`ConfigLoader: Fixed duplicate tile ID "${oldId}" -> "${tile.id}" on page "${page.name}"`);
                }
                seenIds.add(tile.id);
            }
        }
    }
    
    /**
     * Get the highest numeric tile ID across all pages.
     */
    getMaxTileId(layout) {
        let maxId = 0;
        
        for (const page of layout.pages) {
            for (const tile of page.tiles) {
                const match = tile.id.match(/^tile_(\d+)$/);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (num > maxId) maxId = num;
                }
            }
        }
        
        return maxId;
    }
    
    /**
     * Serialize layout for saving.
     */
    save(layout) {
        try {
            const validation = this.validate(layout);
            if (!validation.valid) {
                console.warn(`Layout validation warning: ${validation.error}`);
            }
            
            return JSON.stringify(layout, null, 2);
        } catch (err) {
            throw new Error(`Failed to save layout: ${err.message}`);
        }
    }
    
    /**
     * Validate the layout structure.
     */
    validate(layout) {
        if (!layout.pages || layout.pages.length === 0) {
            return { valid: false, error: 'No pages in layout' };
        }
        
        // Check for duplicate tile IDs across all pages
        const allIds = [];
        for (const page of layout.pages) {
            allIds.push(...page.tiles.map(t => t.id));
        }
        const uniqueIds = new Set(allIds);
        if (allIds.length !== uniqueIds.size) {
            const duplicates = allIds.filter((id, i) => allIds.indexOf(id) !== i);
            return { valid: false, error: `Duplicate tile IDs found: ${duplicates.join(', ')}` };
        }
        
        // Check for overlapping tiles within each page
        for (const page of layout.pages) {
            const grid = page.grid;
            const occupied = new Set();
            
            for (const tile of page.tiles) {
                for (let x = tile.position.x; x < tile.position.x + tile.size.w; x++) {
                    for (let y = tile.position.y; y < tile.position.y + tile.size.h; y++) {
                        if (x >= grid.cols || y >= grid.rows) {
                            return { valid: false, error: `Tile ${tile.id} extends beyond grid on page "${page.name}"` };
                        }
                        const key = `${page.id}:${x},${y}`;
                        if (occupied.has(key)) {
                            return { valid: false, error: `Overlapping tiles at (${x},${y}) on page "${page.name}"` };
                        }
                        occupied.add(key);
                    }
                }
            }
        }
        
        return { valid: true };
    }
}
