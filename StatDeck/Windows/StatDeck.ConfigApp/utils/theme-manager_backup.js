/**
 * Theme Manager - StatDeck Config App
 * VERSION: Unified Theme System v3.1
 * 
 * Changes:
 * - Synthwave restored: valueColor=#00ffff (cyan values), textSecondary=#ff00ff (magenta labels)
 * - valueColor on every theme matching original Pi appearance
 * - 4 new themes: Ocean Deep, Dracula, Amber Terminal, Midnight
 * - --color-value CSS variable for accurate preview
 * - labelColor support for per-tile label overrides
 */

const fs = require('fs');
const path = require('path');

class ThemeManager {
    constructor() {
        this.currentTheme = 'dark';
        
        this.builtinThemes = {
            dark: {
                name: 'Dark',
                builtin: true,
                colors: {
                    primary: '#00ff88',
                    secondary: '#4ecdc4',
                    accent: '#ff6b6b',
                    background: '#0a0e27',
                    surface: '#1a1a2e',
                    text: '#ffffff',
                    textSecondary: '#a0aec0',
                    border: '#2d3748',
                    valueColor: '#00ff88'
                },
                fonts: {
                    main: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    mono: "'Courier New', monospace"
                },
                effects: { glow: false, scanlines: false, pixelated: false, bevel: false }
            },
            light: {
                name: 'Light',
                builtin: true,
                colors: {
                    primary: '#3b82f6',
                    secondary: '#8b5cf6',
                    accent: '#f59e0b',
                    background: '#f7fafc',
                    surface: '#ffffff',
                    text: '#1a202c',
                    textSecondary: '#718096',
                    border: '#e2e8f0',
                    valueColor: '#3b82f6'
                },
                fonts: {
                    main: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    mono: "'Courier New', monospace"
                },
                effects: { glow: false, scanlines: false, pixelated: false, bevel: false }
            },
            synthwave: {
                name: 'Synthwave',
                builtin: true,
                colors: {
                    primary: '#ff00ff',
                    secondary: '#00ffff',
                    accent: '#ff1493',
                    background: '#1a0033',
                    surface: '#2d1b4e',
                    text: '#ffffff',
                    textSecondary: '#ff00ff',
                    border: '#ff00ff',
                    valueColor: '#00ffff'
                },
                fonts: {
                    main: "'Orbitron', 'Arial', sans-serif",
                    mono: "'Courier New', monospace"
                },
                effects: { glow: true, scanlines: false, pixelated: false, bevel: false }
            },
            cyberpunk: {
                name: 'Cyberpunk',
                builtin: true,
                colors: {
                    primary: '#00fff9',
                    secondary: '#ff2e97',
                    accent: '#ffed00',
                    background: '#000000',
                    surface: '#0a0a0a',
                    text: '#00fff9',
                    textSecondary: '#ff2e97',
                    border: '#00fff9',
                    valueColor: '#00fff9'
                },
                fonts: {
                    main: "'Rajdhani', 'Arial', sans-serif",
                    mono: "'Courier New', monospace"
                },
                effects: { glow: true, scanlines: false, pixelated: false, bevel: false }
            },
            pixel: {
                name: '8-Bit',
                builtin: true,
                colors: {
                    primary: '#ff71ce',
                    secondary: '#01cdfe',
                    accent: '#fffb96',
                    background: '#0d0221',
                    surface: '#1a0a3e',
                    text: '#ffffff',
                    textSecondary: '#b967ff',
                    border: '#05ffa1',
                    valueColor: '#01cdfe'
                },
                fonts: {
                    main: "'Press Start 2P', 'Courier New', monospace",
                    mono: "'Press Start 2P', monospace"
                },
                effects: { glow: true, scanlines: true, pixelated: false, bevel: false }
            },
            neon: {
                name: 'Neon',
                builtin: true,
                colors: {
                    primary: '#00ff00',
                    secondary: '#ff00ff',
                    accent: '#00ffff',
                    background: '#000000',
                    surface: '#0a0a0a',
                    text: '#00ff00',
                    textSecondary: '#ff00ff',
                    border: '#00ff00',
                    valueColor: '#00ff00'
                },
                fonts: {
                    main: "'Teko', 'Arial', sans-serif",
                    mono: "'Courier New', monospace"
                },
                effects: { glow: true, scanlines: false, pixelated: false, bevel: false }
            },
            matrix: {
                name: 'Matrix',
                builtin: true,
                colors: {
                    primary: '#00ff41',
                    secondary: '#008f11',
                    accent: '#00ff41',
                    background: '#0d0208',
                    surface: '#1a1a1a',
                    text: '#00ff41',
                    textSecondary: '#008f11',
                    border: '#00ff41',
                    valueColor: '#00ff41'
                },
                fonts: {
                    main: "'Courier New', monospace",
                    mono: "'Courier New', monospace"
                },
                effects: { glow: true, scanlines: false, pixelated: false, bevel: false }
            },
            nord: {
                name: 'Nord',
                builtin: true,
                colors: {
                    primary: '#88c0d0',
                    secondary: '#81a1c1',
                    accent: '#bf616a',
                    background: '#2e3440',
                    surface: '#3b4252',
                    text: '#eceff4',
                    textSecondary: '#d8dee9',
                    border: '#4c566a',
                    valueColor: '#88c0d0'
                },
                fonts: {
                    main: "'Inter', sans-serif",
                    mono: "'Courier New', monospace"
                },
                effects: { glow: false, scanlines: false, pixelated: false, bevel: false }
            },
            sunset: {
                name: 'Sunset',
                builtin: true,
                colors: {
                    primary: '#ff6b6b',
                    secondary: '#feca57',
                    accent: '#ee5a6f',
                    background: '#2d132c',
                    surface: '#3d1e36',
                    text: '#ffffff',
                    textSecondary: '#feca57',
                    border: '#ff6b6b',
                    valueColor: '#ff6b6b'
                },
                fonts: {
                    main: "'Inter', sans-serif",
                    mono: "'Courier New', monospace"
                },
                effects: { glow: true, scanlines: false, pixelated: false, bevel: false }
            },
            gameboy: {
                name: 'GameBoy',
                builtin: true,
                colors: {
                    primary: '#9bbc0f',
                    secondary: '#8bac0f',
                    accent: '#cadc09',
                    background: '#0f380f',
                    surface: '#1e4a1e',
                    text: '#9bbc0f',
                    textSecondary: '#8bac0f',
                    border: '#306230',
                    valueColor: '#9bbc0f'
                },
                fonts: {
                    main: "'Press Start 2P', 'Courier New', monospace",
                    mono: "'Press Start 2P', monospace"
                },
                effects: { glow: false, scanlines: true, pixelated: true, bevel: false }
            },
            '3d': {
                name: '3D Classic',
                builtin: true,
                colors: {
                    primary: '#5a9fd4',
                    secondary: '#7ab8e8',
                    accent: '#ff9500',
                    background: '#c0c0c0',
                    surface: '#d4d4d4',
                    text: '#000000',
                    textSecondary: '#404040',
                    border: '#808080',
                    valueColor: '#000000'
                },
                fonts: {
                    main: "'Segoe UI', 'Tahoma', 'Arial', sans-serif",
                    mono: "'Consolas', 'Courier New', monospace"
                },
                effects: { glow: false, scanlines: false, pixelated: false, bevel: true }
            },
            ocean: {
                name: 'Ocean Deep',
                builtin: true,
                colors: {
                    primary: '#00b4d8',
                    secondary: '#0077b6',
                    accent: '#90e0ef',
                    background: '#03071e',
                    surface: '#023e8a',
                    text: '#caf0f8',
                    textSecondary: '#48cae4',
                    border: '#0077b6',
                    valueColor: '#00b4d8'
                },
                fonts: {
                    main: "'Inter', 'Arial', sans-serif",
                    mono: "'Courier New', monospace"
                },
                effects: { glow: true, scanlines: false, pixelated: false, bevel: false }
            },
            dracula: {
                name: 'Dracula',
                builtin: true,
                colors: {
                    primary: '#bd93f9',
                    secondary: '#ff79c6',
                    accent: '#50fa7b',
                    background: '#282a36',
                    surface: '#44475a',
                    text: '#f8f8f2',
                    textSecondary: '#6272a4',
                    border: '#6272a4',
                    valueColor: '#bd93f9'
                },
                fonts: {
                    main: "'Inter', 'Segoe UI', sans-serif",
                    mono: "'Fira Code', 'Courier New', monospace"
                },
                effects: { glow: false, scanlines: false, pixelated: false, bevel: false }
            },
            amber: {
                name: 'Amber Terminal',
                builtin: true,
                colors: {
                    primary: '#ffb000',
                    secondary: '#ff8800',
                    accent: '#ffcc00',
                    background: '#0a0800',
                    surface: '#1a1400',
                    text: '#ffb000',
                    textSecondary: '#996600',
                    border: '#ffb000',
                    valueColor: '#ffb000'
                },
                fonts: {
                    main: "'Courier New', monospace",
                    mono: "'Courier New', monospace"
                },
                effects: { glow: true, scanlines: true, pixelated: false, bevel: false }
            },
            midnight: {
                name: 'Midnight',
                builtin: true,
                colors: {
                    primary: '#e0aaff',
                    secondary: '#c77dff',
                    accent: '#9d4edd',
                    background: '#10002b',
                    surface: '#240046',
                    text: '#e0aaff',
                    textSecondary: '#7b2cbf',
                    border: '#9d4edd',
                    valueColor: '#e0aaff'
                },
                fonts: {
                    main: "'Inter', 'Arial', sans-serif",
                    mono: "'Courier New', monospace"
                },
                effects: { glow: true, scanlines: false, pixelated: false, bevel: false }
            }
        };
        
        this.customThemes = {};
        this.themes = {};
        this.loadCustomThemes();
        this.rebuildThemes();
    }
    
