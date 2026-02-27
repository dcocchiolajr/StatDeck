# Testing Guide - Test Before Deploying to Pi

This guide walks you through testing every component independently BEFORE pushing to hardware.

## Phase 1: Test Python Service (Windows)

### Test 1A: Check Dependencies
```bash
cd Windows/StatDeck.Service
pip install -r requirements.txt

# Verify installations
python -c "import psutil; print('psutil OK')"
python -c "import serial; print('pyserial OK')"
python -c "import pyautogui; print('pyautogui OK')"
```

Expected: All print "OK"

### Test 1B: Test Individual Collectors
Create `Windows/StatDeck.Service/test_collectors.py`:

```python
from collectors.cpu_collector import CPUCollector
from collectors.ram_collector import RAMCollector
from collectors.disk_collector import DiskCollector
from collectors.network_collector import NetworkCollector

print("Testing CPU Collector...")
cpu = CPUCollector()
stats = cpu.collect()
print(f"  CPU Usage: {stats['usage']}%")
print(f"  CPU Temp: {stats['temp']}°C")
print("  ✓ CPU Collector OK\n")

print("Testing RAM Collector...")
ram = RAMCollector()
stats = ram.collect()
print(f"  RAM Used: {stats['used']} MB")
print(f"  RAM Percent: {stats['percent']}%")
print("  ✓ RAM Collector OK\n")

print("Testing Disk Collector...")
disk = DiskCollector()
stats = disk.collect()
print(f"  Disk Read: {stats['read_speed']} MB/s")
print(f"  Disk Write: {stats['write_speed']} MB/s")
print("  ✓ Disk Collector OK\n")

print("Testing Network Collector...")
net = NetworkCollector()
stats = net.collect()
print(f"  Upload: {stats['upload_speed']} KB/s")
print(f"  Download: {stats['download_speed']} KB/s")
print("  ✓ Network Collector OK\n")

print("✅ All collectors working!")
```

Run it:
```bash
python test_collectors.py
```

### Test 1C: Test Action Executor
Create `Windows/StatDeck.Service/test_actions.py`:

```python
from actions.launch_app_action import LaunchAppAction
from actions.open_url_action import OpenURLAction

print("Testing Launch App Action...")
action = LaunchAppAction()
# Test with notepad (safe, won't interfere)
action.execute({'target': 'C:\\Windows\\System32\\notepad.exe'})
print("  ✓ Should have opened Notepad\n")

print("Testing Open URL Action...")
url_action = OpenURLAction()
url_action.execute({'url': 'https://www.google.com'})
print("  ✓ Should have opened browser\n")

print("✅ Actions working! Close the opened windows.")
```

Run it:
```bash
python test_actions.py
```

### Test 1D: Test Service WITHOUT USB
Edit `main.py` temporarily to add mock mode:

```python
# At the top of main.py, add:
MOCK_MODE = True  # Set to False for real USB

# In __init__, replace USB initialization:
if MOCK_MODE:
    print("⚠️ RUNNING IN MOCK MODE (No USB)")
    self.usb = MockUSB()
else:
    self.usb = USBManager(...)

# Add this class before StatDeckService:
class MockUSB:
    def __init__(self):
        self.connected = True
    
    def connect(self):
        print("MOCK: USB Connected")
        return True
    
    def send_message(self, msg):
        print(f"MOCK SEND: {msg['type']}")
        return True
    
    def receive_message(self):
        # Simulate occasional action from Pi
        import random
        if random.random() < 0.01:  # 1% chance
            return {'type': 'status', 'connected': True}
        return None
    
    def disconnect(self):
        print("MOCK: USB Disconnected")
```

Run mock service:
```bash
python main.py
```

You should see stats being collected every 500ms without USB errors!

---

## Phase 2: Test Pi Backend (On Your PC First!)

### Test 2A: Test Without USB Gadget
The Pi backend can run on your Windows PC for testing!

```bash
cd Pi/backend
npm install
```

