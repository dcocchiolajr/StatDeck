/**
 * Tile Manager
 * Creates and manages all tiles
 */

class TileManager {
    constructor(tilesConfig) {
        this.config = tilesConfig;
        this.tiles = new Map();
        this.gridElement = document.getElementById('tile-grid');
    }
    
    createTiles() {
        // Clear existing tiles
        this.gridElement.innerHTML = '';
        this.tiles.clear();
        
        // Create each tile
        this.config.forEach(tileConfig => {
            const tile = this.createTile(tileConfig);
            if (tile) {
                this.tiles.set(tileConfig.id, tile);
                this.gridElement.appendChild(tile.element);
            }
        });
        
        console.log(`Created ${this.tiles.size} tiles`);
    }
    
    createTile(config) {
        const type = config.type;
        
        // Map tile types to classes
        const tileClasses = {
            'cpu_graph': CPUGraphTile,
            'gauge': GaugeTile,
            'text_display': TextDisplayTile,
            'button': ButtonTile,
            'network_graph': NetworkGraphTile,
            'page_prev': PagePrevTile,
            'page_next': PageNextTile
        };
        
        const TileClass = tileClasses[type];
        
        if (!TileClass) {
            console.warn(`Unknown tile type: ${type}`);
            return null;
        }
        
        return new TileClass(config);
    }
    
    updateAllTiles(statsData) {
        this.tiles.forEach(tile => {
            tile.updateData(statsData);
        });
    }
    
    getTile(tileId) {
        return this.tiles.get(tileId);
    }
}
