/**
 * Live Preview Bridge - ENHANCED with new styles
 * CAREFULLY adds: Line graphs, Area graphs, Semi-circle gauges, Sparklines, etc.
 * WITHOUT breaking existing functionality
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
        this.fetchStats();
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
        
        // Apply font scale if set
        const fontScale = config.style?.fontScale || 100;
        preview.style.fontSize = `${fontScale}%`;
        
        // Build history for graphs and sparklines
        const needsHistory = config.type === 'cpu_graph' || 
                           config.type === 'network_graph' ||
                           config.style?.displayStyle === 'sparkline';
        
        if (needsHistory) {
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
            
            if (history.length > 60) history.shift();
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
                this.renderText(preview, config, value, fullStats, config.data_source, tileId);
                break;
            
            case 'button':
                this.renderButton(preview, config);
                break;
        }
    }
    
    // ===== CPU GRAPH RENDERING (with new styles) =====
    
    renderCPUGraph(preview, config, value, tileId) {
        const color = config.style.color || 'var(--color-primary)';
        const history = this.historyData.get(tileId) || [value];
        const label = this.getDataLabel(config.data_source);
        
        // Check for style preference (graphStyle property)
        const graphStyle = config.style.graphStyle || 'bar';
        
        if (graphStyle === 'line') {
            this.renderLineGraph(preview, history, color, value, label);
        } else if (graphStyle === 'area') {
            this.renderAreaGraph(preview, history, color, value, label);
        } else {
            // Default: bar graph
            this.renderBarGraph(preview, history, color, value, label);
        }
    }
    
    renderBarGraph(preview, history, color, value, label) {
        const bars = history.map(v => {
            const h = Math.max(5, Math.min(95, (v / 100) * 90));
            return `<div style="flex:1;background:${color};height:${h}%;opacity:0.8;border-radius:1px;transition:height 0.3s"></div>`;
        }).join('');
        
        preview.innerHTML = `
            ${label ? `<div style="position:absolute;top:4px;right:8px;font-size:9px;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:0.5px;z-index:2">${label}</div>` : ''}
            <div style="position:absolute;top:8px;left:8px;font-size:20px;font-weight:700;color:${color};z-index:2">
                ${value.toFixed(1)}%
            </div>
            <div style="position:absolute;inset:0;display:flex;align-items:flex-end;gap:2px;padding:35px 8px 8px">
                ${bars}
            </div>
        `;
    }
    
    renderLineGraph(preview, history, color, value, label) {
        const width = 100;
        const height = 100;
        const path = this.createSmoothPath(history, width, height);
        
        preview.innerHTML = `
            ${label ? `<div style="position:absolute;top:4px;right:8px;font-size:9px;color:var(--color-text-secondary);text-transform:uppercase;z-index:2">${label}</div>` : ''}
            <div style="position:absolute;top:8px;left:8px;font-size:20px;font-weight:700;color:${color};z-index:2">
                ${value.toFixed(1)}%
            </div>
            <svg style="position:absolute;inset:0;width:100%;height:100%;padding:35px 8px 8px" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
                <path d="${path}" fill="none" stroke="${color}" stroke-width="2" opacity="0.9"/>
            </svg>
        `;
    }
    
    renderAreaGraph(preview, history, color, value, label) {
        const width = 100;
        const height = 100;
        const path = this.createSmoothPath(history, width, height);
        const areaPath = path + ` L${width},${height} L0,${height} Z`;
        const gradId = 'grad-' + Math.random().toString(36).substr(2, 9);
        
        preview.innerHTML = `
            ${label ? `<div style="position:absolute;top:4px;right:8px;font-size:9px;color:var(--color-text-secondary);text-transform:uppercase;z-index:2">${label}</div>` : ''}
            <div style="position:absolute;top:8px;left:8px;font-size:20px;font-weight:700;color:${color};z-index:2">
                ${value.toFixed(1)}%
            </div>
            <svg style="position:absolute;inset:0;width:100%;height:100%;padding:35px 8px 8px" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
                <defs>
                    <linearGradient id="${gradId}" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style="stop-color:${color};stop-opacity:0.6" />
                        <stop offset="100%" style="stop-color:${color};stop-opacity:0.1" />
                    </linearGradient>
                </defs>
                <path d="${areaPath}" fill="url(#${gradId})" stroke="${color}" stroke-width="2" opacity="0.9"/>
            </svg>
        `;
    }
    
    createSmoothPath(history, width, height) {
        if (history.length < 2) return '';
        
        const points = history.map((v, i) => ({
            x: (i / (history.length - 1)) * width,
            y: height - (v / 100) * height * 0.8
        }));
        
        let path = `M ${points[0].x} ${points[0].y}`;
        
        for (let i = 0; i < points.length - 1; i++) {
            const current = points[i];
            const next = points[i + 1];
            const controlX = (current.x + next.x) / 2;
            
            path += ` Q ${controlX} ${current.y}, ${controlX} ${(current.y + next.y) / 2}`;
            path += ` Q ${controlX} ${next.y}, ${next.x} ${next.y}`;
        }
        
        return path;
    }
    
    // ===== NETWORK GRAPH RENDERING (with dual line option) =====
    
    renderNetworkGraph(preview, config, stats, tileId) {
        const upColor = config.style.upload_color || '#ff6b6b';
        const downColor = config.style.download_color || '#4ecdc4';
        const history = this.historyData.get(tileId) || [];
        
        if (history.length === 0) {
            preview.innerHTML = '<div style="color:var(--color-text-secondary);text-align:center;padding:20px">Loading...</div>';
            return;
        }
        
        const latest = history[history.length - 1];
        const label = this.getDataLabel(config.data_source);
        const networkStyle = config.style.networkStyle || 'bar';
        
        if (networkStyle === 'dual_line') {
            this.renderDualLineGraph(preview, history, upColor, downColor, latest, label);
        } else {
            this.renderDualBarGraph(preview, history, upColor, downColor, latest, label);
        }
    }
    
    renderDualBarGraph(preview, history, upColor, downColor, latest, label) {
        const maxSpeed = Math.max(...history.map(h => Math.max(h.upload, h.download)), 50);
        
        const upBars = history.map(h => {
            const pct = Math.max(2, (h.upload / maxSpeed) * 85); // Minimum 2% height
            return `<div style="flex:1;background:${upColor};height:${pct}%;opacity:0.8;border-radius:1px;transition:height 0.3s"></div>`;
        }).join('');
        
        const downBars = history.map(h => {
            const pct = Math.max(2, (h.download / maxSpeed) * 85); // Minimum 2% height
            return `<div style="flex:1;background:${downColor};height:${pct}%;opacity:0.8;border-radius:1px;transition:height 0.3s"></div>`;
        }).join('');
        
        preview.innerHTML = `
            ${label ? `<div style="position:absolute;top:4px;right:8px;font-size:9px;color:var(--color-text-secondary);text-transform:uppercase;z-index:2">${label}</div>` : ''}
            <div style="position:absolute;top:8px;left:8px;display:flex;gap:10px;font-size:11px;font-weight:600;z-index:2">
                <span style="color:${upColor}">↑${latest.upload.toFixed(0)}</span>
                <span style="color:${downColor}">↓${latest.download.toFixed(0)}</span>
            </div>
            <div style="position:absolute;inset:0;display:flex;align-items:flex-end;gap:3px;padding:30px 8px 8px">
                <div style="flex:1;display:flex;align-items:flex-end;gap:1px">${upBars}</div>
                <div style="flex:1;display:flex;align-items:flex-end;gap:1px">${downBars}</div>
            </div>
        `;
    }
    
    renderDualLineGraph(preview, history, upColor, downColor, latest, label) {
        const width = 100;
        const height = 100;
        const maxSpeed = Math.max(...history.map(h => Math.max(h.upload, h.download)), 50);
        
        const upPath = this.createNetworkPath(history.map(h => h.upload), maxSpeed, width, height);
        const downPath = this.createNetworkPath(history.map(h => h.download), maxSpeed, width, height);
        
        preview.innerHTML = `
            ${label ? `<div style="position:absolute;top:4px;right:8px;font-size:9px;color:var(--color-text-secondary);text-transform:uppercase;z-index:2">${label}</div>` : ''}
            <div style="position:absolute;top:8px;left:8px;display:flex;gap:10px;font-size:11px;font-weight:600;z-index:2">
                <span style="color:${upColor}">↑${latest.upload.toFixed(0)}</span>
                <span style="color:${downColor}">↓${latest.download.toFixed(0)}</span>
            </div>
            <svg style="position:absolute;inset:0;width:100%;height:100%;padding:30px 8px 8px" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
                <path d="${upPath}" fill="none" stroke="${upColor}" stroke-width="2" opacity="0.8"/>
                <path d="${downPath}" fill="none" stroke="${downColor}" stroke-width="2" opacity="0.8"/>
            </svg>
        `;
    }
    
    createNetworkPath(values, max, width, height) {
        if (values.length < 2) return '';
        
        const points = values.map((v, i) => ({
            x: (i / (values.length - 1)) * width,
            y: height - (v / max) * height * 0.8
        }));
        
        let path = `M ${points[0].x} ${points[0].y}`;
        for (let i = 1; i < points.length; i++) {
            path += ` L ${points[i].x} ${points[i].y}`;
        }
        
        return path;
    }
    
    // ===== GAUGE RENDERING (with new styles) =====
    
    renderGauge(preview, config, value, stats, dataSource) {
        const color = config.style.color || 'var(--color-secondary)';
        const label = this.getDataLabel(dataSource);
        
        let displayValue = value;
        let unit = '%';
        
        if (dataSource && dataSource.includes('temp')) {
            displayValue = value ? value.toFixed(0) : 'N/A';
            unit = value ? '°C' : '';
        } else {
            displayValue = value.toFixed(0);
        }
        
        const gaugeStyle = config.style.gaugeStyle || 'circle';
        
        if (gaugeStyle === 'semi') {
            this.renderSemiCircleGauge(preview, value, color, displayValue, unit, label);
        } else if (gaugeStyle === 'linear') {
            this.renderLinearGauge(preview, value, color, displayValue, unit, label);
        } else {
            this.renderCircularGauge(preview, value, color, displayValue, unit, label);
        }
    }
    
    renderCircularGauge(preview, value, color, displayValue, unit, label) {
        const percent = Math.min(100, Math.max(0, value || 0));
        const circumference = 2 * Math.PI * 40 * 0.75;
        const offset = circumference * (1 - percent / 100);
        
        preview.innerHTML = `
            ${label ? `<div style="position:absolute;top:4px;right:8px;font-size:9px;color:var(--color-text-secondary);text-transform:uppercase">${label}</div>` : ''}
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
    
    renderSemiCircleGauge(preview, value, color, displayValue, unit, label) {
        const percent = Math.min(100, Math.max(0, value || 0));
        const degrees = (percent / 100) * 180 - 90;
        
        preview.innerHTML = `
            ${label ? `<div style="position:absolute;top:4px;right:8px;font-size:9px;color:var(--color-text-secondary);text-transform:uppercase;z-index:10">${label}</div>` : ''}
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:flex-start;height:100%;padding-top:15px;gap:4px">
                <svg width="100%" height="60" viewBox="0 0 120 70" style="max-width:120px">
                    <path d="M 10 65 A 50 50 0 0 1 110 65" fill="none" stroke="#333" stroke-width="8" stroke-linecap="round"/>
                    <path d="M 10 65 A 50 50 0 0 1 110 65" fill="none" stroke="${color}" stroke-width="8" 
                          stroke-linecap="round" stroke-dasharray="157" stroke-dashoffset="${157 * (1 - percent/100)}"
                          style="transition:stroke-dashoffset 0.3s"/>
                    <circle cx="60" cy="65" r="6" fill="${color}"/>
                    <line x1="60" y1="65" x2="60" y2="25" stroke="${color}" stroke-width="2.5" 
                          style="transform-origin:60px 65px;transform:rotate(${degrees}deg);transition:transform 0.3s"/>
                </svg>
                <div style="font-size:20px;font-weight:700;color:${color};line-height:1">
                    ${displayValue}${unit}
                </div>
            </div>
        `;
    }
    
    renderLinearGauge(preview, value, color, displayValue, unit, label) {
        const percent = Math.min(100, Math.max(0, value || 0));
        
        preview.innerHTML = `
            ${label ? `<div style="position:absolute;top:4px;right:8px;font-size:9px;color:var(--color-text-secondary);text-transform:uppercase">${label}</div>` : ''}
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:20px;gap:12px">
                <div style="font-size:32px;font-weight:700;color:${color};line-height:1">
                    ${displayValue}${unit}
                </div>
                <div style="width:100%;height:12px;background:#333;border-radius:6px;overflow:hidden;position:relative">
                    <div style="position:absolute;left:0;top:0;height:100%;background:${color};width:${percent}%;transition:width 0.3s;border-radius:6px"></div>
                </div>
            </div>
        `;
    }
    
    // ===== TEXT DISPLAY RENDERING (with new styles) =====
    
    renderText(preview, config, value, stats, dataSource, tileId) {
        const color = config.style.color || 'var(--color-primary)';
        const label = this.getDataLabel(dataSource);
        
        let displayValue = value;
        let unit = '';
        
        if (dataSource) {
            if (dataSource.includes('percent') || dataSource.includes('usage')) {
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
        
        const displayStyle = config.style.displayStyle || 'number';
        
        if (displayStyle === 'sparkline') {
            this.renderSparkline(preview, tileId, value, displayValue, unit, color, label);
        } else if (displayStyle === 'icon') {
            this.renderIconValue(preview, displayValue, unit, color, label, dataSource);
        } else if (displayStyle === 'multi') {
            this.renderMultiValue(preview, stats, color, label, dataSource);
        } else {
            this.renderBigNumber(preview, displayValue, unit, color, label);
        }
    }
    
    renderBigNumber(preview, displayValue, unit, color, label) {
        preview.innerHTML = `
            ${label ? `<div style="position:absolute;top:4px;right:8px;font-size:9px;color:var(--color-text-secondary);text-transform:uppercase">${label}</div>` : ''}
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:4px">
                <div style="font-size:48px;font-weight:700;color:${color};line-height:1">
                    ${displayValue}${unit}
                </div>
            </div>
        `;
    }
    
    renderSparkline(preview, tileId, value, displayValue, unit, color, label) {
        const history = this.historyData.get(tileId) || [value];
        const width = 100;
        const height = 40;
        const max = Math.max(...history, 1);
        
        const path = history.length > 1 ? 
            history.map((v, i) => {
                const x = (i / (history.length - 1)) * width;
                const y = height - (v / max) * height;
                return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
            }).join(' ') : '';
        
        preview.innerHTML = `
            ${label ? `<div style="position:absolute;top:4px;right:8px;font-size:9px;color:var(--color-text-secondary);text-transform:uppercase;z-index:2">${label}</div>` : ''}
            <div style="position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:8px">
                <svg style="position:absolute;bottom:0;left:0;right:0;height:50%;opacity:0.3" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none">
                    <path d="${path}" fill="none" stroke="${color}" stroke-width="2"/>
                </svg>
                <div style="font-size:42px;font-weight:700;color:${color};line-height:1;z-index:2">
                    ${displayValue}${unit}
                </div>
            </div>
        `;
    }
    
    renderIconValue(preview, displayValue, unit, color, label, dataSource) {
        const icons = {
            'cpu': '🖥️', 'gpu': '🎮', 'ram': '💾', 'disk': '💿', 
            'network': '🌐', 'temp': '🌡️', 'speed': '⚡'
        };
        
        let icon = '📊';
        if (dataSource) {
            for (const [key, val] of Object.entries(icons)) {
                if (dataSource.includes(key)) {
                    icon = val;
                    break;
                }
            }
        }
        
        preview.innerHTML = `
            ${label ? `<div style="position:absolute;top:4px;right:8px;font-size:9px;color:var(--color-text-secondary);text-transform:uppercase">${label}</div>` : ''}
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:8px">
                <div style="font-size:48px;opacity:0.3">${icon}</div>
                <div style="font-size:36px;font-weight:700;color:${color};line-height:1;margin-top:-20px">
                    ${displayValue}${unit}
                </div>
            </div>
        `;
    }
    
    renderMultiValue(preview, stats, color, label, dataSource) {
        let primary = '', secondary = '', tertiary = '';
        
        if (dataSource && dataSource.includes('cpu')) {
            primary = `${stats.cpu?.usage?.toFixed(1) || 0}%`;
            secondary = stats.cpu?.temp ? `${stats.cpu.temp.toFixed(0)}°C` : '';
            tertiary = `${stats.cpu?.core_count || 0} cores`;
        } else if (dataSource && dataSource.includes('ram')) {
            primary = `${((stats.ram?.used || 0) / 1024).toFixed(1)} GB`;
            secondary = `${stats.ram?.percent?.toFixed(1) || 0}%`;
            tertiary = `of ${((stats.ram?.total || 0) / 1024).toFixed(0)} GB`;
        } else if (dataSource && dataSource.includes('gpu')) {
            primary = `${stats.gpu?.usage || 0}%`;
            secondary = stats.gpu?.temp ? `${stats.gpu.temp}°C` : '';
            tertiary = `${stats.gpu?.vram_used || 0} MB`;
        }
        
        preview.innerHTML = `
            ${label ? `<div style="position:absolute;top:4px;right:8px;font-size:9px;color:var(--color-text-secondary);text-transform:uppercase">${label}</div>` : ''}
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:4px;padding:15px">
                <div style="font-size:36px;font-weight:700;color:${color};line-height:1">
                    ${primary}
                </div>
                ${secondary ? `<div style="font-size:18px;font-weight:600;color:${color};opacity:0.7">${secondary}</div>` : ''}
                ${tertiary ? `<div style="font-size:12px;color:var(--color-text-secondary)">${tertiary}</div>` : ''}
            </div>
        `;
    }
    
    async renderButton(preview, config) {
        const buttonConfig = config.config || {};
        const iconType = buttonConfig.icon_type || 'emoji';
        
        let iconHTML = '';
        
        if (iconType === 'file' && buttonConfig.icon_path) {
            // Try to load custom icon
            const iconLoader = window.iconLoader || new IconLoader();
            const iconData = await iconLoader.getFileIcon(buttonConfig.icon_path, buttonConfig.icon);
            
            if (iconData.startsWith('data:')) {
                // It's an image data URL
                iconHTML = `<img src="${iconData}" style="width:48px;height:48px;object-fit:contain">`;
            } else {
                // It's an emoji fallback
                iconHTML = `<div style="font-size:48px">${iconData}</div>`;
            }
        } else {
            // Use emoji icon
            const icons = {
                'settings': '⚙️', 'app': '📱', 'folder': '📁', 'browser': '🌐',
                'terminal': '💻', 'play': '▶️', 'stop': '⏹️', 'refresh': '🔄',
                'game': '🎮', 'code': '💻', 'music': '🎵', 'video': '🎬',
                'photo': '📷', 'file': '📄'
            };
            const emoji = icons[buttonConfig.icon] || '📌';
            iconHTML = `<div style="font-size:48px">${emoji}</div>`;
        }
        
        const showLabel = buttonConfig.show_label !== false;
        const label = buttonConfig.label || '';
        
        preview.innerHTML = `
            <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:8px">
                ${iconHTML}
                ${showLabel && label ? `<div style="font-size:14px;color:var(--color-text-secondary);font-weight:500">${label}</div>` : ''}
            </div>
        `;
    }
    
    getDataLabel(dataSource) {
        if (!dataSource) return '';
        
        const labels = {
            'cpu.usage': 'CPU', 'cpu.temp': 'CPU TEMP', 'cpu.core_count': 'CORES',
            'gpu.usage': 'GPU', 'gpu.temp': 'GPU TEMP',
            'ram.percent': 'RAM', 'ram.used': 'RAM',
            'disk.usage_percent': 'DISK', 'disk.read_speed': 'READ', 'disk.write_speed': 'WRITE',
            'network.upload_speed': 'UPLOAD', 'network.download_speed': 'DOWNLOAD', 'network': 'NETWORK'
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
