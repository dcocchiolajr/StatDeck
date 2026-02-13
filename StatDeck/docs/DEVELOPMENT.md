# Development Guide

## Project Architecture

### Overview

StatDeck consists of three main components:

1. **Windows Service** (Python) - Collects hardware stats
2. **Pi Backend** (Node.js) - Manages communication and serves UI
3. **Pi Frontend** (HTML/CSS/JS) - Touch interface

### Communication Flow

```
Windows PC                     Raspberry Pi
┌─────────────┐              ┌──────────────┐
│   Service   │──USB Serial─→│   Backend    │
│  (Python)   │←─────────────│   (Node.js)  │
└─────────────┘              └──────┬───────┘
                                    │ WebSocket
                              ┌─────▼────────┐
                              │   Frontend   │
                              │ (Web Browser)│
                              └──────────────┘
```

## Adding New Tile Types

### 1. Define Tile in Config Schema

Edit `docs/CONFIG_SCHEMA.md` to document the new tile type.

### 2. Create Tile Class (Pi Frontend)

Create `Pi/frontend/tiles/my-new-tile.js`:

```javascript
class MyNewTile extends BaseTile {
    constructor(config) {
        super(config);
        // Initialize
    }
    
    createElement() {
        super.createElement();
        // Build HTML structure
    }
    
    updateData(statsData) {
        const value = this.getValue(statsData);
        // Update display
    }
}
```

### 3. Register Tile Type

Edit `Pi/frontend/core/tile-manager.js`:

```javascript
const tileClasses = {
    // ... existing tiles
    'my_new_tile': MyNewTile
};
```

### 4. Add Script to index.html

Edit `Pi/frontend/index.html`:

```html
<script src="tiles/my-new-tile.js"></script>
```

## Adding New Data Sources

### 1. Create Collector (Windows Service)

Create `Windows/StatDeck.Service/collectors/my_collector.py`:

```python
from .base_collector import BaseCollector

class MyCollector(BaseCollector):
    def collect(self):
        # Collect stats
        return {
            'my_value': 123
        }
```

### 2. Register Collector

Edit `Windows/StatDeck.Service/main.py`:

```python
from collectors.my_collector import MyCollector

self.collectors = {
    # ... existing collectors
    'my_data': MyCollector()
}
```

### 3. Document Data Path

Update `docs/CONFIG_SCHEMA.md` with the new data source path.

## Adding New Action Types

### 1. Create Action Handler (Windows Service)

Create `Windows/StatDeck.Service/actions/my_action.py`:

```python
class MyAction:
    def execute(self, config):
        # Perform action
        pass
```

### 2. Register Action

Edit `Windows/StatDeck.Service/actions/action_executor.py`:

```python
from .my_action import MyAction

self.action_handlers = {
    # ... existing actions
    'my_action': MyAction()
}
```

## Testing Without Hardware

### Test Windows Service Without Pi

Create a mock USB connection:

```python
# In main.py, comment out real USB:
# self.usb = USBManager(...)

# Add mock:
class MockUSB:
    def connect(self): return True
    def send_message(self, msg): print(f"SEND: {msg}")
    def receive_message(self): return None
    def disconnect(self): pass

self.usb = MockUSB()
```

### Test Pi Frontend Without Backend

Create `Pi/frontend/mock-data.js`:

```javascript
// Simulate stats updates
setInterval(() => {
    window.app.updateStats({
        cpu: { usage: Math.random() * 100, temp: 50 + Math.random() * 30 },
        gpu: { usage: Math.random() * 100, temp: 60 + Math.random() * 20 },
        ram: { percent: 50 + Math.random() * 30 },
        // ... more mock data
    });
}, 500);
```

Include in `index.html` before other scripts.

## Debugging

### Windows Service

```bash
# Run with debug logging
python main.py
```

Check `statdeck_service.log` for detailed logs.

### Pi Backend

```bash
# Run with console output
npm start
```

View logs in terminal.

### Pi Frontend

Open browser developer tools:
- Press F12 in Chromium
- Check Console for JavaScript errors
- Use Network tab to debug WebSocket connection

## Code Style

### Python
- Follow PEP 8
- Use docstrings for classes and functions
- Type hints encouraged

### JavaScript
- Use ES6+ features
- Document complex functions
- Keep files focused (one class per file)

### Naming Conventions
- Python: `snake_case`
- JavaScript: `camelCase`
- CSS: `kebab-case`

## Performance Tips

### Reduce CPU Usage
- Increase `update_interval` in config
- Reduce `history_seconds` for graphs
- Disable unused collectors

### Smooth Animations
- Keep tile count reasonable (< 12)
- Use CSS animations over JavaScript
- Minimize Chart.js animations

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Resources

- Chart.js: https://www.chartjs.org/
- psutil: https://psutil.readthedocs.io/
- SerialPort: https://serialport.io/
- Raspberry Pi USB Gadget: https://www.raspberrypi.com/documentation/
