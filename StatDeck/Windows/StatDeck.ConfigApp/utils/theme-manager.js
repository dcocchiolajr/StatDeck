/**
 * Theme Manager for StatDeck Config App
 * Handles theme switching and application
 * 
 * VERSION: With 3D Classic Theme Added
 */

class ThemeManager {
    constructor() {
        this.currentTheme = 'dark';
        this.themes = {
            dark: {
                name: 'Dark',
                colors: {
                    primary: '#00ff88',
                    secondary: '#4ecdc4',
                    accent: '#ff6b6b',
                    background: '#0a0e27',
                    surface: '#1a1a2e',
                    text: '#ffffff',
                    textSecondary: '#a0aec0',
                    border: '#2d3748'
                },
                fonts: {
                    main: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    mono: "'Courier New', monospace"
                },
                effects: {
                    glow: false,
                    scanlines: false,
                    pixelated: false
                }
            },
            light: {
                name: 'Light',
                colors: {
                    primary: '#3b82f6',
                    secondary: '#8b5cf6',
                    accent: '#f59e0b',
                    background: '#f7fafc',
                    surface: '#ffffff',
                    text: '#1a202c',
                    textSecondary: '#718096',
                    border: '#e2e8f0'
                },
                fonts: {
                    main: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                    mono: "'Courier New', monospace"
                },
                effects: {
                    glow: false,
                    scanlines: false,
                    pixelated: false
                }
            },
            synthwave: {
                name: 'Synthwave',
                colors: {
                    primary: '#ff00ff',
                    secondary: '#00ffff',
                    accent: '#ff1493',
                    background: '#1a0033',
                    surface: '#2d1b4e',
                    text: '#ffffff',
                    textSecondary: '#ff00ff',
                    border: '#ff00ff'
                },
                fonts: {
                    main: "'Orbitron', 'Arial', sans-serif",
                    mono: "'Courier New', monospace"
                },
                effects: {
                    glow: true,
                    scanlines: false,
                    pixelated: false
                }
            },
            pixel: {
                name: '8-Bit',
                colors: {
                    primary: '#00ff00',
                    secondary: '#ffff00',
                    accent: '#ff0000',
                    background: '#0f380f',
                    surface: '#306230',
                    text: '#ffffff',
                    textSecondary: '#9bbc0f',
                    border: '#8bac0f'
                },
                fonts: {
                    main: "'Press Start 2P', 'Courier New', monospace",
                    mono: "'Press Start 2P', monospace"
                },
                effects: {
                    glow: false,
                    scanlines: true,
                    pixelated: true
                }
            },
            cyberpunk: {
                name: 'Cyberpunk',
                colors: {
                    primary: '#00fff9',
                    secondary: '#ff2e97',
                    accent: '#ffed00',
                    background: '#000000',
                    surface: '#0a0a0a',
                    text: '#00fff9',
                    textSecondary: '#ff2e97',
                    border: '#00fff9'
                },
                fonts: {
                    main: "'Rajdhani', 'Arial', sans-serif",
                    mono: "'Courier New', monospace"
                },
                effects: {
                    glow: true,
                    scanlines: false,
                    pixelated: false
                }
            },
            neon: {
                name: 'Neon',
                colors: {
                    primary: '#00ff00',
                    secondary: '#ff00ff',
                    accent: '#00ffff',
                    background: '#000000',
                    surface: '#0a0a0a',
                    text: '#00ff00',
                    textSecondary: '#ff00ff',
                    border: '#00ff00'
                },
                fonts: {
                    main: "'Inter', sans-serif",
                    mono: "'Courier New', monospace"
                },
                effects: {
                    glow: true,
                    scanlines: false,
                    pixelated: false
                }
            },
            matrix: {
                name: 'Matrix',
                colors: {
                    primary: '#00ff41',
                    secondary: '#008f11',
                    accent: '#00ff41',
                    background: '#000000',
                    surface: '#0a0f0a',
                    text: '#00ff41',
                    textSecondary: '#008f11',
                    border: '#00ff41'
                },
                fonts: {
                    main: "'Courier New', monospace",
                    mono: "'Courier New', monospace"
                },
                effects: {
                    glow: true,
                    scanlines: false,
                    pixelated: false
                }
            },
            nord: {
                name: 'Nord',
                colors: {
                    primary: '#88c0d0',
                    secondary: '#81a1c1',
                    accent: '#bf616a',
                    background: '#2e3440',
                    surface: '#3b4252',
                    text: '#eceff4',
                    textSecondary: '#d8dee9',
                    border: '#4c566a'
                },
                fonts: {
                    main: "'Inter', sans-serif",
                    mono: "'Courier New', monospace"
                },
                effects: {
                    glow: false,
                    scanlines: false,
                    pixelated: false
                }
            },
            sunset: {
                name: 'Sunset',
                colors: {
                    primary: '#ff6b6b',
                    secondary: '#feca57',
                    accent: '#ee5a6f',
                    background: '#2d132c',
                    surface: '#3d1e36',
                    text: '#ffffff',
                    textSecondary: '#feca57',
                    border: '#ff6b6b'
                },
                fonts: {
                    main: "'Inter', sans-serif",
                    mono: "'Courier New', monospace"
                },
                effects: {
                    glow: true,
                    scanlines: false,
                    pixelated: false
                }
            },
            gameboy: {
                name: 'GameBoy',
                colors: {
                    primary: '#0f380f',
                    secondary: '#306230',
                    accent: '#8bac0f',
                    background: '#9bbc0f',
                    surface: '#8bac0f',
                    text: '#0f380f',
                    textSecondary: '#306230',
                    border: '#0f380f'
                },
                fonts: {
                    main: "'Press Start 2P', 'Courier New', monospace",
                    mono: "'Press Start 2P', monospace"
                },
                effects: {
                    glow: false,
                    scanlines: true,
                    pixelated: true
                }
            },
            '3d': {
                name: '3D Classic',
                colors: {
                    primary: '#4a90d9',
                    secondary: '#6aa3e0',
                    accent: '#ff9500',
                    background: '#c0c0c0',
                    surface: '#d4d4d4',
                    text: '#000000',
                    textSecondary: '#404040',
                    border: '#808080'
                },
                fonts: {
                    main: "'Segoe UI', 'Tahoma', 'Arial', sans-serif",
                    mono: "'Courier New', monospace"
                },
                effects: {
                    glow: false,
                    scanlines: false,
                    pixelated: false
                }
            }
        };
    }
    
