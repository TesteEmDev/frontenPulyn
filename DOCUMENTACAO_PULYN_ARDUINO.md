# 📚 DOCUMENTAÇÃO COMPLETA - PULYN ARDUINO

## 🎯 VISÃO GERAL DO SISTEMA

**Pulyn** é uma plataforma de **gamificação para eventos infantis** onde crianças usam pulseiras NFC para competir em times e conquistar territórios em buffets. O sistema Arduino ESP32 atua como **checkpoint inteligente** que lê pulseiras NFC e se comunica com o backend em tempo real.

## 📁 ARQUITETURA DO CÓDIGO

### Estrutura Modular
```
checkpoints/pullynC2_modular/
├── pullynC2_modular.ino          # Arquivo principal
├── config.h                      # Configurações globais
├── wifi_module.h                 # Gerenciamento WiFi
├── rfid_module.h                 # Leitor NFC RC522
├── led_module.h                  # Controle de LEDs NeoPixel
├── api_module_optimized.h        # Comunicação com backend
├── sound_module.h                # Reprodução de sons
└── README_OTIMIZADO.md           # Documentação técnica
```

## 🔌 BIBLIOTECAS ARDUINO UTILIZADAS

### 1. **ESP32 Core (Obrigatório)**
```
Biblioteca: ESP32 by Espressif Systems
URL: https://github.com/espressif/arduino-esp32
Funções principais:
- WiFi.h              # Conexão WiFi
- HTTPClient.h        # Cliente HTTP
- WiFiClientSecure.h  # HTTPS seguro
```

### 2. **RFID/NFC RC522**
```
Biblioteca: MFRC522 by GithubCommunity
URL: https://github.com/miguelbalboa/rfid
Instalação: Library Manager → "MFRC522"
Versão: 1.4.10 ou superior
Funções principais:
- MFRC522.h           # Controle do leitor RFID
- SPI.h               # Comunicação SPI (incluída automaticamente)
```

### 3. **LEDs NeoPixel (WS2812B)**
```
Biblioteca: Adafruit NeoPixel by Adafruit
URL: https://github.com/adafruit/Adafruit_NeoPixel
Instalação: Library Manager → "Adafruit NeoPixel"
Versão: 1.11.0 ou superior
```

### 4. **JSON Parsing**
```
Biblioteca: ArduinoJson by Benoit Blanchon
URL: https://arduinojson.org
Instalação: Library Manager → "ArduinoJson"
Versão: 6.21.3 ou superior
Funções principais:
- StaticJsonDocument  # Parsing JSON otimizado
- DeserializationError
```

### 5. **DFPlayer Mini (Sons)**
```
Biblioteca: DFRobotDFPlayerMini by DFRobot
URL: https://github.com/DFRobot/DFRobotDFPlayerMini
Instalação: Library Manager → "DFRobotDFPlayerMini"
Versão: 1.0.5 ou superior
```

## 🛠️ INSTALAÇÃO DAS BIBLIOTECAS

### Método 1: Arduino Library Manager
1. Abra **Arduino IDE**
2. **Sketch** → **Include Library** → **Manage Libraries**
3. Instale na ordem:
   - **ESP32** (se não instalado)
   - **MFRC522**
   - **Adafruit NeoPixel**
   - **ArduinoJson**
   - **DFRobotDFPlayerMini**

### Método 2: Instalação Manual (ZIP)
1. Baixe as bibliotecas dos links acima
2. **Sketch** → **Include Library** → **Add .ZIP Library**
3. Selecione os arquivos ZIP baixados

## 🔧 CONFIGURAÇÃO DO ARDUINO IDE

### Placa ESP32 Dev Module
```
Board: ESP32 Dev Module
Flash Mode: QIO
Flash Size: 4MB (32Mb)
Partition Scheme: Default 4MB with spiffs (1.2MB APP/1.5MB SPIFFS)
CPU Frequency: 240MHz (WiFi/BT)
Upload Speed: 921600
```

### Configurações Recomendadas
```cpp
// Arduino IDE → Tools → 
Board: "ESP32 Dev Module"
Upload Speed: "921600"
CPU Frequency: "240MHz (WiFi/BT)"
Flash Frequency: "80MHz"
Flash Mode: "QIO"
Flash Size: "4MB (32Mb)"
Partition Scheme: "Default 4MB with spiffs"
Core Debug Level: "None"
```

## 🔌 PINAGEM DO ESP32

### Conexões Físicas
```
ESP32 PIN   → COMPONENTE
-----------   -----------
GPIO21       → LEDs NeoPixel (DATA)
GPIO5        → RC522 SDA (SS)
GPIO4        → RC522 RST
GPIO18       → RC522 SCK (SPI)
GPIO19       → RC522 MISO (SPI)
GPIO23       → RC522 MOSI (SPI)
GPIO32       → DFPlayer RX
GPIO33       → DFPlayer TX
3.3V         → Todos componentes
GND          → Todos componentes
```

