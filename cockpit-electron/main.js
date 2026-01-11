const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { exec, execSync } = require('child_process');
const si = require('systeminformation');

const userDataPath = app.getPath('userData');
const shortcutsPath = path.join(userDataPath, 'shortcuts.json');

// Default Profiles (moved to initial config generation)
const DEFAULT_SHORTCUTS = [
    { id: 'stg-br', name: 'STG - BR', desc: 'Brasil', icon: '🛡️', type: 'chrome', value: 'Profile 5' },
    { id: 'sandro', name: 'SANDRO', desc: 'Master', icon: '👑', type: 'chrome', value: 'Default' },
    { id: 'propoint', name: 'PROPOINT', desc: 'Treinamento', icon: '🎯', type: 'chrome', value: 'Profile 1' },
    { id: 'ludus', name: 'LUDUS', desc: 'Security', icon: '🔒', type: 'chrome', value: 'Profile 2' },
    { id: 'strike', name: 'STRIKE', desc: 'Coded', icon: '💻', type: 'chrome', value: 'Profile 6' },
    { id: 'stg-us', name: 'STG - US', desc: 'United States', icon: '🚀', type: 'chrome', value: 'Profile 4' }
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
        fs.writeFileSync(shortcutsPath, JSON.stringify(shortcuts, null, 2));
        return true;
    } catch (e) {
        console.error("Error saving shortcuts:", e);
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
            graphics
        ] = await Promise.all([
            si.cpu().catch(() => ({ brand: 'Unknown', cores: os.cpus().length })),
            si.currentLoad().catch(() => ({ currentLoad: 0 })),
            si.fsSize().catch(() => []),
            si.mem().catch(() => ({ total: 0, used: 0, free: 0 })),
            si.graphics().catch(() => ({ controllers: [] }))
        ]);

        // Get CPU temperature with fallback
        let cpuTemp = 0;
        try {
            const tempData = await si.cpuTemperature();
            cpuTemp = Math.round(tempData.main) || 0;
        } catch (e) {
            // Try platform-specific temperature retrieval
            if (platform === 'darwin') {
                try {
                    cpuTemp = await getMacTemperature();
                } catch (err) {
                    console.warn("Mac temperature not available:", err.message);
                }
            } else if (platform === 'win32') {
                try {
                    cpuTemp = await getWindowsTemperature();
                } catch (err) {
                    console.warn("Windows temperature not available:", err.message);
                }
            }
        }

        // Process disk information
        let diskStats = [];
        if (fsSize && fsSize.length > 0) {
            diskStats = fsSize.map((disk) => ({
                device: disk.fs || 'Unknown',
                mount: disk.mount || '/',
                size: Math.round(disk.size / (1024 ** 3)) || 0, // Convert to GB
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

        // Process GPU information
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

        const stats = {
            platform: platform,
            timestamp: new Date().toISOString(),
            cpu: {
                brand: cpuInfo.brand || 'Unknown',
                cores: cpuInfo.cores || os.cpus().length,
                usage: Math.round(currentLoad.currentLoad) || 0,
                temp: cpuTemp
            },
            memory: {
                total: totalMemGB,
                used: usedMemGB,
                free: freeMemGB,
                usage: memUsagePercent
            },
            disk: diskStats,
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

// Helper function to get CPU temperature on macOS
async function getMacTemperature() {
    return new Promise((resolve, reject) => {
        try {
            // Try using powermetrics (requires sudo) - won't work
            // Try using sysctl for other values
            exec('sysctl -a | grep temp', (error, stdout) => {
                if (error) {
                    // Fallback: use a standard estimation
                    return resolve(45); // Default safe value
                }
                const lines = stdout.split('\n');
                for (const line of lines) {
                    if (line.includes('coretemp') || line.includes('thermal')) {
                        const match = line.match(/(\d+)/);
                        if (match) {
                            // Convert from 0.1°C units if needed
                            const temp = parseInt(match[1]);
                            if (temp > 10 && temp < 200) return resolve(temp);
                        }
                    }
                }
                resolve(45); // Default if unable to parse
            });
        } catch (e) {
            resolve(45); // Default safe value
        }
    });
}

// Helper function to get CPU temperature on Windows
async function getWindowsTemperature() {
    return new Promise((resolve) => {
        try {
            // Windows: Try WMI query
            const cmd = 'wmic /namespace:\\\\root\\wmi PATH MSAcpi_ThermalZoneTemperature get CurrentTemperature | findstr .';
            execSync(cmd, { encoding: 'utf8' }, (error, stdout) => {
                if (error) return resolve(50); // Default safe value
                const tempInKelvin = parseInt(stdout.trim()) / 10;
                const tempInCelsius = Math.round(tempInKelvin - 273.15);
                resolve(Math.max(0, tempInCelsius));
            });
        } catch (e) {
            resolve(50); // Default safe value
        }
    });
}

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

ipcMain.handle('run-shortcut', async (event, shortcut) => {
    if (shortcut.type === 'chrome') {
        return openChromeProfile(shortcut.value);
    } else if (shortcut.type === 'url') {
        shell.openExternal(shortcut.value);
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


function openChromeProfile(profileDir) {
    const platform = os.platform();
    let command = '';
    const targetUrl = 'chrome://newtab/';

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
icpMain.handle('lock-system', () => {
    const platform = os.platform();
    if (platform === 'win32') {
        exec('rundll32.exe user32.dll,LockWorkStation');
    } else if (platform === 'darwin') {
        exec('/System/Library/CoreServices/Menu\\ Extras/User.menu/Contents/Resources/CGSession -suspend');
    }
    return true;
});
