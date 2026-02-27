/**
 * Settings & OTA Maintenance Panel
 * Handles remote backups, updates, theme deployments, rollbacks, and network modes.
 */

class SettingsPanel {
    constructor(app) {
        this.app = app;
        this.isWorking = false;
        this.init();
    }

    init() {
        this.renderHTML();
        this.setupEventListeners();
        this.loadSavedSettings();
    }

    renderHTML() {
        const modalHTML = `
            <div id="settings-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.85); z-index: 9999; justify-content: center; align-items: center; backdrop-filter: blur(4px);">
                <div class="settings-container" style="background: #1a1a2e; border: 2px solid #ff00ff; border-radius: 8px; width: 650px; padding: 25px; color: white; font-family: 'Segoe UI', sans-serif; box-shadow: 0 0 20px rgba(255,0,255,0.2);">
                    
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #333; padding-bottom: 15px; margin-bottom: 25px;">
                        <h2 style="margin: 0; color: #00ffff; text-transform: uppercase; letter-spacing: 2px;">⚙️ System Maintenance</h2>
                        <button id="btn-close-settings" style="background: transparent; border: none; color: #ff00ff; font-size: 24px; cursor: pointer; transition: 0.2s;">✖</button>
                    </div>

                    <div style="background: #111122; padding: 15px; border: 1px solid #444; border-radius: 4px; margin-bottom: 20px;">
                        <h4 style="margin-top: 0; margin-bottom: 15px; color: #00ff88; text-transform: uppercase; font-size: 12px;">Raspberry Pi Connection</h4>
                        
                        <div style="margin-bottom: 15px;">
                            <label style="display: block; font-size: 11px; color: #aaa; margin-bottom: 4px;">Connection Mode</label>
                            <select id="network-mode" style="width: 100%; padding: 8px; background: #222; border: 1px solid #555; color: #fff; border-radius: 3px; font-weight: bold; outline: none;">
                                <option value="wifi">🏠 Home Wi-Fi (Manual IP)</option>
                                <option value="usb">🔌 Work USB (Gadget Mode)</option>
                            </select>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                            <div>
                                <label id="lbl-ip-host" style="display: block; font-size: 11px; color: #aaa; margin-bottom: 4px;">Pi IP Address</label>
                                <div style="display: flex; align-items: center; background: #222; border: 1px solid #555; border-radius: 3px; overflow: hidden;">
                                    <input type="text" id="pi-ip-display" value="192.168.1.84" placeholder="192.168.1.84" style="flex: 1; padding: 8px; background: transparent; border: none; color: #fff; box-sizing: border-box; outline: none;">
                                    <span id="usb-suffix" style="display: none; padding-right: 10px; color: #00ff88; font-weight: bold; font-size: 12px; pointer-events: none;">.local</span>
                                </div>
                                <input type="hidden" id="pi-ip" value="192.168.1.84">
                            </div>
                            <div>
                                <label style="display: block; font-size: 11px; color: #aaa; margin-bottom: 4px;">SSH Username</label>
                                <input type="text" id="pi-username" value="pi" style="width: 100%; padding: 8px; background: #222; border: 1px solid #555; color: #fff; border-radius: 3px; box-sizing: border-box; outline: none;">
                            </div>
                            <div style="grid-column: span 2;">
                                <label style="display: block; font-size: 11px; color: #aaa; margin-bottom: 4px;">SSH Password</label>
                                <input type="password" id="pi-password" placeholder="Enter Pi Password" style="width: 100%; padding: 8px; background: #222; border: 1px solid #555; color: #fff; border-radius: 3px; box-sizing: border-box; outline: none;">
                            </div>
                        </div>
                    </div>

                    <div style="background: #111122; padding: 15px; border: 1px solid #444; border-radius: 4px; margin-bottom: 20px;">
                        <h4 style="margin-top: 0; margin-bottom: 15px; color: #ffaa00; text-transform: uppercase; font-size: 12px;">⚡ Performance & Tuning</h4>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                            <div>
                                <label style="display: block; font-size: 11px; color: #aaa; margin-bottom: 4px;">Stats Update Rate (ms)</label>
                                <input type="number" id="setting-stats-rate" value="500" min="100" step="50" placeholder="e.g. 250" style="width: 100%; padding: 8px; background: #222; border: 1px solid #555; color: #fff; border-radius: 3px; box-sizing: border-box; outline: none;">
                                <span style="font-size: 10px; color: #666;">Safe Minimum: 100ms</span>
                            </div>
                            <div>
                                <label style="display: block; font-size: 11px; color: #aaa; margin-bottom: 4px;">App Switch Delay (ms)</label>
                                <input type="number" id="setting-debounce" value="1500" min="500" step="100" placeholder="e.g. 1500" style="width: 100%; padding: 8px; background: #222; border: 1px solid #555; color: #fff; border-radius: 3px; box-sizing: border-box; outline: none;">
                                <span style="font-size: 10px; color: #666;">Safe Minimum: 500ms</span>
                            </div>
                        </div>
                        <button id="btn-save-tuning" style="width: 100%; padding: 10px; background: #332200; border: 1px solid #ffaa00; color: #ffaa00; cursor: pointer; border-radius: 4px; font-weight: bold; margin-top: 15px; transition: 0.2s;">Apply & Save Tuning</button>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px;">
                        <button id="btn-ota-backup" style="padding: 12px; background: #2d1b4e; border: 1px solid #00ffff; color: white; cursor: pointer; border-radius: 4px; font-weight: bold;">📦 Pull Full Backup</button>
                        <button id="btn-ota-reboot" style="padding: 12px; background: #2d1b4e; border: 1px solid #ffaa00; color: white; cursor: pointer; border-radius: 4px; font-weight: bold;">🔄 Reboot Pi</button>
                        
                        <button id="btn-ota-update" style="padding: 12px; background: #004400; border: 1px solid #00ff00; color: white; cursor: pointer; border-radius: 4px; font-weight: bold;">🚀 Push App Update</button>
                        
                        <button id="btn-push-themes" style="padding: 12px; background: #002244; border: 1px solid #00aaff; color: white; cursor: pointer; border-radius: 4px; font-weight: bold;">🎨 Push Themes Only</button>
                    </div>

                    <button id="btn-ota-rollback" style="width: 100%; padding: 12px; background: rgba(255,0,0,0.2); border: 1px solid #ff0000; color: #ff4444; cursor: pointer; border-radius: 4px; margin-bottom: 25px; font-weight: bold; text-transform: uppercase; transition: 0.2s;">⚠️ Emergency Rollback (Last Known Good)</button>

                    <div>
                        <label style="color: #00ffff; font-size: 12px; text-transform: uppercase; font-weight: bold;">Deployment Console</label>
                        <textarea id="push-log-window" readonly style="width: 100%; height: 180px; background: #0b0b1a; border: 1px solid #333; color: #00ff00; font-family: 'Courier New', monospace; padding: 12px; resize: none; margin-top: 8px; box-sizing: border-box; border-radius: 4px;"></textarea>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    setupEventListeners() {
        document.getElementById('btn-close-settings').addEventListener('click', () => this.hide());

        const modeSelect = document.getElementById('network-mode');
        const ipDisplay = document.getElementById('pi-ip-display');
        const ipHidden = document.getElementById('pi-ip');
        const usbSuffix = document.getElementById('usb-suffix');
        const lblIpHost = document.getElementById('lbl-ip-host');
        const userInput = document.getElementById('pi-username');
        const passInput = document.getElementById('pi-password');

        // Function to perfectly map the visible box to the hidden box
        const updateHiddenIP = () => {
            let baseVal = ipDisplay.value.trim();
            if (modeSelect.value === 'usb') {
                // Strip .local if user accidentally typed it, then append it properly
                baseVal = baseVal.replace('.local', '');
                ipHidden.value = (baseVal || 'missioncontrol') + '.local';
            } else {
                ipHidden.value = baseVal || '192.168.1.84';
            }
        };

        const saveCredentials = () => {
            updateHiddenIP();
            localStorage.setItem('statdeck-username', userInput.value);
            localStorage.setItem('statdeck-password', passInput.value);
            if (modeSelect.value === 'wifi') {
                localStorage.setItem('statdeck-wifi-ip', ipDisplay.value);
            } else {
                localStorage.setItem('statdeck-usb-host', ipDisplay.value.replace('.local', ''));
            }
        };

        userInput.addEventListener('input', saveCredentials);
        passInput.addEventListener('input', saveCredentials);
        ipDisplay.addEventListener('input', saveCredentials);

        modeSelect.addEventListener('change', (e) => {
            const mode = e.target.value;
            localStorage.setItem('statdeck-network-mode', mode);

            if (mode === 'usb') {
                lblIpHost.textContent = "Pi Hostname (Gadget Mode)";
                usbSuffix.style.display = 'block';
                ipDisplay.placeholder = "missioncontrol";
                ipDisplay.value = localStorage.getItem('statdeck-usb-host') || 'missioncontrol';
            } else {
                lblIpHost.textContent = "Pi IP Address (Wi-Fi)";
                usbSuffix.style.display = 'none';
                ipDisplay.placeholder = "192.168.1.84";
                ipDisplay.value = localStorage.getItem('statdeck-wifi-ip') || '192.168.1.84';
            }
            saveCredentials();
        });

        // Setup OTA Buttons
        document.getElementById('btn-ota-backup').addEventListener('click', () => this.handleAction('backup', 'Requesting full backup from Pi...'));
        document.getElementById('btn-ota-reboot').addEventListener('click', () => this.handleAction('reboot', 'Sending reboot command. Standby...'));
        document.getElementById('btn-ota-update').addEventListener('click', () => this.handleAction('update', 'Packaging frontend/backend for deployment...'));

        document.getElementById('btn-ota-rollback').addEventListener('click', () => {
            if (confirm("Are you sure? This will overwrite the Pi with the last successful backup.")) {
                this.handleAction('rollback', 'INITIATING EMERGENCY ROLLBACK...');
            }
        });

        // NEW: Performance & Tuning Save Button
        document.getElementById('btn-save-tuning').addEventListener('click', () => {
            let rate = parseInt(document.getElementById('setting-stats-rate').value) || 500;
            let debounce = parseInt(document.getElementById('setting-debounce').value) || 1500;

            // Apply hard UI guardrails
            if (rate < 100) rate = 100;
            if (debounce < 500) debounce = 500;

            // Snap the input boxes back to safe numbers if they typed something too low
            document.getElementById('setting-stats-rate').value = rate;
            document.getElementById('setting-debounce').value = debounce;

            this.log(`Applying new tuning... Rate: ${rate}ms | Delay: ${debounce}ms`);

            // Fire event for renderer.js to catch
            document.dispatchEvent(new CustomEvent('statdeck-update-tuning', {
                detail: { stats_rate_ms: rate, debounce_ms: debounce }
            }));
        });
    }

    loadSavedSettings() {
        const modeSelect = document.getElementById('network-mode');
        const ipDisplay = document.getElementById('pi-ip-display');
        const ipHidden = document.getElementById('pi-ip');
        const usbSuffix = document.getElementById('usb-suffix');
        const lblIpHost = document.getElementById('lbl-ip-host');
        const userInput = document.getElementById('pi-username');
        const passInput = document.getElementById('pi-password');

        userInput.value = localStorage.getItem('statdeck-username') || 'pi';
        passInput.value = localStorage.getItem('statdeck-password') || '';

        const savedMode = localStorage.getItem('statdeck-network-mode') || 'wifi';
        modeSelect.value = savedMode;

        if (savedMode === 'usb') {
            lblIpHost.textContent = "Pi Hostname (Gadget Mode)";
            usbSuffix.style.display = 'block';
            ipDisplay.placeholder = "missioncontrol";
            ipDisplay.value = localStorage.getItem('statdeck-usb-host') || 'missioncontrol';

            let baseVal = ipDisplay.value.replace('.local', '').trim() || 'missioncontrol';
            ipHidden.value = baseVal + '.local';
        } else {
            lblIpHost.textContent = "Pi IP Address (Wi-Fi)";
            usbSuffix.style.display = 'none';
            ipDisplay.placeholder = "192.168.1.84";
            ipDisplay.value = localStorage.getItem('statdeck-wifi-ip') || '192.168.1.84';
            ipHidden.value = ipDisplay.value || '192.168.1.84';
        }
    }

    show() {
        document.getElementById('settings-modal').style.display = 'flex';
        this.log("Settings console initialized. Ready for commands.");
    }

    hide() {
        if (this.isWorking) {
            alert("A deployment is currently in progress. Please wait.");
            return;
        }
        document.getElementById('settings-modal').style.display = 'none';
    }

    log(message) {
        const consoleEl = document.getElementById('push-log-window');
        if (consoleEl) {
            const timestamp = new Date().toLocaleTimeString();
            consoleEl.value += `[${timestamp}] ${message}\n`;
            consoleEl.scrollTop = consoleEl.scrollHeight;
        }
    }

    async handleAction(actionType, initMessage) {
        if (this.isWorking) {
            this.log("⚠️ ERROR: System is busy processing another command.");
            return;
        }

        // 1. Gather credentials from the UI
        const ip = document.getElementById('pi-ip').value || 'missioncontrol.local';
        const username = document.getElementById('pi-username').value || 'pi';
        const password = document.getElementById('pi-password').value;

        if (!password) {
            alert("⚠️ Please enter the SSH Password in the settings first!");
            return;
        }

        this.isWorking = true;
        this.log(initMessage);

        const credentials = { ip, username, password };

        // 2. Disable all buttons in the settings panel to prevent spam-clicking
        const buttons = document.querySelectorAll('.settings-container button');
        buttons.forEach(b => b.disabled = true);

        try {
            // 3. Send the command (backup, update, reboot, or rollback) down to main.js
            // We use ipcRenderer to cross the bridge from the UI to the background process
            const { ipcRenderer } = require('electron');
            const result = await ipcRenderer.invoke(`ota-${actionType}`, credentials);

            if (!result.success) {
                this.log(`❌ Error: ${result.error}`);
            }
        } catch (error) {
            this.log(`❌ IPC Error: ${error.message}`);
        } finally {
            // 4. Unlock the system when finished
            buttons.forEach(b => b.disabled = false);
            this.isWorking = false;
        }
    }
}