### Configuração no código (`config.h`)
```cpp
#define RST_PIN 4
#define SS_PIN  5
#define LED_PIN 21
#define NUM_LEDS 7
#define DFPLAYER_TX 32
#define DFPLAYER_RX 33
```

## 📡 CONFIGURAÇÕES DE REDE

### WiFi
```cpp
const char* WIFI_SSID = "Adv-wifi-Backup";
const char* WIFI_PASSWORD = "advwifibkp";
```

### Backend (Produção)
```cpp
const char* SERVER_BASE_URL = "https://backendpulyn.onrender.com";
const char* CHECKPOINT_ID = "5";  // ID único do checkpoint no banco
```

### Backend Local (Desenvolvimento)
```cpp
#define PULYN_LAN_MODE 1
const char* SERVER_BASE_URL = "http://192.168.0.60:3001";
```

## ⚙️ CONFIGURAÇÕES DE PERFORMANCE

### Otimizações de Tempo
```cpp
const unsigned long RFID_COOLDOWN = 300;          // 300ms entre leituras
const unsigned long FAST_LOOP_INTERVAL = 20;     // Loop a cada 20ms
const unsigned long MODE_CHECK_INTERVAL = 10000; // Verificar modo a cada 10s
const unsigned long HEARTBEAT_INTERVAL = 60000;  // Heartbeat a cada 60s
```

### Timeouts HTTP Otimizados
```cpp
const uint16_t HTTP_CONNECT_TIMEOUT_FAST = 4000;   // 4s para conectar
const uint16_t HTTP_RESPONSE_TIMEOUT_FAST = 6000; // 6s para resposta
const uint16_t HTTP_CONNECT_TIMEOUT_SLOW = 8000;  // 8s para heartbeat
const uint16_t HTTP_RESPONSE_TIMEOUT_SLOW = 10000; // 10s para heartbeat
```

## 🎮 FLUXO DE OPERAÇÃO

### 1. Inicialização
```cpp
void setup() {
  Serial.begin(115200);
  led.init();      // LEDs NeoPixel
  rfid.init();     // RFID RC522 com alcance máximo
  sound.init();    // DFPlayer Mini
  wifi.init();     // Conexão WiFi
  
  // Teste inicial
  if (wifi.connected) {
    api.sendHeartbeat();
    api.checkModeFast();
  }
}
```

### 2. Loop Principal
```cpp
void loop() {
  handleSerialCommands();  // Comandos via Serial Monitor
  wifi.check();            // Verificar conexão WiFi
  checkModePeriodically(); // Verificar modo de jogo
  sendHeartbeatPeriodically(); // Manter conexão
  
  // Leitura RFID otimizada (a cada 20ms)
  if (rfid.checkCardQuick()) {
    String uid = rfid.getUID();
    processReadingFast(uid); // Enviar para backend
  }
}
```

## 🔬 COMANDOS DE TESTE (Serial Monitor)

### Acesso via Serial Monitor (115200 baud)
```
HELP              - Mostra comandos disponíveis
TEST_SENSITIVITY  - Testa alcance RFID por 10 segundos
STATUS            - Mostra configurações do sistema
```

### Exemplo de Teste
```
🔧 COMANDOS DISPONÍVEIS (Serial Monitor):
  HELP              - Mostra comandos
  TEST_SENSITIVITY  - Testa alcance RFID por 10s
  STATUS            - Mostra configurações
```

## 📊 CONFIGURAÇÕES DE ALCANCE RFID

### Ganho Máximo Aplicado
```cpp
// rfid_module.h - Configurações para alcance máximo (48dB)
mfrc522.PCD_SetRegisterBitMask(MFRC522::RFCfgReg, 0x70);  // Ganho 48dB
mfrc522.PCD_WriteRegister(MFRC522::TxASKReg, 0x7F);      // Potência máxima
mfrc522.PCD_WriteRegister(MFRC522::ModGsPReg, 0x12);     // Modulação otimizada
```

### Alcance Esperado
```
✅ Ganho receptor configurado: 48dB (máximo)
✅ Potência transmissor configurada: máximo
🎯 Alcance esperado: 8-15cm (dependendo da pulseira)
```

## 🎨 CONFIGURAÇÕES DE LED

### Cores Definidas
```cpp
#define LED_GREEN 0x00FF00   // Tesouro/conquista
#define LED_RED 0xFF0000     // Erro/indisponível
#define LED_YELLOW 0xFFFF00  // Leitura em progresso
#define LED_BLUE 0x0000FF    // Disponível
#define LED_PURPLE 0xFF00FF  // Monstro especial
#define LED_CYAN 0x00FFFF    // Monstro normal
#define LED_OFF 0x000000     // Desligado
```

### Sequências de Feedback
- **Conquista bem-sucedida**: LED da cor do time
- **Erro**: LED vermelho piscando
- **Tesouro**: LED verde piscando
- **Monstro**: LED roxo (especial) ou ciano (normal)

## 🔊 CONFIGURAÇÕES DE SOM

