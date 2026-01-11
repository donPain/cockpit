# 📚 Documentation Index

## 🚀 Getting Started

**[QUICKSTART.md](QUICKSTART.md)** ⭐ **START HERE**
- 5-minute setup guide
- Test hardware sensors
- Run the application
- Troubleshoot common issues

---

## 📖 Detailed Guides

### [HARDWARE_MONITORING_GUIDE.md](HARDWARE_MONITORING_GUIDE.md)
Complete reference for hardware monitoring system:
- ✅ What works without admin
- 🔐 Permission requirements
- 📊 Data structures returned
- ⚠️ Sensor availability troubleshooting
- 🚀 Performance characteristics
- 🔍 Hierarquical fallback methods

### [ARCHITECTURE.md](ARCHITECTURE.md)
System design and technical overview:
- 🏗️ System architecture diagram
- 🔄 Data flow examples
- 📊 Component responsibilities
- 🎯 Design principles
- 🚀 Performance characteristics
- 🔧 How to extend the system

---

## 🛠️ Implementation Files

### Core Modules

**[hardware-collector.js](hardware-collector.js)**
- Main aggregator for all hardware metrics
- Exports: `getCpuTemperature()`, `getFanSpeedsWindows()`, `getDiskUsagePercentageWindows()`, etc.
- Entry point for main.js

**[hardware-monitor-libre.js](hardware-monitor-libre.js)**
- Helper methods with fallback hierarchies
- Exports: `getCpuTemperatureSystemInfo()`, `getCpuTemperatureWmic()`, `getFanSpeedsHierarchy()`, etc.
- Uses: systeminformation, WMIC, PowerShell

**[hardware-monitor-simple.js](hardware-monitor-simple.js)**
- Lightweight WMIC-based methods
- For low-footprint environments

**[hardware-monitor-ohm.js](hardware-monitor-ohm.js)**
- OpenHardwareMonitor integration
- Detects and wraps OHM installation

**[setup-ohm.js](setup-ohm.js)**
- Automated OpenHardwareMonitor downloader
- Run: `node setup-ohm.js`

### Application Files

**[main.js](main.js)**
- Electron main process
- IPC handler for `get-hardware-stats`
- Calls hardware-collector.js

**[index.html](index.html)**
- UI/Dashboard
- Displays metrics from main.js
- Uses IPC to request data

**[preload.js](preload.js)**
- Electron security layer
- Exposes safe IPC methods to UI

**[package.json](package.json)**
- Project dependencies
- Scripts: `npm start`, `npm run test-hardware`

---

## 🧪 Testing

### [test-hardware-complete.js](test-hardware-complete.js)
Comprehensive test suite:
- Environment check
- systeminformation library tests
- WMIC command tests
- PowerShell command tests
- hardware-collector.js tests
- Full hardware report

**Run:**
```bash
npm run test-hardware
```

---

## 📊 API Reference

### getCpuTemperature(platform)
```javascript
async function getCpuTemperature(platform) -> number | null
```
Returns CPU temperature in Celsius or null if unavailable

### getFanSpeedsWindows()
```javascript
async function getFanSpeedsWindows() -> Array | null
```
Returns array of `{name, rpm, unit}` or null

### getDiskUsagePercentageWindows()
```javascript
async function getDiskUsagePercentageWindows() -> Array | null
```
Returns array of disk info with usage, temperature, health

### getCpuUsage()
```javascript
async function getCpuUsage() -> number
```
Returns CPU usage percentage (0-100)

### getMemoryUsage()
```javascript
async function getMemoryUsage() -> object
```
Returns `{total, used, free, usage}`

### getGpuInfo()
```javascript
async function getGpuInfo() -> object
```
Returns GPU information

---

## 🎯 Common Tasks

