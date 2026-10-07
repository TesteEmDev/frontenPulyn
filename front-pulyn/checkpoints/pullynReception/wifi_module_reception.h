// ==================== WIFI_MODULE_RECEPTION.H ====================
// Gerenciamento WiFi otimizado para recepção Pulyn
//
// A rede vem, nesta ordem:
//   1. da rede gravada pelo portal de configuração (celular), se houver;
//   2. de WIFI_SSID / WIFI_PASSWORD do config_reception.h (rede padrão).
//
// O portal (wifi_portal.h) abre sozinho quando não há conexão, ou quando o
// botão BOOT é segurado por 3 segundos, ou pelo método openPortal().

#ifndef WIFI_MODULE_RECEPTION_H
#define WIFI_MODULE_RECEPTION_H

#include <WiFi.h>
#include "config_reception.h"
#include "wifi_portal.h"

class WiFiModuleReception {
private:
  unsigned long lastReconnectAttempt = 0;
  unsigned long disconnectedSince = 0;
  unsigned long buttonPressedSince = 0;
  WiFiPortal portal;
  String ssid;
  String pass;

  String apName() {
    return String("Pulyn-Recepcao-") + RECEPTION_CHECKPOINT_ID;
  }

  void loadCredentials() {
    if (portal.loadSaved(ssid, pass)) {
      Serial.print("📶 Recepção - usando a rede salva pelo portal: ");
    } else {
      ssid = WIFI_SSID;
      pass = WIFI_PASSWORD;
      Serial.print("📶 Recepção - usando a rede padrão do firmware: ");
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
  bool connected = false;

  void init() {
    pinMode(PORTAL_BUTTON_PIN, INPUT_PULLUP);
    loadCredentials();

    // Reconexão automática. As credenciais ficam na memória do portal (NVS).
    WiFi.mode(WIFI_STA);
    WiFi.setAutoReconnect(true);
    WiFi.persistent(false);

    WiFi.begin(ssid.c_str(), pass.c_str());

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
      Serial.println("❌ Recepção - WiFi ERRO - abrindo o portal de configuração");
      portal.start(apName());
    }

    lastReconnectAttempt = millis();
    disconnectedSince = connected ? 0 : millis();
  }

  // Abre o portal na hora (botão BOOT ou chamada direta).
  void openPortal() {
    portal.start(apName());
  }

  // Apaga a rede salva e volta para a rede padrão do firmware.
  void forgetNetwork() {
    portal.clear();
    Serial.println("🗑️ Recepção - rede salva apagada. Reiniciando...");
    delay(500);
    ESP.restart();
  }

  void printStatus() {
    Serial.println("\n📶 STATUS DO WI-FI (RECEPÇÃO)");
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
        Serial.println("⏱️ Recepção - portal expirou, voltando a tentar a rede salva");
        portal.stop();
        lastReconnectAttempt = millis() - WIFI_RECONNECT_INTERVAL;
        disconnectedSince = millis();
      }
    }

    if (WiFi.status() == WL_CONNECTED) {
      disconnectedSince = 0;
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
    if (disconnectedSince == 0) disconnectedSince = millis();

    // Com o portal aberto não se tenta reconectar (derrubaria o celular).
    if (portal.isActive()) return;

    // Muito tempo sem rede: provavelmente mudou de local ou de roteador.
    if (millis() - disconnectedSince >= PORTAL_OPEN_AFTER_MS) {
      Serial.println("❌ Recepção - sem rede há muito tempo, abrindo o portal de configuração");
      portal.start(apName());
      return;
    }

    if (millis() - lastReconnectAttempt < WIFI_RECONNECT_INTERVAL) {
      return;
    }
    lastReconnectAttempt = millis();

    Serial.println("🔄 Recepção - Tentando reconectar o WiFi...");
    WiFi.disconnect();
    WiFi.begin(ssid.c_str(), pass.c_str());
  }
};

#endif
