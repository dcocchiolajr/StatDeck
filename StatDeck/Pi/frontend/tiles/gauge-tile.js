/**
 * Gauge Tile
 * Displays a value as a circular gauge
 */

class GaugeTile extends BaseTile {
    constructor(config) {
        super(config);
        this.currentValue = 0;
        this.createGauge();
    }
    
    createElement() {
        super.createElement();
        
        // Add label
        const label = document.createElement('div');
        label.className = 'tile-label';
        label.textContent = this.tileConfig.label || '';
        this.element.appendChild(label);
        
        // Add gauge container
        const container = document.createElement('div');
        container.className = 'gauge-container';
        this.element.appendChild(container);
        this.container = container;
        
        // Add value display
        const valueDiv = document.createElement('div');
        valueDiv.className = 'tile-value';
        this.element.appendChild(valueDiv);
        this.valueElement = valueDiv;
    }
    
    createGauge() {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('gauge-svg');
        svg.setAttribute('viewBox', '0 0 100 100');
        
        // Background arc
        const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        bgCircle.setAttribute('cx', '50');
        bgCircle.setAttribute('cy', '50');
        bgCircle.setAttribute('r', '40');
        bgCircle.setAttribute('fill', 'none');
        bgCircle.setAttribute('stroke', '#333');
        bgCircle.setAttribute('stroke-width', '8');
        svg.appendChild(bgCircle);
        
        // Value arc
        const valueCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        valueCircle.setAttribute('cx', '50');
        valueCircle.setAttribute('cy', '50');
        valueCircle.setAttribute('r', '40');
        valueCircle.setAttribute('fill', 'none');
        valueCircle.setAttribute('stroke', this.style.color || '#00aaff');
        valueCircle.setAttribute('stroke-width', '8');
        valueCircle.setAttribute('stroke-linecap', 'round');
        valueCircle.setAttribute('transform', 'rotate(-90 50 50)');
        
        const circumference = 2 * Math.PI * 40;
        valueCircle.setAttribute('stroke-dasharray', circumference);
        valueCircle.setAttribute('stroke-dashoffset', circumference);
        
        svg.appendChild(valueCircle);
        this.valueCircle = valueCircle;
        this.circumference = circumference;
        
        this.container.appendChild(svg);
    }
    
    updateData(statsData) {
        const value = this.getValue(statsData);
        if (value === null) return;
        
        this.currentValue = value;
        
        // Update gauge arc
        const min = this.tileConfig.min || 0;
        const max = this.tileConfig.max || 100;
        const percent = (value - min) / (max - min);
        const offset = this.circumference - (percent * this.circumference);
        this.valueCircle.setAttribute('stroke-dashoffset', offset);
        
        // Update value text
        const units = this.tileConfig.units || '';
        this.valueElement.innerHTML = `${value.toFixed(0)}<span class="tile-units">${units}</span>`;
        
        // Apply warning/critical colors
        if (this.tileConfig.threshold_critical && value >= this.tileConfig.threshold_critical) {
            this.valueElement.className = 'tile-value critical';
            this.valueCircle.setAttribute('stroke', this.style.critical_color || '#ff0000');
        }
        else if (this.tileConfig.threshold_warning && value >= this.tileConfig.threshold_warning) {
            this.valueElement.className = 'tile-value warning';
            this.valueCircle.setAttribute('stroke', this.style.warning_color || '#ffaa00');
        }
        else {
            this.valueElement.className = 'tile-value';
            this.valueCircle.setAttribute('stroke', this.style.color || '#00aaff');
        }
    }
}
