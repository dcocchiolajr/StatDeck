/**
 * Theme Builder Component
 * Provides a visual theme creation/editing interface
 */

class ThemeBuilder {
    constructor(app) {
        this.app = app;
        this.themeManager = app.themeManager;
        this.editingThemeId = null;
        this.workingTheme = null;
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

    open(themeId = null) {
        this.editingThemeId = themeId;
        if (themeId && this.themeManager.themes[themeId]) {
            this.workingTheme = JSON.parse(JSON.stringify(this.themeManager.themes[themeId]));
        } else {
            this.workingTheme = this.themeManager.getBlankTheme();
            this.editingThemeId = null;
        }

        if (!this.workingTheme.shape) this.workingTheme.shape = 'square';
        if (!this.workingTheme.bgStyle) this.workingTheme.bgStyle = 'solid';

        this.isOpen = true;
        this.render();
        this.applyPreview();

        const panel = document.getElementById('theme-builder-panel');
        if (panel) panel.classList.add('open');
    }

    close() {
        this.isOpen = false;
        const panel = document.getElementById('theme-builder-panel');
        if (panel) panel.classList.remove('open');
        this.themeManager.applyTheme(this.themeManager.currentTheme);
    }

    applyPreview() {
        if (!this.workingTheme) return;
        const target = document.getElementById('tb-preview');
        if (!target) return;

        const c = this.workingTheme.colors;
        const eff = this.workingTheme.effects;

        target.style.setProperty('--color-primary', c.primary);
        target.style.setProperty('--color-secondary', c.secondary);
        target.style.setProperty('--color-accent', c.accent);
        target.style.setProperty('--color-background', c.background);
        target.style.setProperty('--color-surface', c.surface);
        target.style.setProperty('--color-text', c.text);
        target.style.setProperty('--color-text-secondary', c.textSecondary);
        target.style.setProperty('--color-border', c.border);

        target.style.setProperty('--font-main', this.workingTheme.fonts.main);
        target.style.setProperty('--font-mono', this.workingTheme.fonts.mono);

        target.setAttribute('data-theme', 'custom-preview');
        target.setAttribute('data-glow', eff.glow ? 'true' : 'false');
        target.setAttribute('data-scanlines', eff.scanlines ? 'true' : 'false');
        target.setAttribute('data-pixelated', eff.pixelated ? 'true' : 'false');
        target.setAttribute('data-bevel', eff.bevel ? 'true' : 'false');
        target.setAttribute('data-shape', this.workingTheme.shape || 'square');
    }

    save() {
        if (!this.workingTheme || !this.workingTheme.name.trim()) {
            alert('Please enter a theme name.');
            return;
        }

        // --- NEW: INJECT DEFAULT TRANSITION ---
        // This ensures the custom theme slides colors instead of snapping
        if (!this.workingTheme.transitions) {
            this.workingTheme.transitions = "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)";
        }

        if (this.editingThemeId && !this.themeManager.isBuiltin(this.editingThemeId)) {
            this.themeManager.updateCustomTheme(this.editingThemeId, this.workingTheme);
        } else {
            this.editingThemeId = this.themeManager.createCustomTheme(null, this.workingTheme);
        }

        if (this.editingThemeId && !this.themeManager.isBuiltin(this.editingThemeId)) {
            this.themeManager.updateCustomTheme(this.editingThemeId, this.workingTheme);
        } else {
            this.editingThemeId = this.themeManager.createCustomTheme(null, this.workingTheme);
        }

        this.themeManager.setTheme(this.editingThemeId);
        this.app.layout.theme = this.editingThemeId;
        this.app.markModified();

        const selector = document.getElementById('theme-selector');
        this.themeManager.populateDropdown(selector);
        selector.value = this.editingThemeId;

        this.close();
    }

    async deleteTheme() {
        if (!this.editingThemeId || this.themeManager.isBuiltin(this.editingThemeId)) return;

        const { ipcRenderer } = require('electron');
        const result = await ipcRenderer.invoke('show-message', {
            type: 'warning',
            buttons: ['Delete', 'Cancel'],
            title: 'Delete Theme',
            message: `Are you sure you want to delete "${this.workingTheme.name}"?`
        });

        if (result.response === 0) {
            this.themeManager.deleteCustomTheme(this.editingThemeId);
            const selector = document.getElementById('theme-selector');
            this.themeManager.populateDropdown(selector);
            selector.value = this.themeManager.currentTheme;
            this.close();
        }
    }

    async exportTheme() {
        const { ipcRenderer } = require('electron');
        const data = {
            statdeck_theme: true, version: '1.0',
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

    async importTheme() {
        const { ipcRenderer } = require('electron');
        const result = await ipcRenderer.invoke('open-dialog');

        if (!result.canceled && result.filePaths.length > 0) {
            try {
                const fs = require('fs');
                const data = JSON.parse(fs.readFileSync(result.filePaths[0], 'utf8'));
                const newId = this.themeManager.importTheme(data);

                if (newId) {
                    const selector = document.getElementById('theme-selector');
                    this.themeManager.populateDropdown(selector);
                    this.themeManager.setTheme(newId);
                    selector.value = newId;
                    this.app.layout.theme = newId;
                    this.app.markModified();
                    this.app.setStatus('Theme imported: ' + data.theme.name);
                    this.open(newId);
                }
            } catch (err) { alert('Failed to import theme.'); }
        }
    }

    render() {
        const panel = document.getElementById('theme-builder-content');
        if (!panel || !this.workingTheme) return;

        const t = this.workingTheme;
        const isNew = !this.editingThemeId;
        const isBuiltin = this.editingThemeId && this.themeManager.isBuiltin(this.editingThemeId);
        const title = isNew ? 'Create New Theme' : (isBuiltin ? 'Duplicate Built-in Theme' : 'Edit Custom Theme');

        if (isBuiltin) {
            this.editingThemeId = null;
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
                    <input type="text" id="tb-name" class="tb-input" value="${this.escapeHtml(t.name)}">
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
                            ${this.fontOptions.map(f => `<option value="${this.escapeHtml(f.value)}" ${t.fonts.main === f.value ? 'selected' : ''}>${f.label}</option>`).join('')}
                        </select>
                    </div>
                    <div class="tb-font-row">
                        <label class="tb-label">Mono Font</label>
                        <select id="tb-font-mono" class="tb-select">
                            ${this.fontOptions.filter(f => f.value.includes('mono') || f.value.includes('Courier')).map(f => `<option value="${this.escapeHtml(f.value)}" ${t.fonts.mono === f.value ? 'selected' : ''}>${f.label}</option>`).join('')}
                        </select>
                    </div>
                </div>
                
                <div class="tb-section">
                    <h4 class="tb-section-title">Shape & Background</h4>
                    
                    <div class="tb-font-row" style="margin-bottom: 15px;">
                        <label class="tb-label">Tile Shape</label>
                        <select id="tb-shape" class="tb-select">
                            <option value="square" ${t.shape === 'square' ? 'selected' : ''}>Square (Default)</option>
                            <option value="rounded" ${t.shape === 'rounded' ? 'selected' : ''}>Rounded (15px)</option>
                            <option value="circle" ${t.shape === 'circle' ? 'selected' : ''}>Pill / Circle</option>
                            <option value="borderless" ${t.shape === 'borderless' ? 'selected' : ''}>Borderless</option>
                        </select>
                    </div>

                    <div class="tb-font-row" style="margin-bottom: 15px;">
                        <label class="tb-label">Background Style</label>
                        <select id="tb-bg-style" class="tb-select">
                            <option value="solid" ${t.bgStyle === 'solid' || !t.bgStyle ? 'selected' : ''}>Solid Color</option>
                            <option value="linear" ${t.bgStyle === 'linear' ? 'selected' : ''}>Linear Gradient</option>
                            <option value="radial" ${t.bgStyle === 'radial' ? 'selected' : ''}>Radial Glow</option>
                        </select>
                    </div>

                    <div class="tb-effects-grid">
                        <label class="tb-toggle"><input type="checkbox" id="tb-effect-glow" ${t.effects.glow ? 'checked' : ''}><span>Glow</span></label>
                        <label class="tb-toggle"><input type="checkbox" id="tb-effect-scanlines" ${t.effects.scanlines ? 'checked' : ''}><span>Scanlines</span></label>
                        <label class="tb-toggle"><input type="checkbox" id="tb-effect-pixelated" ${t.effects.pixelated ? 'checked' : ''}><span>Pixelated</span></label>
                        <label class="tb-toggle"><input type="checkbox" id="tb-effect-bevel" ${t.effects.bevel ? 'checked' : ''}><span>3D Bevel</span></label>
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
                    <button id="tb-export" class="tb-btn tb-btn-secondary">📤 Export</button>
                    ${(!isNew && !isBuiltin) ? '<button id="tb-delete" class="tb-btn tb-btn-danger">🗑️ Delete</button>' : ''}
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

    bindEvents() {
        document.getElementById('tb-close')?.addEventListener('click', () => this.close());
        document.getElementById('tb-cancel')?.addEventListener('click', () => this.close());
        document.getElementById('tb-save')?.addEventListener('click', () => this.save());
        document.getElementById('tb-delete')?.addEventListener('click', () => this.deleteTheme());
        document.getElementById('tb-export')?.addEventListener('click', () => this.exportTheme());

        document.getElementById('tb-name')?.addEventListener('input', (e) => this.workingTheme.name = e.target.value);

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
                    if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) {
                        this.workingTheme.colors[key] = e.target.value;
                        if (picker) picker.value = e.target.value;
                        this.applyPreview();
                        this.updatePreview();
                    }
                });
            }
        });

