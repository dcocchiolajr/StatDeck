# StatDeck

A customizable hardware monitoring display system using a Raspberry Pi 4 with touchscreen, connected to a Windows PC via USB.

## Features
- Real-time hardware monitoring (CPU, GPU, RAM, temps, network, disk)
- Customizable tile-based layout with variable sizes (1x1, 2x1, 2x3, etc.)
- Touch-enabled interface with tap and long-press actions
- Visual layout designer (Windows app)
- Modern web-based UI with live graphs and gauges
- USB connection (no network required)

## Components
- **Windows Config App**: Visual designer for creating layouts and configuring tiles
- **Windows Service**: Background service that collects stats and communicates with Pi
- **Pi Backend**: Node.js server handling USB communication and serving the UI
- **Pi Frontend**: Web-based touch interface with live-updating tiles

## Hardware Requirements
- Raspberry Pi 4
- 7" touchscreen (VoCore or similar)
- USB-C cable for data connection
- Windows PC (for stats collection and configuration)

## Project Structure

```
StatDeck/
├── Windows/
│   ├── StatDeck.ConfigApp/          (C# WPF Project)
│   │   ├── Core/
│   │   ├── Models/
│   │   ├── TileDefinitions/
│   │   ├── Actions/
│   │   └── UI/
│   └── StatDeck.Service/            (Python Service)
│       ├── collectors/
│       ├── usb/
│       └── actions/
├── Pi/
│   ├── backend/                      (Node.js)
│   │   ├── routes/
│   │   └── usb/
│   └── frontend/                     (Web UI)
│       ├── core/
│       ├── tiles/
│       ├── components/
│       └── styles/
├── Shared/
│   └── example-layout.json
└── docs/
    ├── PROTOCOL.md
    ├── CONFIG_SCHEMA.md
    ├── WINDOWS_SETUP.md
    ├── PI_SETUP.md
    └── DEVELOPMENT.md
```

## Getting Started

### Windows Service Setup
1. Install Python 3.9+
2. Navigate to `Windows/StatDeck.Service/`
3. Install dependencies: `pip install -r requirements.txt`
4. Configure COM port in `config.json`
5. Run: `python main.py`

### Pi Setup
1. Install Node.js 16+
2. Navigate to `Pi/backend/`
3. Install dependencies: `npm install`
4. Configure USB gadget mode (see docs/PI_SETUP.md)
5. Run: `npm start`

### Windows Config App
1. Open Visual Studio 2022
2. Open `StatDeck.ConfigApp.sln`
3. Build and run

## Documentation
- [Communication Protocol](docs/PROTOCOL.md)
- [Configuration Schema](docs/CONFIG_SCHEMA.md)
- [Windows Setup Guide](docs/WINDOWS_SETUP.md)
- [Pi Setup Guide](docs/PI_SETUP.md)
- [Development Guide](docs/DEVELOPMENT.md)

## Project Status
🚧 **In Development** - Foundation phase

## License
MIT