    getCustomThemesPath() {
        return path.join(__dirname, '..', 'custom-themes.json');
    }
    
    loadCustomThemes() {
        try {
            const filePath = this.getCustomThemesPath();
            if (fs.existsSync(filePath)) {
                const data = fs.readFileSync(filePath, 'utf8');
                this.customThemes = JSON.parse(data) || {};
                console.log(`Loaded ${Object.keys(this.customThemes).length} custom theme(s)`);
            }
        } catch (err) {
            console.error('Failed to load custom themes:', err.message);
            this.customThemes = {};
        }
    }
    
    saveCustomThemes() {
        try {
            fs.writeFileSync(this.getCustomThemesPath(), JSON.stringify(this.customThemes, null, 2), 'utf8');
        } catch (err) {
            console.error('Failed to save custom themes:', err.message);
        }
    }

    exportThemeToFolder(themeId, themeData) {
        // 1. Generate the hidden META tag for the Config App
        const meta = {
            name: themeData.name,
            colors: themeData.colors,
            fonts: themeData.fonts,
            effects: themeData.effects
        };
        const metaTag = `/* META: ${JSON.stringify(meta)} */\n`;

        // 2. Extract settings
        const c = themeData.colors || {};
        const eff = themeData.effects || {};
        const valColor = c.valueColor || c.primary || '#ffffff';

        // 3. Generate the actual CSS for the Raspberry Pi!
        let css = metaTag + `\n/* Auto-generated custom theme: ${themeData.name} */\n`;
        css += `body[data-theme="${themeId}"] {\n    font-family: ${themeData.fonts ? themeData.fonts.main : 'sans-serif'};\n    background: ${c.background || '#000000'};\n}\n\n`;

        // Build the Tile Borders & Backgrounds
        css += `body[data-theme="${themeId}"] .tile, body[data-theme="${themeId}"] .cpu-graph-tile, body[data-theme="${themeId}"] .gauge-tile, body[data-theme="${themeId}"] .text-display-tile, body[data-theme="${themeId}"] .button-tile, body[data-theme="${themeId}"] .network-graph-tile, body[data-theme="${themeId}"] .page-nav-tile {\n`;
        if (eff.glow) {
            css += `    background: linear-gradient(135deg, ${c.surface} 0%, #000000 100%) !important;\n    border: 2px solid ${c.primary} !important;\n    box-shadow: 0 0 15px ${c.primary}80, inset 0 0 10px ${c.primary}20 !important;\n`;
        } else if (eff.bevel) {
            css += `    background: ${c.surface} !important;\n    border: none !important;\n    border-radius: 4px !important;\n    box-shadow: inset 2px 2px 0 rgba(255,255,255,0.3), inset -2px -2px 0 rgba(0,0,0,0.3), 3px 3px 6px rgba(0,0,0,0.25) !important;\n`;
        } else {
            css += `    background: ${c.surface} !important;\n    border: 1px solid ${c.border} !important;\n`;
        }
        css += `}\n\n`;

        // Build the Text Colors & Glows
        css += `body[data-theme="${themeId}"] .tile-value, body[data-theme="${themeId}"] .gauge-value, body[data-theme="${themeId}"] .text-display-value {\n    color: ${valColor} !important;\n`;
        if (eff.glow) css += `    text-shadow: 0 0 10px ${valColor}, 0 0 20px ${valColor}80;\n    font-weight: 700;\n`;
        css += `}\n\n`;

        // Add smooth default Tap Animations & Page Transitions
        css += `@keyframes custom-tap-${themeId} { 0% { transform: scale(0.92); } 50% { transform: scale(1.02); } 100% { transform: scale(1); } }\n`;
        css += `body[data-theme="${themeId}"] .tile.tap-flash { animation: custom-tap-${themeId} 0.3s ease !important; }\n\n`;
        css += `@keyframes custom-exit-${themeId} { 0% { opacity: 1; transform: scale(1); } 100% { opacity: 0; transform: scale(0.95); } }\n`;
        css += `@keyframes custom-enter-${themeId} { 0% { opacity: 0; transform: scale(1.05); } 100% { opacity: 1; transform: scale(1); } }\n`;
        css += `body[data-theme="${themeId}"] #tile-grid.page-exit-next, body[data-theme="${themeId}"] #tile-grid.page-exit-prev { animation: custom-exit-${themeId} 0.3s forwards; }\n`;
        css += `body[data-theme="${themeId}"] #tile-grid.page-enter-next, body[data-theme="${themeId}"] #tile-grid.page-enter-prev { animation: custom-enter-${themeId} 0.4s forwards; }\n`;

        // 4. Send it to main.js to save as a real .css file!
        require('electron').ipcRenderer.invoke('save-theme-file', themeId, css).catch(err => console.error(err));
    }

    
    rebuildThemes() {
        this.themes = { ...this.builtinThemes, ...this.customThemes };
    }
    
