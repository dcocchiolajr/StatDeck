# Quick Start Guide - Testing StatDeck

## ⚡ Fastest Path to Testing (No Hardware Needed!)

This gets you from download to seeing the UI in **under 5 minutes**.

### Step 1: Install Prerequisites (2 minutes)

**Windows:**
1. Install Python 3.9+: https://www.python.org/downloads/
   - ✓ Check "Add Python to PATH"
2. Install Node.js 18+: https://nodejs.org/
   - Choose LTS version

**Verify installations:**
```bash
python --version   # Should be 3.9+
node --version     # Should be 18+
npm --version
```

### Step 2: Test Python Service (1 minute)

```bash
cd Windows/StatDeck.Service

# Install dependencies
pip install -r requirements.txt

# Test collectors
python test_collectors.py
```

**Expected output:**
```
✓ CPU Collector OK
✓ RAM Collector OK
✓ Disk Collector OK
✓ Network Collector OK
⚠️ GPU Collector OK (No GPU library available)

✅ ALL COLLECTORS PASSED!
```

### Step 3: Test Pi Backend (ON YOUR PC!) (1 minute)

```bash
cd Pi/backend

# Install dependencies
npm install

# Start backend
npm start
```

**Expected output:**
```
HTTP server listening on port 3000
WebSocket server listening on port 3001
StatDeck Pi Backend started
USB serial port /dev/ttyGS0 opened  # Will fail - that's OK!
```

### Step 4: View the UI (30 seconds)

**Open your browser:** http://localhost:3000

You should see:
- Dark dashboard background
- Grid layout (4x3)
- 8 tiles displayed
- "Disconnected from PC" overlay (expected!)

**This proves:**
✅ Backend serves files correctly
✅ Frontend loads and renders
✅ WebSocket connects
✅ Layout engine works

---

## 🎯 What's Happening?

You're running the **Pi backend on your PC**. It's trying to connect via USB (which won't work since there's no Pi), but the **frontend still works perfectly**!

---

## 🔧 Next: Test with Mock Data

Want to see it **fully working** with live-updating tiles?

### Option A: Mock the USB Connection

Edit `Pi/backend/server.js`, add at the very top:

```javascript
const MOCK_USB = true;  // <-- Add this line
```

Then find the line:
```javascript
const usb = new USBHandler(USB_PORT);
```

Replace with:
```javascript
const usb = MOCK_USB ? createMockUSB() : new USBHandler(USB_PORT);

function createMockUSB() {
    const EventEmitter = require('events');
    const mock = new EventEmitter();
    
    // Simulate connection
    setTimeout(() => {
        mock.emit('connected');
        
        // Send mock stats every 500ms
        setInterval(() => {
            mock.emit('message', {
                type: 'stats',
                timestamp: Date.now(),
                data: {
                    cpu: {
                        usage: 40 + Math.random() * 40,
                        temp: 50 + Math.random() * 20,
                        cores: [45, 50, 55, 48]
                    },
                    gpu: {
                        usage: 30 + Math.random() * 50,
                        temp: 60 + Math.random() * 15,
                        vram_used: 4096,
                        vram_total: 8192
                    },
                    ram: {
                        used: 8234,
                        total: 16384,
                        percent: 50 + Math.random() * 20
                    },
                    disk: {
                        read_speed: Math.random() * 150,
                        write_speed: Math.random() * 80,
                        usage_percent: 65
                    },
                    network: {
                        upload_speed: Math.random() * 500,
                        download_speed: Math.random() * 3000
                    }
                }
            });
        }, 500);
    }, 1000);
    
    mock.send = (msg) => { console.log('Mock send:', msg.type); return true; };
    mock.close = () => {};
    mock.on = EventEmitter.prototype.on;
    mock.emit = EventEmitter.prototype.emit;
    
    return mock;
}
```

**Restart backend:**
```bash
npm start
```

**Refresh browser** - now you'll see:
- ✅ Tiles updating every 500ms!
- ✅ Graphs animating!
- ✅ Gauges spinning!
- ✅ No "Disconnected" overlay!

**Test interactions:**
- Click a tile → Check backend console for "Action: tile_X.tap"
- Hold-click for 1 second → Check for "long_press"

---

## ✅ Success Criteria

You've successfully tested the code if:

1. **Python collectors run** without errors
2. **Node backend starts** (even if USB fails)
3. **Browser shows the UI** with all tiles
4. **With mock data**, tiles update smoothly
5. **Click events** appear in backend console

---

## 🚀 What's Next?

### Deploy to Raspberry Pi

Now that you've verified everything works, follow:
1. `docs/PI_SETUP.md` - Configure your Pi
2. Copy files to Pi
3. Connect via USB
4. See it running on the touchscreen!

### Build the Config App

Instead of editing JSON manually, let's build a visual config tool:
- I recommend **Electron** (uses same tech as frontend)
- Drag-and-drop tile placement
- Visual property editor
- Live preview

Want me to create the Electron config app next?

---

## 🐛 Troubleshooting

### "Module not found" errors
```bash
# Python
pip install -r requirements.txt --force-reinstall

# Node
rm -rf node_modules package-lock.json
npm install
```

### Port 3000 already in use
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <number> /F

# Kill any node processes
taskkill /F /IM node.exe
```

### Browser shows blank page
- Check backend console for errors
- Press F12 in browser, check Console tab
- Try: http://localhost:3000/index.html

### Still stuck?
Share the error message and I'll help debug!
