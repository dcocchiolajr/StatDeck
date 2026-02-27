/**
 * Text Display Tile - Pi Display
 * VERSION: v3.2 - bulletproof value display
 * 
 * If a gauge can show the value, this tile MUST show it too.
 * Same getValue() from BaseTile, simplified formatting.
 */

class TextDisplayTile extends BaseTile {
    constructor(config) {
        super(config);
        this.displayStyle = this.style.displayStyle || 'number';
        console.log(`TextDisplayTile ${this.id}: ds=${this.dataSource}, style=${this.displayStyle}`);
    }

    createElement() {
        super.createElement();
        this.element.classList.add('text-display-tile');

        const displayStyle = (this.config.style && this.config.style.displayStyle) || 'number';
        this.displayStyle = displayStyle;

        // Label
        const label = document.createElement('div');
        label.className = 'tile-label text-display-label';
        label.textContent = this.tileConfig.label || this.getAutoLabel() || '';
        const lc = this.getLabelColor();
        if (lc) label.style.color = lc;
        this.element.appendChild(label);
        this.labelElement = label;

        // Value container based on display style
        if (displayStyle === 'multi') {
            this.createMultiLineDisplay();
        } else if (displayStyle === 'scanline' || displayStyle === 'sparkline') {
            this.createScanlineDisplay();
        } else if (displayStyle === 'bignum') {
            this.createBigNumberDisplay();
        } else if (displayStyle === 'icon') {
            this.createIconDisplay();
        } else {
            this.createNumberDisplay();
        }
    }

    getAutoLabel() {
        const ds = this.dataSource;
        if (!ds) return '';
        const labels = {
            'cpu.usage': 'CPU', 'cpu.temp': 'CPU TEMP', 'cpu.core_count': 'CORES',
            'gpu.usage': 'GPU', 'gpu.temp': 'GPU TEMP', 'gpu.vram_used': 'VRAM',
            'ram.percent': 'RAM', 'ram.used': 'RAM USED', 'ram.total': 'RAM TOTAL',
            'disk.usage_percent': 'DISK', 'disk.read_speed': 'DISK READ', 'disk.write_speed': 'DISK WRITE',
            'network.upload_speed': 'UPLOAD', 'network.download_speed': 'DOWNLOAD',
            'system.active_app': 'ACTIVE APP', 'system.active_process': 'PROCESS', 'system.uptime': 'UPTIME'
        };
        return labels[ds] || ds.split('.').pop().toUpperCase();
    }

    getDataIcon() {
        const ds = this.dataSource || '';
        if (ds.includes('cpu')) return '🖥️';
        if (ds.includes('gpu')) return '🎮';
        if (ds.includes('ram')) return '💾';
        if (ds.includes('disk')) return '💿';
        if (ds.includes('network') || ds.includes('upload') || ds.includes('download')) return '🌐';
        return '📊';
    }

    createNumberDisplay() {
        const value = document.createElement('div');
        value.className = 'tile-value text-display-value';
        const vc = this.getValueColor();
        if (vc) value.style.color = vc;
        this.element.appendChild(value);
        this.valueElement = value;
    }

    createBigNumberDisplay() {
        const value = document.createElement('div');
        value.className = 'tile-value text-display-value text-display-bignum';
        // Use em so it scales with grid + tile font scale
        value.style.fontSize = '2.5em';
        value.style.fontWeight = '900';
        value.style.lineHeight = '1';
        const vc = this.getValueColor();
        if (vc) value.style.color = vc;
        this.element.appendChild(value);
        this.valueElement = value;
    }

    createIconDisplay() {
        const container = document.createElement('div');
        container.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;flex:1;gap:2px';
        
        const icon = document.createElement('div');
        icon.className = 'text-display-icon';
        icon.style.cssText = 'font-size:2em;opacity:0.4;line-height:1';
        icon.textContent = this.getDataIcon();
        
        const value = document.createElement('div');
        value.className = 'tile-value text-display-value';
        value.style.cssText = 'font-size:1.8em;font-weight:700;line-height:1';
        const vc = this.getValueColor();
        if (vc) value.style.color = vc;
        
        container.appendChild(icon);
        container.appendChild(value);
        this.element.appendChild(container);
        this.valueElement = value;
    }

