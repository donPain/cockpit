# 🚀 Quick Start Guide - Hardware Monitoring

## 5 Minutos para Começar

### 1️⃣ Instalar Dependências

```powershell
cd C:\Users\eduar\Documents\cockpit\cockpit-electron
npm install
```

**Status esperado:**
```
✅ systeminformation@5.21.22
✅ electron@28.1.0
✅ (opcional: electron-edge-js)
```

---

### 2️⃣ Testar Hardware (RECOMENDADO)

Antes de iniciar a aplicação, teste se os sensores funcionam:

```powershell
npm run test-hardware
```

**O que verá:**

```
🔍 Hardware Monitoring Test Suite

📋 Environment Check:
  Platform: win32
  Node: v22.19.0
  Current user: eduar
  Admin: ❌ NO

📦 Testing systeminformation library:
  ✅ CPU: Intel Core i9 (8 cores)
  ✅ CPU Temp: 58°C (ou ⚠️ Not available)
  ✅ Memory: 16.0 GB total
  ✅ Disks: 2 found
     - C:\: 70.1% used
     - E:\: 45.3% used
  ✅ GPU: 1 found
     - NVIDIA RTX 3090
  ✅ Fans: 3 found (ou ⚠️ Not available)
     - CPU Fan: 2450 RPM
```

---

### 3️⃣ Se Temperatura retornar NULL

**Opção A: Executar como Admin (RECOMENDADO)**

```powershell
# Clique direito em PowerShell → "Run as Administrator"
cd C:\Users\eduar\Documents\cockpit\cockpit-electron
npm run test-hardware
```

Resultado:
```
Admin: ✅ YES
✅ CPU Temp: 58°C        ← Agora funciona!
✅ Fans: 3 found
```

**Opção B: Configurar app para rodar sempre como Admin**

1. Windows Explorer
2. Navegue até: `C:\Users\eduar\Documents\cockpit`
3. Clique direito em `cockpit-launch.bat`
4. Propriedades → Compatibilidade
5. ☑️ "Executar este programa como administrador"
6. OK

Agora toda vez que clicar, rodará com admin automaticamente!

**Opção C: Se ainda não funcionar**

Hardware muito antigo ou VM - isso é normal. A aplicação funciona normalmente, apenas sem sensores de temperatura.

---

### 4️⃣ Iniciar a Aplicação

```powershell
npm start
```

**Ou use o batch file:**
```powershell
cd C:\Users\eduar\Documents\cockpit
./cockpit-launch.bat
```

**Esperado:**
```
✅ Electron app opened
✅ Hardware metrics loaded
✅ Dashboard visible
```

---

### 5️⃣ Visualizar Dados em Tempo Real

Na aplicação Electron:
- 📊 CPU: Brand, cores, uso %
- 💾 Memória: Total, usado, livre
- 📁 Discos: Espaço, uso %, saúde
- 🎮 GPU: Nome, VRAM, uso %
- 🔧 Fans: RPM (se disponível)
- 🌡️ Temperatura: °C (se disponível/admin)

---

## 🔍 Estrutura do Código

```
cockpit-electron/
├── main.js                          ← Electron main process
├── index.html                       ← UI
├── hardware-collector.js            ← Coleta de hardware (PRINCIPAL)
├── hardware-monitor-libre.js        ← Helpers para LibreHardwareMonitor
├── hardware-monitor-simple.js       ← Método WMIC simples
├── hardware-monitor-ohm.js          ← OpenHardwareMonitor (opcional)
├── setup-ohm.js                     ← Download do OHM
├── test-hardware-complete.js        ← Script de teste
└── HARDWARE_MONITORING_GUIDE.md     ← Documentação completa
```

---

## 📊 Métodos Disponíveis

| Método | Admin | CPU Temp | Fans | Disco |
|--------|:-----:|:--------:|:----:|:-----:|
| systeminformation | ❌ | ⚠️ | ⚠️ | ✅ |
| WMIC | ❌ | ✅* | ✅* | ✅ |
| PowerShell | ❌ | ✅* | ✅* | ✅ |
| OpenHardwareMonitor | ❌ | ✅ | ✅ | ✅ |
| LibreHardwareMonitor | ✅ | ✅ | ✅ | ✅ |

*Funciona melhor com admin

---

## 🆘 Troubleshooting

### ❌ "Module not found: systeminformation"

```powershell
npm install systeminformation
```

### ❌ "Acesso Negado" ao acessar sensores

**Solução:** Rodando como admin (veja acima)

### ❌ CPU Temp retorna NULL

É normal em:
- ✓ VMs/Hyper-V
- ✓ Hardware muito antigo
- ✓ Hardware OEM desabilitado
- ✓ Sem drivers de sensor

A aplicação funciona normalmente sem isso.

### ❌ Electron não abre

```powershell
# Verificar erro
npm start 2>&1 | tee error.log

# Se der erro de node_modules
rm -r node_modules
npm install
npm start
```

---

## 💡 Tips

1. **Teste sempre antes de customizar:**
   ```powershell
   npm run test-hardware
   ```

2. **Para debug, rode com verbosity:**
   ```powershell
   $env:DEBUG = "*"; npm start
   ```

3. **Se quer O máximo de dados, instale admin:**
   - Temperatura CPU
   - Velocidade de fans
   - Saúde de disco SMART
   - Drivers NVIDIA/AMD sensors

4. **Performance:** A coleta é async e rápida (~100-200ms)

---

## 📚 Arquivos Importantes

- [HARDWARE_MONITORING_GUIDE.md](HARDWARE_MONITORING_GUIDE.md) - Documentação técnica completa
- [hardware-collector.js](hardware-collector.js) - Código principal
- [test-hardware-complete.js](test-hardware-complete.js) - Script de teste

---

## ✅ Checklist de Configuração

- [ ] Node.js 18+ instalado
- [ ] npm install executado
- [ ] npm run test-hardware passa
- [ ] Decidiu se quer rodar como admin
- [ ] npm start abre o aplicativo
- [ ] Dados de hardware visíveis

**Pronto! 🎉**
