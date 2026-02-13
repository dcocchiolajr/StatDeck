/**
 * Icon Loader Utility
 * Handles loading custom icons from .ico, .png files and .exe extraction
 */

class IconLoader {
    constructor() {
        this.iconCache = new Map();
        this.defaultIcons = {
            'settings': '⚙️',
            'app': '📱',
            'folder': '📁',
            'browser': '🌐',
            'terminal': '💻',
            'play': '▶️',
            'stop': '⏹️',
            'refresh': '🔄',
            'game': '🎮',
            'code': '💻',
            'music': '🎵',
            'video': '🎬',
            'photo': '📷',
            'file': '📄'
        };
    }
    
    /**
     * Get icon for button
     * @param {Object} config - Button config with icon settings
     * @returns {Promise<string>} - Icon as emoji or data URL
     */
    async getIcon(config) {
        if (!config) return this.defaultIcons['app'];
        
        const iconType = config.icon_type || 'emoji';
        
        if (iconType === 'emoji') {
            return this.getEmojiIcon(config.icon);
        } else if (iconType === 'file') {
            return await this.getFileIcon(config.icon_path, config.icon);
        }
        
        return this.defaultIcons['app'];
    }
    
    /**
     * Get emoji icon (current system)
     */
    getEmojiIcon(iconName) {
        return this.defaultIcons[iconName] || this.defaultIcons['app'];
    }
    
    /**
     * Load icon from file path
     * @param {string} filePath - Path to .ico, .png, or .exe file
     * @param {string} fallbackEmoji - Emoji to use if file load fails
     * @returns {Promise<string>} - Data URL or emoji fallback
     */
    async getFileIcon(filePath, fallbackEmoji) {
        if (!filePath) {
            return this.getEmojiIcon(fallbackEmoji);
        }
        
        // Check cache first
        if (this.iconCache.has(filePath)) {
            return this.iconCache.get(filePath);
        }
        
        try {
            // For Electron/Node.js environment
            if (typeof require !== 'undefined') {
                const iconData = await this.loadIconNode(filePath);
                if (iconData) {
                    this.iconCache.set(filePath, iconData);
                    return iconData;
                }
            }
        } catch (error) {
            console.warn('Failed to load icon from file:', filePath, error);
        }
        
        // Fallback to emoji
        return this.getEmojiIcon(fallbackEmoji);
    }
    
    /**
     * Load icon using Node.js (Electron environment)
     */
    async loadIconNode(filePath) {
        try {
            const fs = require('fs');
            const path = require('path');
            
            // Normalize path
            const normalizedPath = path.normalize(filePath);
            
            // Check if file exists
            if (!fs.existsSync(normalizedPath)) {
                console.warn('Icon file not found:', normalizedPath);
                return null;
            }
            
            const ext = path.extname(normalizedPath).toLowerCase();
            
            // Handle .exe files - extract icon
            if (ext === '.exe') {
                return await this.extractExeIcon(normalizedPath);
            }
            
            // Handle .ico and .png files directly
            if (ext === '.ico' || ext === '.png') {
                const buffer = fs.readFileSync(normalizedPath);
                const base64 = buffer.toString('base64');
                const mimeType = ext === '.png' ? 'image/png' : 'image/x-icon';
                return `data:${mimeType};base64,${base64}`;
            }
            
            return null;
        } catch (error) {
            console.error('Error loading icon:', error);
            return null;
        }
    }
    
    /**
     * Extract icon from .exe file
     * Uses Windows ICO extraction or falls back to file icon
     */
    async extractExeIcon(exePath) {
        try {
            // Try to find associated .ico file in same directory
            const path = require('path');
            const fs = require('fs');
            
            const dir = path.dirname(exePath);
            const baseName = path.basename(exePath, '.exe');
            const icoPath = path.join(dir, `${baseName}.ico`);
            
            // Check for standalone .ico file first
            if (fs.existsSync(icoPath)) {
                const buffer = fs.readFileSync(icoPath);
                const base64 = buffer.toString('base64');
                return `data:image/x-icon;base64,${base64}`;
            }
            
            // For now, return null (can add exe-icon-extractor library later)
            // This would require: npm install exe-icon-extractor
            console.log('EXE icon extraction not yet implemented, use standalone .ico file');
            return null;
            
        } catch (error) {
            console.error('Error extracting EXE icon:', error);
            return null;
        }
    }
    
    /**
     * Get available emoji icons
     */
    getAvailableEmojis() {
        return Object.keys(this.defaultIcons);
    }
    
    /**
     * Clear icon cache
     */
    clearCache() {
        this.iconCache.clear();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IconLoader;
}