    createMultiLineDisplay() {
        const container = document.createElement('div');
        container.className = 'text-display-multi';
        container.style.cssText = 'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;flex:1;padding:4px';

        const mainValue = document.createElement('div');
        mainValue.className = 'tile-value text-display-value';
        mainValue.style.cssText = 'font-size:1.6em;font-weight:700;line-height:1';
        const vc = this.getValueColor();
        if (vc) mainValue.style.color = vc;

        const subValue = document.createElement('div');
        subValue.className = 'text-display-sub';
        subValue.style.cssText = 'font-size:0.9em;font-weight:600;opacity:0.7';
        if (vc) subValue.style.color = vc;

        const tertiaryValue = document.createElement('div');
        tertiaryValue.className = 'text-display-tertiary';
        tertiaryValue.style.cssText = 'font-size:0.75em;opacity:0.6';
        const lc = this.getLabelColor();
        if (lc) tertiaryValue.style.color = lc;

        container.appendChild(mainValue);
        container.appendChild(subValue);
        container.appendChild(tertiaryValue);
        this.element.appendChild(container);

        this.valueElement = mainValue;
        this.subValueElement = subValue;
        this.tertiaryElement = tertiaryValue;
    }

    createScanlineDisplay() {
        const container = document.createElement('div');
        container.style.cssText = 'position:relative;overflow:hidden;flex:1;display:flex;align-items:center;justify-content:center';

        const value = document.createElement('div');
        value.className = 'tile-value text-display-value';
        value.style.cssText = "font-family:'Courier New',monospace;letter-spacing:2px";
        const vc = this.getValueColor();
        if (vc) value.style.color = vc;

        const scanline = document.createElement('div');
        scanline.style.cssText = 'position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(0,255,0,0.05),rgba(0,255,0,0.05) 1px,transparent 1px,transparent 2px);pointer-events:none';

        container.appendChild(value);
        container.appendChild(scanline);
        this.element.appendChild(container);
        this.valueElement = value;
    }

    /**
     * Format any value based on its data source.
     * Handles ALL known data sources + fallback.
     */
    formatValue(value) {
        if (value == null || (typeof value === 'number' && isNaN(value))) return '--';
        if (typeof value === 'string') return value;
        
        const ds = this.dataSource || '';
        const v = Number(value);
        
        // Percentage values
        if (ds === 'cpu.usage' || ds === 'gpu.usage' || ds === 'ram.percent' || ds === 'disk.usage_percent') {
            return `${v.toFixed(1)}%`;
        }
        // Temperature values
        if (ds === 'cpu.temp' || ds === 'gpu.temp') {
            return `${v.toFixed(0)}°C`;
        }
        // RAM in MB → show as GB
        if (ds === 'ram.used' || ds === 'ram.total' || ds === 'ram.available') {
            return `${(v / 1024).toFixed(1)} GB`;
        }
        // Core count
        if (ds === 'cpu.core_count') {
            return `${v}`;
        }
        // Disk speeds in MB/s
        if (ds === 'disk.read_speed' || ds === 'disk.write_speed') {
            return `${v.toFixed(1)} MB/s`;
        }
        // Network speeds in KB/s
        if (ds === 'network.upload_speed' || ds === 'network.download_speed') {
            return `${v.toFixed(1)} KB/s`;
        }
        // VRAM in MB
        if (ds === 'gpu.vram_used' || ds === 'gpu.vram_total') {
            return `${v} MB`;
        }
        
        // Fallback: use tile config
        const decimals = this.tileConfig.decimals != null ? this.tileConfig.decimals : 1;
        const units = this.tileConfig.units || '';
        return `${v.toFixed(decimals)}${units}`;
    }

    updateData(statsData) {
        if (!this.valueElement) {
            console.warn(`TextDisplayTile ${this.id}: no valueElement!`);
            return;
        }

        if (this.displayStyle === 'multi') {
            this.updateMultiLineData(statsData);
            return;
        }

        // Single value display (number, bignum, icon, scanline)
        const value = this.getValue(statsData);
        const text = this.formatValue(value);
        
        // Only update DOM if changed
        if (this.valueElement.textContent !== text) {
            this.valueElement.textContent = text;
        }

        // Warning/critical
        this.applyThresholdClass(value);
    }

