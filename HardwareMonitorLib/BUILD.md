# Build Instructions

## Pré-requisitos
- .NET 6.0 SDK ou superior
- Visual Studio 2022 (ou VS Build Tools)

## Como Compilar

1. Abra PowerShell como Administrador
2. Navegue até a pasta do projeto:
   ```powershell
   cd "C:\Users\eduar\Documents\cockpit\HardwareMonitorLib"
   ```

3. Compile o projeto:
   ```powershell
   dotnet build -c Release
   ```

4. A DLL será gerada em:
   ```
   bin\Release\net6.0\HardwareMonitorLib.dll
   ```

5. Copie a DLL para a pasta do Electron:
   ```powershell
   Copy-Item "bin\Release\net6.0\*.dll" "..\cockpit-electron\native\" -Force
   Copy-Item "bin\Release\net6.0\*.so" "..\cockpit-electron\native\" -Force -ErrorAction SilentlyContinue
   ```

## Usar DLL pré-compilada (alternativa mais simples)

Se não conseguir compilar, use LibreHardwareMonitor diretamente via edge-js ou node-ffi-napi.

## Importante

Esta DLL requer privilégios administrativos para acessar sensores de hardware via WinRing0.
