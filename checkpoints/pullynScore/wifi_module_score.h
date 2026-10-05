// ==================== WIFI_MODULE_SCORE.H ====================
// Módulo WiFi otimizado para Score/Telão Pulyn
//
// A rede vem, nesta ordem:
//   1. da rede gravada pelo portal de configuração (celular), se houver;
//   2. de WIFI_SSID / WIFI_PASSWORD do config_score.h (rede padrão).
//
// O portal (wifi_portal.h) abre sozinho quando não há conexão, ou quando o
// botão BOOT é segurado por 3 segundos, ou pelo comando serial WIFI_PORTAL.

#ifndef WIFI_MODULE_SCORE_H
#define WIFI_MODULE_SCORE_H

#include <WiFi.h>
#include "config_score.h"
#include "wifi_portal.h"

class WiFiModuleScore {
private:
  unsigned long lastCheckTime;
  unsigned long lastConnectionAttempt;
  unsigned long disconnectedSince;
  unsigned long buttonPressedSince;
  bool connecting;
  WiFiPortal portal;
  String ssid;
  String pass;

  String apName() {
    return String("Pulyn-Placar");
  }

  void loadCredentials() {
    if (portal.loadSaved(ssid, pass)) {
      Serial.print("📶 Score: usando a rede salva pelo portal: ");
    } else {
      ssid = WIFI_SSID;
      pass = WIFI_PASSWORD;
      Serial.print("📶 Score: usando a rede padrão do firmware: ");
    }
    Serial.println(ssid);
  }

  // Segurar o botão BOOT por 3 s (com o aparelho já ligado) abre o portal.
  // Não segure durante a reinicialização, senão o ESP32 entra em modo de gravação.
  void pollButton() {
    if (digitalRead(PORTAL_BUTTON_PIN) == LOW) {
      if (buttonPressedSince == 0) buttonPressedSince = millis();
      if (millis() - buttonPressedSince >= 3000) {
        buttonPressedSince = 0;
        openPortal();
      }
    } else {
      buttonPressedSince = 0;
    }
  }

public:
  bool connected;

  WiFiModuleScore() : lastCheckTime(0), lastConnectionAttempt(0),
                      disconnectedSince(0), buttonPressedSince(0),
                      connecting(false), connected(false) {}

  void init() {
    pinMode(PORTAL_BUTTON_PIN, INPUT_PULLUP);
    loadCredentials();

    Serial.print("📶 Score: conectando ao WiFi...");
    WiFi.mode(WIFI_STA);
    WiFi.persistent(false);
    WiFi.begin(ssid.c_str(), pass.c_str());

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
      Serial.println("\n⚠️ Score: WiFi não conectado inicialmente - abrindo o portal de configuração");
      connected = false;
      portal.start(apName());
      disconnectedSince = millis();
    }
  }

  // Abre o portal na hora (botão BOOT ou comando serial WIFI_PORTAL).
  void openPortal() {
    portal.start(apName());
  }

  // Apaga a rede salva e volta para a rede padrão do firmware.
  void forgetNetwork() {
    portal.clear();
    Serial.println("🗑️ Score: rede salva apagada. Reiniciando...");
    delay(500);
    ESP.restart();
  }

  void printStatus() {
    Serial.println("\n📶 STATUS DO WI-FI (SCORE)");
    Serial.print("  Rede configurada: ");
    Serial.println(ssid);
    Serial.print("  Conexão: ");
    Serial.println(WiFi.status() == WL_CONNECTED ? "conectado" : "sem conexão");
    if (WiFi.status() == WL_CONNECTED) {
      Serial.print("  IP: ");
      Serial.println(WiFi.localIP());
    }
    Serial.print("  Portal: ");
    Serial.println(portal.isActive() ? "aberto" : "fechado");
    Serial.println();
  }

  void check() {
    pollButton();

    if (portal.isActive()) {
      portal.handle();
      if (portal.timedOut()) {
        Serial.println("⏱️ Score: portal expirou, voltando a tentar a rede salva");
        portal.stop();
        lastConnectionAttempt = millis() - WIFI_RETRY_INTERVAL;
        disconnectedSince = millis();
      }
    }

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

      if (connected) {
        disconnectedSince = 0;
        return;
      }
      if (disconnectedSince == 0) disconnectedSince = now;

      // Com o portal aberto não se tenta reconectar (derrubaria o celular).
      if (portal.isActive()) return;

      // Muito tempo sem rede: provavelmente mudou de local ou de roteador.
      if (now - disconnectedSince >= PORTAL_OPEN_AFTER_MS) {
        Serial.println("❌ Score: sem rede há muito tempo, abrindo o portal de configuração");
        portal.start(apName());
        return;
      }

      // Tentar reconexão se necessário
      if (!connecting) {
        if (now - lastConnectionAttempt >= WIFI_RETRY_INTERVAL) {
          lastConnectionAttempt = now;
          connecting = true;

          Serial.println("🔄 Score: tentando reconectar WiFi...");
          WiFi.disconnect();
          WiFi.begin(ssid.c_str(), pass.c_str());

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
