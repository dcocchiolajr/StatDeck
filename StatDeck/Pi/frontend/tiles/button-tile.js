/**
 * Button Tile
 * Interactive button with icon and label
 */

class ButtonTile extends BaseTile {
    constructor(config) {
        super(config);
    }
    
    createElement() {
        super.createElement();
        this.element.classList.add('button-tile');
        
        // Add icon
        if (this.tileConfig.icon) {
            const icon = document.createElement('div');
            icon.className = 'button-icon';
            icon.textContent = this.getIconChar(this.tileConfig.icon);
            this.element.appendChild(icon);
        }
        
        // Add label
        if (this.tileConfig.show_label !== false) {
            const label = document.createElement('div');
            label.className = 'button-label';
            label.textContent = this.tileConfig.label || '';
            this.element.appendChild(label);
        }
    }
    
    getIconChar(iconName) {
        const icons = {
            'settings': '⚙️',
            'app': '📱',
            'folder': '📁',
            'browser': '🌐',
            'terminal': '💻',
            'play': '▶️',
            'stop': '⏹️',
            'refresh': '🔄'
        };
        
        return icons[iconName] || '📌';
    }
    
    updateData(statsData) {
        // Buttons typically don't update from stats
        // Override if needed for dynamic buttons
    }
}