    createCustomTheme(id, themeData) {
        if (!id) id = themeData.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
        if (this.builtinThemes[id]) id = 'custom_' + id;
        let uniqueId = id;
        let counter = 1;
        while (this.customThemes[uniqueId]) { uniqueId = id + '_' + counter; counter++; }
        themeData.builtin = false;
        if (!themeData.colors.valueColor) themeData.colors.valueColor = themeData.colors.primary;
        this.customThemes[uniqueId] = themeData;
        this.saveCustomThemes();
        this.rebuildThemes();

        this.exportThemeToFolder(uniqueId, themeData);

        return uniqueId;
    }
    
    updateCustomTheme(id, themeData) {
        if (this.builtinThemes[id]) return false;
        if (!this.customThemes[id]) return false;
        themeData.builtin = false;
        if (!themeData.colors.valueColor) themeData.colors.valueColor = themeData.colors.primary;
        this.customThemes[id] = themeData;
        this.saveCustomThemes();
        this.rebuildThemes();

        this.exportThemeToFolder(id, themeData);

        return true;
    }
    
    deleteCustomTheme(id) {
        if (this.builtinThemes[id]) return false;
        if (!this.customThemes[id]) return false;
        delete this.customThemes[id];
        this.saveCustomThemes();
        this.rebuildThemes();
        if (this.currentTheme === id) this.setTheme('dark');
        return true;
    }
    