### I want to test if sensors work
→ [QUICKSTART.md](QUICKSTART.md#2️⃣-testar-hardware-recomendado)

### I need temperature but get NULL
→ [HARDWARE_MONITORING_GUIDE.md](HARDWARE_MONITORING_GUIDE.md#️-se-temperatura-retorna-null)

### I want to understand the architecture
→ [ARCHITECTURE.md](ARCHITECTURE.md)

### I need to extend with new metrics
→ [ARCHITECTURE.md](ARCHITECTURE.md#️-extending-the-system)

### My GPU data is missing
→ [HARDWARE_MONITORING_GUIDE.md](HARDWARE_MONITORING_GUIDE.md#-se-temperatura-retorna-null)

### App runs slow
→ [ARCHITECTURE.md](ARCHITECTURE.md#-performance-characteristics)

---

## 📋 File Structure

```
cockpit-electron/
├── README (this file)
├── QUICKSTART.md                    ← Start here!
├── HARDWARE_MONITORING_GUIDE.md     ← Complete reference
├── ARCHITECTURE.md                  ← Technical design
├── 
├── main.js                          ← Electron main process
├── index.html                       ← UI/Dashboard
├── preload.js                       ← Security layer
├── package.json                     ← Dependencies
├── 
├── hardware-collector.js            ← Main module (USE THIS)
├── hardware-monitor-libre.js        ← Helper with fallbacks
├── hardware-monitor-simple.js       ← Lightweight WMIC
├── hardware-monitor-ohm.js          ← OpenHardwareMonitor
├── setup-ohm.js                     ← OHM installer
├── 
├── test-hardware-complete.js        ← Test suite
└── [other files...]
```

---

## 🎯 Quick Links

| Need | File | Command |
|------|------|---------|
| Setup | [QUICKSTART.md](QUICKSTART.md) | `npm install` |
| Test | [test-hardware-complete.js](test-hardware-complete.js) | `npm run test-hardware` |
| Run | [main.js](main.js) | `npm start` |
| Code | [hardware-collector.js](hardware-collector.js) | Modify metrics |
| Design | [ARCHITECTURE.md](ARCHITECTURE.md) | Understand system |
| Reference | [HARDWARE_MONITORING_GUIDE.md](HARDWARE_MONITORING_GUIDE.md) | API docs |

---

## 🆘 Troubleshooting Quick Links

| Problem | Solution |
|---------|----------|
| Temp is NULL | [HARDWARE_MONITORING_GUIDE.md#️-se-temperatura-retorna-null](HARDWARE_MONITORING_GUIDE.md) |
| Fans not showing | Run as admin (see HARDWARE_MONITORING_GUIDE.md) |
| Module errors | [QUICKSTART.md#-troubleshooting](QUICKSTART.md) |
| Slow performance | [ARCHITECTURE.md#-performance-characteristics](ARCHITECTURE.md) |
| Need hardware data | [API Reference](#-api-reference) above |
| Extend system | [ARCHITECTURE.md#️-extending-the-system](ARCHITECTURE.md) |

---

## 📚 Reading Guide

### For Quick Setup (5 min)
1. [QUICKSTART.md](QUICKSTART.md)
2. Run `npm run test-hardware`
3. Run `npm start`

### For Understanding System (15 min)
1. [ARCHITECTURE.md](ARCHITECTURE.md) - Overview
2. [HARDWARE_MONITORING_GUIDE.md](HARDWARE_MONITORING_GUIDE.md) - Detailed methods

### For Development (30 min)
1. [QUICKSTART.md](QUICKSTART.md) - Setup
2. [ARCHITECTURE.md](ARCHITECTURE.md) - Design
3. Review [hardware-collector.js](hardware-collector.js) - Implementation
4. [ARCHITECTURE.md#️-extending-the-system](ARCHITECTURE.md) - Extend

### For Troubleshooting
1. Run `npm run test-hardware` - See what works
2. [HARDWARE_MONITORING_GUIDE.md](HARDWARE_MONITORING_GUIDE.md) - Check method compatibility
3. [QUICKSTART.md#-troubleshooting](QUICKSTART.md) - Common fixes

---

## ✅ Verification Checklist

- [ ] Read [QUICKSTART.md](QUICKSTART.md)
- [ ] Run `npm run test-hardware` successfully
- [ ] Understand your permission level (admin/non-admin)
- [ ] Know which sensors work in your environment
- [ ] Run `npm start` and see dashboard
- [ ] Review [ARCHITECTURE.md](ARCHITECTURE.md) for extending

---

**Last Updated:** 2024
**Cockpit Hardware Monitoring v2.0**
