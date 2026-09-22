// ==================== WIFI_MODULE_RECEPTION.H ====================
// Gerenciamento WiFi otimizado para recepção Pulyn

#ifndef WIFI_MODULE_RECEPTION_H
#define WIFI_MODULE_RECEPTION_H

#include <WiFi.h>
#include "config_reception.h"

class WiFiModuleReception {
private:
  unsigned long lastReconnectAttempt = 0;

public:
  bool connected = false;

  void init() {
    Serial.print("📶 Recepção - Conectando WiFi: ");
    Serial.println(WIFI_SSID);

    // Reconexão automática
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
      Serial.print("✅ Recepção - WiFi OK - IP: ");
      Serial.println(WiFi.localIP());
    } else {
      connected = false;
      Serial.println("❌ Recepção - WiFi ERRO");
    }

    lastReconnectAttempt = millis();
  }

  void check() {
    if (WiFi.status() == WL_CONNECTED) {
      if (!connected) {
        connected = true;
        Serial.print("✅ Recepção - WiFi reconectado - IP: ");
        Serial.println(WiFi.localIP());
      }
      return;
    }

    if (connected) {
      connected = false;
      Serial.println("⚠️ Recepção - WiFi desconectado");
    }

    if (millis() - lastReconnectAttempt < WIFI_RECONNECT_INTERVAL) {
      return;
    }
    lastReconnectAttempt = millis();

    Serial.println("🔄 Recepção - Tentando reconectar o WiFi...");
    WiFi.disconnect();
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  }
};

#endif