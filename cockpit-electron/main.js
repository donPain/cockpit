const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { exec, execSync } = require('child_process');
const si = require('systeminformation');
const hardwareCollector = require('./hardware-collector');

const userDataPath = app.getPath('userData');
const shortcutsPath = path.join(userDataPath, 'shortcuts.json');
const toolsPath = path.join(userDataPath, 'tools.json');

// Default Profiles (moved to initial config generation)
const DEFAULT_SHORTCUTS = [
    { id: 'stg-br', name: 'STG - BR', desc: 'Brasil', icon: 'https://stg-outdoor.com/img/stg-logo-branco.png', type: 'chrome', value: 'Profile 5' },
    { id: 'sandro', name: 'SANDRO', desc: 'Master', icon: '👑', type: 'chrome', value: 'Default' },
    { id: 'propoint', name: 'PROPOINT', desc: 'Treinamento', icon: 'https://www.propoint.com.br/logo_propoint.png', type: 'chrome', value: 'Profile 1' },
    { id: 'ludus', name: 'LUDUS', desc: 'Security', icon: 'https://ludus.vision/logoludus600x175.png', type: 'chrome', value: 'Profile 2' },
    { id: 'strike', name: 'STRIKE', desc: 'Coded', icon: 'https://www.scb.center/_next/image?url=%2Flogo3.png&w=640&q=75', type: 'chrome', value: 'Profile 6' },
    { id: 'stg-us', name: 'STG - US', desc: 'United States', icon: 'https://stg-outdoor.com/img/stg-logo-branco.png', type: 'chrome', value: 'Profile 4' }
];

const DEFAULT_TOOLS = [
    { id: 'chatgpt', name: 'ChatGPT', url: 'https://chat.openai.com', icon: 'https://cdn-icons-png.flaticon.com/512/11865/11865338.png', profile: 'Default' },
    { id: 'gemini', name: 'Gemini', url: 'https://gemini.google.com', icon: 'https://registry.npmmirror.com/@lobehub/icons-static-png/latest/files/dark/gemini-color.png', profile: 'Default' },
    { id: 'claude', name: 'Claude', url: 'https://claude.ai', icon: 'https://registry.npmmirror.com/@lobehub/icons-static-png/latest/files/dark/claude-color.png', profile: 'Default' }
];

function loadShortcuts() {
    try {
        if (!fs.existsSync(shortcutsPath)) {
            // Ensure directory exists
            if (!fs.existsSync(userDataPath)) {
                fs.mkdirSync(userDataPath, { recursive: true });
            }
            fs.writeFileSync(shortcutsPath, JSON.stringify(DEFAULT_SHORTCUTS, null, 2));
            return DEFAULT_SHORTCUTS;
        }
        return JSON.parse(fs.readFileSync(shortcutsPath, 'utf8'));
    } catch (e) {
        console.error("Error loading shortcuts:", e);
        return DEFAULT_SHORTCUTS;
    }
}

function saveShortcuts(shortcuts) {
    try {
        // Ensure directory exists before saving
        if (!fs.existsSync(userDataPath)) {
            fs.mkdirSync(userDataPath, { recursive: true });
        }
        fs.writeFileSync(shortcutsPath, JSON.stringify(shortcuts, null, 2));
        console.log("Shortcuts saved to:", shortcutsPath);
        return true;
    } catch (e) {
        console.error("Error saving shortcuts:", e);
        return false;
    }
}

function loadTools() {
    try {
        if (!fs.existsSync(toolsPath)) {
            fs.writeFileSync(toolsPath, JSON.stringify(DEFAULT_TOOLS, null, 2));
            return DEFAULT_TOOLS;
        }
        return JSON.parse(fs.readFileSync(toolsPath, 'utf8'));
    } catch (e) {
        console.error("Error loading tools:", e);
        return DEFAULT_TOOLS;
    }
}

function saveTools(tools) {
    try {
        if (!fs.existsSync(userDataPath)) {
            fs.mkdirSync(userDataPath, { recursive: true });
        }
        fs.writeFileSync(toolsPath, JSON.stringify(tools, null, 2));
        console.log("Tools saved to:", toolsPath);
        return true;
    } catch (e) {
        console.error("Error saving tools:", e);
        return false;
    }
}

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1900,
        height: 1000,
        fullscreen: false,
        autoHideMenuBar: true,
        backgroundColor: '#0a0e1a',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        }
    });

    mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
    console.log("Configuration Path:", userDataPath);
    createWindow();

    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

