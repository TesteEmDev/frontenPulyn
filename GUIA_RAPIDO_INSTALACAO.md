# ⚡ GUIA RÁPIDO DE INSTALAÇÃO - PULYN ARDUINO

## 🚀 INSTALAÇÃO EM 5 MINUTOS

### 1. INSTALAR ARDUINO IDE
- Download: https://www.arduino.cc/en/software
- Versão: 2.3.2 ou superior

### 2. ADICIONAR SUPORTE ESP32
- **Arduino IDE** → **Arquivo** → **Preferências**
- Em "URLs Adicionais para Gerenciadores de Placas", adicione:
```
https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
```
- **Ferramentas** → **Placa** → **Gerenciador de Placas**
- Busque por "ESP32" e instale "ESP32 by Espressif Systems"

### 3. INSTALAR BIBLIOTECAS
**Arduino IDE** → **Sketch** → **Include Library** → **Manage Libraries**

Instale na ordem:
1. **MFRC522** (versão 1.4.10+)
2. **Adafruit NeoPixel** (versão 1.11.0+)
3. **ArduinoJson** (versão 6.21.3+)
4. **DFRobotDFPlayerMini** (versão 1.0.5+)

## 📁 ABRIR O PROJETO

### 4. ABRIR ARQUIVO PRINCIPAL
- **Arduino IDE** → **Arquivo** → **Abrir**
- Navegue até: `checkpoints/pullynC2_modular/`
- Selecione: `pullynC2_modular.ino`

### 5. CONFIGURAR PLACA
```
Ferramentas → Placa: "ESP32 Dev Module"
Ferramentas → Upload Speed: "921600"
Ferramentas → CPU Frequency: "240MHz (WiFi/BT)"
Ferramentas → Flash Size: "4MB (32Mb)"
Ferramentas → Partition Scheme: "Default 4MB with spiffs"
```

## 🔧 CONFIGURAÇÃO RÁPIDA

### 6. EDITAR `config.h`
Local: `checkpoints/pullynC2_modular/config.h`

**MUDAR APENAS ESSES VALORES:**
```cpp
// WiFi da SUA REDE:
const char* WIFI_SSID = "SUA_REDE_WIFI";
const char* WIFI_PASSWORD = "SUA_SENHA_WIFI";

// ID do SEU CHECKPOINT (definido no backend):
const char* CHECKPOINT_ID = "5";  // Troque para o ID correto
```

### 7. CONEXÕES DO HARDWARE
```
ESP32 → COMPONENTE
GPIO21 → LEDs NeoPixel (DATA IN)
GPIO5  → RC522 SDA (SS)
GPIO4  → RC522 RST
GPIO18 → RC522 SCK (SPI)
GPIO19 → RC522 MISO (SPI)
GPIO23 → RC522 MOSI (SPI)
GPIO32 → DFPlayer RX
GPIO33 → DFPlayer TX
3.3V   → Todos componentes
GND    → Todos componentes
```

## 🛠️ COMPILAR E CARREGAR

### 8. COMPILAR
- **Sketch** → **Compilar/Verificar** (Ctrl+R)
- Aguarde "Compilação concluída" no console inferior

### 9. CONECTAR ESP32
  - Conecte o ESP32 via USB ao computador
  - **Ferramentas** → **Porta** → Selecione a porta COM do ESP32
  - Exemplo: "COM3" ou "/dev/ttyUSB0"

### 10. CARREGAR FIRMWARE
- **Sketch** → **Carregar** (Ctrl+U)
- Aguarde "Carregamento concluído" no console inferior

## 🧪 TESTE RÁPIDO

### 11. ABRIR SERIAL MONITOR
- **Ferramentas** → **Monitor Serial** (115200 baud)
- Aguarde logs de inicialização:
```
✅ Ganho receptor configurado: 48dB (máximo)
✅ Potência transmissor configurada: máximo
✅ WiFi OK - IP: 192.168.1.100
✅ Sistema pronto! Leitura otimizada ativada.
```

### 12. TESTAR COMANDOS
No Serial Monitor, digite:
```
HELP              # Mostra comandos
TEST_SENSITIVITY  # Testa alcance RFID (10 segundos)
STATUS            # Verifica configurações
```

