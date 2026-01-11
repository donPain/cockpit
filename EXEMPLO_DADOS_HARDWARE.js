// Exemplo da resposta da API getHardwareStats

{
    "platform": "darwin", // ou "win32" no Windows
    "timestamp": "2026-01-11T15:30:45.123Z",
    
    "cpu": {
        "brand": "Intel Core i9",           // Marca/Modelo do CPU
        "cores": 8,                          // Número de núcleos
        "usage": 35,                         // Percentual de uso (0-100)
        "temp": 58                           // Temperatura em Celsius
    },
    
    "memory": {
        "total": 16,                         // Total de RAM em GB
        "used": 8.5,                         // RAM usada em GB
        "free": 7.5,                         // RAM livre em GB
        "usage": 53                          // Percentual de uso (0-100)
    },
    
    "disk": [
        {
            "device": "/dev/disk0s2",        // Identificador do disco
            "mount": "/",                    // Ponto de montagem
            "size": 500,                     // Tamanho total em GB
            "used": 350,                     // Espaço usado em GB
            "available": 150,                // Espaço disponível em GB
            "use": 70                        // Percentual de uso (0-100)
        },
        {
            "device": "D:",                  // Windows pode ser assim
            "mount": "D:/",
            "size": 1000,
            "used": 450,
            "available": 550,
            "use": 45
        }
    ],
    
    "gpu": {
        "controllers": [
            {
                "name": "Intel Iris Graphics",
                "vram": 1536,                // VRAM em MB
                "utilizationGpu": 15,        // Percentual de uso
                "utilizationMemory": 20,     // Percentual de memória GPU usada
                "temperatureGpu": 45         // Temperatura em Celsius
            }
        ]
    }
}

// NOTAS DE USO:

// 1. TEMPERATURA:
//    - Usa si.cpuTemperature() da biblioteca systeminformation
//    - Fallback para comandos específicos do SO se não disponível
//    - Valor padrão: 45°C em macOS, 50°C em Windows (se não conseguir obter)

// 2. DISCO:
//    - Array com todos os discos/partições do sistema
//    - Valores em GB (convertidos automaticamente)
//    - Percentual de uso é calculado automaticamente

// 3. MEMÓRIA:
//    - Valores em GB para melhor legibilidade
//    - Percentual é calculado como (used / total) * 100

// 4. ALERTAS NA UI:
//    - CPU > 85°C: Mostra alerta vermelho
//    - Qualquer métrica > 80%: Classe "warning" (amarelo)
//    - Qualquer métrica > 95%: Classe "critical" (vermelho)

// 5. FREQUÊNCIA DE ATUALIZAÇÃO:
//    - A cada 2 segundos (setInterval 2000ms)
//    - Pode ser ajustado no index.html se necessário