// --- Hardware Stats Handler ---
ipcMain.handle('get-hardware-stats', async () => {
    try {
        const platform = os.platform();
        
        // Fetch all hardware data in parallel
        const [
            cpuInfo,
            currentLoad,
            fsSize,
            mem,
            graphics,
            diskLayout
        ] = await Promise.all([
            si.cpu().catch(() => ({ brand: 'Unknown', cores: os.cpus().length })),
            si.currentLoad().catch(() => ({ currentLoad: 0 })),
            si.fsSize().catch(() => []),
            si.mem().catch(() => ({ total: 0, used: 0, free: 0 })),
            si.graphics().catch(() => ({ controllers: [] })),
            si.diskLayout().catch(() => [])
        ]);

        // Get CPU temperature using advanced methods
        let cpuTemp = await hardwareCollector.getCpuTemperature(platform);

        // Try to get enhanced hardware stats from C# monitor (NVMe, GPU Temps, etc.)
        const csharpStats = await hardwareCollector.getHardwareStatsCSharp();
        
        // Override CPU temp if C# monitor has better data
        if (csharpStats && csharpStats.cpu && csharpStats.cpu.temp > 0) {
            cpuTemp = csharpStats.cpu.temp;
        }

        // Get enhanced disk info with percentage on Windows
        let diskStats = [];
        if (platform === 'win32') {
            const diskUsageData = await hardwareCollector.getDiskUsagePercentageWindows();
            if (diskUsageData && Array.isArray(diskUsageData)) {
                diskStats = diskUsageData.map(disk => ({
                    device: disk.drive,
                    mount: disk.drive,
                    size: disk.totalGB,
                    used: disk.usedGB,
                    available: disk.freeGB,
                    use: disk.percentageUsed
                }));
            }
        }
        
        // Fallback to systeminformation if Windows method didn't work
        if (diskStats.length === 0 && fsSize && fsSize.length > 0) {
            diskStats = fsSize.map((disk) => ({
                device: disk.fs || 'Unknown',
                mount: disk.mount || '/',
                size: Math.round(disk.size / (1024 ** 3)) || 0,
                used: Math.round(disk.used / (1024 ** 3)) || 0,
                available: Math.round(disk.available / (1024 ** 3)) || 0,
                use: Math.round(disk.use) || 0
            }));
        }

        // Process memory information
        const totalMemGB = Math.round(mem.total / (1024 ** 3));
        const usedMemGB = Math.round(mem.used / (1024 ** 3));
        const freeMemGB = Math.round(mem.free / (1024 ** 3));
        const memUsagePercent = totalMemGB > 0 ? Math.round((mem.used / mem.total) * 100) : 0;

        // Process GPU information - with Windows-specific enhancements
        let gpuControllers = [];
        if (graphics.controllers && graphics.controllers.length > 0) {
            gpuControllers = graphics.controllers.map(ctrl => ({
                name: ctrl.name || 'Unknown GPU',
                vram: ctrl.vram || 0,
                utilizationGpu: ctrl.utilizationGpu || 0,
                utilizationMemory: ctrl.utilizationMemory || 0,
                temperatureGpu: ctrl.temperatureGpu || 0
            }));
        }
        
        // Enhanced GPU info for Windows - native detection
        if (platform === 'win32') {
            try {
                // First try C# monitor stats as they are most reliable for Temps/Usage
                if (csharpStats && csharpStats.gpus && csharpStats.gpus.length > 0) {
                    // Start fresh or merge? Let's use C# data as primary source for GPU if available
                    gpuControllers = csharpStats.gpus.map(gpu => ({
                         name: gpu.name,
                         vram: gpu.memoryTotal ? gpu.memoryTotal * 1024 : 0, // Convert GB back to MB if needed, or keep uniform. keeping consistency with systeminfo might require MB
                         utilizationGpu: gpu.load,
                         utilizationMemory: gpu.memoryLoad,
                         temperatureGpu: gpu.temp,
                         memoryUsed: gpu.memoryUsed,
                         memoryTotal: gpu.memoryTotal
                    }));
                } 
                else {
                    // Fallback to WMI/Powershell
                    const gpuInfoArray = await hardwareCollector.getGpuInfoWindows();
                    if (Array.isArray(gpuInfoArray) && gpuInfoArray.length > 0) {
                        gpuControllers = gpuInfoArray;
                    }
                }
            } catch (e) {
                console.warn("Enhanced GPU detection failed:", e.message);
            }
        }

        const stats = {
            platform: platform,
            timestamp: new Date().toISOString(),
            cpu: {
                brand: cpuInfo.brand || 'Unknown',
                cores: cpuInfo.cores || os.cpus().length,
                usage: (csharpStats && csharpStats.cpu && csharpStats.cpu.load > 0) ? csharpStats.cpu.load : (Math.round(currentLoad.currentLoad) || 0),
                temp: cpuTemp
            },
            memory: {
                total: totalMemGB,
                used: usedMemGB,
                free: freeMemGB,
                usage: memUsagePercent
            },
            disk: diskStats,
            nvme: (csharpStats && csharpStats.storage) ? csharpStats.storage : (diskLayout || []),
            gpu: {
                controllers: gpuControllers
            }
        };

        return stats;
    } catch (error) {
        console.error("Error fetching hardware stats:", error);
        return {
            platform: os.platform(),
            timestamp: new Date().toISOString(),
            cpu: { brand: 'Unknown', cores: os.cpus().length, usage: 0, temp: 0 },
            memory: { total: 0, used: 0, free: 0, usage: 0 },
            disk: [],
            gpu: { controllers: [] },
            error: error.message
        };
    }
});