    duplicateTheme(sourceId, newName) {
        const source = this.themes[sourceId];
        if (!source) return null;
        const newTheme = JSON.parse(JSON.stringify(source));
        newTheme.name = newName || (source.name + ' Copy');
        newTheme.builtin = false;
        return this.createCustomTheme(null, newTheme);
    }
    
    exportTheme(id) {
        const theme = this.themes[id];
        if (!theme) return null;
        return { statdeck_theme: true, version: '1.0', id, theme: JSON.parse(JSON.stringify(theme)) };
    }
    
    importTheme(data) {
        try {
            if (!data.statdeck_theme || !data.theme) return null;
            data.theme.builtin = false;
            if (!data.theme.name || !data.theme.colors || !data.theme.fonts || !data.theme.effects) return null;
            return this.createCustomTheme(data.id || null, data.theme);
        } catch (err) { return null; }
    }
    
    getCurrentTheme() { return this.themes[this.currentTheme]; }
    getTheme(themeName) { return this.themes[themeName] || this.themes.dark; }
    isBuiltin(themeId) { return !!this.builtinThemes[themeId]; }
    
    setTheme(themeName) {
        if (this.themes[themeName]) {
            this.currentTheme = themeName;
            this.applyTheme(themeName);
            return true;
        }
        return false;
    }
    
