/**
 * Theme Builder Component
 * Provides a visual theme creation/editing interface
 * 
 * This is a NEW FILE - add to Config App components/ folder
 */

class ThemeBuilder {
    constructor(app) {
        this.app = app;
        this.themeManager = app.themeManager;
        this.editingThemeId = null;     // null = creating new, string = editing existing
        this.workingTheme = null;       // The theme being edited (live copy)
        this.isOpen = false;
        
        this.fontOptions = [
            { value: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", label: 'Inter (Default)' },
            { value: "'Orbitron', 'Arial', sans-serif", label: 'Orbitron (Futuristic)' },
            { value: "'Rajdhani', 'Arial', sans-serif", label: 'Rajdhani (Tech)' },
            { value: "'Press Start 2P', 'Courier New', monospace", label: 'Press Start 2P (Retro)' },
            { value: "'Courier New', monospace", label: 'Courier New (Monospace)' },
            { value: "'Teko', 'Arial', sans-serif", label: 'Teko (Modern)' },
            { value: "'Segoe UI', 'Roboto', 'Arial', sans-serif", label: 'Segoe UI (Classic)' },
            { value: "'Consolas', 'Courier New', monospace", label: 'Consolas (Code)' }
        ];
    }
    
    /**
     * Open the theme builder panel
     * @param {string|null} themeId - Theme to edit, or null for new
     */
    open(themeId = null) {
        this.editingThemeId = themeId;
        
        if (themeId && this.themeManager.themes[themeId]) {
            // Editing existing - deep clone
            this.workingTheme = JSON.parse(JSON.stringify(this.themeManager.themes[themeId]));
        } else {
            // New theme
            this.workingTheme = this.themeManager.getBlankTheme();
            this.editingThemeId = null;
        }
        
        this.isOpen = true;
        this.render();
        this.applyPreview();
        
        // Show the panel
        const panel = document.getElementById('theme-builder-panel');
        if (panel) panel.classList.add('open');
    }
    
    /**
     * Close the theme builder
     */
    close() {
        this.isOpen = false;
        const panel = document.getElementById('theme-builder-panel');
        if (panel) panel.classList.remove('open');
        
        // Restore the actual current theme
        this.themeManager.applyTheme(this.themeManager.currentTheme);
    }
    
    /**
     * Apply working theme as a live preview
     */
    applyPreview() {
        if (!this.workingTheme) return;
        
        const root = document.documentElement;
        const c = this.workingTheme.colors;
        
        root.style.setProperty('--color-primary', c.primary);
        root.style.setProperty('--color-secondary', c.secondary);
        root.style.setProperty('--color-accent', c.accent);
        root.style.setProperty('--color-background', c.background);
        root.style.setProperty('--color-surface', c.surface);
        root.style.setProperty('--color-text', c.text);
        root.style.setProperty('--color-text-secondary', c.textSecondary);
        root.style.setProperty('--color-border', c.border);
        
        root.style.setProperty('--font-main', this.workingTheme.fonts.main);
        root.style.setProperty('--font-mono', this.workingTheme.fonts.mono);
        
        const eff = this.workingTheme.effects;
        root.setAttribute('data-theme', 'custom-preview');
        root.setAttribute('data-glow', eff.glow ? 'true' : 'false');
        root.setAttribute('data-scanlines', eff.scanlines ? 'true' : 'false');
        root.setAttribute('data-pixelated', eff.pixelated ? 'true' : 'false');
        root.setAttribute('data-bevel', eff.bevel ? 'true' : 'false');
    }
    
    /**
     * Save the working theme
     */
    save() {
        if (!this.workingTheme || !this.workingTheme.name.trim()) {
            alert('Please enter a theme name.');
            return;
        }
        
        if (this.editingThemeId && !this.themeManager.isBuiltin(this.editingThemeId)) {
            // Update existing custom theme
            this.themeManager.updateCustomTheme(this.editingThemeId, this.workingTheme);
        } else {
            // Create new custom theme
            this.editingThemeId = this.themeManager.createCustomTheme(null, this.workingTheme);
        }
        
        // Apply the saved theme
        this.themeManager.setTheme(this.editingThemeId);
        this.app.layout.theme = this.editingThemeId;
        this.app.markModified();
        
        // Update the dropdown
        const selector = document.getElementById('theme-selector');
        this.themeManager.populateDropdown(selector);
        selector.value = this.editingThemeId;
        
        this.close();
    }
    
    /**
     * Delete the current custom theme being edited
     */
    async deleteTheme() {
        if (!this.editingThemeId || this.themeManager.isBuiltin(this.editingThemeId)) {
            return;
        }
        
        const { ipcRenderer } = require('electron');
        const result = await ipcRenderer.invoke('show-message', {
            type: 'warning',
            buttons: ['Delete', 'Cancel'],
            title: 'Delete Theme',
            message: `Are you sure you want to delete "${this.workingTheme.name}"? This cannot be undone.`
        });
        
        if (result.response === 0) {
            this.themeManager.deleteCustomTheme(this.editingThemeId);
            
            // Update dropdown
            const selector = document.getElementById('theme-selector');
            this.themeManager.populateDropdown(selector);
            selector.value = this.themeManager.currentTheme;
            
            this.close();
        }
    }
    
    /**
     * Export working theme to file
     */
    async exportTheme() {
        const { ipcRenderer } = require('electron');
        const data = {
            statdeck_theme: true,
            version: '1.0',
            id: this.editingThemeId || this.workingTheme.name.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
            theme: this.workingTheme
        };
        
        const filename = (this.workingTheme.name || 'theme').replace(/[^a-zA-Z0-9]/g, '_') + '.json';
        const result = await ipcRenderer.invoke('save-dialog', filename);
        
        if (!result.canceled && result.filePath) {
            const fs = require('fs');
            fs.writeFileSync(result.filePath, JSON.stringify(data, null, 2), 'utf8');
            this.app.setStatus('Theme exported: ' + result.filePath);
        }
    }
    
    /**
     * Import theme from file
     */
    async importTheme() {
        const { ipcRenderer } = require('electron');
        const result = await ipcRenderer.invoke('open-dialog');
        
        if (!result.canceled && result.filePaths.length > 0) {
            try {
                const fs = require('fs');
                const data = JSON.parse(fs.readFileSync(result.filePaths[0], 'utf8'));
                const newId = this.themeManager.importTheme(data);
                
                if (newId) {
                    // Update dropdown and switch to imported theme
                    const selector = document.getElementById('theme-selector');
                    this.themeManager.populateDropdown(selector);
                    this.themeManager.setTheme(newId);
                    selector.value = newId;
                    this.app.layout.theme = newId;
                    this.app.markModified();
                    this.app.setStatus('Theme imported: ' + data.theme.name);
                    
                    // Open builder to edit the imported theme
                    this.open(newId);
                } else {
                    alert('Invalid theme file.');
                }
            } catch (err) {
                alert('Failed to import theme: ' + err.message);
            }
        }
    }
    
    /**
     * Render the theme builder panel HTML
     */
    render() {
        const panel = document.getElementById('theme-builder-content');
        if (!panel || !this.workingTheme) return;
        
        const t = this.workingTheme;
        const isNew = !this.editingThemeId;
        const isBuiltin = this.editingThemeId && this.themeManager.isBuiltin(this.editingThemeId);
        const title = isNew ? 'Create New Theme' : (isBuiltin ? 'Duplicate Built-in Theme' : 'Edit Custom Theme');
        
        // If editing a built-in, change to "save as copy" mode
        if (isBuiltin) {
            this.editingThemeId = null; // Force save as new
            this.workingTheme.name = t.name + ' Custom';
        }
        
        panel.innerHTML = `
            <div class="tb-header">
                <h3>${title}</h3>
                <button class="tb-close-btn" id="tb-close" title="Close">✕</button>
            </div>
            
            <div class="tb-body">
                <div class="tb-section">
                    <label class="tb-label">Theme Name</label>
                    <input type="text" id="tb-name" class="tb-input" value="${this.escapeHtml(t.name)}" 
                           placeholder="My Custom Theme">
                </div>
                
                <div class="tb-section">
                    <h4 class="tb-section-title">Colors</h4>
                    <div class="tb-color-grid">
                        ${this.renderColorPicker('primary', 'Primary', t.colors.primary)}
                        ${this.renderColorPicker('secondary', 'Secondary', t.colors.secondary)}
                        ${this.renderColorPicker('accent', 'Accent', t.colors.accent)}
                        ${this.renderColorPicker('background', 'Background', t.colors.background)}
                        ${this.renderColorPicker('surface', 'Tile Surface', t.colors.surface)}
                        ${this.renderColorPicker('text', 'Text', t.colors.text)}
                        ${this.renderColorPicker('textSecondary', 'Label Text', t.colors.textSecondary)}
                        ${this.renderColorPicker('border', 'Border', t.colors.border)}
                    </div>
                </div>
                
                <div class="tb-section">
                    <h4 class="tb-section-title">Fonts</h4>
                    <div class="tb-font-row">
                        <label class="tb-label">Main Font</label>
                        <select id="tb-font-main" class="tb-select">
                            ${this.fontOptions.map(f => 
                                `<option value="${this.escapeHtml(f.value)}" ${t.fonts.main === f.value ? 'selected' : ''}>${f.label}</option>`
                            ).join('')}
                        </select>
                    </div>
                    <div class="tb-font-row">
                        <label class="tb-label">Mono Font</label>
                        <select id="tb-font-mono" class="tb-select">
                            ${this.fontOptions.filter(f => f.value.includes('mono') || f.value.includes('Courier') || f.value.includes('Consolas') || f.value.includes('Press Start')).map(f => 
                                `<option value="${this.escapeHtml(f.value)}" ${t.fonts.mono === f.value ? 'selected' : ''}>${f.label}</option>`
                            ).join('')}
                            ${!this.fontOptions.some(f => f.value === t.fonts.mono) ? `<option value="${this.escapeHtml(t.fonts.mono)}" selected>${t.fonts.mono}</option>` : ''}
                        </select>
                    </div>
                </div>
                
                <div class="tb-section">
                    <h4 class="tb-section-title">Effects</h4>
                    <div class="tb-effects-grid">
                        <label class="tb-toggle">
                            <input type="checkbox" id="tb-effect-glow" ${t.effects.glow ? 'checked' : ''}>
                            <span>Glow</span>
                        </label>
                        <label class="tb-toggle">
                            <input type="checkbox" id="tb-effect-scanlines" ${t.effects.scanlines ? 'checked' : ''}>
                            <span>Scanlines</span>
                        </label>
                        <label class="tb-toggle">
                            <input type="checkbox" id="tb-effect-pixelated" ${t.effects.pixelated ? 'checked' : ''}>
                            <span>Pixelated</span>
                        </label>
                        <label class="tb-toggle">
                            <input type="checkbox" id="tb-effect-bevel" ${t.effects.bevel ? 'checked' : ''}>
                            <span>3D Bevel</span>
                        </label>
                    </div>
                </div>
                
                <div class="tb-section tb-preview-section">
                    <h4 class="tb-section-title">Preview</h4>
                    <div class="tb-preview-box" id="tb-preview">
                        <div class="tb-preview-tile" id="tb-preview-tile">
                            <div class="tb-preview-label">CPU USAGE</div>
                            <div class="tb-preview-value">67%</div>
                        </div>
                        <div class="tb-preview-tile" id="tb-preview-tile2">
                            <div class="tb-preview-label">GPU TEMP</div>
                            <div class="tb-preview-value">72°C</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="tb-footer">
                <div class="tb-footer-left">
                    <button id="tb-export" class="tb-btn tb-btn-secondary" title="Export theme to file">📤 Export</button>
                    ${(!isNew && !isBuiltin) ? '<button id="tb-delete" class="tb-btn tb-btn-danger" title="Delete this theme">🗑️ Delete</button>' : ''}
                </div>
                <div class="tb-footer-right">
                    <button id="tb-cancel" class="tb-btn tb-btn-secondary">Cancel</button>
                    <button id="tb-save" class="tb-btn tb-btn-primary">💾 Save Theme</button>
                </div>
            </div>
        `;
        
        this.bindEvents();
        this.updatePreview();
    }
    
    /**
     * Bind all event listeners
     */
    bindEvents() {
        // Close button
        document.getElementById('tb-close')?.addEventListener('click', () => this.close());
        document.getElementById('tb-cancel')?.addEventListener('click', () => this.close());
        document.getElementById('tb-save')?.addEventListener('click', () => this.save());
        document.getElementById('tb-delete')?.addEventListener('click', () => this.deleteTheme());
        document.getElementById('tb-export')?.addEventListener('click', () => this.exportTheme());
        
        // Name
        document.getElementById('tb-name')?.addEventListener('input', (e) => {
            this.workingTheme.name = e.target.value;
        });
        
        // Color pickers
        const colorKeys = ['primary', 'secondary', 'accent', 'background', 'surface', 'text', 'textSecondary', 'border'];
        colorKeys.forEach(key => {
            const picker = document.getElementById('tb-color-' + key);
            const textInput = document.getElementById('tb-hex-' + key);
            
            if (picker) {
                picker.addEventListener('input', (e) => {
                    this.workingTheme.colors[key] = e.target.value;
                    if (textInput) textInput.value = e.target.value;
                    this.applyPreview();
                    this.updatePreview();
                });
            }
            if (textInput) {
                textInput.addEventListener('input', (e) => {
                    const val = e.target.value;
                    if (/^#[0-9a-fA-F]{6}$/.test(val)) {
                        this.workingTheme.colors[key] = val;
                        if (picker) picker.value = val;
                        this.applyPreview();
                        this.updatePreview();
                    }
                });
            }
        });
        
        // Fonts
        document.getElementById('tb-font-main')?.addEventListener('change', (e) => {
            this.workingTheme.fonts.main = e.target.value;
            this.applyPreview();
            this.updatePreview();
        });
        document.getElementById('tb-font-mono')?.addEventListener('change', (e) => {
            this.workingTheme.fonts.mono = e.target.value;
            this.applyPreview();
            this.updatePreview();
        });
        
        // Effects
        ['glow', 'scanlines', 'pixelated', 'bevel'].forEach(effect => {
            document.getElementById('tb-effect-' + effect)?.addEventListener('change', (e) => {
                this.workingTheme.effects[effect] = e.target.checked;
                this.applyPreview();
                this.updatePreview();
            });
        });
    }
    
    /**
     * Update the mini preview tiles
     */
    updatePreview() {
        if (!this.workingTheme) return;
        const c = this.workingTheme.colors;
        const eff = this.workingTheme.effects;
        
        const box = document.getElementById('tb-preview');
        if (box) {
            box.style.backgroundColor = c.background;
        }
        
        const tiles = document.querySelectorAll('.tb-preview-tile');
        tiles.forEach(tile => {
            tile.style.backgroundColor = c.surface;
            tile.style.borderColor = c.border;
            tile.style.fontFamily = this.workingTheme.fonts.main;
            
            if (eff.glow) {
                tile.style.boxShadow = `0 0 10px ${c.primary}40, inset 0 0 10px ${c.primary}10`;
            } else if (eff.bevel) {
                tile.style.boxShadow = `2px 2px 4px rgba(0,0,0,0.5), -1px -1px 3px rgba(255,255,255,0.1), inset 1px 1px 2px rgba(255,255,255,0.1)`;
            } else {
                tile.style.boxShadow = 'none';
            }
        });
        
        document.querySelectorAll('.tb-preview-label').forEach(el => {
            el.style.color = c.textSecondary;
        });
        document.querySelectorAll('.tb-preview-value').forEach(el => {
            el.style.color = c.text;
            if (eff.glow) {
                el.style.textShadow = `0 0 10px ${c.primary}`;
            } else {
                el.style.textShadow = 'none';
            }
        });
    }
    
    /**
     * Helper to render a color picker row
     */
    renderColorPicker(key, label, value) {
        return `
            <div class="tb-color-item">
                <label class="tb-color-label">${label}</label>
                <div class="tb-color-controls">
                    <input type="color" id="tb-color-${key}" class="tb-color-picker" value="${value}">
                    <input type="text" id="tb-hex-${key}" class="tb-hex-input" value="${value}" maxlength="7" spellcheck="false">
                </div>
            </div>
        `;
    }
    
    /**
     * Escape HTML for safe insertion
     */
    escapeHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeBuilder;
}