// Note: Temperature collection is now handled by hardware-collector.js module
// The following functions have been moved there for better maintenance and organization

// --- Shortcuts Handlers ---
ipcMain.handle('get-shortcuts', () => {
    return loadShortcuts();
});

ipcMain.handle('add-shortcut', (event, shortcut) => {
    const shortcuts = loadShortcuts();
    shortcut.id = Date.now().toString();
    shortcuts.push(shortcut);
    saveShortcuts(shortcuts);
    return shortcuts;
});

ipcMain.handle('delete-shortcut', (event, id) => {
    let shortcuts = loadShortcuts();
    shortcuts = shortcuts.filter(s => s.id !== id);
    saveShortcuts(shortcuts);
    return shortcuts;
});

ipcMain.handle('edit-shortcut', (event, updatedShortcut) => {
    let shortcuts = loadShortcuts();
    const index = shortcuts.findIndex(s => s.id === updatedShortcut.id);
    if (index !== -1) {
        shortcuts[index] = updatedShortcut;
        saveShortcuts(shortcuts);
    }
    return shortcuts;
});

// --- Tools Handlers ---
ipcMain.handle('get-tools', () => {
    return loadTools();
});

ipcMain.handle('add-tool', (event, tool) => {
    const tools = loadTools();
    tool.id = Date.now().toString();
    tools.push(tool);
    saveTools(tools);
    return tools;
});

ipcMain.handle('delete-tool', (event, id) => {
    let tools = loadTools();
    tools = tools.filter(t => t.id !== id);
    saveTools(tools);
    return tools;
});

ipcMain.handle('edit-tool', (event, updatedTool) => {
    let tools = loadTools();
    const index = tools.findIndex(t => t.id === updatedTool.id);
    if (index !== -1) {
        tools[index] = updatedTool;
        saveTools(tools);
    }
    return tools;
});

ipcMain.handle('run-tool', async (event, tool) => {
    return openChromeProfile(tool.profile, tool.url);
});

ipcMain.handle('run-shortcut', async (event, shortcut) => {
    if (shortcut.type === 'chrome') {
        // Chrome profiles sempre abrem no Chrome
        return openChromeProfile(shortcut.value);
    } else if (shortcut.type === 'url') {
        // URLs customizadas (Meet, Agenda, etc.) abrem no app
        // Enviar para renderer process abrir webview
        const mainWindow = BrowserWindow.getAllWindows()[0];
        if (mainWindow) {
            mainWindow.webContents.send('open-webview', {
                url: shortcut.value,
                title: shortcut.name
            });
        }
        return { ok: true };
    } else if (shortcut.type === 'app') {
        shell.openPath(shortcut.value);
        return { ok: true };
    }
    return { ok: false, error: 'Tipo desconhecido' };
});

// Keep this for backward compatibility if index.html calls it directly (though we will update index.html)
// but let's redirect to our new logic just in case
ipcMain.handle('open-profile', async (event, profileName) => {
    // Legacy support: map old names to values if needed, or just find in shortcuts
    const shortcuts = loadShortcuts();
    // Try to find by ID or Name
    const found = shortcuts.find(s => s.name === profileName || s.id === profileName);
    if (found && found.type === 'chrome') {
        return openChromeProfile(found.value);
    }
    // Fallback to direct lookup if user hasn't migrated but code logic expects old map
    // (Should not be hit if we update index.html correctly)
    return { ok: false, error: "Perfil não encontrado." };
});


function openChromeProfile(profileDir, url) {
    const platform = os.platform();
    let command = '';
    const targetUrl = url || 'chrome://newtab/';

    if (platform === 'win32') {
        const suffixes = ['\\Google\\Chrome\\Application\\chrome.exe'];
        const prefixes = [process.env['ProgramFiles'], process.env['ProgramFiles(x86)']].filter(p => p);
        
        let chromePath = '';

        for (const prefix of prefixes) {
            const tryPath = path.join(prefix, 'Google', 'Chrome', 'Application', 'chrome.exe');
            if (fs.existsSync(tryPath)) {
                chromePath = tryPath;
                break;
            }
        }

        if (!chromePath) return { ok: false, error: "Chrome não encontrado." };
        command = `"${chromePath}" --profile-directory="${profileDir}" --new-window "${targetUrl}"`;

    } else if (platform === 'darwin') {
        const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
        command = `"${chromePath}" --profile-directory="${profileDir}" --new-window "${targetUrl}"`;
    } else {
        return { ok: false, error: "Sistema operacional não suportado." };
    }

    exec(command, (error) => {
        if (error) console.error(`exec error: ${error}`);
    });
    return { ok: true };
}

// --- Lock Handler ---
ipcMain.handle('lock-system', () => {
    const platform = os.platform();
    if (platform === 'win32') {
        exec('rundll32.exe user32.dll,LockWorkStation');
    } else if (platform === 'darwin') {
        exec('/System/Library/CoreServices/Menu\\ Extras/User.menu/Contents/Resources/CGSession -suspend');
    }
    return true;
});