    applyTheme(themeName) {
        const theme = this.themes[themeName];
        if (!theme) return;
        const root = document.documentElement;
        
        root.style.setProperty('--color-primary', theme.colors.primary);
        root.style.setProperty('--color-secondary', theme.colors.secondary);
        root.style.setProperty('--color-accent', theme.colors.accent);
        root.style.setProperty('--color-background', theme.colors.background);
        root.style.setProperty('--color-surface', theme.colors.surface);
        root.style.setProperty('--color-text', theme.colors.text);
        root.style.setProperty('--color-text-secondary', theme.colors.textSecondary);
        root.style.setProperty('--color-border', theme.colors.border);
        root.style.setProperty('--color-value', theme.colors.valueColor || theme.colors.primary);
        
        root.style.setProperty('--font-main', theme.fonts.main);
        root.style.setProperty('--font-mono', theme.fonts.mono);
        
        root.setAttribute('data-theme', themeName);
        root.setAttribute('data-glow', theme.effects.glow ? 'true' : 'false');
        root.setAttribute('data-scanlines', theme.effects.scanlines ? 'true' : 'false');
        root.setAttribute('data-pixelated', theme.effects.pixelated ? 'true' : 'false');
        root.setAttribute('data-bevel', theme.effects.bevel ? 'true' : 'false');
        
        document.dispatchEvent(new CustomEvent('themeChanged', { 
            detail: { theme: themeName, themeData: theme, colors: theme.colors } 
        }));
    }
    
    getAvailableThemes() {
        const themes = [];
        for (const [key, theme] of Object.entries(this.builtinThemes))
            themes.push({ id: key, name: theme.name, builtin: true });
        for (const [key, theme] of Object.entries(this.customThemes))
            themes.push({ id: key, name: theme.name, builtin: false });
        return themes;
    }
    
    getThemeDataForPush() {
        const theme = this.getCurrentTheme();
        if (!theme) return { name: 'dark' };
        return {
            id: this.currentTheme,
            name: theme.name,
            colors: { ...theme.colors },
            fonts: { ...theme.fonts },
            effects: { ...theme.effects }
        };
    }
    
    loadFromConfig(config) {
        if (config && config.theme) {
            if (typeof config.theme === 'string') {
                this.setTheme(config.theme);
            } else if (typeof config.theme === 'object' && config.theme.id) {
                const themeId = config.theme.id;
                if (!this.themes[themeId] && config.theme.colors) {
                    this.customThemes[themeId] = {
                        name: config.theme.name || themeId,
                        builtin: false,
                        colors: config.theme.colors,
                        fonts: config.theme.fonts || { main: "'Inter', sans-serif", mono: "'Courier New', monospace" },
                        effects: config.theme.effects || { glow: false, scanlines: false, pixelated: false, bevel: false }
                    };
                    this.saveCustomThemes();
                    this.rebuildThemes();
                }
                this.setTheme(themeId);
            }
        }
    }
    
