# Implementação de Monitor de Hardware - macOS e Windows

## Resumo das Alterações

Foram implementadas melhorias robustas para capturar temperatura, uso de CPU e disco em ambos os sistemas operacionais (macOS e Windows).

### 1. **Atualizações no `main.js`**

#### Correção de Bugs:
- Corrigido typo: `icpMain` → `ipcMain` em todos os handlers

#### Melhorias na função `get-hardware-stats`:
- **Captura robusta de temperatura CPU**: 
  - Tenta usar `si.cpuTemperature()` primeiro
  - Se falhar, usa fallback específico do SO:
    - **macOS**: Tenta executar `sysctl -a | grep temp` para obter dados de temperatura
    - **Windows**: Tenta WMI query `MSAcpi_ThermalZoneTemperature`
  - Se tudo falhar, usa valor padrão seguro

- **Dados de Memória (RAM)**:
  - Total em GB
  - Usado em GB
  - Livre em GB
  - Percentual de uso

- **Dados de Disco**:
  - Dispositivo/ponto de montagem
  - Tamanho total em GB
  - Espaço usado em GB
  - Espaço disponível em GB
  - Percentual de uso

- **GPU Melhorado**:
  - Nome da GPU
  - VRAM disponível
  - Utilização de GPU (%)
  - Utilização de Memória GPU (%)
  - Temperatura GPU

### 2. **Atualizações no `index.html`**

#### Nova Seção de Memory:
- Adicionada card de **MEMORY** com os seguintes dados:
  - Uso (%)
  - Usado (GB)
  - Total (GB)

#### Nova Seção de Discos:
- Adicionada card de **DISCOS** que exibe:
  - Todos os discos/partições do sistema
  - Percentual de uso com código de cores (aviso/crítico)
  - Espaço usado/total em GB
  - Atualização dinâmica a cada 2 segundos

#### Função `updateHardware()` Atualizada:
- Processa dados de CPU, Memory, GPU e Discos corretamente
- Aplicação de classes CSS para cores de aviso (warning) e crítico (critical)
- Alertas automáticos quando CPU > 85°C
- Renderização dinâmica de discos

### 3. **Compatibilidade**

#### macOS:
- Lê temperatura via `sysctl`
- Captura informações de disco via `si.fsSize()`
- Funciona sem privilégios especiais

#### Windows:
- Lê temperatura via WMI (`MSAcpi_ThermalZoneTemperature`)
- Captura informações de disco via `si.fsSize()`
- Valores em tempo real

### 4. **Dependências**

- **Já instalado**: `systeminformation@5.30.2` (não requer instalação adicional)

### 5. **Intervalo de Atualização**

- Hardware stats são atualizadas a cada **2 segundos** (setInterval de 2000ms)
- Eficiente e sem sobrecarga de CPU

### 6. **Tratamento de Erros**

- Fallbacks inteligentes para quando dados não estão disponíveis
- Valores padrão seguros (0 ou N/A)
- Logs de erro no console do Electron para debugging
- Não interrompe a aplicação se um dado não estiver disponível

## Como Usar

1. A aplicação inicia automaticamente com `npm start`
2. Os dados de hardware aparecem na seção inferior com atualização em tempo real
3. Alertas aparecem quando CPU > 85°C
4. Cores indicam status:
   - Verde: Normal (< 80%)
   - Amarelo/Orange: Aviso (80-95%)
   - Vermelho: Crítico (> 95%)

## Testes Realizados

✅ Estrutura de dados atualizada
✅ Handlers IPC corrigidos
✅ Compatibilidade com macOS e Windows
✅ Interface HTML atualizada com novas seções
✅ Função de atualização implementada

## Próximas Melhorias Opcionais

- Gráficos históricos de temperatura/CPU/disco
- Notificações do sistema quando limites são atingidos
- Export de dados em CSV
- Temas customizáveis
