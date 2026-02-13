/**
 * Live Preview Bridge - REAL DATA VERSION
 * Connects to Python HTTP server for actual PC stats
 */

class LivePreviewBridge {
    constructor(app) {
        this.app = app;
        this.enabled = false;
        this.updateInterval = null;
        this.currentStats = null;
        this.historyData = new Map();
        this.pollInterval = 500;
        this.apiUrl = 'http://localhost:8080/stats';
    }
    
    enable() {
        this.enabled = true;
        this.startPolling();
        this.app.setStatus('Live Preview: Connecting...');
    }
    
    disable() {
        this.enabled = false;
        this.stopPolling();
        this.clearPreviews();
        this.app.setStatus('Live Preview: Disabled');
    }
    
    toggle() {
        return this.enabled ? (this.disable(), false) : (this.enable(), true);
    }
    
    startPolling() {
        this.fetchStats(); // First fetch immediately
        this.updateInterval = setInterval(() => this.fetchStats(), this.pollInterval);
    }
    
    stopPolling() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
    
    clearPreviews() {
        this.app.gridCanvas.tiles.forEach(tile => {
            const preview = tile.element.querySelector('.tile-live-preview');
            if (preview) preview.remove();
            
            const typeLabel = tile.element.querySelector('.tile-type-label');
            const content = tile.element.querySelector('.tile-content');
            if (typeLabel) typeLabel.style.display = '';
            if (content) content.style.display = '';
        });
    }
    
