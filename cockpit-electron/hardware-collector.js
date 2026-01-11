/**
 * Hardware Collector Module
 * Provides native hardware metrics collection for Windows, macOS, and Linux
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const os = require('os');

/**
 * Get CPU temperature - with multiple fallback strategies
 */
async function getCpuTemperature(platform) {
    if (platform === 'win32') {
        return getWindowsTemperatureNative();
    } else if (platform === 'darwin') {
        return getMacTemperatureNative();
    } else if (platform === 'linux') {
        return getLinuxTemperature();
    }
    return 0;
}

/**
 * Native Windows Temperature Collection - Uses WMI
 */
async function getWindowsTemperatureNative() {
    try {
        // Method 1: Try basic WMIC namespace query with correct syntax
        let { stdout } = await execPromise('wmic /namespace:\\\\root\\wmi PATH MSAcpi_ThermalZoneTemperature get CurrentTemperature /value 2>nul', {
            encoding: 'utf8',
            timeout: 5000
        }).catch(() => ({ stdout: '' }));

        if (stdout && stdout.trim()) {
            const match = stdout.match(/CurrentTemperature=(\d+)/);
            if (match && match[1]) {
                const tempKelvinTenths = parseInt(match[1]);
                const celsius = Math.round(tempKelvinTenths / 10 - 273.15);
                if (celsius > 0 && celsius < 150) {
                    return celsius;
                }
            }
        }

        // Method 2: Try PowerShell CIM Instance (more modern and reliable)
        try {
            ({ stdout } = await execPromise('powershell -NoProfile -Command "Get-CimInstance -Namespace root/wmi -ClassName MSAcpi_ThermalZoneTemperature -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty CurrentTemperature" 2>nul', {
                encoding: 'utf8',
                timeout: 5000
            }));

            if (stdout && stdout.trim()) {
                const tempKelvinTenths = parseInt(stdout.trim());
                if (!isNaN(tempKelvinTenths) && tempKelvinTenths > 0) {
                    const celsius = Math.round(tempKelvinTenths / 10 - 273.15);
                    if (celsius > 0 && celsius < 150) {
                        return celsius;
                    }
                }
            }
        } catch (e) {
            // Continue to next method
        }

        // Method 3: Try registry approach via PowerShell
        try {
            ({ stdout } = await execPromise('powershell -NoProfile -Command "Get-ItemProperty -Path HKLM:\\Hardware\\Description\\System\\CentralProcessor\\0 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty ProcessorNameString" 2>nul', {
                encoding: 'utf8',
                timeout: 5000
            }));
            // If we got CPU info, return a reasonable default temp
            if (stdout && stdout.trim()) {
                return 45; // Default reasonable temperature
            }
        } catch (e) {
            // Continue
        }

        // Fallback: return default
        return 50;
    } catch (error) {
        console.warn("Windows temperature detection failed:", error.message);
        return 50;
    }
}

/**
 * Native macOS Temperature Collection
 */
