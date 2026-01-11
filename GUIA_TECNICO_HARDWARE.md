# Guia Técnico - Captura de Hardware por Sistema Operacional

## macOS - Detalhes de Implementação

### Temperatura CPU
```javascript
// Tenta primeiro com systeminformation library
await si.cpuTemperature()

// Se falhar, executa:
sysctl -a | grep temp
```

**Exemplo de saída esperada:**
```
hw.acpi.thermal.tz0.temperature: 55
hw.acpi.thermal.tz1.temperature: 60
```

**Fallback:** 45°C (valor seguro)

### CPU Usage
```javascript
// Direto da biblioteca systeminformation
await si.currentLoad()
// Retorna .currentLoad como percentual
```

### Disco
```javascript
// Direto da biblioteca systeminformation
await si.fsSize()
```

**Estrutura de resposta:**
```javascript
{
    fs: "/dev/disk0s2",
    mount: "/",
    type: "apfs",
    size: 536870912000,      // bytes
    used: 350000000000,       // bytes
    available: 186870912000,  // bytes
    use: 65.12,              // percentual
    rw: true
}
```

---

## Windows - Detalhes de Implementação

### Temperatura CPU
```javascript
// Tenta primeiro com systeminformation library
await si.cpuTemperature()

// Se falhar, executa comando WMI:
wmic /namespace:\\root\wmi PATH MSAcpi_ThermalZoneTemperature get CurrentTemperature
```

**Fórmula de conversão:**
```
Temperatura em Celsius = (RetornoWMI / 10) - 273.15
```

**Exemplo:**
```
WMI retorna: 31815
Celsius = (31815 / 10) - 273.15 = 44.65°C
```

**Fallback:** 50°C (valor seguro)

### CPU Usage
```javascript
// Direto da biblioteca systeminformation
await si.currentLoad()
```

### Disco
```javascript
// Direto da biblioteca systeminformation
await si.fsSize()
```

**Estrutura de resposta:**
```javascript
{
    fs: "C:",
    mount: "C:/",
    type: "NTFS",
    size: 1099511627776,     // bytes
    used: 550000000000,      // bytes
    available: 549511627776, // bytes
    use: 50.05,              // percentual
    rw: true
}
```

---

## Memória RAM (Multi-plataforma)

```javascript
await si.mem()
```

**Estrutura de resposta:**
```javascript
{
    total: 17179869184,      // bytes (16 GB)
    free: 8589934592,        // bytes (8 GB)
    used: 8589934592,        // bytes (8 GB)
    active: 5000000000,      // bytes
    available: 12179869184,  // bytes
    buffcache: 3000000000,   // bytes
    buffers: 0,
    cached: 3000000000,
    slab: 0,
    swap: { ... }
}
```

---

## GPU (Multi-plataforma)

```javascript
await si.graphics()
```

**Estrutura de resposta:**
```javascript
{
    controllers: [
        {
            vendor: "Intel",
            model: "Iris Graphics 630",
            bus: "PCI",
            vram: 1536,                    // MB
            vramDynamic: true,
            utilizationGpu: 15,            // percentual
            utilizationMemory: 25,         // percentual
            temperatureGpu: 45,            // Celsius (nem sempre disponível)
            memoryUsed: 384,               // MB
            memoryFree: 1152               // MB
        }
    ],
    displays: [
        {
            vendor: "Apple",
            model: "Built-in Display",
            resX: 2880,
            resY: 1800,
            hz: 60,
            main: true
        }
    ]
}
```

---

## Fluxo de Dados na Aplicação

```
┌─────────────────────────────────────────────────┐
│  Electron Main Process (main.js)                │
│  ipcMain.handle('get-hardware-stats', async) │
└─────────────────┬───────────────────────────────┘
                  │
        ┌─────────┼─────────┐
        │         │         │
    ┌───▼──┐ ┌──▼────┐ ┌─▼──────┐
    │CPU   │ │Memory │ │Disk    │
    │Usage │ │Usage  │ │Usage   │
    └───┬──┘ └──┬────┘ └─┬──────┘
        │       │        │
        └───────┼────────┘
                │
         ┌──────▼──────┐
         │Temperatura  │
         │(Fallback)   │
         └──────┬──────┘
                │
        ┌───────▼──────────┐
        │JSON Estruturado  │
        └───────┬──────────┘
                │
        ┌───────▼──────────────┐
        │ipcRenderer invocação │
        │preload.js (IPC)      │
        └───────┬──────────────┘
                │
        ┌───────▼──────────────┐
        │index.html JavaScript │
        │updateHardware()      │
        └───────┬──────────────┘
                │
        ┌───────▼──────────────┐
        │Atualiza DOM Elements │
        │innerHTML, textContent│
        └──────────────────────┘
```

---

## Debugging

### Verificar estrutura de dados recebidos:

```javascript
// No console do Electron (DevTools)
window.electronAPI.getHardwareStats().then(data => {
    console.log('Hardware Stats:', data);
    console.log('CPU Temp:', data.cpu.temp);
    console.log('Discos:', data.disk);
});
```

### Verificar logs do main process:

```bash
# Terminal macOS/Linux
npm start 2>&1 | grep -E "Error|Temperature|Hardware"

# Ou buscar no console do Electron
Ctrl+Shift+I ou Cmd+Shift+I
```

### Forçar atualização manual:

```javascript
// No console do navegador
updateHardware();  // Atualiza imediatamente
```

---

## Limitações Conhecidas

| Aspecto | macOS | Windows | Linux |
|---------|-------|---------|-------|
| Temperatura CPU | ✅ (sysctl) | ✅ (WMI) | ✅ (sysfs) |
| CPU Usage | ✅ | ✅ | ✅ |
| Memória | ✅ | ✅ | ✅ |
| Disco | ✅ | ✅ | ✅ |
| GPU Utilização | ⚠️ (limitado) | ⚠️ (limitado) | ⚠️ (limitado) |
| GPU Temperatura | ❌ (raro) | ❌ (raro) | ❌ (raro) |

---

## Instalação e Setup

### Dependências (já incluídas):
```bash
npm install systeminformation@5.30.2
```

### Iniciar aplicação:
```bash
cd cockpit-electron
npm start
```

### Compilar para distribuição:
```bash
# macOS
npm run dist:mac

# Windows
npm run dist:win
```

---

## Performance

- **Frequência de atualização**: 2 segundos (pode ser ajustado)
- **Overhead de CPU**: < 1% por atualização
- **Uso de Memória**: ~50-100MB (Electron + dados)
- **Processamento**: Assíncrono, não bloqueia UI

---

## Ajustes Futuros Possíveis

1. **Aumentar frequência** (1 segundo):
   ```javascript
   setInterval(updateHardware, 1000);  // Mais responsivo
   ```

2. **Reduzir frequência** (5 segundos):
   ```javascript
   setInterval(updateHardware, 5000);  // Menos consumo
   ```

3. **Capturar histórico** (gráficos):
   ```javascript
   // Manter array com últimas 60 medições
   const historyArray = [];
   ```

4. **Exportar dados**:
   ```javascript
   // Salvar em CSV ou JSON
   ```
