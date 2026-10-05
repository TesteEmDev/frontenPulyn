// ==================== WIFI_MODULE.H ====================
// Gerenciar conexão WiFi
//
// A rede vem, nesta ordem:
//   1. da rede gravada pelo portal de configuração (celular), se houver;
//   2. de WIFI_SSID / WIFI_PASSWORD do config.h (rede padrão do firmware).
//
// O portal (wifi_portal.h) abre sozinho quando não há conexão, ou quando o
// botão BOOT é segurado por 3 segundos, ou pelo comando serial WIFI_PORTAL.

#ifndef WIFI_MODULE_H
#define WIFI_MODULE_H

#include <WiFi.h>
#include <ESPmDNS.h>
#include "config.h"
#include "wifi_portal.h"

class WiFiModule {
private:
  unsigned long lastReconnectAttempt = 0;
  unsigned long disconnectedSince = 0;
  unsigned long buttonPressedSince = 0;
  bool remoteRunning = false;
  WiFiPortal portal;
  String ssid;
  String pass;
  bool useStaticIp = false;
  IPAddress staticIp;
  IPAddress staticGateway;
  IPAddress staticMask;
  IPAddress staticDns;

  // Aplica o IP fixo (se configurado). Sem ele, o roteador escolhe o IP (DHCP).
  void applyIpConfig() {
    if (useStaticIp) {
      WiFi.config(staticIp, staticGateway, staticMask, staticDns);
    }
  }

  String apName() {
    return String("Pulyn-CP-") + CHECKPOINT_ID;
  }

  // Nome na rede do local: pulyn-cp-23 (abre em http://pulyn-cp-23.local)
  String hostName() {
    String host = apName();
    host.toLowerCase();
    return host;
  }

  // Com o ESP32 conectado, a página de configuração também fica disponível
  // para os celulares da mesma rede (usuário "admin", senha do portal).
  void startRemoteConfig() {
    const String host = hostName();
    if (MDNS.begin(host.c_str())) {
      MDNS.addService("http", "tcp", 80);
    }
    portal.startRemote();
    remoteRunning = true;

    Serial.println("🌐 Configuração do Wi-Fi pela rede do local:");
    Serial.print("   http://");
    Serial.print(WiFi.localIP());
    Serial.print("  ou  http://");
    Serial.print(host);
    Serial.println(".local");
    Serial.println("   Usuário: admin  |  Senha: a do portal (PORTAL_AP_PASSWORD)");
  }

  void stopRemoteConfig() {
    portal.stopRemote();
    MDNS.end();
    remoteRunning = false;
  }

  void loadCredentials() {
    if (portal.loadSaved(ssid, pass)) {
      Serial.print("📶 Usando a rede salva pelo portal: ");
    } else {
      ssid = WIFI_SSID;
      pass = WIFI_PASSWORD;
      Serial.print("📶 Usando a rede padrão do firmware: ");
    }
    Serial.println(ssid);

    useStaticIp = portal.loadStatic(staticIp, staticGateway, staticMask, staticDns);
    if (useStaticIp) {
      Serial.print("📌 IP fixo configurado: ");
      Serial.println(staticIp);
    } else {
      Serial.println("📌 IP automático (DHCP)");
    }
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

    // Reconexão automática do próprio stack, além da tentativa manual do check().
    // As credenciais ficam na memória do portal (NVS), não na do próprio Wi-Fi.
    WiFi.mode(WIFI_STA);
    WiFi.setAutoReconnect(true);
    WiFi.persistent(false);

    applyIpConfig();
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
      Serial.print("✅ WiFi OK - IP: ");
      Serial.println(WiFi.localIP());
    } else {
      connected = false;
      Serial.println("❌ WiFi ERRO - abrindo o portal de configuração");
      openPortal();
    }

    lastReconnectAttempt = millis();
    disconnectedSince = connected ? 0 : millis();

    if (connected) startRemoteConfig();
  }

  // Abre o portal na hora (botão BOOT ou comando serial WIFI_PORTAL).
  void openPortal() {
    if (remoteRunning) stopRemoteConfig();
    portal.start(apName());
  }

  // Apaga a rede salva e volta para a rede padrão do firmware.
  void forgetNetwork() {
    portal.clear();
    Serial.println("🗑️ Rede salva apagada. Reiniciando...");
    delay(500);
    ESP.restart();
  }

  void printStatus() {
    Serial.println("\n📶 STATUS DO WI-FI");
    Serial.print("  Rede configurada: ");
    Serial.println(ssid);
    Serial.print("  Conexão: ");
    Serial.println(WiFi.status() == WL_CONNECTED ? "conectado" : "sem conexão");
    if (WiFi.status() == WL_CONNECTED) {
      Serial.print("  IP: ");
      Serial.println(WiFi.localIP());
    }
    Serial.print("  IP: ");
    Serial.println(useStaticIp ? "fixo" : "automático (DHCP)");
    Serial.print("  Portal: ");
    Serial.println(portal.isActive() ? "aberto" : "fechado");
    if (remoteRunning) {
      Serial.print("  Configuração pela rede: http://");
      Serial.print(WiFi.localIP());
      Serial.print(" ou http://");
      Serial.print(hostName());
      Serial.println(".local");
    }
    Serial.println();
  }

  // Além de observar o estado, tenta reconectar periodicamente.
  // Sem isso o checkpoint ficava offline até alguém reiniciar o ESP32 na mão.
  void check() {
    pollButton();
    portal.handle();

    if (portal.isActive()) {
      if (portal.timedOut()) {
        Serial.println("⏱️ Portal expirou, voltando a tentar a rede salva");
        portal.stop();
        lastReconnectAttempt = millis() - WIFI_RECONNECT_INTERVAL;
        disconnectedSince = millis();
      }
    }

    if (WiFi.status() == WL_CONNECTED) {
      disconnectedSince = 0;
      if (!connected) {
        connected = true;
        Serial.print("✅ WiFi reconectado - IP: ");
        Serial.println(WiFi.localIP());
      }
      if (!remoteRunning && !portal.isActive()) startRemoteConfig();
      return;
    }

    if (connected) {
      connected = false;
      Serial.println("⚠️ WiFi desconectado");
    }
    if (remoteRunning) stopRemoteConfig();
    if (disconnectedSince == 0) disconnectedSince = millis();

    // Com o portal aberto não se tenta reconectar (derrubaria o celular).
    if (portal.isActive()) return;

    // Muito tempo sem rede: provavelmente mudou de local ou de roteador.
    if (millis() - disconnectedSince >= PORTAL_OPEN_AFTER_MS) {
      Serial.println("❌ Sem rede há muito tempo - abrindo o portal de configuração");
      openPortal();
      return;
    }

    if (millis() - lastReconnectAttempt < WIFI_RECONNECT_INTERVAL) {
      return;
    }
    lastReconnectAttempt = millis();

    Serial.println("🔄 Tentando reconectar o WiFi...");
    WiFi.disconnect();
    applyIpConfig();
    WiFi.begin(ssid.c_str(), pass.c_str());
  }
};

#endif
