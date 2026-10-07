// ==================== WIFI_PORTAL.H ====================
// Portal de configuração do Wi-Fi: permite trocar a rede do ESP32 pelo
// celular, sem alterar o código nem regravar o firmware.
//
// Como funciona:
//   1. O ESP32 cria o Wi-Fi "Pulyn-CP-<id>" (senha em PORTAL_AP_PASSWORD).
//   2. O celular conecta nele e a página de configuração abre sozinha
//      (ou acesse http://192.168.4.1).
//   3. Escolha a rede, digite a senha e toque em Salvar.
//   4. A rede fica gravada na memória do ESP32 (NVS) e ele reinicia.
//
// Usa apenas bibliotecas que já vêm com o core ESP32 (WebServer, DNSServer,
// Preferences).

#ifndef WIFI_PORTAL_H
#define WIFI_PORTAL_H

#include <WiFi.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <Preferences.h>

// Senha do Wi-Fi do portal (mínimo de 8 caracteres). Troque se quiser.
#ifndef PORTAL_AP_PASSWORD
#define PORTAL_AP_PASSWORD "pulyn1234"
#endif

// Tempo máximo que o portal fica aberto antes de fechar e voltar a tentar
// a rede salva.
#ifndef PORTAL_TIMEOUT_MS
#define PORTAL_TIMEOUT_MS 180000UL
#endif

// Sem conexão por este tempo, o portal abre sozinho.
#ifndef PORTAL_OPEN_AFTER_MS
#define PORTAL_OPEN_AFTER_MS 120000UL
#endif

// Botão que abre o portal quando segurado por 3 segundos (BOOT do ESP32).
#ifndef PORTAL_BUTTON_PIN
#define PORTAL_BUTTON_PIN 0
#endif

#define PORTAL_NVS_NAMESPACE "pulyn-wifi"

class WiFiPortal {
private:
  WebServer server;
  DNSServer dns;
  Preferences prefs;
  bool active = false;
  bool handlersReady = false;
  unsigned long startedAt = 0;

  static String htmlEscape(const String& in) {
    String out;
    out.reserve(in.length() + 8);
    for (size_t i = 0; i < in.length(); i++) {
      char c = in[i];
      if (c == '&') out += "&amp;";
      else if (c == '<') out += "&lt;";
      else if (c == '>') out += "&gt;";
      else if (c == '"') out += "&quot;";
      else if (c == '\'') out += "&#39;";
      else out += c;
    }
    return out;
  }

  String pageHeader() {
    String h;
    h += F("<!DOCTYPE html><html lang='pt-BR'><head><meta charset='utf-8'>");
    h += F("<meta name='viewport' content='width=device-width,initial-scale=1'>");
    h += F("<title>Pulyn - Wi-Fi</title><style>");
    h += F("body{font-family:system-ui,sans-serif;background:#0f1f33;color:#fff;margin:0;padding:20px}");
    h += F(".card{max-width:420px;margin:0 auto;background:#132338;border:1px solid #1e3a54;border-radius:14px;padding:20px}");
    h += F("h1{font-size:20px;margin:0 0 4px}p{color:#9fb3c8;font-size:14px}");
    h += F("label{display:block;margin:14px 0 6px;font-size:14px}");
    h += F("input,select{width:100%;box-sizing:border-box;padding:12px;border-radius:10px;border:1px solid #1e3a54;");
    h += F("background:#0f1f33;color:#fff;font-size:16px}");
    h += F("button{width:100%;margin-top:18px;padding:14px;border:0;border-radius:10px;background:#2f80ed;");
    h += F("color:#fff;font-size:16px;font-weight:600}");
    h += F("button.sec{background:transparent;border:1px solid #1e3a54;color:#9fb3c8;margin-top:10px}");
    h += F(".ok{color:#4caf50}.bad{color:#e53935}</style></head><body><div class='card'>");
    return h;
  }

  void handleRoot() {
    String ssidSaved;
    String passIgnored;
    const bool hasSaved = loadSaved(ssidSaved, passIgnored);
    const bool online = WiFi.status() == WL_CONNECTED;

    String h = pageHeader();
    h += F("<h1>Pulyn &middot; Configurar Wi-Fi</h1>");
    h += F("<p>Escolha a rede em que este checkpoint vai trabalhar.</p>");

    h += F("<p>Situação: ");
    if (online) {
      h += F("<span class='ok'>conectado a ");
      h += htmlEscape(WiFi.SSID());
      h += F("</span>");
    } else {
      h += F("<span class='bad'>sem conexão</span>");
    }
    h += F("<br>Rede salva: ");
    h += hasSaved ? htmlEscape(ssidSaved) : String(F("nenhuma (usa a do firmware)"));
    h += F("</p>");

    h += F("<form method='POST' action='/save'>");
    h += F("<label>Redes encontradas</label><select id='lista' onchange=\"document.getElementById('ssid').value=this.value\">");
    h += F("<option value=''>Selecione...</option>");

    const int found = WiFi.scanNetworks();
    for (int i = 0; i < found; i++) {
      String name = WiFi.SSID(i);
      if (name.length() == 0) continue;
      bool duplicate = false;
      for (int j = 0; j < i; j++) {
        if (WiFi.SSID(j) == name) { duplicate = true; break; }
      }
      if (duplicate) continue;
      const String safe = htmlEscape(name);
      h += F("<option value='");
      h += safe;
      h += F("'>");
      h += safe;
      h += F(" (");
      h += String(WiFi.RSSI(i));
      h += F(" dBm)</option>");
    }
    WiFi.scanDelete();

    h += F("</select>");
    h += F("<label>Nome da rede (SSID)</label><input id='ssid' name='ssid' maxlength='32' required autocapitalize='none'>");
    h += F("<label>Senha</label><input name='pass' type='password' maxlength='63' autocapitalize='none'>");
    h += F("<button type='submit'>Salvar e reiniciar</button></form>");

    if (hasSaved) {
      h += F("<form method='POST' action='/forget'>");
      h += F("<button class='sec' type='submit'>Esquecer rede salva</button></form>");
    }
    h += F("</div></body></html>");

    server.send(200, "text/html; charset=utf-8", h);
  }

