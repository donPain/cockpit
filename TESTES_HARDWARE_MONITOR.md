# Instruções de Teste - Monitor de Hardware

## Quick Start

### 1. Instalar dependências (já feito)
```bash
cd /Users/eduardopaino/Documents/Cockpit/cockpit-electron
npm install  # Se necessário
```

### 2. Executar a aplicação
```bash
npm start
```

### 3. Verificar dados de hardware
A UI mostra automaticamente:
- ✅ CPU (uso % e temperatura)
- ✅ Memory (uso %, GB usado, total)
- ✅ GPU (utilização, memória, temperatura)
- ✅ DISCOS (todos os discos/partições com uso %)
- ✅ NVME (compatibilidade com dados anteriores)

---

## Checklist de Verificação

### Temperatura CPU
- [ ] Valor mostrado em °C
- [ ] Valor é realista (30-90°C)
- [ ] Atualiza a cada 2 segundos
- [ ] **macOS**: Tenta sysctl, tem fallback
- [ ] **Windows**: Tenta WMI, tem fallback

### CPU Usage
- [ ] Percentual 0-100%
- [ ] Aumenta quando sistema carregado
- [ ] Cores exatas (cores do processor)
- [ ] Atualiza em tempo real

### Memory
- [ ] Total de RAM mostra valor correto (ex: 16 GB)
- [ ] Usado mostra valor realista
- [ ] Percentual calcula correto: (usado/total)*100
- [ ] Código de cores funciona:
  - Verde: < 80%
  - Amarelo: 80-95%
  - Vermelho: > 95%

### Discos
- [ ] Todos os discos/partições aparecem
- [ ] Nomes dos discos aparecem corretamente
- [ ] Uso percentual é preciso
- [ ] Espaço em GB é convertido corretamente
- [ ] Atualiza a cada 2 segundos

### GPU
- [ ] Nome da GPU aparece
- [ ] Utilização mostra percentual
- [ ] Se sem GPU dedicada: mostra iGPU (Intel/AMD)
- [ ] Temperatura (se disponível)

### Alertas
- [ ] Alerta vermelho quando CPU > 85°C
- [ ] Alerta desaparece quando CPU < 85°C
- [ ] Alerta mostra mensagem de aviso

---

## Testes Específicos por SO

### macOS 🍎

#### Teste 1: Temperatura via sysctl
```bash
# Terminal - verificar se tem dados
sysctl -a | grep temp

# Esperado: Algo como
# hw.acpi.thermal.tz0.temperature: 45
```

#### Teste 2: Comparação com Activity Monitor
- Abrir Activity Monitor (Cmd+Spacebar → "Activity Monitor")
- Comparar:
  - CPU % com a UI
  - Memória (Memory tab) com a UI
  - Disco (Storage tab) com a UI

#### Teste 3: Discos
```bash
# Terminal - verificar discos
df -h | grep -E "^/dev"

# Esperado: Deve bater com valores na UI
```

---

### Windows 🪟

#### Teste 1: Temperatura via WMI
```batch
REM Em Command Prompt
wmic /namespace:\\root\wmi PATH MSAcpi_ThermalZoneTemperature get CurrentTemperature

REM Esperado: Um número (ex: 31815)
REM Conversão: (31815/10) - 273.15 = 44.65°C
```

#### Teste 2: Comparação com Task Manager
- Pressionar Ctrl+Shift+Esc (Task Manager)
- Aba "Performance"
- Comparar:
  - CPU %
  - Memória (RAM)
  - Disco (Storage)

#### Teste 3: Discos
```batch
REM Em Command Prompt
wmic logicaldisk get name,size,freespace

REM Esperado: Deve bater com valores na UI
```

---

## Testes de Stress

### Teste 1: Carregar CPU
```bash
# macOS/Linux
yes > /dev/null &

# Verificar se temperatura sobe
# Killall: killall yes

# Windows PowerShell
(0..100000000) | ForEach-Object { [Math]::Sqrt($_) } > $null &
```

