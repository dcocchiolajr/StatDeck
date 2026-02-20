/**
 * StatDeck Config App - Main Process
 * Electron entry point and window management
 */

const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

// Create the main application window
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1200,
        minHeight: 700,
        backgroundColor: '#0f0f23',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true
        },
        icon: path.join(__dirname, 'assets/icon.png'),
        title: 'StatDeck Configuration Designer'
    });

    // Load the app
    mainWindow.loadFile('index.html');

    // Open DevTools in development
    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }

    // Create menu
    createMenu();

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Create application menu
function createMenu() {
    const template = [
        {
            label: 'File',
            submenu: [
                {
                    label: 'New Layout',
                    accelerator: 'CmdOrCtrl+N',
                    click: () => {
                        mainWindow.webContents.send('menu-new');
                    }
                },
                {
                    label: 'Open Layout...',
                    accelerator: 'CmdOrCtrl+O',
                    click: async () => {
                        const result = await dialog.showOpenDialog(mainWindow, {
                            properties: ['openFile'],
                            filters: [
                                { name: 'JSON', extensions: ['json'] }
                            ]
                        });
                        
                        if (!result.canceled && result.filePaths.length > 0) {
                            mainWindow.webContents.send('menu-open', result.filePaths[0]);
                        }
                    }
                },
                {
                    label: 'Save Layout',
                    accelerator: 'CmdOrCtrl+S',
                    click: () => {
                        mainWindow.webContents.send('menu-save');
                    }
                },
                {
                    label: 'Save As...',
                    accelerator: 'CmdOrCtrl+Shift+S',
                    click: () => {
                        mainWindow.webContents.send('menu-save-as');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Export to Pi',
                    accelerator: 'CmdOrCtrl+E',
                    click: () => {
                        mainWindow.webContents.send('menu-export');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Exit',
                    accelerator: 'CmdOrCtrl+Q',
                    click: () => {
                        app.quit();
                    }
                }
            ]
        },
        {
            label: 'Edit',
            submenu: [
                {
                    label: 'Undo',
                    accelerator: 'CmdOrCtrl+Z',
                    click: () => {
                        mainWindow.webContents.send('menu-undo');
                    }
                },
                {
                    label: 'Redo',
                    accelerator: 'CmdOrCtrl+Y',
                    click: () => {
                        mainWindow.webContents.send('menu-redo');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Delete Selected',
                    accelerator: 'Delete',
                    click: () => {
                        mainWindow.webContents.send('menu-delete');
                    }
                },
                {
                    label: 'Clear All',
                    click: () => {
                        mainWindow.webContents.send('menu-clear');
                    }
                }
            ]
        },
        {
            label: 'View',
            submenu: [
                {
                    label: 'Toggle Grid',
                    accelerator: 'CmdOrCtrl+G',
                    click: () => {
                        mainWindow.webContents.send('menu-toggle-grid');
                    }
                },
                {
                    label: 'Toggle Preview',
                    accelerator: 'CmdOrCtrl+P',
                    click: () => {
                        mainWindow.webContents.send('menu-toggle-preview');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Zoom In',
                    accelerator: 'CmdOrCtrl+Plus',
                    click: () => {
                        mainWindow.webContents.send('menu-zoom-in');
                    }
                },
                {
                    label: 'Zoom Out',
                    accelerator: 'CmdOrCtrl+-',
                    click: () => {
                        mainWindow.webContents.send('menu-zoom-out');
                    }
                },
                {
                    label: 'Reset Zoom',
                    accelerator: 'CmdOrCtrl+0',
                    click: () => {
                        mainWindow.webContents.send('menu-zoom-reset');
                    }
                },
                { type: 'separator' },
                {
                    label: 'Toggle Developer Tools',
                    accelerator: 'F12',
                    click: () => {
                        mainWindow.webContents.toggleDevTools();
                    }
                }
            ]
        },
        {
            label: 'Layout',
            submenu: [
                {
                    label: '3x3 Grid',
                    click: () => {
                        mainWindow.webContents.send('menu-grid-size', { cols: 3, rows: 3 });
                    }
                },
                {
                    label: '4x3 Grid (Default)',
                    click: () => {
                        mainWindow.webContents.send('menu-grid-size', { cols: 4, rows: 3 });
                    }
                },
                {
                    label: '5x4 Grid',
                    click: () => {
                        mainWindow.webContents.send('menu-grid-size', { cols: 5, rows: 4 });
                    }
                },
                {
                    label: 'Custom...',
                    click: () => {
                        mainWindow.webContents.send('menu-grid-custom');
                    }
                }
            ]
        },
        {
            label: 'Help',
            submenu: [
                {
                    label: 'Documentation',
                    click: () => {
                        require('electron').shell.openExternal('https://github.com/statdeck/docs');
                    }
                },
                {
                    label: 'Keyboard Shortcuts',
                    click: () => {
                        mainWindow.webContents.send('menu-shortcuts');
                    }
                },
                { type: 'separator' },
                {
                    label: 'About StatDeck',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'About StatDeck Config',
                            message: 'StatDeck Configuration Designer',
                            detail: 'Version 1.0.0\n\nA visual layout designer for StatDeck hardware monitoring displays.\n\nBuilt with Electron',
                            buttons: ['OK']
                        });
                    }
                }
            ]
        }
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// IPC Handlers
ipcMain.handle('save-dialog', async (event, defaultPath) => {
    const result = await dialog.showSaveDialog(mainWindow, {
        defaultPath: defaultPath || 'layout.json',
        filters: [
            { name: 'JSON', extensions: ['json'] }
        ]
    });
    return result;
});

ipcMain.handle('open-dialog', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [
            { name: 'JSON', extensions: ['json'] }
        ]
    });
    return result;
});

ipcMain.handle('read-file', async (event, filepath) => {
    try {
        const data = fs.readFileSync(filepath, 'utf8');
        return { success: true, data };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('write-file', async (event, filepath, data) => {
    try {
        fs.writeFileSync(filepath, data, 'utf8');
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

ipcMain.handle('show-error', async (event, title, message) => {
    dialog.showErrorBox(title, message);
});

ipcMain.handle('show-message', async (event, options) => {
    const result = await dialog.showMessageBox(mainWindow, options);
    return result;
});

// App lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