  void handleSave() {
    String ssid = server.arg("ssid");
    String pass = server.arg("pass");
    ssid.trim();

    if (ssid.length() == 0 || ssid.length() > 32 || pass.length() > 63) {
      String h = pageHeader();
      h += F("<h1>Dados inválidos</h1><p>Informe o nome da rede (até 32 caracteres) ");
      h += F("e uma senha de até 63 caracteres.</p><a href='/'><button>Voltar</button></a></div></body></html>");
      server.send(400, "text/html; charset=utf-8", h);
      return;
    }

    save(ssid, pass);

    String h = pageHeader();
    h += F("<h1>Rede salva</h1><p>O checkpoint vai reiniciar e conectar em <b>");
    h += htmlEscape(ssid);
    h += F("</b>. Pode fechar esta página. Se a luz continuar vermelha depois de ");
    h += F("alguns segundos, o portal volta a abrir para você corrigir a senha.</p></div></body></html>");
    server.send(200, "text/html; charset=utf-8", h);

    delay(1500);
    ESP.restart();
  }

  void handleForget() {
    clear();
    String h = pageHeader();
    h += F("<h1>Rede esquecida</h1><p>O checkpoint vai reiniciar e usar a rede do firmware.</p></div></body></html>");
    server.send(200, "text/html; charset=utf-8", h);

    delay(1500);
    ESP.restart();
  }

  // Qualquer endereço digitado no celular cai na página de configuração
  // (é isso que faz o aviso "Fazer login na rede" abrir sozinho).
  void handleRedirect() {
    server.sendHeader("Location", String("http://") + WiFi.softAPIP().toString() + "/", true);
    server.send(302, "text/plain", "");
  }

public:
  WiFiPortal() : server(80) {}

  // ---------- Credenciais gravadas na memória do ESP32 ----------

  bool loadSaved(String& ssid, String& pass) {
    prefs.begin(PORTAL_NVS_NAMESPACE, false);
    ssid = prefs.getString("ssid", "");
    pass = prefs.getString("pass", "");
    prefs.end();
    return ssid.length() > 0;
  }

  void save(const String& ssid, const String& pass) {
    prefs.begin(PORTAL_NVS_NAMESPACE, false);
    prefs.putString("ssid", ssid);
    prefs.putString("pass", pass);
    prefs.end();
  }

  void clear() {
    prefs.begin(PORTAL_NVS_NAMESPACE, false);
    prefs.clear();
    prefs.end();
  }

  // ---------- Ciclo de vida do portal ----------

  bool isActive() const { return active; }

  bool timedOut() const {
    return active && (millis() - startedAt >= PORTAL_TIMEOUT_MS);
  }

  void start(const String& apName) {
    if (active) return;

    // Durante a configuração o ESP32 não pode ficar tentando reconectar:
    // isso troca o canal do Wi-Fi e derruba o celular que está configurando.
    WiFi.setAutoReconnect(false);
    if (WiFi.status() != WL_CONNECTED) WiFi.disconnect();

    WiFi.mode(WIFI_AP_STA);
    WiFi.softAP(apName.c_str(), PORTAL_AP_PASSWORD);
    dns.start(53, "*", WiFi.softAPIP());

    if (!handlersReady) {
      server.on("/", HTTP_GET, [this]() { handleRoot(); });
      server.on("/save", HTTP_POST, [this]() { handleSave(); });
      server.on("/forget", HTTP_POST, [this]() { handleForget(); });
      server.onNotFound([this]() { handleRedirect(); });
      handlersReady = true;
    }
    server.begin();

    active = true;
    startedAt = millis();

    Serial.println("📲 Portal de Wi-Fi aberto");
    Serial.print("   Rede: ");
    Serial.println(apName);
    Serial.print("   Senha: ");
    Serial.println(PORTAL_AP_PASSWORD);
    Serial.print("   Página: http://");
    Serial.println(WiFi.softAPIP());
  }

  void stop() {
    if (!active) return;
    server.stop();
    dns.stop();
    WiFi.softAPdisconnect(true);
    WiFi.mode(WIFI_STA);
    WiFi.setAutoReconnect(true);
    active = false;
    Serial.println("📲 Portal de Wi-Fi fechado");
  }

  // Chamar a cada volta do loop().
  void handle() {
    if (!active) return;
    dns.processNextRequest();
    server.handleClient();
  }
};

#endif
