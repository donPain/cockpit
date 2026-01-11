const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    openProfile: (profileName) => ipcRenderer.invoke('open-profile', profileName), // Legacy
    getHardwareStats: () => ipcRenderer.invoke('get-hardware-stats'),
    lockSystem: () => ipcRenderer.invoke('lock-system'),
    
    // New Shortcuts API
    getShortcuts: () => ipcRenderer.invoke('get-shortcuts'),
    addShortcut: (shortcut) => ipcRenderer.invoke('add-shortcut', shortcut),
    editShortcut: (shortcut) => ipcRenderer.invoke('edit-shortcut', shortcut),
    deleteShortcut: (id) => ipcRenderer.invoke('delete-shortcut', id),
    runShortcut: (shortcut) => ipcRenderer.invoke('run-shortcut', shortcut),

    // Tools API
    getTools: () => ipcRenderer.invoke('get-tools'),
    addTool: (tool) => ipcRenderer.invoke('add-tool', tool),
    editTool: (tool) => ipcRenderer.invoke('edit-tool', tool),
    deleteTool: (id) => ipcRenderer.invoke('delete-tool', id),
    runTool: (tool) => ipcRenderer.invoke('run-tool', tool),
    
    // Webview API
    openWebview: (url, title) => {
        // Chama função JavaScript no renderer process
        window.openWebview(url, title);
    },

    // Listener para quando main.js pedir para abrir webview
    onOpenWebview: (callback) => ipcRenderer.on('open-webview', (event, data) => {
        callback(data);
    })
});