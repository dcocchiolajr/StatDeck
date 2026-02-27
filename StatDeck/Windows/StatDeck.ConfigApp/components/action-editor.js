/**
 * Action Editor Component
 * Modal for configuring tile actions
 * V4.1 - Added EXE Icon Auto-Extraction
 */

class ActionEditor {
    constructor(app) {
        this.app = app;
        this.modal = document.getElementById('action-modal');
        this.currentTile = null;
        this.currentActionType = null;
        this.init();
    }

    init() {
        // Close button
        this.modal.querySelector('.modal-close').addEventListener('click', () => this.close());
        document.getElementById('btn-action-cancel').addEventListener('click', () => this.close());
        document.getElementById('btn-action-save').addEventListener('click', () => this.save());

        // Action type selector
        document.getElementById('action-type').addEventListener('change', (e) => {
            this.updateActionConfig(e.target.value);
        });

        // Close on background click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });
    }

    open(tileConfig, actionType) {
        this.currentTile = tileConfig;
        this.currentActionType = actionType;

        const action = tileConfig.actions[actionType] || {};

        document.getElementById('action-type').value = action.type || '';
        this.updateActionConfig(action.type || '', action);

        this.modal.style.display = 'flex';
    }

    close() {
        this.modal.style.display = 'none';
    }

    updateActionConfig(actionType, existing = {}) {
        const container = document.getElementById('action-config');
        container.innerHTML = '';

        if (!actionType) return;

        let html = '';

        switch (actionType) {
            case 'launch_app':
                html = `
                    <div class="property-group">
                        <label>Application Path</label>
                        <div style="display: flex; gap: 5px;">
                            <input type="text" id="action-target" value="${existing.target || ''}" placeholder="C:\\Program Files\\App\\app.exe" style="flex: 1;">
                            <button id="btn-browse-exe" class="btn-secondary" style="padding: 4px 8px;">Browse</button>
                        </div>
                    </div>
                    <div class="property-group">
                        <label>Arguments (optional)</label>
                        <input type="text" id="action-arguments" value="${existing.arguments || ''}" placeholder="--flag value">
                    </div>
                `;
                break;

            case 'hotkey':
                html = `
                    <div class="property-group">
                        <label>Key Combination</label>
                        <input type="text" id="action-keys" value="${existing.keys || ''}" placeholder="ctrl+shift+esc">
                        <small style="color: #666; margin-top: 4px;">Examples: ctrl+c, alt+tab, ctrl+shift+esc</small>
                    </div>
                `;
                break;

            case 'run_script':
                html = `
                    <div class="property-group">
                        <label>Script Path</label>
                        <input type="text" id="action-script" value="${existing.script || ''}" placeholder="C:\\Scripts\\script.bat">
                    </div>
                `;
                break;

            case 'open_url':
                html = `
                    <div class="property-group">
                        <label>URL</label>
                        <input type="text" id="action-url" value="${existing.url || ''}" placeholder="https://example.com">
                    </div>
                `;
                break;

            case 'open_folder':
                html = `
                    <div class="property-group">
                        <label>Folder Path</label>
                        <input type="text" id="action-folder" value="${existing.folder || ''}" placeholder="C:\\Users\\Username\\Documents">
                    </div>
                `;
                break;
        }

        container.innerHTML = html;

        // Attach event listener for the Browse button AFTER html is injected
        if (actionType === 'launch_app') {
            const browseBtn = document.getElementById('btn-browse-exe');
            if (browseBtn) {
                browseBtn.addEventListener('click', async () => {
                    const { ipcRenderer } = require('electron');
                    const result = await ipcRenderer.invoke('open-exe-dialog');
                    if (!result.canceled && result.filePaths.length > 0) {
                        document.getElementById('action-target').value = result.filePaths[0];
                    }
                });
            }
        }
    }

    // Converted to async so we can wait for the icon to extract before saving
    async save() {
        const actionType = document.getElementById('action-type').value;
        const { ipcRenderer } = require('electron');

        if (!actionType) {
            // Remove action
            delete this.currentTile.actions[this.currentActionType];
        } else {
            const action = { type: actionType };

            switch (actionType) {
                case 'launch_app':
                    const exePath = document.getElementById('action-target').value;
                    action.target = exePath;
                    action.arguments = document.getElementById('action-arguments').value;

                    // ICON AUTO-EXTRACTION
                    if (exePath && exePath.toLowerCase().endsWith('.exe')) {
                        try {
                            const iconResult = await ipcRenderer.invoke('extract-icon', exePath);
                            if (iconResult.success) {
                                if (!this.currentTile.config) this.currentTile.config = {};
                                // Save the Base64 image directly to the tile config
                                this.currentTile.config.iconBase64 = iconResult.iconBase64;
                                console.log("Successfully extracted icon for:", exePath);
                            }
                        } catch (err) {
                            console.error("Icon extraction failed:", err);
                        }
                    }
                    break;
                case 'hotkey':
                    action.keys = document.getElementById('action-keys').value;
                    break;
                case 'run_script':
                    action.script = document.getElementById('action-script').value;
                    break;
                case 'open_url':
                    action.url = document.getElementById('action-url').value;
                    break;
                case 'open_folder':
                    action.folder = document.getElementById('action-folder').value;
                    break;
            }

            this.currentTile.actions[this.currentActionType] = action;
        }

        // CRITICAL: Update the tile in the main layout array (V4 Multi-page support)
        if (this.app.layout.pages) {
            for (let page of this.app.layout.pages) {
                const layoutTile = page.tiles.find(t => t.id === this.currentTile.id);
                if (layoutTile) {
                    layoutTile.actions = { ...this.currentTile.actions };
                }
            }
        }

        // Update the preview in properties panel
        if (this.app.propertiesPanel && this.app.propertiesPanel.updateActionPreview) {
            this.app.propertiesPanel.updateActionPreview(
                this.currentActionType,
                this.currentTile.actions[this.currentActionType]
            );
        }

        console.log('Action saved:', this.currentActionType, this.currentTile.actions[this.currentActionType]);

        // Force the canvas to redraw the tile (so if we render an icon later, it pops in immediately)
        this.app.gridCanvas.updateTileElement(this.currentTile);

        this.app.markModified();
        this.close();
    }
}