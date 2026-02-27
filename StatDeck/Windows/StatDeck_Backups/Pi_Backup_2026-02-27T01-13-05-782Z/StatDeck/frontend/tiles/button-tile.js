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

        // Safety net: Grab the inner "config" block where your data actually lives
        const innerConfig = this.tileConfig.config || {};

        // Look for the icon in either the root or the config block
        const base64Str = this.tileConfig.iconBase64 || innerConfig.iconBase64;
        const fallbackIcon = this.tileConfig.icon || innerConfig.icon;

        // 1. Check for custom Base64 Icon first
        if (base64Str && base64Str.trim() !== "") {
            const img = document.createElement('img');
            img.src = base64Str;

            // Inline Styles - These override any conflicting CSS
            img.style.width = '60%';
            img.style.height = '60%';
            img.style.objectFit = 'contain';
            img.style.display = 'block';
            img.style.margin = 'auto';
            img.style.pointerEvents = 'none'; // Respects your touchscreen fix
            img.style.filter = 'drop-shadow(0 0 8px rgba(255, 0, 255, 0.4))'; // Synthwave glow

            this.element.appendChild(img);
        }
        // 2. Fallback to Emoji Icon if no image exists
        else if (fallbackIcon) {
            const icon = document.createElement('div');
            icon.className = 'button-icon';
            icon.textContent = this.getIconChar(fallbackIcon);
            this.element.appendChild(icon);
        }

        // 3. Add Label
        const labelText = this.tileConfig.label || innerConfig.label;
        if (this.tileConfig.show_label !== false && labelText) {
            const label = document.createElement('div');
            label.className = 'button-label';
            label.textContent = labelText;
            label.style.pointerEvents = 'none'; // Respects your touchscreen fix
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