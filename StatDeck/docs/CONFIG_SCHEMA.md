# Configuration Schema

## Layout File Structure

```json
{
  "version": "1.0",
  "grid": {
    "cols": 4,
    "rows": 3,
    "cell_width": 180,
    "cell_height": 120,
    "gap": 10
  },
  "tiles": [
    {
      "id": "unique_tile_id",
      "type": "tile_type_name",
      "position": {"x": 0, "y": 0},
      "size": {"w": 1, "h": 1},
      "data_source": "cpu.usage",
      "style": {
        "color": "#00ff88",
        "background": "#1a1a2e"
      },
      "actions": {
        "tap": {
          "type": "launch_app",
          "target": "C:\\Program Files\\App.exe"
        },
        "long_press": {
          "type": "hotkey",
          "keys": "ctrl+shift+esc"
        }
      },
      "config": {}
    }
  ]
}
```

## Field Definitions

### Grid
- **cols**: Number of columns (1-10)
- **rows**: Number of rows (1-10)
- **cell_width**: Base width in pixels
- **cell_height**: Base height in pixels
- **gap**: Spacing between tiles in pixels

### Tile
- **id**: Unique identifier (string)
- **type**: Registered tile type name
- **position**: Grid coordinates {x, y}
- **size**: Tile dimensions in grid units {w, h}
- **data_source**: Dot-notation path to data (e.g., "cpu.usage", "gpu.temp")
- **style**: Visual customization (tile-type specific)
- **actions**: Event handlers for user interaction
- **config**: Tile-type specific configuration

## Tile Types

### cpu_graph
Line graph showing CPU usage over time

```json
{
  "type": "cpu_graph",
  "data_source": "cpu.usage",
  "config": {
    "history_seconds": 60,
    "show_cores": false,
    "fill_under": true,
    "min": 0,
    "max": 100
  },
  "style": {
    "color": "#00ff88",
    "background": "#1a1a2e"
  }
}
```

### gauge
Circular gauge for single values

```json
{
  "type": "gauge",
  "data_source": "cpu.temp",
  "config": {
    "min": 0,
    "max": 100,
    "units": "°C",
    "threshold_warning": 70,
    "threshold_critical": 85
  },
  "style": {
    "color": "#00aaff",
    "warning_color": "#ffaa00",
    "critical_color": "#ff0000"
  }
}
```

### button
Launcher button with icon and label

```json
{
  "type": "button",
  "config": {
    "label": "Task Manager",
    "icon": "settings",
    "show_label": true
  },
  "actions": {
    "tap": {
      "type": "launch_app",
      "target": "C:\\Windows\\System32\\taskmgr.exe"
    }
  }
}
```

### text_display
Simple text/value display

```json
{
  "type": "text_display",
  "data_source": "ram.percent",
  "config": {
    "label": "RAM",
    "units": "%",
    "decimals": 1,
    "font_size": "large"
  }
}
```

### network_graph
Dual-line graph for upload/download

```json
{
  "type": "network_graph",
  "data_source": "network",
  "config": {
    "history_seconds": 60,
    "show_upload": true,
    "show_download": true,
    "units": "MB/s"
  },
  "style": {
    "upload_color": "#ff6b6b",
    "download_color": "#4ecdc4"
  }
}
```

## Action Types

### launch_app
```json
{
  "type": "launch_app",
  "target": "C:\\Path\\To\\Application.exe",
  "arguments": ""
}
```

### hotkey
```json
{
  "type": "hotkey",
  "keys": "ctrl+shift+esc"
}
```

### run_script
```json
{
  "type": "run_script",
  "script": "C:\\Scripts\\custom.bat"
}
```

### open_url
```json
{
  "type": "open_url",
  "url": "https://example.com"
}
```

### toggle_app
```json
{
  "type": "toggle_app",
  "process_name": "spotify.exe",
  "launch_path": "C:\\Users\\...\\Spotify.exe"
}
```

## Data Source Paths

Available paths for `data_source` field:

```
cpu.usage          → Overall CPU percentage
cpu.temp           → CPU temperature
cpu.cores          → Array of per-core percentages
cpu.cores[0]       → First core percentage

gpu.usage          → GPU utilization percentage
gpu.temp           → GPU temperature
gpu.vram_used      → VRAM used in MB
gpu.vram_total     → Total VRAM in MB

ram.used           → RAM used in MB
ram.total          → Total RAM in MB
ram.percent        → RAM usage percentage

disk.read_speed    → Current read speed MB/s
disk.write_speed   → Current write speed MB/s
disk.usage_percent → Disk space used percentage

network.upload_speed    → Current upload KB/s
network.download_speed  → Current download KB/s
```

## Validation Rules

1. **No overlapping tiles** - Each grid cell can only contain one tile
2. **Tiles must fit in grid** - position.x + size.w ≤ grid.cols
3. **Unique IDs** - Each tile must have a unique id
4. **Valid tile types** - type must be registered in TileRegistry
5. **Valid data sources** - data_source must match available paths
6. **Size constraints** - w and h must be ≥ 1
