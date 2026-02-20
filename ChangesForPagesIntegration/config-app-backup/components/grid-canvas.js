/**
 * Grid Canvas Component
 * Handles the drag-and-drop grid where tiles are placed
 */

class GridCanvas {
    constructor(app) {
        this.app = app;
        this.element = document.getElementById('grid-canvas');
        this.tiles = new Map();
        this.selectedTile = null;
        this.draggedTile = null;
        this.nextTileId = 1;
        
        this.init();
    }
    
    init() {
        this.setupDropZone();
        this.setupEvents();
    }
    
    setupDropZone() {
        this.element.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            this.element.classList.add('drag-over');
        });
        
        this.element.addEventListener('dragleave', () => {
            this.element.classList.remove('drag-over');
        });
        
        this.element.addEventListener('drop', (e) => {
            e.preventDefault();
            this.element.classList.remove('drag-over');
            
            const tileType = e.dataTransfer.getData('tile-type');
            if (tileType) {
                this.addTileFromPalette(tileType, e);
            }
        });
    }
    
    setupEvents() {
        // Click outside tiles to deselect
        this.element.addEventListener('click', (e) => {
            if (e.target === this.element) {
                this.deselectAll();
            }
        });
    }
    

    /**
     * Load a single page into the canvas (v4.0).
     * @param {Object} page - { id, name, grid, tiles }
     */
    loadPage(page) {
        const layout = {
            grid: page.grid,
            tiles: page.tiles
        };
        this.loadLayout(layout);
    }
    loadLayout(layout) {
        // Clear existing tiles
        this.element.innerHTML = '';
        this.tiles.clear();
        this.selectedTile = null;
        
        // Update grid size
        this.updateGridSize(layout.grid.cols, layout.grid.rows);
        
        // Add tiles
        if (layout.tiles) {
            layout.tiles.forEach(tileConfig => {
                this.addTile(tileConfig);
            });
        }
    }
    
    updateGridSize(cols, rows) {
        this.element.style.setProperty('--grid-cols', cols);
        this.element.style.setProperty('--grid-rows', rows);
        this.element.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
        this.element.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
        
        // Calculate canvas size (800x600 as base, scale to fit)
        const cellWidth = this.app.layout.grid.cell_width || 180;
        const cellHeight = this.app.layout.grid.cell_height || 120;
        const gap = this.app.layout.grid.gap || 10;
        
        const width = (cols * cellWidth) + ((cols - 1) * gap) + (gap * 2);
        const height = (rows * cellHeight) + ((rows - 1) * gap) + (gap * 2);
        
        this.element.style.width = `${width}px`;
        this.element.style.height = `${height}px`;
    }
    
    addTileFromPalette(tileType, dropEvent) {
        // Get drop position relative to grid
        const rect = this.element.getBoundingClientRect();
        const x = dropEvent.clientX - rect.left;
        const y = dropEvent.clientY - rect.top;
        
        // Calculate grid position
        const cols = this.app.layout.grid.cols;
        const rows = this.app.layout.grid.rows;
        const cellWidth = rect.width / cols;
        const cellHeight = rect.height / rows;
        
        const gridX = Math.floor(x / cellWidth);
        const gridY = Math.floor(y / cellHeight);
        
        // Create tile config
        const tileConfig = {
            id: `tile_${this.nextTileId++}`,
            type: tileType,
            position: { x: gridX, y: gridY },
            size: { w: 1, h: 1 },
            data_source: '',
            style: {
                color: '',
                background: ''
            },
            config: {},
            actions: {}
        };
        
        
        // Page nav tile defaults
        if (tileType === 'page_prev' || tileType === 'page_next') {
            tileConfig.data_source = '';
            tileConfig.style.color = '';
            tileConfig.style.navStyle = 'arrow';
            tileConfig.config = { label: '' };
        }

        // Add to layout
        this.app.getCurrentPage().tiles.push(tileConfig);
        this.addTile(tileConfig);
        this.app.markModified();
        this.app.undoManager.recordAction('add', tileConfig);
    }
    
    addTile(tileConfig) {
        const tileElement = this.createTileElement(tileConfig);
        this.element.appendChild(tileElement);
        this.tiles.set(tileConfig.id, { config: tileConfig, element: tileElement });
        this.updateTileElement(tileConfig.id);
    }
    
    createTileElement(config) {
        const tile = document.createElement('div');
        tile.className = 'grid-tile';
        tile.dataset.tileId = config.id;
        
        // Set grid position and size
        tile.style.gridColumn = `${config.position.x + 1} / span ${config.size.w}`;
        tile.style.gridRow = `${config.position.y + 1} / span ${config.size.h}`;
        
        // Content
        tile.innerHTML = `
            <div class="tile-type-label">${this.getTileTypeName(config.type)}</div>
            <div class="tile-content">${config.size.w}×${config.size.h}</div>
            <div class="tile-resize-handle"></div>
        `;
        
        // Make draggable
        tile.draggable = true;
        
        // Events - use dataset.tileId to avoid closure issues
        tile.addEventListener('click', (e) => {
            e.stopPropagation();
            const tileId = e.currentTarget.dataset.tileId;
            this.selectTile(tileId);
        });
        
        tile.addEventListener('dragstart', (e) => {
            this.draggedTile = config.id;
            tile.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('tile-id', config.id);
        });
        
        tile.addEventListener('dragend', () => {
            tile.classList.remove('dragging');
            this.draggedTile = null;
        });
        
        // Resize handle
        const handle = tile.querySelector('.tile-resize-handle');
        handle.addEventListener('mousedown', (e) => {
            e.stopPropagation();
            this.startResize(config.id, e);
        });
        
        return tile;
    }
    
    getTileTypeName(type) {
        const names = {
            'cpu_graph': 'CPU Graph',
            'gauge': 'Gauge',
            'text_display': 'Text',
            'button': 'Button',
            'network_graph': 'Network'
        };
        return names[type] || type;
    }
    
    updateTileElement(tileId) {
        const tile = this.tiles.get(tileId);
        if (!tile) return;
        
        const config = tile.config;
        const element = tile.element;
        
        // Update position and size
        element.style.gridColumn = `${config.position.x + 1} / span ${config.size.w}`;
        element.style.gridRow = `${config.position.y + 1} / span ${config.size.h}`;
        
        // Update content
        const content = element.querySelector('.tile-content');
        if (content) {
            content.textContent = `${config.size.w}×${config.size.h}`;
        }
        
        // Update styling
        if (false) {
            element.style.background = config.style.background;
        }
    }
    
    selectTile(tileId) {
        this.deselectAll();
        
        const tile = this.tiles.get(tileId);
        if (tile) {
            tile.element.classList.add('selected');
            this.selectedTile = tileId;
            this.app.propertiesPanel.showTileProperties(tile.config);
        }
    }
    
    deselectAll() {
        this.tiles.forEach(tile => {
            tile.element.classList.remove('selected');
        });
        this.selectedTile = null;
        this.app.propertiesPanel.hideProperties();
    }
    
    deleteSelected() {
        if (!this.selectedTile) return;
        
        this.deleteTile(this.selectedTile);
    }
    
    deleteTile(tileId) {
        const tile = this.tiles.get(tileId);
        if (!tile) return;
        
        // Remove from layout
        const index = this.app.layout.tiles.findIndex(t => t.id === tileId);
        if (index !== -1) {
            const removed = this.app.layout.tiles.splice(index, 1)[0];
            this.app.undoManager.recordAction('delete', removed);
        }
        
        // Remove from DOM
        tile.element.remove();
        this.tiles.delete(tileId);
        
        if (this.selectedTile === tileId) {
            this.selectedTile = null;
            this.app.propertiesPanel.hideProperties();
        }
        
        this.app.markModified();
        this.app.updateUI();
    }
    
    updateTileConfig(tileId, updates) {
        const tile = this.tiles.get(tileId);
        if (!tile) return;
        
        Object.assign(tile.config, updates);
        this.updateTileElement(tileId);
        this.app.markModified();
    }
    
    startResize(tileId, event) {
        event.preventDefault();
        
        const tile = this.tiles.get(tileId);
        if (!tile) return;
        
        const startX = event.clientX;
        const startY = event.clientY;
        const startWidth = tile.config.size.w;
        const startHeight = tile.config.size.h;
        
        const maxWidth = this.app.layout.grid.cols - tile.config.position.x;
        const maxHeight = this.app.layout.grid.rows - tile.config.position.y;
        
        const onMouseMove = (e) => {
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            const rect = this.element.getBoundingClientRect();
            const cellWidth = rect.width / this.app.layout.grid.cols;
            const cellHeight = rect.height / this.app.layout.grid.rows;
            
            const newWidth = Math.max(1, Math.min(maxWidth, startWidth + Math.round(deltaX / cellWidth)));
            const newHeight = Math.max(1, Math.min(maxHeight, startHeight + Math.round(deltaY / cellHeight)));
            
            this.updateTileConfig(tileId, {
                size: { w: newWidth, h: newHeight }
            });
            
            if (this.selectedTile === tileId) {
                this.app.propertiesPanel.updateSizeInputs(newWidth, newHeight);
            }
        };
        
        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    }
    
    toggleGridLines(show) {
        if (show) {
            this.element.classList.add('show-grid');
        } else {
            this.element.classList.remove('show-grid');
        }
    }
    
    getSelectedTile() {
        return this.selectedTile ? this.tiles.get(this.selectedTile) : null;
    }
}
