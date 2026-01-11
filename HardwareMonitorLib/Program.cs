using System;

namespace HardwareMonitorLib
{
    class Program
    {
        static void Main(string[] args)
        {
            try 
            {
                // Simple argument parsing
                bool jsonMode = false;
                bool storageOnly = false;

                foreach (var arg in args)
                {
                    if (arg == "--json") jsonMode = true;
                    if (arg == "--storage") storageOnly = true;
                }

                using (var monitor = new HardwareMonitor())
                {
                    if (jsonMode)
                    {
                         Console.WriteLine(monitor.GetHardwareInfoJson());
                         return;
                    }

                    // Default dump if run without args (useful for debug)
                    Console.WriteLine("CPU Temp: " + monitor.GetCpuTemperature());
                    Console.WriteLine("GPU Temp: " + monitor.GetGpuTemperature());
                    Console.WriteLine("Storage JSON: " + monitor.GetStorageInfoJson());
                }
            }
            catch (Exception ex)
            {
                Console.Error.WriteLine("Error: " + ex.Message);
            }
        }
    }
}