Edit `server.js` temporarily - add mock mode at top:
```javascript
const MOCK_MODE = true;  // Set false for real Pi

// Replace USB initialization:
const usb = MOCK_MODE ? new MockUSBHandler() : new USBHandler(USB_PORT);

// Add before other code:
class MockUSBHandler extends EventEmitter {
    constructor() {
        super();
        this.connected = false;
        
        // Simulate connection after 1 second
        setTimeout(() => {
            this.connected = true;
            this.emit('connected');
            
            // Simulate stats every 500ms
            this.startMockStats();
        }, 1000);
    }
    
    startMockStats() {
        setInterval(() => {
            this.emit('message', {
                type: 'stats',
                timestamp: Date.now(),
                data: {
                    cpu: {
                        usage: Math.random() * 100,
                        temp: 50 + Math.random() * 30,
                        cores: [45, 50, 55, 48]
                    },
                    gpu: {
                        usage: Math.random() * 100,
                        temp: 60 + Math.random() * 20,
                        vram_used: 4096,
                        vram_total: 8192
                    },
                    ram: {
                        used: 8234,
                        total: 16384,
                        percent: 50 + Math.random() * 30
                    },
                    disk: {
                        read_speed: Math.random() * 200,
                        write_speed: Math.random() * 100,
                        usage_percent: 65
                    },
                    network: {
                        upload_speed: Math.random() * 1000,
                        download_speed: Math.random() * 5000
                    }
                }
            });
        }, 500);
    }
    
    send(message) {
        console.log('MOCK SEND:', message.type);
        return true;
    }
    
    close() {}
    isConnected() { return this.connected; }
}
```

Run it:
```bash
npm start
```

You should see:
```
HTTP server listening on port 3000
WebSocket server listening on port 3001
StatDeck Pi Backend started
```

---

## Phase 3: Test Pi Frontend (In Your Browser!)

Open your browser to: **http://localhost:3000**

You should see:
- The grid layout
- Tiles appearing (but showing 0 values initially)
- After backend connects, tiles updating with mock data!

**Test touch interactions:**
- Click a tile (simulates tap)
- Hold click for 800ms (simulates long press)

Check browser console (F12) for any errors.

---

## Phase 4: Test Full System on PC

### Test 4A: PC-to-PC over Network
Instead of USB, test the full system using network sockets first!

**Modify Python Service:**
Change `usb_manager.py` to use TCP sockets instead:
```python
import socket
# ... add TCP socket implementation
```

**Modify Pi Backend:**
Change `usb-handler.js` to accept TCP connections

This lets you test the ENTIRE communication protocol without any USB setup!

### Test 4B: Integration Test Script
Create `test_integration.py`:

```python
import subprocess
import time
import requests

print("Starting Integration Test...")

# Start Pi backend
print("1. Starting Pi backend...")
backend = subprocess.Popen(['node', 'Pi/backend/server.js'])
time.sleep(3)

# Check if backend is running
try:
    r = requests.get('http://localhost:3000')
    print("  ✓ Backend is running")
except:
    print("  ✗ Backend failed to start")
    backend.kill()
    exit(1)

# Start Windows service in mock mode
print("2. Starting Windows service...")
# ... you get the idea

# Run for 10 seconds
print("3. Running for 10 seconds...")
time.sleep(10)

# Cleanup
print("4. Cleaning up...")
backend.kill()

print("✅ Integration test complete!")
```

---

## Phase 5: Ready for Pi Deployment

**Only after ALL these tests pass**, deploy to Pi:

### Step 1: Copy Files to Pi
```bash
# From your PC
scp -r Pi/backend pi@raspberrypi.local:/home/pi/statdeck/
scp -r Pi/frontend pi@raspberrypi.local:/home/pi/statdeck/
```

### Step 2: Install Dependencies on Pi
```bash
ssh pi@raspberrypi.local
cd ~/statdeck/Pi/backend
npm install
```

### Step 3: Test on Pi (Without USB First!)
```bash
# On Pi
cd ~/statdeck/Pi/backend
MOCK_MODE=true node server.js
```

Open browser on another device: `http://raspberrypi.local:3000`

### Step 4: Configure USB Gadget
Follow `docs/PI_SETUP.md` step by step.

### Step 5: Test USB Connection
Connect Pi to PC via USB, then:

**On PC:**
```bash
# Check Device Manager for COM port
python main.py
```

**On Pi:**
```bash
# Disable mock mode first!
node server.js
```

Watch both consoles - they should connect!

---

## Troubleshooting Tests

### Python Import Errors
```bash
pip install --upgrade pip
pip install -r requirements.txt --force-reinstall
```

### Node.js Module Errors
```bash
rm -rf node_modules package-lock.json
npm install
```

### Port Already in Use
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Pi
sudo lsof -i :3000
kill <PID>
```

### Browser Can't Connect
- Check firewall settings
- Verify backend is running: `curl http://localhost:3000`
- Check browser console for errors

---

## Test Checklist

Before deploying to Pi, verify:

- [ ] All Python collectors work
- [ ] All actions execute
- [ ] JSON config loads
- [ ] Node.js backend starts
- [ ] Frontend displays in browser
- [ ] WebSocket connects
- [ ] Tiles update with data
- [ ] Touch events trigger
- [ ] Mock data flows end-to-end

Only when ALL tests pass, move to hardware!