        document.getElementById('tb-font-main')?.addEventListener('change', (e) => { this.workingTheme.fonts.main = e.target.value; this.applyPreview(); this.updatePreview(); });
        document.getElementById('tb-font-mono')?.addEventListener('change', (e) => { this.workingTheme.fonts.mono = e.target.value; this.applyPreview(); this.updatePreview(); });
        document.getElementById('tb-shape')?.addEventListener('change', (e) => { this.workingTheme.shape = e.target.value; this.applyPreview(); this.updatePreview(); });
        document.getElementById('tb-bg-style')?.addEventListener('change', (e) => { this.workingTheme.bgStyle = e.target.value; this.applyPreview(); this.updatePreview(); });

        ['glow', 'scanlines', 'pixelated', 'bevel'].forEach(effect => {
            document.getElementById('tb-effect-' + effect)?.addEventListener('change', (e) => {
                this.workingTheme.effects[effect] = e.target.checked;
                this.applyPreview();
                this.updatePreview();
            });
        });
    }

    updatePreview() {
        if (!this.workingTheme) return;
        const c = this.workingTheme.colors;
        const eff = this.workingTheme.effects;
        const shape = this.workingTheme.shape || 'square';
        const bgStyle = this.workingTheme.bgStyle || 'solid';

        const box = document.getElementById('tb-preview');
        if (box) {
            if (bgStyle === 'linear') {
                box.style.background = `linear-gradient(135deg, ${c.background} 0%, ${c.surface} 100%)`;
            } else if (bgStyle === 'radial') {
                box.style.background = `radial-gradient(circle at center, ${c.surface} 0%, ${c.background} 100%)`;
            } else {
                box.style.background = c.background;
            }
        }

        const tiles = document.querySelectorAll('.tb-preview-tile');
        tiles.forEach(tile => {
            tile.style.backgroundColor = c.surface;
            tile.style.borderColor = c.border;
            tile.style.fontFamily = this.workingTheme.fonts.main;

            tile.style.borderWidth = '1px';
            tile.style.borderStyle = 'solid';
            if (shape === 'rounded') tile.style.borderRadius = '15px';
            else if (shape === 'circle') tile.style.borderRadius = '50px';
            else if (shape === 'borderless') { tile.style.backgroundColor = 'transparent'; tile.style.border = 'none'; }
            else tile.style.borderRadius = '0';

            if (eff.glow && shape !== 'borderless') tile.style.boxShadow = `0 0 10px ${c.primary}40, inset 0 0 10px ${c.primary}10`;
            else if (eff.bevel && shape !== 'borderless') tile.style.boxShadow = `2px 2px 4px rgba(0,0,0,0.5), -1px -1px 3px rgba(255,255,255,0.1), inset 1px 1px 2px rgba(255,255,255,0.1)`;
            else tile.style.boxShadow = 'none';
        });

        document.querySelectorAll('.tb-preview-label').forEach(el => el.style.color = c.textSecondary);
        document.querySelectorAll('.tb-preview-value').forEach(el => {
            el.style.color = c.text;
            el.style.textShadow = eff.glow ? `0 0 10px ${c.primary}` : 'none';
        });
    }

    renderColorPicker(key, label, value) {
        return `<div class="tb-color-item"><label class="tb-color-label">${label}</label><div class="tb-color-controls"><input type="color" id="tb-color-${key}" class="tb-color-picker" value="${value}"><input type="text" id="tb-hex-${key}" class="tb-hex-input" value="${value}" maxlength="7" spellcheck="false"></div></div>`;
    }

    escapeHtml(str) {
        return !str ? '' : str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
}

if (typeof module !== 'undefined' && module.exports) module.exports = ThemeBuilder;