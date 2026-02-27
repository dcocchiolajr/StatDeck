/**
 * Configuration Loader
 * 
 * Handles loading and saving layout configuration.
 */

const fs = require('fs');
const path = require('path');

const CONFIG_DIR = path.join(__dirname, 'config');
const CONFIG_FILE = path.join(CONFIG_DIR, 'layout.json');
const EXAMPLE_CONFIG = path.join(__dirname, '../../Shared/example-layout.json');

class ConfigLoader {
    constructor() {
        this.currentConfig = null;
        this.ensureConfigDir();
    }
    
    ensureConfigDir() {
        if (!fs.existsSync(CONFIG_DIR)) {
            fs.mkdirSync(CONFIG_DIR, { recursive: true });
        }
    }
    
    load() {
        try {
            // Try to load existing config
            if (fs.existsSync(CONFIG_FILE)) {
                const data = fs.readFileSync(CONFIG_FILE, 'utf8');
                this.currentConfig = JSON.parse(data);
                console.log('Loaded configuration from', CONFIG_FILE);
                return this.currentConfig;
            }
            
            // No config exists, try to load example
            if (fs.existsSync(EXAMPLE_CONFIG)) {
                const data = fs.readFileSync(EXAMPLE_CONFIG, 'utf8');
                this.currentConfig = JSON.parse(data);
                console.log('Loaded example configuration');
                
                // Save it as the current config
                this.save(this.currentConfig);
                
                return this.currentConfig;
            }
            
            // No config available
            console.warn('No configuration file found');
            this.currentConfig = this.getDefaultConfig();
            return this.currentConfig;
            
        } catch (err) {
            console.error('Error loading configuration:', err);
            this.currentConfig = this.getDefaultConfig();
            return this.currentConfig;
        }
    }
    
    save(config) {
        try {
            this.ensureConfigDir();
            
            const data = JSON.stringify(config, null, 2);
            fs.writeFileSync(CONFIG_FILE, data, 'utf8');
            
            this.currentConfig = config;
            console.log('Configuration saved to', CONFIG_FILE);
            
            return true;
        } catch (err) {
            console.error('Error saving configuration:', err);
            return false;
        }
    }
    
    getDefaultConfig() {
        return {
            version: '1.0',
            grid: {
                cols: 4,
                rows: 3,
                cell_width: 180,
                cell_height: 120,
                gap: 10
            },
            tiles: []
        };
    }
    
    isLoaded() {
        return this.currentConfig !== null;
    }
    
    getTileCount() {
        if (!this.currentConfig || !this.currentConfig.tiles) {
            return 0;
        }
        return this.currentConfig.tiles.length;
    }
}

// Export singleton instance
module.exports = new ConfigLoader();