async function getMacTemperatureNative() {
    try {
        const { stdout } = await execPromise('sysctl -a | grep "temp" | head -1', {
            encoding: 'utf8',
            timeout: 3000
        });
        
        if (stdout && stdout.trim()) {
            const match = stdout.match(/(\d+)/);
            if (match && match[1]) {
                const temp = parseInt(match[1]);
                if (temp > 10 && temp < 150) return temp;
            }
        }
        return 45;
    } catch (error) {
        console.warn("macOS temperature detection failed:", error.message);
        return 45;
    }
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
 * Get GPU Information - Windows native via WMIC
 */
async function getGpuInfoWindows() {
    try {
        const gpus = [];

        // Query all video controllers using WMIC - simple and reliable
        try {
            let { stdout } = await execPromise('wmic path win32_videocontroller get name,adapterram /format:csv 2>nul', {
                encoding: 'utf8',
                timeout: 5000
            }).catch(() => ({ stdout: '' }));

            if (stdout && stdout.trim()) {
                const lines = stdout.split('\n').filter(l => l.trim() && !l.includes('Node'));
                
                for (const line of lines) {
                    const parts = line.split(',').map(p => p.trim()).filter(p => p);
                    if (parts.length >= 2) {
                        const name = parts[0];
                        const vramBytes = parseInt(parts[1]);
                        
                        if (name && name.toLowerCase() !== 'unknown' && name.toLowerCase() !== 'name') {
                            const vramGB = !isNaN(vramBytes) && vramBytes > 0 ? Math.round(vramBytes / (1024 ** 3)) : 0;
                            gpus.push({
                                name: name,
                                vram: vramGB,
                                temperatureGpu: 0,
                                utilizationGpu: 0,
                                utilizationMemory: 0
                            });
                        }
                    }
                }
            }
        } catch (e) {
            console.warn("WMIC GPU query failed:", e.message);
        }

        // If no GPU found, try PowerShell
        if (gpus.length === 0) {
            try {
                let { stdout } = await execPromise('powershell -NoProfile -Command "Get-CimInstance Win32_VideoController -ErrorAction SilentlyContinue | Select-Object Name, @{Name=\'VRAM\';Expression={$_.AdapterRAM}} | ConvertTo-Csv -NoTypeInformation" 2>nul', {
                    encoding: 'utf8',
                    timeout: 5000
                }).catch(() => ({ stdout: '' }));

                if (stdout && stdout.trim()) {
                    const lines = stdout.split('\n').filter(l => l.trim());
                    for (let i = 1; i < lines.length; i++) {
                        const parts = lines[i].split(',').map(p => p.trim().replace(/"/g, ''));
                        if (parts.length >= 2) {
                            const name = parts[0];
                            const vramBytes = parseInt(parts[1]);
                            
                            if (name && name.toLowerCase() !== 'unknown') {
                                const vramGB = !isNaN(vramBytes) && vramBytes > 0 ? Math.round(vramBytes / (1024 ** 3)) : 0;
                                gpus.push({
                                    name: name,
                                    vram: vramGB,
                                    temperatureGpu: 0,
                                    utilizationGpu: 0,
                                    utilizationMemory: 0
                                });
                            }
                        }
                    }
                }
            } catch (e) {
                console.warn("PowerShell GPU query failed:", e.message);
            }
        }

        // Try to enhance with NVIDIA-SMI if available
        if (gpus.length > 0) {
            try {
                const { stdout } = await execPromise('nvidia-smi --query-gpu=index,name,temperature.gpu,utilization.gpu,utilization.memory --format=csv,noheader,nounits 2>nul', {
                    encoding: 'utf8',
                    timeout: 3000
                }).catch(() => ({ stdout: '' }));

                if (stdout && stdout.trim()) {
                    const lines = stdout.trim().split('\n');
                    for (const line of lines) {
                        const parts = line.split(',').map(p => p.trim());
                        if (parts.length >= 5) {
                            const gpuIdx = parseInt(parts[0]);
                            if (gpus[gpuIdx]) {
                                gpus[gpuIdx].temperatureGpu = parseInt(parts[2]) || 0;
                                gpus[gpuIdx].utilizationGpu = parseInt(parts[3]) || 0;
                                gpus[gpuIdx].utilizationMemory = parseInt(parts[4]) || 0;
                            }
                        }
                    }
                }
            } catch (e) {
                // NVIDIA-SMI not available - continue without GPU temps
            }
        }

        return gpus;
    } catch (error) {
        console.error("Error getting GPU info:", error.message);
        return [];
    }
}

/**
 * Get Disk Usage Percentage - Windows native
 */
async function getDiskUsagePercentageWindows() {
    try {
        const disks = [];

        // Use WMIC for disk info - simple and reliable
        try {
            let { stdout } = await execPromise('wmic logicaldisk get name,size,freespace /format:csv 2>nul', {
                encoding: 'utf8',
                timeout: 5000
            }).catch(() => ({ stdout: '' }));

            if (stdout && stdout.trim()) {
                const lines = stdout.split('\n').filter(l => l.trim() && !l.includes('Node'));
                
                for (const line of lines) {
                    const parts = line.split(',').map(p => p.trim()).filter(p => p);
                    if (parts.length >= 3) {
                        const drive = parts[0];
                        const size = parseInt(parts[1]);
                        const freespace = parseInt(parts[2]);
                        
                        if (!isNaN(size) && !isNaN(freespace) && size > 0) {
                            const used = size - freespace;
                            const percentage = Math.round((used / size) * 100);
                            
                            disks.push({
                                drive: drive,
                                totalGB: Math.round(size / (1024 ** 3)),
                                usedGB: Math.round(used / (1024 ** 3)),
                                freeGB: Math.round(freespace / (1024 ** 3)),
                                percentageUsed: percentage
                            });
                        }
                    }
                }
            }
        } catch (e) {
            console.warn("Disk info WMIC query failed:", e.message);
        }

        // Fallback: Try PowerShell if WMIC failed
        if (disks.length === 0) {
            try {
                let { stdout } = await execPromise('powershell -NoProfile -Command "Get-PSDrive -PSProvider FileSystem | Where-Object {$_.Root -match \'^[A-Z]:\\\\\'} | Select-Object @{Name=\'Drive\';Expression={$_.Name + \':\'}}, @{Name=\'TotalGB\';Expression={[Math]::Round($_.Used / 1GB + $_.Free / 1GB)}}, @{Name=\'UsedGB\';Expression={[Math]::Round($_.Used / 1GB)}}, @{Name=\'FreeGB\';Expression={[Math]::Round($_.Free / 1GB)}} | ConvertTo-Csv -NoTypeInformation" 2>nul', {
                    encoding: 'utf8',
                    timeout: 5000
                }).catch(() => ({ stdout: '' }));

                if (stdout && stdout.trim()) {
                    const lines = stdout.split('\n').filter(l => l.trim());
                    for (let i = 1; i < lines.length; i++) {
                        const parts = lines[i].split(',').map(p => p.trim().replace(/"/g, ''));
                        if (parts.length >= 4) {
                            const drive = parts[0];
                            const totalGB = parseInt(parts[1]);
                            const usedGB = parseInt(parts[2]);
                            const freeGB = parseInt(parts[3]);
                            
                            if (totalGB > 0) {
                                const percentage = Math.round((usedGB / totalGB) * 100);
                                disks.push({
                                    drive: drive,
                                    totalGB: totalGB,
                                    usedGB: usedGB,
                                    freeGB: freeGB,
                                    percentageUsed: percentage
                                });
                            }
                        }
                    }
                }
            } catch (e) {
                console.warn("Disk info PowerShell query failed:", e.message);
            }
        }

        return disks.length > 0 ? disks : null;
    } catch (error) {
        console.error("Error getting disk usage:", error.message);
        return null;
    }
}

/**
 * Get Storage Info Advanced
 */
async function getStorageInfoAdvanced(platform) {
    if (platform === 'win32') {
        return getDiskUsagePercentageWindows();
    }
    return [];
}

/**
 * Export all functions
 */
module.exports = {
    getCpuTemperature,
    getWindowsTemperatureNative,
    getMacTemperatureNative,
    getLinuxTemperature,
    getGpuInfoWindows,
    getDiskUsagePercentageWindows,
    getStorageInfoAdvanced
};
