using System;
using System.Linq;
using System.Runtime.InteropServices;
using System.Collections.Generic;
using LibreHardwareMonitor.Hardware;

namespace HardwareMonitorLib
{
    public class HardwareMonitor : IDisposable
    {
        private Computer _computer;
        private bool _initialized = false;

        public HardwareMonitor()
        {
            _computer = new Computer
            {
                IsCpuEnabled = true,
                IsGpuEnabled = true,
                IsMemoryEnabled = true,
                IsMotherboardEnabled = true,
                IsStorageEnabled = true
            };
        }

        private void EnsureInitialized()
        {
            if (!_initialized)
            {
                _computer.Open();
                _initialized = true;
            }
        }

        public void Update()
        {
            EnsureInitialized();
            foreach (var hardware in _computer.Hardware)
            {
                hardware.Update();
                foreach (var subHardware in hardware.SubHardware)
                {
                    subHardware.Update();
                }
            }
        }

        public string GetHardwareInfoJson()
        {
            try
            {
                Update();
                
                // CPU
                double cpuTemp = 0;
                double cpuLoad = 0;
                var cpu = _computer.Hardware.FirstOrDefault(h => h.HardwareType == HardwareType.Cpu);
                if (cpu != null)
                {
                    cpu.Update();
                    var tempSensor = cpu.Sensors.FirstOrDefault(s => s.SensorType == SensorType.Temperature && (s.Name.Contains("Package") || s.Name.Contains("Average"))) 
                                     ?? cpu.Sensors.FirstOrDefault(s => s.SensorType == SensorType.Temperature);
                    if (tempSensor != null && tempSensor.Value.HasValue) cpuTemp = Math.Round(tempSensor.Value.Value, 1);
                    
                    var loadSensor = cpu.Sensors.FirstOrDefault(s => s.SensorType == SensorType.Load && s.Name.Contains("Total"));
                    if (loadSensor != null && loadSensor.Value.HasValue) cpuLoad = Math.Round(loadSensor.Value.Value, 1);
                }

                // GPU
                var gpuList = new List<string>();
                var gpus = _computer.Hardware.Where(h => 
                    h.HardwareType == HardwareType.GpuNvidia || 
                    h.HardwareType == HardwareType.GpuAmd || 
                    h.HardwareType == HardwareType.GpuIntel).ToList();
                
                foreach (var gpu in gpus)
                {
                    gpu.Update();
                    double gpuTemp = 0;
                    double gpuLoad = 0;
                    double gpuMemLoad = 0;
                    double gpuMemTotal = 0;
                    double gpuMemUsed = 0;

                    var tSensor = gpu.Sensors.FirstOrDefault(s => s.SensorType == SensorType.Temperature);
                    if (tSensor != null && tSensor.Value.HasValue) gpuTemp = Math.Round(tSensor.Value.Value, 1);

                    var lSensor = gpu.Sensors.FirstOrDefault(s => s.SensorType == SensorType.Load && s.Name.Contains("Core"));
                    if (lSensor != null && lSensor.Value.HasValue) gpuLoad = Math.Round(lSensor.Value.Value, 1);
                    
                    var mlSensor = gpu.Sensors.FirstOrDefault(s => s.SensorType == SensorType.Load && s.Name.Contains("Memory"));
                    if (mlSensor != null && mlSensor.Value.HasValue) gpuMemLoad = Math.Round(mlSensor.Value.Value, 1);

                    var memUsedSensor = gpu.Sensors.FirstOrDefault(s => s.SensorType == SensorType.SmallData && s.Name.Contains("Memory Used"));
                    if (memUsedSensor != null && memUsedSensor.Value.HasValue) gpuMemUsed = Math.Round(memUsedSensor.Value.Value / 1024, 1); // MB to GB ? Check units. Libre usually MB.
                    
                    var memTotalSensor = gpu.Sensors.FirstOrDefault(s => s.SensorType == SensorType.SmallData && s.Name.Contains("Memory Total"));
                    if (memTotalSensor != null && memTotalSensor.Value.HasValue) gpuMemTotal = Math.Round(memTotalSensor.Value.Value / 1024, 1);

                    gpuList.Add($"{{\"name\": \"{gpu.Name}\", \"temp\": {gpuTemp}, \"load\": {gpuLoad}, \"memoryLoad\": {gpuMemLoad}, \"memoryUsed\": {gpuMemUsed}, \"memoryTotal\": {gpuMemTotal}}}");
                }

                // Storage
                var storageList = new List<string>();
                var storageDevices = _computer.Hardware.Where(h => h.HardwareType == HardwareType.Storage).ToList();
                
                foreach (var device in storageDevices)
                {
                    device.Update();
                    double temp = 0;
                    var tempSensor = device.Sensors.FirstOrDefault(s => s.SensorType == SensorType.Temperature);
                    if (tempSensor != null && tempSensor.Value.HasValue) temp = Math.Round(tempSensor.Value.Value, 1);
                    
                    storageList.Add($"{{\"name\": \"{device.Name}\", \"temp\": {temp}}}");
                }

                return $"{{\"cpu\": {{\"temp\": {cpuTemp}, \"load\": {cpuLoad}}}, \"gpus\": [{string.Join(",", gpuList)}], \"storage\": [{string.Join(",", storageList)}]}}";
            }
            catch (Exception ex)
            {
                return $"{{\"error\": \"{ex.Message}\"}}";
            }
        }

