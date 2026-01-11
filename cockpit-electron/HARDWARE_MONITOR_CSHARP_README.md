# 🌡️ Hardware Monitor C# (Híbrido)

## ✅ Como Funciona?

Este sistema usa uma abordagem híbrida inteligente para obter a temperatura REAL do processador:

1. **Tentativa Principal (Edge.js / C# Nativo)**
   - Tenta carregar o módulo nativo `electron-edge-js` para executar código C# diretamente na memória.
   - É o método mais rápido e eficiente.

2. **Fallback Inteligente (PowerShell C# Compiler)**
   - Se o `electron-edge-js` falhar (erro de compilação/versão), o sistema muda automaticamente para **PowerShell**.
   - O PowerShell **compila o código C# em tempo real** usando `Add-Type`.
   - Isso garante que a lógica C# seja usada mesmo sem o módulo Node funcionando!

3. **Fallback Final (systeminformation)**
   - Se tudo falhar, usa a biblioteca padrão multiplataforma.

---

## 🚀 Vantagens

- **Sem Dependências Quebradas**: Se o módulo nativo falhar, o app não crasha. Ele se adapta.
- **Leitura Real (WMI/MSAcpi)**: O código C# acessa diretamente `MSAcpi_ThermalZoneTemperature` via WMI, que é a fonte mais comum de temperatura real em Windows.
- **Simplicidade**: Tudo encapsulado em `hardware-monitor-edge.js` e `hardware-collector.js`.

---

## 🛠️ Arquivos do Monitoramento

- `hardware-collector.js` (Gerenciador central)
- `hardware-monitor-edge.js` (Implementação C# + Fallback)

---

## ❓ Temperatura Zero ou null?

Se ainda aparecer "N/A" ou temperatura errada:
1. **Execute como Administrador** (WMI thermal zones requerem admin frequentemente).
2. Verifique se seu hardware expõe `MSAcpi_ThermalZoneTemperature`.