### 13. TESTAR PULSEIRA
- Aproxime uma pulseira NFC a ~5cm do leitor
- Deve aparecer no Serial Monitor:
```
⚡ UID: 04E72C1A896880
📡 Processando leitura...
⚡ Leitura enviada em 150ms
```

## 🚨 SOLUÇÃO DE PROBLEMAS COMUNS

### "Erro de compilação - Biblioteca não encontrada"
```
Solução: Reinstale as bibliotecas via Library Manager
```

### "ESP32 não aparece nas portas"
```
Solução:
1. Instale drivers USB (CP210x ou CH340)
2. Reinicie Arduino IDE
3. Reconecte o cabo USB
```

### "WiFi não conecta"
```
Verifique:
1. SSID/senha corretos em config.h
2. Rede 2.4GHz (ESP32 não suporta 5GHz)
3. Sinal WiFi forte o suficiente
```

### "RFID não detecta pulseiras"
```
Teste com: TEST_SENSITIVITY
Verifique:
1. Conexões do RC522 corretas
2. Alimentação 3.3V estável
3. Pulseira NFC funcional
```

## 📊 CONFIGURAÇÕES DE PERFORMANCE

### Alcance RFID Otimizado
- **Ganho**: 48dB (máximo)
- **Alcance**: 8-15cm
- **Tempo de leitura**: <200ms

### Comunicação Otimizada
- **Timeout HTTP**: 4s/6s (fast), 8s/10s (slow)
- **Heartbeat**: 60 segundos
- **Loop RFID**: 20ms

## 🎮 MODOS DE JOGO SUPORTADOS

### 1. **Conquista de Território**
- Cada pulseira conquista checkpoint para seu time
- LED mostra cor do time dominante

### 2. **Caça ao Tesouro**
- Time inteiro precisa passar no checkpoint
- LED verde enquanto time reúne membros
- Concluído → LED da cor do time

### 3. **Caça ao Monstro**
- Cada pulseira causa dano ao monstro
- LED roxo (ataque especial) ou ciano (normal)
- Monstro derrotado → LED apaga

## 🔗 INTEGRAÇÃO COM BACKEND

### URLs do Backend
```
Produção: https://backendpulyn.onrender.com
Desenvolvimento: http://192.168.0.60:3001
```

### Endpoints Principais
```
POST /api/leituras          # Enviar leitura RFID
GET  /api/debug/checkpoint-mode  # Verificar modo
POST /api/checkpoints/{id}/heartbeat  # Heartbeat
GET  /api/checkpoints/{id}/territory  # Status território
```

## ✅ CHECKLIST DE VERIFICAÇÃO

### Hardware
- [ ] ESP32 conectado via USB
- [ ] RC522 conectado corretamente
- [ ] LEDs NeoPixel funcionando
- [ ] DFPlayer com SD card e arquivos MP3
- [ ] Alimentação 3.3V/5V estável

### Software
- [ ] Arduino IDE instalado
- [ ] Bibliotecas instaladas
- [ ] Placa ESP32 configurada
- [ ] Porta COM selecionada

### Configuração
- [ ] WiFi SSID/senha corretos
- [ ] ID do checkpoint definido
- [ ] Backend acessível
- [ ] Pinos configurados corretamente

### Teste
- [ ] Compilação bem-sucedida
- [ ] Carregamento bem-sucedido
- [ ] Serial Monitor mostra logs
- [ ] WiFi conecta
- [ ] RFID detecta pulseiras
- [ ] Backend responde

## 📞 SUPORTE

### Problemas Técnicos
1. **Serial Monitor**: Primeira fonte de informações
2. **Logs do Backend**: Verificar integração
3. **GitHub Issues**: Reportar bugs

### Comunicação
- **Equipe Pulyn**: Para problemas específicos
- **Documentação Completa**: `DOCUMENTACAO_PULYN_ARDUINO.md`
- **Exemplos de Código**: Na pasta `checkpoints/`

---

**⏱️ Tempo Estimado**: 15-30 minutos para instalação completa  
**✅ Pronto para**: Eventos infantis, buffets, festas  
**🎯 Público**: Crianças 5-12 anos  
**📶 Requisitos**: WiFi 2.4GHz, NFC pulseiras passivas