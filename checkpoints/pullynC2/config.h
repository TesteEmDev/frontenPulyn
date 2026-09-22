// ==================== CONFIG.H ====================
// Configurações centralizadas do checkpoint

#ifndef CONFIG_H
#define CONFIG_H

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
// Cada ESP32 deve usar o ID do seu próprio checkpoint.
const char* CHECKPOINT_ID = "3";

// ==================== Timers ====================
const unsigned long MODE_CHECK_INTERVAL = 5000;      // Checar modo a cada 5s
const unsigned long HEARTBEAT_INTERVAL = 30000;     // Heartbeat a cada 30s
const unsigned long RFID_COOLDOWN = 500;            // Esperar 500ms antes de nova leitura
const unsigned long RFID_REPEAT_GUARD = 10000;      // Ignorar releitura da mesma pulseira por 10s
const unsigned long IDLE_COLOR_DURATION = 3000;     // Manter cor aleatória por 3s

// ==================== Sons ====================
#define SOUND_SUCCESS 1  // Detecção/check-in: 01.mp3
#define SOUND_POINT   1  // Conquista de território: 01.mp3
#define SOUND_ERROR   3  // Erro/bloqueio: 03.mp3

// ==================== Cores LED ====================
#define LED_GREEN 0x00FF00
#define LED_RED 0xFF0000
#define LED_YELLOW 0xFFFF00
#define LED_OFF 0x000000

#endif
