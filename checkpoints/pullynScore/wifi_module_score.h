// ==================== WIFI_MODULE_SCORE.H ====================
// Módulo WiFi otimizado para Score/Telão Pulyn

#ifndef WIFI_MODULE_SCORE_H
#define WIFI_MODULE_SCORE_H

#include <WiFi.h>
#include "config_score.h"

class WiFiModuleScore {
private:
  unsigned long lastCheckTime;
  unsigned long lastConnectionAttempt;
  bool connecting;
  
public:
  bool connected;
  
  WiFiModuleScore() : connected(false), connecting(false), 
                      lastCheckTime(0), lastConnectionAttempt(0) {}
  
  void init() {
    Serial.print("📶 Score: conectando ao WiFi...");
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
    
    // Tentativa inicial rápida
    unsigned long startTime = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - startTime < 8000) {
      delay(250);
      Serial.print(".");
    }
    
    if (WiFi.status() == WL_CONNECTED) {
      connected = true;
      Serial.println("\n✅ Score: WiFi conectado");
      Serial.print("📡 IP: ");
      Serial.println(WiFi.localIP());
    } else {
      Serial.println("\n⚠️ Score: WiFi não conectado inicialmente");
      connected = false;
    }
  }
  
  void check() {
    unsigned long now = millis();
    
    // Verificar conexão apenas a cada 1 segundo
    if (now - lastCheckTime >= 1000) {
      lastCheckTime = now;
      
      bool wasConnected = connected;
      connected = (WiFi.status() == WL_CONNECTED);
      
      if (wasConnected && !connected) {
        Serial.println("⚠️ Score: WiFi desconectado");
        connecting = false;
      } else if (!wasConnected && connected) {
        Serial.println("✅ Score: WiFi reconectado");
      }
      
      // Tentar reconexão se necessário
      if (!connected && !connecting) {
        if (now - lastConnectionAttempt >= WIFI_RETRY_INTERVAL) {
          lastConnectionAttempt = now;
          connecting = true;
          
          Serial.println("🔄 Score: tentando reconectar WiFi...");
          WiFi.disconnect();
          WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
          
          // Espera curta para verificar conexão
          unsigned long reconnectStart = millis();
          while (WiFi.status() != WL_CONNECTED && millis() - reconnectStart < 5000) {
            delay(100);
          }
          
          connecting = false;
        }
      }
    }
  }
  
  bool isConnected() {
    return connected;
  }
};

#endif