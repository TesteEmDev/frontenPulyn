// ==================== CONFIG_SCORE.H ====================
// Configurações otimizadas para Score/Telão Pulyn

#ifndef CONFIG_SCORE_H
#define CONFIG_SCORE_H

// ==================== PINAGEM OTIMIZADA ====================
#define RST_PIN 4
#define SS_PIN 5
#define LED_PIN 21
#define NUM_LEDS 7
#define DFPLAYER_TX 32
#define DFPLAYER_RX 33

// ==================== CONFIGURAÇÕES DE REDE ====================
const char* WIFI_SSID = "Adv-wifi-Backup";
const char* WIFI_PASSWORD = "advwifibkp";

// 0 = Render/online, 1 = servidor local na mesma rede Wi-Fi.
#define PULYN_LAN_MODE 0
#define PULYN_LAN_SERVER "http://192.168.0.60:3001"
#if PULYN_LAN_MODE
const char* SERVER_BASE_URL = PULYN_LAN_SERVER;
#else
const char* SERVER_BASE_URL = "https://backendpulyn.onrender.com";
#endif

// ==================== CREDENCIAIS SCORE_KIOSK ====================
const char* SCORE_KIOSK_EMAIL = "pontuacao@gmail.com";
const char* SCORE_KIOSK_PASSWORD = "123456";

// ==================== TIMINGS OTIMIZADOS ====================
#define EVENT_REFRESH_INTERVAL 5000      // 5 segundos
#define RFID_REPEAT_GUARD 1500           // 1.5 segundos (reduzido de 3s)
#define WIFI_RETRY_INTERVAL 10000        // 10 segundos
#define HTTP_CONNECT_TIMEOUT 4000        // 4 segundos (reduzido)
#define HTTP_RESPONSE_TIMEOUT 6000       // 6 segundos (reduzido)
#define RFID_CHECK_INTERVAL 20           // 20ms para verificação rápida
#define MIN_UID_LENGTH 8                 // Tamanho mínimo do UID

// ==================== LED COLORS ====================
#define LED_GREEN 0x00FF00
#define LED_RED 0xFF0000
#define LED_YELLOW 0xFFFF00
#define LED_BLUE 0x0044FF
#define LED_OFF 0x000000

// ==================== SOUND TRACKS ====================
#define SOUND_SUCCESS 1
#define SOUND_ERROR 3
#define SOUND_WAITING 2

#endif