    applyThresholdClass(value) {
        if (value == null || isNaN(value)) return;
        
        const isCritical = this.tileConfig.threshold_critical && value >= this.tileConfig.threshold_critical;
        const isWarning = this.tileConfig.threshold_warning && value >= this.tileConfig.threshold_warning;
        
        if (isCritical && !this.valueElement.classList.contains('critical')) {
            this.valueElement.classList.remove('warning');
            this.valueElement.classList.add('critical');
        } else if (isWarning && !isCritical && !this.valueElement.classList.contains('warning')) {
            this.valueElement.classList.remove('critical');
            this.valueElement.classList.add('warning');
        } else if (!isCritical && !isWarning) {
            this.valueElement.classList.remove('critical', 'warning');
        }
    }

    updateMultiLineData(statsData) {
        let primary = '--', secondary = '', tertiary = '';

        const ds = this.dataSource || '';

        if (ds.includes('cpu')) {
            const o = statsData.cpu;
            if (o) {
                primary = o.usage != null ? `${Number(o.usage).toFixed(1)}%` : '--';
                secondary = o.temp != null ? `${Number(o.temp).toFixed(0)}°C` : '';
                tertiary = o.core_count != null ? `${o.core_count} cores` : '';
            }
        } else if (ds.includes('ram')) {
            const o = statsData.ram;
            if (o) {
                primary = o.used != null ? `${(o.used / 1024).toFixed(1)} GB` : '--';
                secondary = o.percent != null ? `${Number(o.percent).toFixed(1)}%` : '';
                tertiary = o.total != null ? `of ${(o.total / 1024).toFixed(0)} GB` : '';
            }
        } else if (ds.includes('gpu')) {
            const o = statsData.gpu;
            if (o) {
                primary = o.usage != null ? `${o.usage}%` : '--';
                secondary = o.temp != null ? `${o.temp}°C` : '';
                tertiary = o.vram_used != null ? `${o.vram_used} MB VRAM` : '';
            }
        } else if (ds.includes('disk')) {
            const o = statsData.disk;
            if (o) {
                primary = o.usage_percent != null ? `${Number(o.usage_percent).toFixed(1)}%` : '--';
                secondary = o.read_speed != null ? `R: ${o.read_speed.toFixed(1)} MB/s` : '';
                tertiary = o.write_speed != null ? `W: ${o.write_speed.toFixed(1)} MB/s` : '';
            }
        } else if (ds.includes('system')) {
            const o = statsData.system;
            if (o) {
                if (ds === 'system.active_app') {
                    primary = o.active_app || '--';
                    secondary = o.active_process || '';
                } else if (ds === 'system.active_process') {
                    primary = o.active_process || '--';
                    secondary = o.active_app || '';
                } else if (ds === 'system.uptime') {
                    const secs = o.uptime || 0;
                    const hrs = Math.floor(secs / 3600);
                    const mins = Math.floor((secs % 3600) / 60);
                    primary = `${hrs}h ${mins}m`;
                    secondary = `${secs.toLocaleString()}s`;
                } else {
                    primary = o[ds.split('.')[1]] || '--';
                }
            }
        } else if (ds.includes('network')) {
            const o = statsData.network;
            if (o) {
                primary = o.download_speed != null ? `↓ ${Number(o.download_speed).toFixed(1)} KB/s` : '--';
                secondary = o.upload_speed != null ? `↑ ${Number(o.upload_speed).toFixed(1)} KB/s` : '';
            }
        } else {
            // Fallback: show single value
            const value = this.getValue(statsData);
            primary = this.formatValue(value);
        }

        if (this.valueElement && this.valueElement.textContent !== primary) this.valueElement.textContent = primary;
        if (this.subValueElement && this.subValueElement.textContent !== secondary) this.subValueElement.textContent = secondary;
        if (this.tertiaryElement && this.tertiaryElement.textContent !== tertiary) this.tertiaryElement.textContent = tertiary;

        // Threshold on the primary value
        const value = this.getValue(statsData);
        this.applyThresholdClass(value);
    }
}
