const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { NodeSSH } = require('node-ssh'); // PORTABLE SSH MODULE

let mainWindow;

// PORTABLE PATH DETECTION
const LAYOUTS_DIR = path.join(app.getAppPath(), '..', 'StatDeck.Service', 'layouts');
if (!fs.existsSync(LAYOUTS_DIR)) { fs.mkdirSync(LAYOUTS_DIR, { recursive: true }); }

const THEMES_DIR = path.join(app.getAppPath(), '..', 'StatDeck.Service', 'themes');
if (!fs.existsSync(THEMES_DIR)) { fs.mkdirSync(THEMES_DIR, { recursive: true }); }

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400, height: 900,
        backgroundColor: '#0f0f23',
        webPreferences: { nodeIntegration: true, contextIsolation: false },
        title: 'StatDeck Configuration Designer v4.0'
    });
    mainWindow.loadFile('index.html');
    createMenu();
}

function createMenu() {
    const template = [
        {
            label: 'File', submenu: [
                { label: 'New', click: () => mainWindow.webContents.send('menu-new') },
                { label: 'Save', click: () => mainWindow.webContents.send('menu-save') },
                { type: 'separator' },
                { label: 'Exit', click: () => app.quit() }
            ]
        },
        {
            label: 'View', submenu: [
                { label: 'Toggle DevTools', accelerator: 'F12', click: () => mainWindow.webContents.toggleDevTools() }
            ]
        }
    ];
    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// IPC HANDLERS (The "Ears" of the App)
// ==========================================
// THEME MANAGEMENT HANDLERS
// ==========================================

// 1. Read the themes folder and return a list of available themes
ipcMain.handle('list-themes', async () => {
    try {
        const files = fs.existsSync(THEMES_DIR) ? fs.readdirSync(THEMES_DIR) : [];
        const themesList = [];

        files.filter(f => f.endsWith('.css')).forEach(f => {
            const themeId = f.replace('.css', '');
            const content = fs.readFileSync(path.join(THEMES_DIR, f), 'utf8');

            let meta = null;
            // Scan the file for a hidden JSON metadata block
            const match = content.match(/\/\*\s*META:\s*(.*?)\s*\*\//);
            if (match) {
                try { meta = JSON.parse(match[1]); } catch (e) { }
            }

            themesList.push({ id: themeId, meta: meta });
        });

        return { success: true, themes: themesList };
    } catch (error) { return { success: false, themes: [] }; }
});

// 2. Save a newly created custom theme from the Theme Builder
ipcMain.handle('save-theme-file', async (event, themeId, cssContent) => {
    try {
        const safeId = themeId.toLowerCase().replace(/[^a-z0-9_-]/g, '');
        const filePath = path.join(THEMES_DIR, `${safeId}.css`);
        fs.writeFileSync(filePath, cssContent, 'utf8');
        return { success: true };
    } catch (error) {
        console.error('Error saving custom theme:', error);
        return { success: false, error: error.message };
    }
});

// 3. Push Themes to Pi securely and portably
ipcMain.handle('push-themes-only', async (event, credentials) => {
    const { ip, username, password } = credentials;
    const ssh = new NodeSSH();

    try {
        event.sender.send('terminal-log', `➔ Connecting to Pi at ${ip}...\n`);

        // Log in programmatically
        await ssh.connect({
            host: ip,
            username: username || 'pi',
            password: password
        });

        event.sender.send('terminal-log', '➔ Connected! Pushing theme files...\n');

        // Transfer the themes folder
        const remotePath = '/home/pi/StatDeck/frontend/themes';
        await ssh.putDirectory(THEMES_DIR, remotePath, {
            recursive: true,
            concurrency: 2,
            tick: function (localPath, remotePath, error) {
                if (error) {
                    event.sender.send('terminal-log', `⚠️ Failed to transfer: ${localPath}\n`);
                }
            }
        });

        event.sender.send('terminal-log', '➔ Files copied! Restarting StatDeck dashboard...\n');

        // Restart dashboard
        const restartCmd = "sudo rm -rf /home/pi/.cache/chromium && sudo reboot";
        const result = await ssh.execCommand(restartCmd);

        if (result.stderr && !result.stderr.includes('Warning')) {
            event.sender.send('terminal-log', `⚠️ Note from Pi: ${result.stderr}\n`);
        }

        event.sender.send('terminal-log', '✅ Themes successfully pushed and dashboard reloaded!\n');
        return { success: true };

    } catch (error) {
        event.sender.send('terminal-log', `❌ Error: ${error.message}\n`);
        return { success: false, error: error.message };
    } finally {
        ssh.dispose(); // Always clean up the connection
    }
});

ipcMain.handle('list-profiles', async () => {
    const files = fs.readdirSync(LAYOUTS_DIR);
    return { success: true, profiles: files.filter(f => f.endsWith('.json')).map(f => f.replace('.json', '')) };
});

ipcMain.handle('load-profile-layout', async (event, profileName) => {
    const filePath = path.join(LAYOUTS_DIR, profileName.toLowerCase() + '.json');
    return fs.existsSync(filePath) ? { success: true, data: fs.readFileSync(filePath, 'utf8') } : { success: false };
});

ipcMain.handle('save-profile-layout', async (event, profileName, layoutData) => {
    try {
        const safeName = profileName.toLowerCase().replace('.json', '');
        const filePath = path.join(LAYOUTS_DIR, `${safeName}.json`);
        const dataString = typeof layoutData === 'string' ? layoutData : JSON.stringify(layoutData, null, 4);
        fs.writeFileSync(filePath, dataString, 'utf8');
        return { success: true };
    } catch (error) {
        console.error('Error saving profile layout:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('save-dialog', async (event, defaultPath) => {
    const targetPath = path.isAbsolute(defaultPath) ? defaultPath : path.join(LAYOUTS_DIR, defaultPath);
    const result = await dialog.showSaveDialog(mainWindow, {
        defaultPath: targetPath,
        filters: [{ name: 'JSON Layouts', extensions: ['json'] }]
    });
    return result;
});

ipcMain.handle('write-file', async (event, filepath, data) => {
    const targetPath = path.isAbsolute(filepath) ? filepath : path.join(LAYOUTS_DIR, filepath);
    fs.writeFileSync(targetPath, data, 'utf8');
    return { success: true };
});

ipcMain.handle('read-file', async (event, filepath) => {
    try { return { success: true, data: fs.readFileSync(filepath, 'utf8') }; }
    catch (e) { return { success: false, error: e.message }; }
});

ipcMain.handle('open-exe-dialog', async () => {
    return await dialog.showOpenDialog(mainWindow, { properties: ['openFile'], filters: [{ name: 'Apps', extensions: ['exe'] }] });
});

ipcMain.handle('extract-icon', async (event, exePath) => {
    try {
        const nativeImage = await app.getFileIcon(exePath, { size: 'large' });
        const base64String = nativeImage.toDataURL();
        return { success: true, iconBase64: base64String };
    } catch (error) {
        console.error('Failed to extract icon:', error);
        return { success: false, error: error.message };
    }
});

// Forward tuning settings to the local Python Service (main.py) on port 5555
ipcMain.handle('send-to-local-service', async (event, payload) => {
    return new Promise((resolve) => {
        const net = require('net');
        const client = new net.Socket();

        client.connect(5555, '127.0.0.1', () => {
            client.write(JSON.stringify(payload) + '\n');
            client.end();
            resolve(true);
        });

        client.on('error', (err) => {
            console.error('Failed to talk to local Python service:', err);
            resolve(false);
        });
    });
});

// ==========================================
// OTA (OVER-THE-AIR) SYSTEM HANDLERS
// ==========================================

// 1. 📦 PULL FULL BACKUP
ipcMain.handle('ota-backup', async (event, credentials) => {
    const ssh = new NodeSSH();
    try {
        await ssh.connect({ host: credentials.ip, username: credentials.username, password: credentials.password });
        event.sender.send('terminal-log', '➔ Connected! Zipping /home/pi/StatDeck...\n');

        // Command the Pi to zip its own folder
        await ssh.execCommand('tar -czf /home/pi/statdeck_backup.tar.gz -C /home/pi StatDeck');

        // Create a local Backups folder on your Windows PC if it doesn't exist
        const backupsDir = path.join(app.getAppPath(), '..', 'StatDeck_Backups');
        if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir);

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const localFile = path.join(backupsDir, `Pi_Backup_${timestamp}.tar.gz`);

        event.sender.send('terminal-log', '➔ Downloading backup to your PC...\n');

        // Download the zip to Windows
        await ssh.getFile(localFile, '/home/pi/statdeck_backup.tar.gz');

        // Clean up the zip file left on the Pi's SD card
        await ssh.execCommand('rm /home/pi/statdeck_backup.tar.gz');

        event.sender.send('terminal-log', `✅ Backup safely downloaded to: ${localFile}\n`);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    } finally {
        ssh.dispose();
    }
});

// 2. 🚀 PUSH APP UPDATE (The "Patch & Push" Workflow)
ipcMain.handle('ota-update', async (event, credentials) => {
    const ssh = new NodeSSH();
    try {
        // Prompt you to select your patched backup folder
        const result = await dialog.showOpenDialog(mainWindow, {
            title: 'Select the Patched Folder to Push to the Pi',
            properties: ['openDirectory']
        });

        if (result.canceled || result.filePaths.length === 0) {
            event.sender.send('terminal-log', '⚠️ Update canceled by user.\n');
            return { success: true }; // Not an error, just a cancel
        }

        const sourceFolder = result.filePaths[0];
        event.sender.send('terminal-log', `➔ Target folder acquired: ${sourceFolder}\n`);
        event.sender.send('terminal-log', '➔ Connecting to Pi...\n');

        await ssh.connect({ host: credentials.ip, username: credentials.username, password: credentials.password });
        event.sender.send('terminal-log', '➔ Connected! Pushing files to /home/pi/StatDeck...\n');

        // Push the selected directory over the old one
        await ssh.putDirectory(sourceFolder, '/home/pi/StatDeck', {
            recursive: true,
            concurrency: 2,
            tick: function (localPath, remotePath, error) {
                if (error) {
                    event.sender.send('terminal-log', `⚠️ Failed to transfer: ${localPath}\n`);
                }
            }
        });

        event.sender.send('terminal-log', '✅ Files transferred! Rebooting Pi to apply changes...\n');

        // Reboot the Pi to load the fresh code
        await ssh.execCommand('sudo reboot');

        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    } finally {
        ssh.dispose();
    }
});


ipcMain.handle('show-message', async (event, options) => { return await dialog.showMessageBox(mainWindow, options); });
ipcMain.handle('show-error', async (event, title, message) => { dialog.showErrorBox(title, message); });

app.whenReady().then(createWindow);