/**
 * Gauge Tile - Pi Display
 * VERSION: v3.2
 * Null-safe, efficient DOM updates, auto-labels, all 3 styles, theme colors
 */

class GaugeTile extends BaseTile {
    constructor(config) {
        super(config);
        this.currentValue = 0;
        this.gaugeStyle = this.style.gaugeStyle || 'circle';
        this.createGauge();
    }

    createElement() {
        super.createElement();

        const label = document.createElement('div');
        label.className = 'tile-label gauge-label';
        label.textContent = this.tileConfig.label || this.getAutoLabel() || '';
        const lc = this.getLabelColor();
        if (lc) label.style.color = lc;
        this.element.appendChild(label);
        this.labelElement = label;

        const container = document.createElement('div');
        container.className = 'gauge-container';
        this.element.appendChild(container);
        this.container = container;

        const valueDiv = document.createElement('div');
        valueDiv.className = 'tile-value gauge-value';
        const vc = this.getValueColor();
        if (vc) valueDiv.style.color = vc;
        this.element.appendChild(valueDiv);
        this.valueElement = valueDiv;
    }

    getAutoLabel() {
        const ds = this.dataSource;
        if (!ds) return '';
        const labels = {
            'cpu.usage': 'CPU', 'cpu.temp': 'CPU TEMP', 'cpu.core_count': 'CORES',
            'gpu.usage': 'GPU', 'gpu.temp': 'GPU TEMP',
            'ram.percent': 'RAM', 'ram.used': 'RAM USED',
            'disk.usage_percent': 'DISK', 'disk.read_speed': 'READ', 'disk.write_speed': 'WRITE',
            'network.upload_speed': 'UPLOAD', 'network.download_speed': 'DOWNLOAD'
        };
        return labels[ds] || '';
    }

    createGauge() {
        if (this.gaugeStyle === 'linear') this.createLinearGauge();
        else if (this.gaugeStyle === 'semi') this.createSemiCircleGauge();
        else this.createCircleGauge();
    }

    createCircleGauge() {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('gauge-svg');
        svg.setAttribute('viewBox', '0 0 100 100');

        const bg = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        bg.setAttribute('cx', '50'); bg.setAttribute('cy', '50'); bg.setAttribute('r', '40');
        bg.setAttribute('fill', 'none'); bg.setAttribute('stroke', '#333'); bg.setAttribute('stroke-width', '8');
        svg.appendChild(bg);

        const vc = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        vc.setAttribute('cx', '50'); vc.setAttribute('cy', '50'); vc.setAttribute('r', '40');
        vc.setAttribute('fill', 'none'); vc.setAttribute('stroke', this.style.color || '#00aaff');
        vc.setAttribute('stroke-width', '8'); vc.setAttribute('stroke-linecap', 'round');
        vc.setAttribute('transform', 'rotate(-90 50 50)');

        const circ = 2 * Math.PI * 40;
        vc.setAttribute('stroke-dasharray', circ); vc.setAttribute('stroke-dashoffset', circ);
        svg.appendChild(vc);
        this.valueCircle = vc;
        this.circumference = circ;
        this.container.appendChild(svg);
    }

    createSemiCircleGauge() {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('gauge-svg');
        svg.setAttribute('viewBox', '0 0 100 60');

        const bg = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        bg.setAttribute('d', 'M 10 50 A 40 40 0 0 1 90 50');
        bg.setAttribute('fill', 'none'); bg.setAttribute('stroke', '#333'); bg.setAttribute('stroke-width', '8');
        svg.appendChild(bg);

        const vp = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        vp.setAttribute('fill', 'none'); vp.setAttribute('stroke', this.style.color || '#00aaff');
        vp.setAttribute('stroke-width', '8'); vp.setAttribute('stroke-linecap', 'round');
        svg.appendChild(vp);
        this.valuePath = vp;
        this.container.appendChild(svg);
    }

    createLinearGauge() {
        const outer = document.createElement('div');
        outer.style.cssText = 'width:100%;height:20px;background:#333;border-radius:10px;overflow:hidden;position:relative';
        const bar = document.createElement('div');
        bar.style.cssText = `height:100%;width:0%;background:${this.style.color || '#00aaff'};transition:width 0.3s ease;border-radius:10px`;
        outer.appendChild(bar);
        this.linearBar = bar;
        this.container.appendChild(outer);
    }

    updateData(statsData) {
        const value = this.getValue(statsData);
        
        if (value == null || isNaN(value)) {
            if (this.valueElement.textContent !== '--') this.valueElement.textContent = '--';
            return;
        }

        this.currentValue = value;
        const max = this.tileConfig.max || 100;
        const percent = Math.min(1, Math.max(0, value / max));

        // Color: normal → warning → critical
        let color = this.style.color || '#00aaff';
        if (this.tileConfig.threshold_critical && value >= this.tileConfig.threshold_critical) {
            color = this.style.critical_color || '#ff0000';
        } else if (this.tileConfig.threshold_warning && value >= this.tileConfig.threshold_warning) {
            color = this.style.warning_color || '#ffaa00';
        }

        // Update gauge visual (only dynamic attributes)
        if (this.gaugeStyle === 'linear' && this.linearBar) {
            this.linearBar.style.width = `${percent * 100}%`;
            this.linearBar.style.background = color;
        } else if (this.gaugeStyle === 'semi' && this.valuePath) {
            const angle = percent * Math.PI;
            const endX = 50 - 40 * Math.cos(angle);
            const endY = 50 - 40 * Math.sin(angle);
            this.valuePath.setAttribute('d', `M 10 50 A 40 40 0 ${percent > 0.5 ? 1 : 0} 1 ${endX} ${endY}`);
            this.valuePath.setAttribute('stroke', color);
        } else if (this.valueCircle) {
            this.valueCircle.setAttribute('stroke-dashoffset', this.circumference - (percent * this.circumference));
            this.valueCircle.setAttribute('stroke', color);
        }

        // Format value text
        let text;
        if (this.dataSource && this.dataSource.includes('temp')) {
            text = `${value.toFixed(0)}°C`;
        } else if (this.dataSource === 'ram.used') {
            text = `${(value / 1024).toFixed(1)} GB`;
        } else {
            text = `${value.toFixed(0)}${this.tileConfig.units || ''}`;
        }
        if (this.valueElement.textContent !== text) this.valueElement.textContent = text;

        // Warning/critical class
        const base = 'tile-value gauge-value';
        const cls = (this.tileConfig.threshold_critical && value >= this.tileConfig.threshold_critical) ? `${base} critical`
            : (this.tileConfig.threshold_warning && value >= this.tileConfig.threshold_warning) ? `${base} warning` : base;
        if (this.valueElement.className !== cls) this.valueElement.className = cls;
    }
}
