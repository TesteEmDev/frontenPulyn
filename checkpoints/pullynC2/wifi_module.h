// ==================== WIFI_MODULE.H ====================
// Gerenciar conexão WiFi

#ifndef WIFI_MODULE_H
#define WIFI_MODULE_H

#include <WiFi.h>
#include "config.h"

class WiFiModule {
public:
  bool connected = false;
  
  void init() {
    Serial.print("📶 Conectando WiFi: ");
    Serial.println(WIFI_SSID);
    
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
  }
  
  void check() {
    if (WiFi.status() != WL_CONNECTED) {
      if (connected) {
        connected = false;
        Serial.println("⚠️ WiFi desconectado");
      }
    } else {
      if (!connected) {
        connected = true;
        Serial.println("✅ WiFi reconectado");
      }
    }
  }
};

#endif
