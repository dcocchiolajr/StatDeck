/**
 * Gauge Tile
 * Displays a value as a circular gauge with style options
 */

class GaugeTile extends BaseTile {
    constructor(config) {
        super(config);
        this.currentValue = 0;
        this.gaugeStyle = this.style.gaugeStyle || 'circle'; // circle, semi, linear
        this.createGauge();
    }

    createElement() {
        super.createElement();

        // Add label
        const label = document.createElement('div');
        label.className = 'tile-label gauge-label';
        label.textContent = this.tileConfig.label || '';
        this.element.appendChild(label);

        // Add gauge container
        const container = document.createElement('div');
        container.className = 'gauge-container';
        this.element.appendChild(container);
        this.container = container;

        // Add value display
        const valueDiv = document.createElement('div');
        valueDiv.className = 'tile-value gauge-value';
        this.element.appendChild(valueDiv);
        this.valueElement = valueDiv;
    }

    createGauge() {
        const style = this.gaugeStyle;
        
        if (style === 'linear') {
            this.createLinearGauge();
        } else if (style === 'semi') {
            this.createSemiCircleGauge();
        } else {
            this.createCircleGauge();
        }
    }

    createCircleGauge() {
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

    createSemiCircleGauge() {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('gauge-svg');
        svg.setAttribute('viewBox', '0 0 100 60');

        // Background arc (semi-circle)
        const bgPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        bgPath.setAttribute('d', 'M 10 50 A 40 40 0 0 1 90 50');
        bgPath.setAttribute('fill', 'none');
        bgPath.setAttribute('stroke', '#333');
        bgPath.setAttribute('stroke-width', '8');
        svg.appendChild(bgPath);

        // Value arc (semi-circle)
        const valuePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        valuePath.setAttribute('fill', 'none');
        valuePath.setAttribute('stroke', this.style.color || '#00aaff');
        valuePath.setAttribute('stroke-width', '8');
        valuePath.setAttribute('stroke-linecap', 'round');

        svg.appendChild(valuePath);
        this.valuePath = valuePath;

        this.container.appendChild(svg);
    }

    createLinearGauge() {
        const container = document.createElement('div');
        container.style.width = '100%';
        container.style.height = '20px';
        container.style.background = '#333';
        container.style.borderRadius = '10px';
        container.style.overflow = 'hidden';
        container.style.position = 'relative';

        const bar = document.createElement('div');
        bar.style.height = '100%';
        bar.style.width = '0%';
        bar.style.background = this.style.color || '#00aaff';
        bar.style.transition = 'width 0.3s ease';
        
        container.appendChild(bar);
        this.container.appendChild(container);
        this.linearBar = bar;
    }

    updateData(statsData) {
        const value = this.getValue(statsData);
        if (value === null) return;

        this.currentValue = value;

        // Calculate percentage
        const min = this.tileConfig.min || 0;
        const max = this.tileConfig.max || 100;
        const percent = Math.max(0, Math.min(1, (value - min) / (max - min)));

        // Update gauge based on style
        if (this.gaugeStyle === 'linear') {
            this.linearBar.style.width = `${percent * 100}%`;
            
            // Update color based on thresholds
            if (this.tileConfig.threshold_critical && value >= this.tileConfig.threshold_critical) {
                this.linearBar.style.background = this.style.critical_color || '#ff0000';
            } else if (this.tileConfig.threshold_warning && value >= this.tileConfig.threshold_warning) {
                this.linearBar.style.background = this.style.warning_color || '#ffaa00';
            } else {
                this.linearBar.style.background = this.style.color || '#00aaff';
            }
        } else if (this.gaugeStyle === 'semi') {
            // Semi-circle: 0% = left, 100% = right
            const angle = percent * 180; // 0-180 degrees
            const radians = (angle - 90) * (Math.PI / 180);
            const endX = 50 + 40 * Math.cos(radians);
            const endY = 50 + 40 * Math.sin(radians);
            const largeArc = angle > 90 ? 1 : 0;
            
            const path = `M 10 50 A 40 40 0 ${largeArc} 1 ${endX} ${endY}`;
            this.valuePath.setAttribute('d', path);
            
            // Update color
            if (this.tileConfig.threshold_critical && value >= this.tileConfig.threshold_critical) {
                this.valuePath.setAttribute('stroke', this.style.critical_color || '#ff0000');
            } else if (this.tileConfig.threshold_warning && value >= this.tileConfig.threshold_warning) {
                this.valuePath.setAttribute('stroke', this.style.warning_color || '#ffaa00');
            } else {
                this.valuePath.setAttribute('stroke', this.style.color || '#00aaff');
            }
        } else {
            // Full circle
            const offset = this.circumference - (percent * this.circumference);
            this.valueCircle.setAttribute('stroke-dashoffset', offset);
            
            // Update color
            if (this.tileConfig.threshold_critical && value >= this.tileConfig.threshold_critical) {
                this.valueCircle.setAttribute('stroke', this.style.critical_color || '#ff0000');
            } else if (this.tileConfig.threshold_warning && value >= this.tileConfig.threshold_warning) {
                this.valueCircle.setAttribute('stroke', this.style.warning_color || '#ffaa00');
            } else {
                this.valueCircle.setAttribute('stroke', this.style.color || '#00aaff');
            }
        }

        // Update value text
        const units = this.tileConfig.units || '';
        this.valueElement.innerHTML = `${value.toFixed(0)}<span class="tile-units">${units}</span>`;

        // Apply warning/critical class to text
        if (this.tileConfig.threshold_critical && value >= this.tileConfig.threshold_critical) {
            this.valueElement.className = 'tile-value gauge-value critical';
        } else if (this.tileConfig.threshold_warning && value >= this.tileConfig.threshold_warning) {
            this.valueElement.className = 'tile-value gauge-value warning';
        } else {
            this.valueElement.className = 'tile-value gauge-value';
        }
    }
}
