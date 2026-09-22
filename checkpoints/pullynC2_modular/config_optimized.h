// ==================== CONFIG_OPTIMIZED.H ====================
// Configurações otimizadas para leitura mais rápida

#ifndef CONFIG_OPTIMIZED_H
#define CONFIG_OPTIMIZED_H

// ==================== PINAGEM ====================
#define RST_PIN 4
#define SS_PIN  5
#define LED_PIN 21
#define NUM_LEDS 7
#define DFPLAYER_TX 32
#define DFPLAYER_RX 33

// ==================== WiFi ====================
const char* WIFI_SSID = "Adv-wifi-Backup";
const char* WIFI_PASSWORD = "advwifibkp";

// ==================== Servidor ====================
// 0 = Render/online, 1 = servidor local na mesma rede Wi-Fi.
#define PULYN_LAN_MODE 0
#define PULYN_LAN_SERVER "http://192.168.0.60:3001"

#if PULYN_LAN_MODE
const char* SERVER_BASE_URL = PULYN_LAN_SERVER;
#else
const char* SERVER_BASE_URL = "https://backendpulyn.onrender.com";
#endif

// ID do checkpoint cadastrado no banco de produção.
const char* CHECKPOINT_ID = "15";

// ==================== TIMERS OTIMIZADOS ====================
const unsigned long MODE_CHECK_INTERVAL = 10000;      // Checar modo a cada 10s (aumentado)
const unsigned long HEARTBEAT_INTERVAL = 60000;       // Heartbeat a cada 60s (aumentado)
const unsigned long RFID_COOLDOWN = 300;              // Reduzido: 300ms antes de nova leitura
const unsigned long RFID_REPEAT_GUARD = 5000;         // Reduzido: ignorar releitura por 5s
const unsigned long IDLE_COLOR_DURATION = 1500;       // Reduzido: cor aleatória por 1.5s
const unsigned long FAST_LOOP_INTERVAL = 20;          // Loop RFID a cada 20ms

// ==================== REDE OTIMIZADA ====================
// Timeouts mais agressivos para resposta mais rápida
#if PULYN_LAN_MODE
const uint16_t HTTP_CONNECT_TIMEOUT = 2000;          // LAN: 2s para conectar
const uint16_t HTTP_RESPONSE_TIMEOUT = 3000;         // LAN: 3s para resposta
#else
// Timeouts otimizados para Render
const uint16_t HTTP_CONNECT_TIMEOUT_FAST = 4000;     // Online rápido: 4s conectar
const uint16_t HTTP_RESPONSE_TIMEOUT_FAST = 6000;    // Online rápido: 6s resposta
const uint16_t HTTP_CONNECT_TIMEOUT_SLOW = 8000;     // Online lento: 8s conectar (heartbeat)
const uint16_t HTTP_RESPONSE_TIMEOUT_SLOW = 10000;   // Online lento: 10s resposta (heartbeat)
#endif

// Tolerância a falhas mantida
const uint8_t API_FAILURE_TOLERANCE = 3;

// Intervalo mínimo entre tentativas de reconexão do Wi-Fi.
const unsigned long WIFI_RECONNECT_INTERVAL = 5000;

// ==================== SONS OTIMIZADOS ====================
#define SOUND_SUCCESS 1  // Detecção/check-in: 01.mp3
#define SOUND_POINT   1  // Conquista de território: 01.mp3  
#define SOUND_ERROR   3  // Erro/bloqueio: 03.mp3

// ==================== CORES LED OTIMIZADAS ====================
#define LED_GREEN 0x00FF00
#define LED_RED 0xFF0000
#define LED_YELLOW 0xFFFF00
#define LED_BLUE 0x0000FF
#define LED_PURPLE 0xFF00FF
#define LED_CYAN 0x00FFFF
#define LED_OFF 0x000000

// ==================== TEMPOS DE FEEDBACK OTIMIZADOS ====================
const unsigned long FEEDBACK_SUCCESS = 500;          // Sucesso: 500ms
const unsigned long FEEDBACK_ERROR = 800;            // Erro: 800ms
const unsigned long FEEDBACK_BLINK_FAST = 60;        // Piscar rápido: 60ms
const unsigned long FEEDBACK_BLINK_SLOW = 100;       // Piscar lento: 100ms
const unsigned long FEEDBACK_TREASURE = 500;         // Tesouro: 500ms
const unsigned long FEEDBACK_MONSTER = 400;          // Monstro: 400ms

#endif