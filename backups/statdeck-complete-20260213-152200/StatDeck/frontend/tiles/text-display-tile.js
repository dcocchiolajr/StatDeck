/**
 * Text Display Tile
 * Simple text/number display
 */

class TextDisplayTile extends BaseTile {
    constructor(config) {
        super(config);
    }
    
    createElement() {
        super.createElement();
        this.element.classList.add('text-display-tile');
        
        // Add label
        const label = document.createElement('div');
        label.className = 'text-display-label';
        label.textContent = this.tileConfig.label || '';
        this.element.appendChild(label);
        
        // Add value
        const value = document.createElement('div');
        value.className = 'text-display-value';
        this.element.appendChild(value);
        this.valueElement = value;
    }
    
    updateData(statsData) {
        const value = this.getValue(statsData);
        if (value === null) return;
        
        const decimals = this.tileConfig.decimals !== undefined ? this.tileConfig.decimals : 1;
        const units = this.tileConfig.units || '';
        
        this.valueElement.innerHTML = `${value.toFixed(decimals)}<span class="tile-units">${units}</span>`;
    }
}
