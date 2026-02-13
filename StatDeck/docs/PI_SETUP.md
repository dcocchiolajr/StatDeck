# Raspberry Pi Setup Guide

## Hardware Requirements
- Raspberry Pi 4 (2GB+ RAM recommended)
- 7" touchscreen (VoCore or compatible)
- MicroSD card (16GB+)
- USB-C cable for data connection to PC
- Separate power supply (optional but recommended)

## Software Installation

### 1. Install Raspberry Pi OS Lite

Download and flash Raspberry Pi OS Lite to your SD card:
https://www.raspberrypi.com/software/

For development, you can use the full Desktop version initially.

### 2. Initial Setup

Boot the Pi and complete initial setup:

```bash
sudo raspi-config
```

- Set hostname (optional): "statdeck"
- Enable SSH (Interface Options → SSH)
- Set timezone
- Expand filesystem

### 3. Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

Verify installation:
```bash
node --version  # Should be v18.x or higher
npm --version
```

### 4. Configure USB Gadget Mode

Edit boot config:

```bash
sudo nano /boot/config.txt
```

Add at the end:
```
dtoverlay=dwc2
```

Edit cmdline:

```bash
sudo nano /boot/cmdline.txt
```

After `rootwait`, add:
```
modules-load=dwc2,g_serial
```

Enable gadget mode:

```bash
sudo nano /etc/modules
```

Add:
```
dwc2
g_serial
```

Reboot:
```bash
sudo reboot
```

After reboot, verify:
```bash
ls /dev/ttyGS0
```

You should see the serial gadget device.

### 5. Install StatDeck Backend

Copy the `Pi/backend` folder to your Pi (using SCP or USB drive):

```bash
cd ~/statdeck/Pi/backend
npm install
```

### 6. Install StatDeck Frontend

Copy the `Pi/frontend` folder:

The frontend files should be in `~/statdeck/Pi/frontend`

### 7. Test the Backend

```bash
cd ~/statdeck/Pi/backend
npm start
```

You should see:
```
HTTP server listening on port 3000
WebSocket server listening on port 3001
StatDeck Pi Backend started
```

### 8. Configure Chromium Kiosk Mode

Install Chromium:

```bash
sudo apt-get install -y chromium-browser unclutter
```

Create autostart script:

```bash
mkdir -p ~/.config/autostart
nano ~/.config/autostart/statdeck.desktop
```

Add:
```
[Desktop Entry]
Type=Application
Name=StatDeck
Exec=/home/pi/statdeck/start.sh
```

Create start script:

```bash
nano ~/statdeck/start.sh
```

Add:
```bash
#!/bin/bash

# Start backend
cd /home/pi/statdeck/Pi/backend
node server.js &

# Wait for backend to start
sleep 3

# Hide mouse cursor
unclutter -idle 0 &

# Start Chromium in kiosk mode
chromium-browser \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --no-first-run \
  --enable-features=OverlayScrollbar \
  --start-fullscreen \
  http://localhost:3000
```

Make executable:
```bash
chmod +x ~/statdeck/start.sh
```

### 9. Test the Display

```bash
~/statdeck/start.sh
```

You should see the StatDeck UI in fullscreen.

## Touchscreen Calibration

If touch input is misaligned:

```bash
sudo apt-get install -y xinput-calibrator
DISPLAY=:0 xinput_calibrator
```

Follow on-screen instructions.

## Troubleshooting

### USB gadget not working
- Verify dwc2 overlay in `/boot/config.txt`
- Check `/dev/ttyGS0` exists
- Try different USB port on PC
- Some USB-C cables are power-only

### Backend won't start
- Check Node.js version: `node --version`
- Verify dependencies: `npm install`
- Check for port conflicts: `sudo netstat -tlnp | grep 3000`

### Chromium won't go fullscreen
- Make sure you're running under X11 (not console)
- Try running from desktop environment first
- Check for error messages in terminal

### Touch not working
- Verify touchscreen is detected: `ls /dev/input`
- Check Xorg logs: `cat /var/log/Xorg.0.log | grep touch`
- Try calibration tool

## Auto-start on Boot

For headless operation with Raspberry Pi OS Lite:

```bash
sudo nano /etc/systemd/system/statdeck.service
```

Add:
```ini
[Unit]
Description=StatDeck Display Service
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/statdeck
ExecStart=/home/pi/statdeck/start.sh
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable:
```bash
sudo systemctl enable statdeck
sudo systemctl start statdeck
```
