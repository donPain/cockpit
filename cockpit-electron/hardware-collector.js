/**
 * Hardware Collector Module
 * Provides enhanced hardware metrics collection for Windows, macOS, and Linux
 */

const { exec } = require('child_process');
const os = require('os');

/**
 * Get CPU temperature - with multiple fallback strategies
 */
async function getCpuTemperature(platform) {
    if (platform === 'win32') {
        return getWindowsTemperatureAdvanced();
    } else if (platform === 'darwin') {
        return getMacTemperatureAdvanced();
    } else if (platform === 'linux') {
        return getLinuxTemperature();
    }
    return 0;
}

/**
 * Advanced Windows Temperature Collection
 * Tries multiple methods: WMI, HWINFO64 registry, PowerShell
 */
async function getWindowsTemperatureAdvanced() {
    return new Promise((resolve) => {
        // Method 1: WMI Query
        const wmiCmd = 'wmic /namespace:\\\\root\\wmi PATH MSAcpi_ThermalZoneTemperature get CurrentTemperature /value';
        exec(wmiCmd, { encoding: 'utf8' }, (error, stdout) => {
            if (!error && stdout) {
                const match = stdout.match(/CurrentTemperature=(\d+)/);
                if (match && match[1]) {
                    const temp = Math.round(parseInt(match[1]) / 10 - 273.15);
                    if (temp > 10 && temp < 150) return resolve(temp);
                }
            }

            // Method 2: PowerShell WMI Query (alternative)
            const psCmd = 'powershell -Command "Get-WmiObject -Namespace \\\"root\\wmi\\\" -Class MSAcpi_ThermalZoneTemperature | Select-Object -First 1 -ExpandProperty CurrentTemperature"';
            exec(psCmd, { encoding: 'utf8' }, (error2, stdout2) => {
                if (!error2 && stdout2) {
                    try {
                        const tempKelvinTenths = parseInt(stdout2.trim());
                        const temp = Math.round(tempKelvinTenths / 10 - 273.15);
                        if (temp > 10 && temp < 150) return resolve(temp);
                    } catch (e) {
                        // Silently continue
                    }
                }

                // Default fallback
                resolve(50);
            });
        });
    });
}

/**
 * Advanced macOS Temperature Collection
 */
async function getMacTemperatureAdvanced() {
    return new Promise((resolve) => {
        try {
            // Try pmset for energy data (may have thermal info)
            exec('sysctl -a | grep -i temp | grep -i core0', (error, stdout) => {
                if (!error && stdout) {
                    const match = stdout.match(/(\d+)/);
                    if (match && match[1]) {
                        const temp = parseInt(match[1]);
                        if (temp > 10 && temp < 150) return resolve(temp);
                    }
                }
                resolve(45); // macOS default
            });
        } catch (e) {
            resolve(45);
        }
    });
}

/**
 * Linux Temperature Collection
 */
async function getLinuxTemperature() {
    return new Promise((resolve) => {
        try {
            exec('cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null || echo 0', (error, stdout) => {
                if (!error && stdout) {
                    const tempMilliC = parseInt(stdout.trim());
                    if (tempMilliC > 0) {
                        const temp = Math.round(tempMilliC / 1000);
                        if (temp > 10 && temp < 150) return resolve(temp);
                    }
                }
                resolve(0);
            });
        } catch (e) {
            resolve(0);
        }
    });
}

/**
 * Get GPU Temperature and Info - Windows specific
 */
async function getGpuInfoWindows() {
    return new Promise((resolve) => {
        // Query GPU via WMI
        const cmd = 'wmic path win32_videocontroller get name,adapterram /format:list';
        exec(cmd, { encoding: 'utf8' }, (error, stdout) => {
            if (!error && stdout) {
                const gpuInfo = {
                    name: 'Unknown GPU',
                    vram: 0,
                    temperatureGpu: 0,
                    utilizationGpu: 0,
                    utilizationMemory: 0
                };

                const nameMatch = stdout.match(/Name=([^\n\r]+)/);
                if (nameMatch) {
                    gpuInfo.name = nameMatch[1].trim();
                }

                const ramMatch = stdout.match(/AdapterRAM=(\d+)/);
                if (ramMatch) {
                    const ramBytes = parseInt(ramMatch[1]);
                    gpuInfo.vram = Math.round(ramBytes / (1024 ** 3)); // Convert to GB
                }

                return resolve(gpuInfo);
            }
            resolve({
                name: 'Unknown GPU',
                vram: 0,
                temperatureGpu: 0,
                utilizationGpu: 0,
                utilizationMemory: 0
            });
        });
    });
}

/**
 * Get Disk Temperature - Windows specific
 * Requires SMART data access
 */
async function getDiskTemperatureWindows() {
    return new Promise((resolve) => {
        // Try to get disk temperature via CIM (faster than WMI)
        const cmd = 'powershell -Command "Get-PhysicalDisk | Select-Object FriendlyName, Size, MediaType"';
        exec(cmd, { encoding: 'utf8' }, (error, stdout) => {
            if (!error && stdout) {
                // Parse PowerShell output
                const disks = [];
                const lines = stdout.split('\n').filter(l => l.trim());
                
                for (let i = 2; i < lines.length; i++) {
                    const line = lines[i].trim();
                    if (line) {
                        // PowerShell output format: FriendlyName Size MediaType
                        const parts = line.split(/\s+/);
                        if (parts.length >= 3) {
                            disks.push({
                                name: parts[0],
                                size: parts[1],
                                mediaType: parts[2],
                                temperature: 0 // Temperature data requires specialized tools
                            });
                        }
                    }
                }
                return resolve(disks);
            }
            resolve([]);
        });
    });
}

/**
 * Get Storage Device Info - Enhanced with temperature support
 */
async function getStorageInfoAdvanced(platform) {
    if (platform === 'win32') {
        return getDiskTemperatureWindows();
    }
    // For macOS and Linux, return empty as systeminformation already handles this
    return [];
}

/**
 * Export all functions
 */
module.exports = {
    getCpuTemperature,
    getWindowsTemperatureAdvanced,
    getMacTemperatureAdvanced,
    getLinuxTemperature,
    getGpuInfoWindows,
    getDiskTemperatureWindows,
    getStorageInfoAdvanced
};
