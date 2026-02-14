/**
 * Text Display Tile
 * Simple text/number display with style options
 */

class TextDisplayTile extends BaseTile {
    constructor(config) {
        super(config);
        this.displayStyle = this.style.displayStyle || 'number'; // number, multi, scanline, bignum
    }

    createElement() {
        super.createElement();
        this.element.classList.add('text-display-tile');

        // Read displayStyle from config directly (since this happens during super() constructor)
        const displayStyle = (this.config.style && this.config.style.displayStyle) || 'number';

        // Apply display style class
        this.element.classList.add(`display-${displayStyle}`);

        // Add label
        const label = document.createElement('div');
        label.className = 'text-display-label';
        label.textContent = this.tileConfig.label || '';
        this.element.appendChild(label);

        // Add value container based on style
        if (displayStyle === 'multi') {
            this.createMultiLineDisplay();
        } else if (displayStyle === 'scanline' || displayStyle === 'sparkline') {
            this.createScanlineDisplay();
        } else if (displayStyle === 'bignum') {
            this.createBigNumberDisplay();
        } else {
            this.createNumberDisplay();
        }
    }

    createNumberDisplay() {
        const value = document.createElement('div');
        value.className = 'text-display-value';
        this.element.appendChild(value);
        this.valueElement = value;
    }

    createBigNumberDisplay() {
        const value = document.createElement('div');
        value.className = 'text-display-value text-display-bignum';
        value.style.fontSize = '64px';
        value.style.fontWeight = '900';
        value.style.lineHeight = '1';
        this.element.appendChild(value);
        this.valueElement = value;
    }

    createMultiLineDisplay() {
        const container = document.createElement('div');
        container.className = 'text-display-multi';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '8px';
        container.style.flex = '1';
        
        const mainValue = document.createElement('div');
        mainValue.className = 'text-display-value';
        mainValue.style.fontSize = '32px';
        
        const subValue = document.createElement('div');
        subValue.className = 'text-display-sub';
        subValue.style.fontSize = '14px';
        subValue.style.color = '#888';
        
        container.appendChild(mainValue);
        container.appendChild(subValue);
        this.element.appendChild(container);
        
        this.valueElement = mainValue;
        this.subValueElement = subValue;
    }

    createScanlineDisplay() {
        const container = document.createElement('div');
        container.className = 'text-display-scanline';
        container.style.position = 'relative';
        container.style.overflow = 'hidden';
        
        const value = document.createElement('div');
        value.className = 'text-display-value';
        value.style.fontFamily = "'Courier New', monospace";
        value.style.letterSpacing = '2px';
        
        // Add scanline effect
        const scanline = document.createElement('div');
        scanline.style.position = 'absolute';
        scanline.style.top = '0';
        scanline.style.left = '0';
        scanline.style.right = '0';
        scanline.style.bottom = '0';
        scanline.style.background = 'repeating-linear-gradient(0deg, rgba(0, 255, 0, 0.05), rgba(0, 255, 0, 0.05) 1px, transparent 1px, transparent 2px)';
        scanline.style.pointerEvents = 'none';
        
        container.appendChild(value);
        container.appendChild(scanline);
        this.element.appendChild(container);
        this.valueElement = value;
    }

    updateData(statsData) {
        const value = this.getValue(statsData);
        if (value === null) return;

        const decimals = this.tileConfig.decimals !== undefined ? this.tileConfig.decimals : 1;
        const units = this.tileConfig.units || '';

        // Use this.displayStyle (now properly set after super)
        if (this.displayStyle === 'multi' && this.subValueElement) {
            // Main value
            this.valueElement.innerHTML = `${value.toFixed(decimals)}<span class="tile-units">${units}</span>`;
            
            // Sub value (could show additional info like percentage, trend, etc.)
            // For now, show the raw value with more precision
            this.subValueElement.textContent = `Exact: ${value.toFixed(2)}${units}`;
        } else {
            this.valueElement.innerHTML = `${value.toFixed(decimals)}<span class="tile-units">${units}</span>`;
        }

        // Apply warning/critical colors if thresholds exist
        if (this.tileConfig.threshold_critical && value >= this.tileConfig.threshold_critical) {
            this.valueElement.classList.add('critical');
        } else if (this.tileConfig.threshold_warning && value >= this.tileConfig.threshold_warning) {
            this.valueElement.classList.add('warning');
        } else {
            this.valueElement.classList.remove('critical', 'warning');
        }
    }
}