    async fetchStats() {
        try {
            const response = await fetch(this.apiUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            
            const stats = await response.json();
            this.currentStats = stats;
            this.updateTiles(stats);
            this.app.setStatus('Live Preview: Active');
        } catch (error) {
            console.error('Failed to fetch stats:', error);
            this.app.setStatus('Live Preview: Connection failed');
        }
    }
    
    updateTiles(stats) {
        if (!this.enabled) return;
        
        this.app.gridCanvas.tiles.forEach((tile, tileId) => {
            const config = tile.config;
            const element = tile.element;
            
            // Hide original labels
            const typeLabel = element.querySelector('.tile-type-label');
            const content = element.querySelector('.tile-content');
            if (typeLabel) typeLabel.style.display = 'none';
            if (content) content.style.display = 'none';
            
            const value = this.getValueFromStats(stats, config.data_source);
            
            if (value !== null && value !== undefined) {
                this.updateTilePreview(element, config, value, stats, tileId);
            }
        });
    }
    
    getValueFromStats(stats, dataSource) {
        if (!dataSource) return null;
        
        const path = dataSource.split('.');
        let value = stats;
        
        for (const key of path) {
            if (value && value.hasOwnProperty(key)) {
                value = value[key];
            } else {
                return null;
            }
        }
        
        return value;
    }
    
    updateTilePreview(element, config, value, fullStats, tileId) {
        let preview = element.querySelector('.tile-live-preview');
        
        if (!preview) {
            preview = document.createElement('div');
            preview.className = 'tile-live-preview';
            element.appendChild(preview);
        }
        
        // Build history for graphs
        if (config.type === 'cpu_graph' || config.type === 'network_graph') {
            if (!this.historyData.has(tileId)) {
                this.historyData.set(tileId, []);
            }
            const history = this.historyData.get(tileId);
            
            if (config.type === 'network_graph') {
                history.push({
                    upload: fullStats.network?.upload_speed || 0,
                    download: fullStats.network?.download_speed || 0
                });
            } else {
                history.push(value);
            }
            
            if (history.length > 30) history.shift();
        }
        
        // Render based on tile type
        switch (config.type) {
            case 'cpu_graph':
                this.renderCPUGraph(preview, config, value, tileId);
                break;
            
            case 'network_graph':
                this.renderNetworkGraph(preview, config, fullStats, tileId);
                break;
            
            case 'gauge':
                this.renderGauge(preview, config, value, fullStats, config.data_source);
                break;
            
            case 'text_display':
                this.renderText(preview, config, value, fullStats, config.data_source);
                break;
            
            case 'button':
                this.renderButton(preview, config);
                break;
        }
    }
    
    renderCPUGraph(preview, config, value, tileId) {
        const color = config.style.color || '#00ff88';
        const history = this.historyData.get(tileId) || [value];
        
        const bars = history.map(v => {
            const h = Math.max(5, Math.min(95, (v / 100) * 90));
            return `<div style="flex:1;background:${color};height:${h}%;opacity:0.8;border-radius:1px;transition:height 0.3s"></div>`;
        }).join('');
        
        // Add label
        const label = this.getDataLabel(config.data_source);
        
        preview.innerHTML = `
            ${label ? `<div style="position:absolute;top:4px;right:8px;font-size:9px;color:#666;text-transform:uppercase;letter-spacing:0.5px">${label}</div>` : ''}
            <div style="position:absolute;top:8px;left:8px;font-size:20px;font-weight:700;color:${color}">
                ${value.toFixed(1)}%
            </div>
            <div style="position:absolute;inset:0;display:flex;align-items:flex-end;gap:2px;padding:35px 8px 8px">
                ${bars}
            </div>
        `;
    }
    
    renderNetworkGraph(preview, config, stats, tileId) {
        const upColor = '#ff6b6b';
        const downColor = '#4ecdc4';
        const history = this.historyData.get(tileId) || [];
        
        if (history.length === 0) {
            preview.innerHTML = '<div style="color:#666;text-align:center;padding:20px">Loading...</div>';
            return;
        }
        
        const maxSpeed = Math.max(...history.map(h => Math.max(h.upload, h.download)), 50);
        
        const upBars = history.map(h => {
            const pct = (h.upload / maxSpeed) * 85;
            return `<div style="flex:1;background:${upColor};height:${pct}%;opacity:0.7;border-radius:1px"></div>`;
        }).join('');
        
        const downBars = history.map(h => {
            const pct = (h.download / maxSpeed) * 85;
            return `<div style="flex:1;background:${downColor};height:${pct}%;opacity:0.7;border-radius:1px"></div>`;
        }).join('');
        
        const latest = history[history.length - 1];
        const label = this.getDataLabel(config.data_source);
        
        preview.innerHTML = `
            ${label ? `<div style="position:absolute;top:4px;right:8px;font-size:9px;color:#666;text-transform:uppercase">${label}</div>` : ''}
            <div style="position:absolute;top:8px;left:8px;display:flex;gap:10px;font-size:11px;font-weight:600">
                <span style="color:${upColor}">↑${latest.upload.toFixed(0)} KB/s</span>
                <span style="color:${downColor}">↓${latest.download.toFixed(0)} KB/s</span>
            </div>
            <div style="position:absolute;inset:0;display:flex;align-items:flex-end;gap:4px;padding:30px 8px 8px">
                <div style="flex:1;display:flex;align-items:flex-end;gap:1px">${upBars}</div>
                <div style="flex:1;display:flex;align-items:flex-end;gap:1px">${downBars}</div>
            </div>
        `;
    }
    
    renderGauge(preview, config, value, stats, dataSource) {
        const color = config.style.color || '#00aaff';
        const percent = Math.min(100, Math.max(0, value || 0));
        const circumference = 2 * Math.PI * 40 * 0.75;
        const offset = circumference * (1 - percent / 100);
        
        let displayValue = percent.toFixed(0);
        let unit = '%';
        
        if (dataSource && dataSource.includes('temp')) {
            displayValue = value ? value.toFixed(0) : 'N/A';
            unit = value ? '°C' : '';
        }
        
        const label = this.getDataLabel(dataSource);
        
        preview.innerHTML = `
            ${label ? `<div style="position:absolute;top:4px;right:8px;font-size:9px;color:#666;text-transform:uppercase">${label}</div>` : ''}
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:8px;padding-top:10px">
                <svg width="80" height="80" viewBox="0 0 100 100" style="transform:rotate(-135deg)">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#333" stroke-width="8"/>
                    <circle cx="50" cy="50" r="40" fill="none" stroke="${color}" stroke-width="8" 
                            stroke-dasharray="${circumference}" 
                            stroke-dashoffset="${offset}"
                            stroke-linecap="round"
                            style="transition:stroke-dashoffset 0.3s"/>
                </svg>
                <div style="font-size:28px;font-weight:700;color:${color};line-height:1">
                    ${displayValue}${unit}
                </div>
            </div>
        `;
    }
    
    renderText(preview, config, value, stats, dataSource) {
        const color = config.style.color || '#00ff88';
        let displayValue = value;
        let unit = '';
        
        // Smart formatting based on data source
        if (dataSource) {
            if (dataSource.includes('percent') || dataSource === 'ram.percent' || 
                dataSource === 'cpu.usage' || dataSource === 'gpu.usage' ||
                dataSource === 'disk.usage_percent') {
                displayValue = value.toFixed(1);
                unit = '%';
            } else if (dataSource.includes('temp')) {
                displayValue = value ? value.toFixed(0) : 'N/A';
                unit = value ? '°C' : '';
            } else if (dataSource === 'ram.used') {
                displayValue = (value / 1024).toFixed(1);
                unit = ' GB';
            } else if (dataSource.includes('speed')) {
                displayValue = value.toFixed(1);
                unit = dataSource.includes('network') ? ' KB/s' : ' MB/s';
            } else if (dataSource === 'cpu.core_count') {
                displayValue = value;
                unit = ' cores';
            }
        }
        
        const label = this.getDataLabel(dataSource);
        
        preview.innerHTML = `
            ${label ? `<div style="position:absolute;top:4px;right:8px;font-size:9px;color:#666;text-transform:uppercase">${label}</div>` : ''}
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:4px">
                <div style="font-size:48px;font-weight:700;color:${color};line-height:1">
                    ${displayValue}${unit}
                </div>
            </div>
        `;
    }
    
    renderButton(preview, config) {
        const icons = {
            'settings': '⚙️', 'app': '📱', 'folder': '📁', 'browser': '🌐',
            'terminal': '💻', 'play': '▶️', 'stop': '⏹️', 'refresh': '🔄'
        };
        const icon = icons[config.config.icon] || '📌';
        
        preview.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:8px">
                <div style="font-size:48px">${icon}</div>
                ${config.config.label ? `<div style="font-size:14px;color:#aaa;font-weight:500">${config.config.label}</div>` : ''}
            </div>
        `;
    }
    
    getDataLabel(dataSource) {
        if (!dataSource) return '';
        
        const labels = {
            'cpu.usage': 'CPU',
            'cpu.temp': 'CPU TEMP',
            'cpu.core_count': 'CORES',
            'gpu.usage': 'GPU',
            'gpu.temp': 'GPU TEMP',
            'ram.percent': 'RAM',
            'ram.used': 'RAM',
            'disk.usage_percent': 'DISK',
            'disk.read_speed': 'DISK READ',
            'disk.write_speed': 'DISK WRITE',
            'network.upload_speed': 'UPLOAD',
            'network.download_speed': 'DOWNLOAD',
            'network': 'NETWORK'
        };
        
        return labels[dataSource] || '';
    }
    
    isEnabled() {
        return this.enabled;
    }
    
    getCurrentStats() {
        return this.currentStats;
    }
}