    getConfigData() { return { theme: this.currentTheme }; }
    
    getBlankTheme() {
        return {
            name: 'My Custom Theme',
            builtin: false,
            colors: {
                primary: '#00ff88', secondary: '#4ecdc4', accent: '#ff6b6b',
                background: '#0a0e27', surface: '#1a1a2e', text: '#ffffff',
                textSecondary: '#a0aec0', border: '#2d3748', valueColor: '#00ff88'
            },
            fonts: { main: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", mono: "'Courier New', monospace" },
            effects: { glow: false, scanlines: false, pixelated: false, bevel: false }
        };
    }
    
    async populateDropdown(selectElementOrId) {
        const selectElement = (typeof selectElementOrId === 'string')
            ? document.getElementById(selectElementOrId) : selectElementOrId;
        if (!selectElement) return;

        const currentValue = selectElement.value;
        selectElement.innerHTML = '';

        // 1. Rebuild the base themes so we have a clean slate
        this.rebuildThemes();

        // 2. Ask main.js what .css files are in the folder
        let folderThemes = [];
        try {
            const result = await require('electron').ipcRenderer.invoke('list-themes');
            if (result && result.success) folderThemes = result.themes;
        } catch (e) { console.error("Could not read folder", e); }

        const builtinGroup = document.createElement('optgroup');
        builtinGroup.label = 'Built-in Themes';
        const customGroup = document.createElement('optgroup');
        customGroup.label = 'Custom / Folder Themes';

        const emojiMap = {
            dark: '🌙', light: '☀️', synthwave: '🌆', cyberpunk: '🤖',
            pixel: '🎮', neon: '💚', matrix: '🟢', nord: '🔵',
            sunset: '🌅', gameboy: '🕹️', '3d': '🧊',
            ocean: '🌊', dracula: '🧛', amber: '🟠', midnight: '🔮'
        };

        // 3. Add our built-in UI themes
        for (const [key, theme] of Object.entries(this.builtinThemes)) {
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = (emojiMap[key] || '🎨') + ' ' + theme.name;
            builtinGroup.appendChild(opt);
        }
        selectElement.appendChild(builtinGroup);

        const addedCustoms = new Set();

        // 4. Add custom themes you made in the Theme Builder UI
        for (const [key, theme] of Object.entries(this.customThemes)) {
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = '✨ ' + theme.name;
            customGroup.appendChild(opt);
            addedCustoms.add(key);
        }

        // 5. THE FALLBACK FIX: Add raw .css files found in the folder
        folderThemes.forEach(folderTheme => {
            const themeId = folderTheme.id;
            const meta = folderTheme.meta; // Grab the extracted metadata!

            if (!this.builtinThemes[themeId] && !addedCustoms.has(themeId)) {

                // If the CSS file has a META tag, use those colors! Otherwise, use Dark mode.
                this.themes[themeId] = {
                    name: meta && meta.name ? meta.name : themeId.charAt(0).toUpperCase() + themeId.slice(1),
                    builtin: false,
                    isFolderOnly: true,
                    colors: meta && meta.colors ? meta.colors : this.builtinThemes['dark'].colors,
                    fonts: meta && meta.fonts ? meta.fonts : this.builtinThemes['dark'].fonts,
                    effects: this.builtinThemes['dark'].effects
                };

                const opt = document.createElement('option');
                opt.value = themeId;
                opt.textContent = '📁 ' + this.themes[themeId].name;
                customGroup.appendChild(opt);
            }
        });

        if (customGroup.children.length > 0) {
            selectElement.appendChild(customGroup);
        }

        // Restore the previously selected theme if it still exists
        if (currentValue && this.themes[currentValue]) selectElement.value = currentValue;
        else selectElement.value = this.currentTheme;
    }
}

if (typeof module !== 'undefined' && module.exports) module.exports = ThemeManager;
