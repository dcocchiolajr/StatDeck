# StatDeck Communication Protocol

## Connection Type
**USB Serial (CDC ACM)** - Pi configured as USB gadget device

- **Baud Rate**: 115200
- **Data Format**: JSON messages, newline-delimited
- **Direction**: Bidirectional

## Message Types

### 1. Stats Update (PC → Pi)
Sent every 500ms with current hardware statistics

```json
{
  "type": "stats",
  "timestamp": 1738368000000,
  "data": {
    "cpu": {
      "usage": 45.2,
      "temp": 52.0,
      "cores": [40.1, 45.2, 50.3, 44.8]
    },
    "gpu": {
      "usage": 67.5,
      "temp": 72.0,
      "vram_used": 4096,
      "vram_total": 8192
    },
    "ram": {
      "used": 8234,
      "total": 16384,
      "percent": 50.3
    },
    "disk": {
      "read_speed": 125.5,
      "write_speed": 45.2,
      "usage_percent": 65.0
    },
    "network": {
      "upload_speed": 1250,
      "download_speed": 5600
    }
  }
}
```

### 2. Action Event (Pi → PC)
Sent when user interacts with a tile

```json
{
  "type": "action",
  "tile_id": "tile_3",
  "action_type": "tap",
  "timestamp": 1738368000000
}
```

**action_type values:**
- `"tap"` - Quick tap/click
- `"long_press"` - Hold for 800ms+
- `"double_tap"` - Two quick taps

### 3. Config Update (PC → Pi)
Sent when layout is modified in config app

```json
{
  "type": "config",
  "layout": {
    "grid": {
      "cols": 4,
      "rows": 3,
      "cell_width": 180,
      "cell_height": 120,
      "gap": 10
    },
    "tiles": [
      {
        "id": "tile_1",
        "type": "cpu_graph",
        "position": {"x": 0, "y": 0},
        "size": {"w": 2, "h": 1},
        "config": {}
      }
    ]
  }
}
```

### 4. Status Heartbeat (Pi → PC)
Sent every 5 seconds

```json
{
  "type": "status",
  "connected": true,
  "config_loaded": true,
  "tiles_active": 6,
  "timestamp": 1738368000000
}
```

### 5. Config Request (Pi → PC)
Sent on Pi startup to request current layout

```json
{
  "type": "config_request",
  "timestamp": 1738368000000
}
```

## Grid Coordinate System

```
(0,0)───→ X (cols)
  │
  ↓
  Y (rows)
```

- Origin at top-left
- Position in grid cells (not pixels)
- Size in grid units (width × height)

## Error Handling

### Connection Lost
- PC Service: Attempts reconnect every 5 seconds
- Pi Display: Shows "Disconnected" overlay, retains last data

### Malformed JSON
- Log error, discard message, continue processing

### Unknown Message Type
- Log warning, ignore message
