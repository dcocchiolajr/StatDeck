/**
 * Main Application Controller
 * Initializes and manages the StatDeck display
 */

class StatDeckApp {
    constructor() {
        this.config = null;
        this.usbClient = new USBClient();
        this.tileManager = null;
        this.layoutEngine = null;
        this.touchHandler = new TouchHandler();
        
        this.init();
    }
    
    init() {
        console.log('StatDeck initializing...');
        
        // Setup USB client event handlers
        this.usbClient.on('connected', () => {
            console.log('Connected to backend');
            this.hideDisconnectedOverlay();
        });
        
        this.usbClient.on('disconnected', () => {
            console.log('Disconnected from backend');
            this.showDisconnectedOverlay();
        });
        
        this.usbClient.on('config', (layout) => {
            console.log('Received configuration');
            this.loadConfig(layout);
        });
        
        this.usbClient.on('stats', (data) => {
            this.updateStats(data);
        });
        
        // Setup touch handler
        this.touchHandler.on('tap', (tileId) => {
            this.handleTileAction(tileId, 'tap');
        });
        
        this.touchHandler.on('long_press', (tileId) => {
            this.handleTileAction(tileId, 'long_press');
        });
        
        // Connect to backend
        this.usbClient.connect();
    }
    
    loadConfig(layout) {
        this.config = layout;
        
        // Initialize layout engine
        this.layoutEngine = new LayoutEngine(layout.grid);
        this.layoutEngine.apply();
        
        // Initialize tile manager
        this.tileManager = new TileManager(layout.tiles);
        this.tileManager.createTiles();
        
        // Register tiles with touch handler
        this.touchHandler.registerTiles(this.tileManager.tiles);
        
        console.log('Configuration loaded');
    }
    
    updateStats(data) {
        if (this.tileManager) {
            this.tileManager.updateAllTiles(data);
        }
    }
    
    handleTileAction(tileId, actionType) {
        console.log(`Tile action: ${tileId}.${actionType}`);
        
        // Send action to backend (which forwards to PC)
        this.usbClient.sendAction(tileId, actionType);
    }
    
    showDisconnectedOverlay() {
        document.getElementById('disconnected-overlay').classList.remove('hidden');
    }
    
    hideDisconnectedOverlay() {
        document.getElementById('disconnected-overlay').classList.add('hidden');
    }
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.app = new StatDeckApp();
    });
} else {
    window.app = new StatDeckApp();
}