### Arquivos MP3 no SD Card
```
/SD_CARD/
├── 001.mp3  # SOUND_SUCCESS / SOUND_POINT
├── 002.mp3  # (reservado)
└── 003.mp3  # SOUND_ERROR
```

### Volume e Controle
```cpp
myDFPlayer.volume(30);  // Volume máximo (0-30)
myDFPlayer.play(1);     // Tocar arquivo 001.mp3
```

## 🚨 SOLUÇÃO DE PROBLEMAS COMUNS

### 1. **Erro de Compilação "MFRC522.h not found"**
```
Solução: Instale a biblioteca MFRC522 via Library Manager
```

### 2. **ESP32 não reconhece portas USB**
```
Solução: Instale drivers CP210x ou CH340
```

### 3. **WiFi não conecta**
```
Verifique:
1. SSID e senha corretos em config.h
2. Rede 2.4GHz (ESP32 não suporta 5GHz)
3. Potência do sinal WiFi
```

### 4. **RFID não detecta pulseiras**
```
Teste com: TEST_SENSITIVITY no Serial Monitor
Verifique:
1. Conexões do RC522 (SDA, SCK, MISO, MOSI, RST)
2. Alimentação 3.3V estável
3. Pulseira NFC funcionando
```

### 5. **Erro "Failed to connect to backend"**
```
Verifique:
1. Conexão WiFi ativa
2. URL do backend correta em config.h
3. Backend online (https://backendpulyn.onrender.com)
```

## 🔄 PROCESSO DE ATUALIZAÇÃO

### Compilar e Carregar
1. **Arduino IDE** → **Arquivo** → **Abrir**
2. Selecione: `pullynC2_modular.ino`
3. **Ferramentas** → **Placa**: "ESP32 Dev Module"
4. **Ferramentas** → **Porta**: Porta COM do ESP32
5. **Sketch** → **Compilar/Verificar** (Ctrl+R)
6. **Sketch** → **Carregar** (Ctrl+U)

### Monitoramento
1. **Ferramentas** → **Monitor Serial** (115200 baud)
2. Observe logs de inicialização
3. Use comandos de teste se necessário

## 📈 OTIMIZAÇÕES IMPLEMENTADAS

### 1. **Leitura RFID Otimizada**
- Cooldown reduzido de 600ms para 300ms
- Verificação não-bloqueante a cada 20ms
- Cache para evitar releituras repetidas
- Ganho máximo (48dB) para alcance estendido

### 2. **Comunicação HTTP Otimizada**
- Timeouts reduzidos (4s/6s vs 8s/10s)
- Conexões HTTP reutilizadas
- JSON payload mínimo
- Heartbeat menos frequente (60s vs 30s)

### 3. **Feedback Visual Rápido**
- LED amarelo IMEDIATO ao detectar pulseira
- Tempos de animação reduzidos em ~50%
- Restauração de cor não-bloqueante

## 📋 CHECKLIST DE IMPLANTAÇÃO

### Hardware Necessário
- [ ] ESP32 DevKit v1 ou similar
- [ ] Módulo RFID RC522
- [ ] LEDs NeoPixel (fita ou anel)
- [ ] DFPlayer Mini + cartão SD
- [ ] Fonte 5V 2A (estável)
- [ ] Pulseiras NFC passivas

### Software Necessário
- [ ] Arduino IDE 2.3.2 ou superior
- [ ] Bibliotecas listadas instaladas
- [ ] Drivers USB para ESP32
- [ ] Arquivos de som no SD card

### Configuração
- [ ] WiFi SSID/senha configurados
- [ ] ID do checkpoint definido no banco
- [ ] URL do backend configurada
- [ ] Pinos corretos no config.h

## 🔗 LINKS ÚTEIS

### Documentação Oficial
- **ESP32**: https://docs.espressif.com/projects/esp-idf
- **ArduinoJson**: https://arduinojson.org
- **MFRC522**: https://github.com/miguelbalboa/rfid
- **NeoPixel**: https://learn.adafruit.com/adafruit-neopixel-uberguide

### Repositórios
- **Backend Pulyn**: https://github.com/seu-usuario/pulyn-backend
- **Frontend Pulyn**: https://github.com/seu-usuario/pulyn-frontend
- **Firmware Checkpoint**: Este repositório

### Suporte
- **Issues GitHub**: Para problemas técnicos
- **Serial Monitor**: Para debugging local
- **Logs do Backend**: Para problemas de integração

## 📄 LICENÇA

Este projeto está licenciado sob a MIT License - veja o arquivo LICENSE para detalhes.

## 👥 AUTORES

- **Desenvolvimento**: Equipe Pulyn
- **Hardware**: ESP32 + RC522 + NeoPixel
- **Backend**: Node.js + Express + SQL Server
- **Frontend**: React + TypeScript

---

**Última Atualização**: Agosto 2026  
**Versão do Firmware**: 2.0.0 (Otimizado)  
**Status**: ✅ **Pronto para Produção**