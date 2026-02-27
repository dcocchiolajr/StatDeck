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

        const innerConfig = this.tileConfig.config || {};
        const base64Str = this.tileConfig.iconBase64 || innerConfig.iconBase64;
        const fallbackIcon = this.tileConfig.icon || innerConfig.icon;

        // 1. THE TRAFFIC LIGHT TEST
        if (base64Str && base64Str.trim() !== "") {
            // WE HAVE DATA! Turn it GREEN.
            this.element.style.setProperty('background', '#004400', 'important');

            const img = document.createElement('img');
            img.src = base64Str;

            img.style.width = '60%';
            img.style.height = '60%';
            img.style.objectFit = 'contain';
            img.style.display = 'block';
            img.style.margin = '0 auto';
            img.style.pointerEvents = 'none';
            img.style.filter = 'drop-shadow(0 0 8px rgba(255, 0, 255, 0.4))';

            // If the image tag renders but the data is bad, it will show this text
            img.alt = "IMG FOUND BUT BROKEN";
            img.style.color = "white";
            img.style.fontSize = "10px";

            this.element.appendChild(img);
        } else {
            // DATA IS MISSING! Turn it RED.
            this.element.style.setProperty('background', '#440000', 'important');

            if (fallbackIcon) {
                const icon = document.createElement('div');
                icon.className = 'button-icon';
                icon.textContent = this.getIconChar(fallbackIcon);
                this.element.appendChild(icon);
            }
        }

        // Add Label (so you know which button is which)
        const labelText = this.tileConfig.label || innerConfig.label || "Btn";
        if (this.tileConfig.show_label !== false) {
            const label = document.createElement('div');
            label.className = 'button-label';
            label.textContent = labelText;
            label.style.pointerEvents = 'none';
            this.element.appendChild(label);
        }
    }

    getIconChar(iconName) {
        const icons = {
            'settings': '⚙️', 'app': '📱', 'folder': '📁', 'browser': '🌐',
            'terminal': '💻', 'play': '▶️', 'stop': '⏹️', 'refresh': '🔄'
        };
        return icons[iconName] || '📌';
    }

    updateData(statsData) { }
}