        public double GetCpuTemperature()
        {
            try
            {
                Update();
                var cpu = _computer.Hardware.FirstOrDefault(h => h.HardwareType == HardwareType.Cpu);
                if (cpu != null)
                {
                    var tempSensor = cpu.Sensors
                        .FirstOrDefault(s => s.SensorType == SensorType.Temperature && 
                                           (s.Name.Contains("Package") || s.Name.Contains("Average")));
                    
                    if (tempSensor != null && tempSensor.Value.HasValue)
                    {
                        return Math.Round(tempSensor.Value.Value, 1);
                    }

                    // Fallback: qualquer sensor de temperatura da CPU
                    tempSensor = cpu.Sensors.FirstOrDefault(s => s.SensorType == SensorType.Temperature);
                    if (tempSensor != null && tempSensor.Value.HasValue)
                    {
                        return Math.Round(tempSensor.Value.Value, 1);
                    }
                }
                return -1; // Não disponível
            }
            catch
            {
                return -1;
            }
        }

        public double GetGpuTemperature()
        {
            try
            {
                Update();
                var gpu = _computer.Hardware.FirstOrDefault(h => 
                    h.HardwareType == HardwareType.GpuNvidia || 
                    h.HardwareType == HardwareType.GpuAmd ||
                    h.HardwareType == HardwareType.GpuIntel);
                
                if (gpu != null)
                {
                    var tempSensor = gpu.Sensors.FirstOrDefault(s => s.SensorType == SensorType.Temperature);
                    if (tempSensor != null && tempSensor.Value.HasValue)
                    {
                        return Math.Round(tempSensor.Value.Value, 1);
                    }
                }
                return -1;
            }
            catch
            {
                return -1;
            }
        }

        public string GetStorageInfoJson()
        {
            try
            {
                Update();
                var storageParams = new List<string>();
                
                var storageDevices = _computer.Hardware.Where(h => h.HardwareType == HardwareType.Storage).ToList();
                
                foreach (var device in storageDevices)
                {
                    device.Update();
                    string name = device.Name?.Replace("\"", "\\\"") ?? "Unknown";
                    double temp = 0;
                    
                    var tempSensor = device.Sensors.FirstOrDefault(s => s.SensorType == SensorType.Temperature);
                    if (tempSensor != null && tempSensor.Value.HasValue)
                    {
                        temp = Math.Round(tempSensor.Value.Value, 1);
                    }
                    
                    // JSON manual construction
                    storageParams.Add($"{{\"name\": \"{name}\", \"temperature\": {temp}}}");
                }
                
                return "[" + string.Join(",", storageParams) + "]";
            }
            catch (Exception ex)
            {
                 // Return empty array on error for safety, or an error object
                return "[]";
            }
        }

        public int GetFanSpeed(int index = 0)
        {
            try
            {
                Update();
                var allFans = _computer.Hardware
                    .SelectMany(h => h.Sensors.Where(s => s.SensorType == SensorType.Fan))
                    .ToList();

                if (index < allFans.Count && allFans[index].Value.HasValue)
                {
                    return (int)allFans[index].Value.Value;
                }
                return -1;
            }
            catch
            {
                return -1;
            }
        }

        public int GetFanCount()
        {
            try
            {
                Update();
                return _computer.Hardware
                    .SelectMany(h => h.Sensors.Where(s => s.SensorType == SensorType.Fan))
                    .Count();
            }
            catch
            {
                return 0;
            }
        }

        public double GetDiskTemperature(int index = 0)
        {
            try
            {
                Update();
                var storage = _computer.Hardware.Where(h => h.HardwareType == HardwareType.Storage).ToList();
                
                if (index < storage.Count)
                {
                    var tempSensor = storage[index].Sensors.FirstOrDefault(s => s.SensorType == SensorType.Temperature);
                    if (tempSensor != null && tempSensor.Value.HasValue)
                    {
                        return Math.Round(tempSensor.Value.Value, 1);
                    }
                }
                return -1;
            }
            catch
            {
                return -1;
            }
        }

        public void Dispose()
        {
            if (_initialized)
            {
                _computer?.Close();
                _initialized = false;
            }
        }
    }

    // Classe para exportar funções C-style para FFI
    public static class NativeExports
    {
        private static HardwareMonitor _monitor = new HardwareMonitor();

        [DllExport("GetCPUTemperature", CallingConvention.Cdecl)]
        public static double GetCPUTemperature()
        {
            return _monitor.GetCpuTemperature();
        }

        [DllExport("GetGPUTemperature", CallingConvention.Cdecl)]
        public static double GetGPUTemperature()
        {
            return _monitor.GetGpuTemperature();
        }

        [DllExport("GetFanSpeed", CallingConvention.Cdecl)]
        public static int GetFanSpeed(int index)
        {
            return _monitor.GetFanSpeed(index);
        }

        [DllExport("GetFanCount", CallingConvention.Cdecl)]
        public static int GetFanCount()
        {
            return _monitor.GetFanCount();
        }

        [DllExport("GetDiskTemperature", CallingConvention.Cdecl)]
        public static double GetDiskTemperature(int index)
        {
            return _monitor.GetDiskTemperature(index);
        }

        [DllExport("GetStorageInfoJson", CallingConvention.Cdecl)]
        [return: MarshalAs(UnmanagedType.LPStr)]
        public static string GetStorageInfoJson()
        {
            return _monitor.GetStorageInfoJson();
        }

        [DllExport("Initialize", CallingConvention.Cdecl)]
        public static void Initialize()
        {
            _monitor.Update();
        }

        [DllExport("Cleanup", CallingConvention.Cdecl)]
        public static void Cleanup()
        {
            _monitor?.Dispose();
        }
    }
}
