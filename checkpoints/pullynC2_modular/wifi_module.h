// ==================== WIFI_MODULE.H ====================
// Gerenciar conexão WiFi

#ifndef WIFI_MODULE_H
#define WIFI_MODULE_H

#include <WiFi.h>
#include "config.h"

class WiFiModule {
private:
  unsigned long lastReconnectAttempt = 0;

public:
  bool connected = false;

  void init() {
    Serial.print("📶 Conectando WiFi: ");
    Serial.println(WIFI_SSID);

    // Reconexão automática do próprio stack, além da tentativa manual do check().
    WiFi.mode(WIFI_STA);
    WiFi.setAutoReconnect(true);
    WiFi.persistent(true);

    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    int tentativas = 0;
    while (WiFi.status() != WL_CONNECTED && tentativas < 30) {
      delay(500);
      Serial.print(".");
      tentativas++;
    }
    Serial.println();

    if (WiFi.status() == WL_CONNECTED) {
      connected = true;
      Serial.print("✅ WiFi OK - IP: ");
      Serial.println(WiFi.localIP());
    } else {
      connected = false;
      Serial.println("❌ WiFi ERRO");
    }

    lastReconnectAttempt = millis();
  }

  // Além de observar o estado, tenta reconectar periodicamente.
  // Sem isso o checkpoint ficava offline até alguém reiniciar o ESP32 na mão.
  void check() {
    if (WiFi.status() == WL_CONNECTED) {
      if (!connected) {
        connected = true;
        Serial.print("✅ WiFi reconectado - IP: ");
        Serial.println(WiFi.localIP());
      }
      return;
    }

    if (connected) {
      connected = false;
      Serial.println("⚠️ WiFi desconectado");
    }

    if (millis() - lastReconnectAttempt < WIFI_RECONNECT_INTERVAL) {
      return;
    }
    lastReconnectAttempt = millis();

    Serial.println("🔄 Tentando reconectar o WiFi...");
    WiFi.disconnect();
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  }
};

#endif
