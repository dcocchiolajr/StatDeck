/**
 * Tile Palette Component
 * Sidebar with draggable tile templates
 */

class TilePalette {
    constructor(app) {
        this.app = app;
        this.init();
    }
    
    init() {
        const tiles = document.querySelectorAll('.palette-tile');
        
        tiles.forEach(tile => {
            tile.addEventListener('dragstart', (e) => {
                const tileType = tile.dataset.type;
                e.dataTransfer.setData('tile-type', tileType);
                e.dataTransfer.effectAllowed = 'copy';
            });
        });
    }
}