    /**
     * Get current theme
     */
    getCurrentTheme() {
        return this.themes[this.currentTheme];
    }
    
    /**
     * Get theme by name
     */
    getTheme(themeName) {
        return this.themes[themeName] || this.themes.dark;
    }
    
    /**
     * Set active theme
     */
    setTheme(themeName) {
        if (this.themes[themeName]) {
            this.currentTheme = themeName;
            this.applyTheme(themeName);
            return true;
        }
        return false;
    }
    
    /**
     * Apply theme to document
     */
    applyTheme(themeName) {
        const theme = this.themes[themeName];
        if (!theme) return;
        
        const root = document.documentElement;
        
        // Apply color variables
        root.style.setProperty('--color-primary', theme.colors.primary);
        root.style.setProperty('--color-secondary', theme.colors.secondary);
        root.style.setProperty('--color-accent', theme.colors.accent);
        root.style.setProperty('--color-background', theme.colors.background);
        root.style.setProperty('--color-surface', theme.colors.surface);
        root.style.setProperty('--color-text', theme.colors.text);
        root.style.setProperty('--color-text-secondary', theme.colors.textSecondary);
        root.style.setProperty('--color-border', theme.colors.border);
        
        // Apply fonts
        root.style.setProperty('--font-main', theme.fonts.main);
        root.style.setProperty('--font-mono', theme.fonts.mono);
        
        // Apply effects
        root.setAttribute('data-theme', themeName);
        root.setAttribute('data-glow', theme.effects.glow ? 'true' : 'false');
        root.setAttribute('data-scanlines', theme.effects.scanlines ? 'true' : 'false');
        root.setAttribute('data-pixelated', theme.effects.pixelated ? 'true' : 'false');
        
        // Trigger theme change event
        document.dispatchEvent(new CustomEvent('themeChanged', { 
            detail: { theme: themeName, colors: theme.colors } 
        }));
    }
    
    /**
     * Get all available themes
     */
    getAvailableThemes() {
        return Object.keys(this.themes).map(key => ({
            id: key,
            name: this.themes[key].name
        }));
    }
    
    /**
     * Load theme from layout config
     */
    loadFromConfig(config) {
        if (config && config.theme) {
            this.setTheme(config.theme);
        }
    }
    
    /**
     * Get theme config for saving
     */
    getConfigData() {
        return {
            theme: this.currentTheme
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeManager;
}
