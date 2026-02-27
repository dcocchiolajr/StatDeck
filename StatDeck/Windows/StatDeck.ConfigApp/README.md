# StatDeck Configuration Designer

Beautiful Electron-based visual layout designer for creating StatDeck configurations.

![StatDeck Config App](https://img.shields.io/badge/version-1.0.0-blue) ![Electron](https://img.shields.io/badge/electron-28.0.0-brightgreen)

## Features

✅ **Drag-and-Drop Designer** - Visual grid-based layout creation  
✅ **Live Property Editing** - Real-time tile configuration  
✅ **Action Configuration** - Set up tap and long-press actions  
✅ **USB Export** - Push configs directly to Pi over USB  
✅ **Undo/Redo** - Full history management  
✅ **Keyboard Shortcuts** - Professional workflow  
✅ **Modern Dark Theme** - Beautiful VS Code-inspired UI  
✅ **Save/Load** - JSON-based configuration files  

## Installation

### Prerequisites
- Node.js 18+ (already installed for Pi backend)
- Windows 10/11, macOS, or Linux

### Setup

```bash
cd Windows/StatDeck.ConfigApp
npm install
```

This will install:
- Electron (~200MB)
- SerialPort for USB communication
- All dependencies

**First install takes 2-3 minutes** depending on your internet speed.

## Running the App

```bash
npm start
```

The config app window will open immediately!

## Quick Start Guide

### 1. Create a Layout

1. **Drag tiles** from the left palette onto the grid
2. **Resize tiles** by dragging the resize handle (bottom-right corner)
3. **Select a tile** to edit its properties in the right panel

### 2. Configure Tiles

In the Properties panel (right side):

- **Position & Size**: Set grid coordinates and dimensions
- **Data Source**: Choose what data to display (CPU, GPU, RAM, etc.)
- **Styling**: Pick colors for the tile
- **Actions**: Configure tap and long-press behaviors

### 3. Set Up Actions

Click "Edit Action..." to configure what happens when tiles are touched:

- **Launch App**: Open any application
- **Hotkey**: Send keyboard shortcuts (e.g., Ctrl+Shift+Esc for Task Manager)
- **Run Script**: Execute batch files or scripts
- **Open URL**: Open websites in browser

### 4. Save Your Layout

- **Ctrl+S** to save
- **Ctrl+Shift+S** to save as new file
- Saves as `.json` file compatible with StatDeck

### 5. Export to Pi

- **Ctrl+E** to push directly to Pi via USB
- Or manually copy the JSON file to your Pi

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New Layout |
| `Ctrl+O` | Open Layout |
| `Ctrl+S` | Save Layout |
| `Ctrl+Shift+S` | Save As |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` | Redo |
| `Ctrl+E` | Export to Pi |
| `Delete` | Delete Selected Tile |
| `Ctrl+G` | Toggle Grid Lines |
| `F12` | Toggle Developer Tools |

## UI Overview

```
┌──────────────────────────────────────────────────────────┐
│  StatDeck Configuration Designer              [_ □ ✕]   │
├──────────────────────────────────────────────────────────┤
│ 📄New 📂Open 💾Save | ↶ ↷ | Grid: [4×3] | 📤 Push to Pi │
├─────────┬──────────────────────────┬─────────────────────┤
│         │                          │                     │
│ Tiles   │   Grid Canvas            │  Properties         │
│         │                          │                     │
│ ┌─────┐ │   ┌──────┬───┬───┐      │  Type: CPU Graph   │
│ │ CPU │ │   │ CPU  │GPU│RAM│      │  Size: 2 × 2       │
│ │Graph│ │   │Graph │   │   │      │  ┌─────┬─────┐    │
│ └─────┘ │   ├──────┴───┴───┤      │  │  2  │  2  │    │
│         │   │  Network      │      │  └─────┴─────┘    │
│ ┌─────┐ │   │   Graph       │      │                    │
│ │Gauge│ │   └───────────────┘      │  Color: #00ff88   │
│ └─────┘ │                          │  [████████░░░]     │
│         │ ← Drag tiles here        │                    │
│ ┌─────┐ │                          │  Data: cpu.usage  │
│ │Text │ │   Click to configure →   │  [dropdown ▼]     │
│ └─────┘ │                          │                    │
│         │                          │  Actions:          │
│ ┌─────┐ │                          │  Tap: [Edit...]   │
│ │Btn  │ │                          │  Long: [Edit...]  │
│ └─────┘ │                          │                    │
│         │                          │  [🗑️ Delete Tile] │
└─────────┴──────────────────────────┴─────────────────────┘
│ Ready           Untitled Layout         USB: Disconnected│
└──────────────────────────────────────────────────────────┘
```

## Available Tile Types

### 📊 Graphs
- **CPU Graph** - Line chart of CPU usage over time
- **Network Graph** - Dual-line graph for upload/download speeds

### 📈 Meters
- **Gauge** - Circular gauge for temperatures or percentages
- **Text Display** - Simple numeric display

### 🎮 Controls
- **Button** - Interactive launcher with icon

## Data Sources

Choose what each tile displays:

**CPU:**
- `cpu.usage` - Overall CPU percentage
- `cpu.temp` - CPU temperature
- `cpu.cores` - Per-core usage

**GPU:**
- `gpu.usage` - GPU utilization
- `gpu.temp` - GPU temperature
- `gpu.vram_used` - VRAM usage

**Memory:**
- `ram.percent` - RAM usage percentage
- `ram.used` - RAM used in MB

**Disk:**
- `disk.usage_percent` - Disk space used
- `disk.read_speed` - Read speed MB/s
- `disk.write_speed` - Write speed MB/s

**Network:**
- `network` - Both upload and download (for dual graphs)
- `network.upload_speed` - Upload KB/s
- `network.download_speed` - Download KB/s

## Grid Sizes

Supported grid configurations:
- 3×3 (9 tiles max)
- 4×3 (12 tiles max) - **Default**
- 5×4 (20 tiles max)
- Custom sizes available via menu

## Tile Sizes

Tiles can be any size from 1×1 to full grid:
- **1×1** - Small, single metric
- **2×1** - Wide, good for graphs
- **1×2** - Tall, good for vertical layouts
- **2×2** - Large, detailed displays
- **2×3**, **3×2**, etc. - Custom sizes

## Building Standalone Executable

To create a distributable `.exe` file:

```bash
npm run build
```

The installer will be in the `dist/` folder (~150MB).

You can then run StatDeck Config without `npm start` - just double-click the exe!

## Troubleshooting

### "Module not found" errors
```bash
rm -rf node_modules package-lock.json
npm install
```

### USB not connecting
- Check COM port in Device Manager
- Make sure Pi is configured as USB gadget
- Try a different USB cable (must support data, not just power)

### App won't start
- Make sure Node.js 18+ is installed: `node --version`
- Try: `npm install --force`
- Check for error messages in console

### Tiles not dragging
- Make sure you're dragging from the palette (left panel)
- Drag onto the grid canvas (center panel)
- Check that grid size allows placement

## Development

### Project Structure
```
StatDeck.ConfigApp/
├── main.js              # Electron main process
├── renderer.js          # Main app controller
├── index.html           # UI layout
├── styles/
│   └── app.css         # Modern dark theme
├── components/
│   ├── grid-canvas.js  # Drag-drop grid
│   ├── tile-palette.js # Tile selector
│   ├── properties-panel.js
│   └── action-editor.js
└── utils/
    ├── usb-manager.js
    ├── config-loader.js
    └── undo-manager.js
```

### Tech Stack
- **Electron 28** - Desktop app framework
- **Vanilla JavaScript** - No frameworks, pure JS
- **CSS Grid** - Layout engine
- **Native Drag-and-Drop API** - No libraries needed
- **SerialPort** - USB communication

## Tips & Tricks

1. **Use Ctrl+G** to toggle grid lines for precise placement
2. **Hold Shift** while dragging to snap to grid (coming soon)
3. **Double-click** a tile to quickly edit it (coming soon)
4. **Right-click** for context menu (coming soon)
5. **Zoom** the canvas with Ctrl+Plus/Minus (coming soon)

## Known Limitations

- Undo/Redo is basic (records actions but doesn't fully restore state yet)
- USB connection is manual (auto-detect coming soon)
- No tile duplication yet (copy/paste coming soon)
- No templates/presets yet (coming soon)

## Roadmap

🔜 **Version 1.1**
- Auto-detect USB ports
- Tile templates/presets
- Copy/paste tiles
- Import from Pi
- Theme customization

🔜 **Version 1.2**
- Live preview with mock data
- Tile library with custom types
- Multi-layout support
- Export as image

## Support

Having issues? Check:
1. [TESTING.md](../../docs/TESTING.md) - Testing guide
2. [WINDOWS_SETUP.md](../../docs/WINDOWS_SETUP.md) - Windows setup
3. [PI_SETUP.md](../../docs/PI_SETUP.md) - Pi setup

## License

MIT - See LICENSE file

---

**Made with ❤️ for StatDeck**  
Version 1.0.0 | Built with Electron