### Teste 2: Carregar Memória
```bash
# macOS Python
python3 -c "
import sys
arr = []
for i in range(100000):
    arr.append([0]*10000)
"
```

### Teste 3: I/O Disco
```bash
# macOS/Linux
dd if=/dev/zero of=testfile bs=1m count=1000

# Windows PowerShell
New-Item -ItemType File -Path testfile -Force
(1..100) | ForEach-Object { [IO.File]::WriteAllBytes("test_$_.bin", (1..1024)) }
```

---

## Troubleshooting

### Problema: Temperatura mostra 0°C ou N/A

**Solução macOS:**
```bash
# Verificar se tem dados sysctl
sysctl -a | grep -i temp | head -5

# Se vazio, pode ser que o sistema não exponha dados
# A biblioteca usa fallback automático (45°C)
```

**Solução Windows:**
```batch
# Verificar se WMI funciona
wmic /namespace:\\root\wmi PATH MSAcpi_ThermalZoneTemperature get CurrentTemperature

# Se erro de acesso, pode precisar executar como Admin
```

### Problema: Discos não aparecem

**Solução:**
```javascript
// Abrir DevTools: Cmd+Shift+I (macOS) ou Ctrl+Shift+I (Windows)
// Console:
window.electronAPI.getHardwareStats().then(d => {
    console.log('Discos:', d.disk);
});

// Deve retornar array com discos
```

### Problema: Memória não atualiza

**Solução:**
```javascript
// No console:
// Verificar se updateHardware() é chamado
// Deve rodar a cada 2 segundos

setInterval(() => {
    console.log('Update Hardware called');
    updateHardware();
}, 2000);
```

### Problema: Performance lenta

**Solução:**
- Aumentar intervalo: `setInterval(updateHardware, 5000);`
- Desabilitar GPU se não usar: comentar linha na função
- Executar DevTools em janela separada (não inline)

---

## Verificação de Código

### Verificar handler IPC está correto:
```javascript
// No arquivo main.js
ipcMain.handle('get-hardware-stats', async () => {
    // Deve estar aqui, não icpMain
});
```

### Verificar que preload.js expõe API:
```javascript
// No arquivo preload.js
contextBridge.exposeInMainWorld('electronAPI', {
    getHardwareStats: () => ipcRenderer.invoke('get-hardware-stats'),
    // ... outras APIs
});
```

### Verificar que HTML chama corretamente:
```javascript
// No index.html
const data = await window.electronAPI.getHardwareStats();
// Deve funcionar sem erro
```

---

## Performance Metrics

| Métrica | Esperado | Crítico |
|---------|----------|---------|
| CPU para ler stats | < 1% | > 5% |
| Tempo resposta | < 200ms | > 500ms |
| Memória extra | < 100MB | > 500MB |
| Frequência | 2s (2000ms) | Ajustável |

---

## Reports de Teste

Após executar os testes, documentar:

```
Data: ___________
SO: ___ macOS / ___ Windows
Versão SO: _________

✅ Temperatura CPU: ____ °C
✅ CPU Usage: ____ %
✅ Cores detectados: ____
✅ Memória total: ____ GB
✅ Memória usada: ____ GB
✅ Número de discos: ____
✅ Disco 1 uso: ____ %
✅ GPU detectada: ___________

Problemas encontrados:
_________________________
_________________________

Status Final:
___ PASSOU TODOS OS TESTES
___ PASSOU COM RESSALVAS
___ FALHOU
```

---

## Próximos Passos

1. **Após validação**: Compilar para distribuição
   ```bash
   npm run dist:mac    # ou dist:win
   ```

2. **Criar release**: Publicar em GitHub Releases

3. **Monitorar**: Coletar feedback dos usuários

4. **Melhorias futuras**:
   - Gráficos históricos (Chart.js)
   - Alertas com som
   - Log de eventos
   - Dashboard remoto
