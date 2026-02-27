# Windows Setup Guide

## Prerequisites
- Windows 10/11
- Python 3.9 or higher
- Visual Studio 2022 (for Config App)
- USB connection to Raspberry Pi

## Python Service Setup

### 1. Install Python
Download and install Python from https://www.python.org/downloads/

Make sure to check "Add Python to PATH" during installation.

### 2. Install Dependencies

Open Command Prompt or PowerShell:

```bash
cd Windows/StatDeck.Service
pip install -r requirements.txt
```

### 3. Configure COM Port

1. Connect your Raspberry Pi via USB
2. Open Device Manager (Windows + X → Device Manager)
3. Look under "Ports (COM & LPT)" for a new COM port (e.g., COM3, COM4)
4. Edit `config.json` and update the `usb_port` value:

```json
{
  "usb_port": "COM3",
  "baud_rate": 115200,
  "update_interval": 0.5
}
```

### 4. Run the Service

```bash
python main.py
```

You should see:
```
StatDeck Service starting...
Connected to Pi on COM3 at 115200 baud
```

## GPU Monitoring (Optional)

### For NVIDIA GPUs

Install nvidia-ml-py3:

```bash
pip install nvidia-ml-py3
```

The service will automatically detect and use your NVIDIA GPU.

### For AMD GPUs

AMD support requires additional setup. The current implementation is a placeholder.

## Running as a Windows Service

To run the service automatically on startup:

1. Install NSSM (Non-Sucking Service Manager):
   https://nssm.cc/download

2. Create the service:

```bash
nssm install StatDeckService "C:\Path\To\Python\python.exe" "C:\Path\To\StatDeck\Windows\StatDeck.Service\main.py"
```

3. Start the service:

```bash
nssm start StatDeckService
```

## Troubleshooting

### Can't find COM port
- Make sure Pi is connected and configured as USB gadget
- Try a different USB port
- Check Windows Device Manager for errors

### Import errors
- Verify all dependencies are installed: `pip list`
- Try reinstalling: `pip install -r requirements.txt --force-reinstall`

### No GPU stats
- NVIDIA users: Install nvidia-ml-py3
- AMD users: GPU monitoring not yet implemented
- Integrated graphics: May not be supported

## Config App Setup

Coming soon - requires Visual Studio 2022 and C# WPF development workload.
