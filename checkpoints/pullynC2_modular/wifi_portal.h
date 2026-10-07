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
  bool active = false;        // portal aberto (Wi-Fi próprio do ESP32)
  bool remoteActive = false;  // página disponível na rede em que ele já está conectado
  bool handlersReady = false;
  unsigned long startedAt = 0;

  // No portal (Wi-Fi próprio) quem protege é a senha do Wi-Fi. Na rede do
  // local qualquer aparelho conectado alcançaria a página, então exige
  // usuário "admin" e a mesma senha PORTAL_AP_PASSWORD.
  bool authorized() {
    if (active) return true;
    if (server.authenticate("admin", PORTAL_AP_PASSWORD)) return true;
    server.requestAuthentication();
    return false;
  }

  void ensureHandlers() {
    if (handlersReady) return;
    server.on("/", HTTP_GET, [this]() { handleRoot(); });
    server.on("/save", HTTP_POST, [this]() { handleSave(); });
    server.on("/forget", HTTP_POST, [this]() { handleForget(); });
    server.onNotFound([this]() { handleRedirect(); });
    handlersReady = true;
  }

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
    if (!authorized()) return;
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
    h += F("<label>Nome da rede (SSID)</label><input id='ssid' name='ssid' maxlength='32' autocapitalize='none'>");
    h += F("<label>Senha</label><input name='pass' type='password' maxlength='63' autocapitalize='none'>");
    if (hasSaved) {
      h += F("<p>Para mudar só o IP, deixe o nome e a senha em branco: a rede salva é mantida.</p>");
    }

    h += F("<h1 style='margin-top:22px'>IP fixo (opcional)</h1>");
    h += F("<p>Deixe em branco para o roteador escolher o IP sozinho (recomendado ao mudar de local). ");
    h += F("Se preencher, use um IP livre da mesma rede do roteador e fora da faixa automática dele.</p>");
    h += F("<label>IP do checkpoint</label><input name='ip' maxlength='15' inputmode='decimal' placeholder='ex.: 192.168.0.50' value='");
    h += htmlEscape(rawSetting("ip"));
    h += F("'><label>Gateway (IP do roteador)</label><input name='gw' maxlength='15' inputmode='decimal' placeholder='ex.: 192.168.0.1' value='");
    h += htmlEscape(rawSetting("gw"));
    h += F("'><label>Máscara</label><input name='mask' maxlength='15' inputmode='decimal' placeholder='padrão: 255.255.255.0' value='");
    h += htmlEscape(rawSetting("mask"));
    h += F("'><label>DNS</label><input name='dns' maxlength='15' inputmode='decimal' placeholder='padrão: igual ao gateway' value='");
    h += htmlEscape(rawSetting("dns"));
    h += F("'>");
    h += F("<button type='submit'>Salvar e reiniciar</button></form>");

    if (hasSaved) {
      h += F("<form method='POST' action='/forget'>");
      h += F("<button class='sec' type='submit'>Esquecer rede salva</button></form>");
    }
    h += F("</div></body></html>");

    server.send(200, "text/html; charset=utf-8", h);
  }

  void handleSave() {
    if (!authorized()) return;
    String ssid = server.arg("ssid");
    String pass = server.arg("pass");
    String ip = server.arg("ip");
    String gw = server.arg("gw");
    String mask = server.arg("mask");
    String dns = server.arg("dns");
    ssid.trim();
    ip.trim();
    gw.trim();
    mask.trim();
    dns.trim();

    // Nome em branco: mantém a rede já salva (útil para mudar só o IP).
    if (ssid.length() == 0) {
      String savedSsid;
      String savedPass;
      if (loadSaved(savedSsid, savedPass)) {
        ssid = savedSsid;
        pass = savedPass;
      }
    }

    String erro;
    IPAddress teste;
    if (ssid.length() == 0 || ssid.length() > 32 || pass.length() > 63) {
      erro = F("Informe o nome da rede (até 32 caracteres) e uma senha de até 63 caracteres.");
    } else if (ip.length() > 0) {
      if (!teste.fromString(ip)) {
        erro = F("O IP fixo não é válido. Use o formato 192.168.0.50.");
      } else if (!teste.fromString(gw)) {
        erro = F("Com IP fixo, informe também o gateway (IP do roteador), por exemplo 192.168.0.1.");
      } else if (mask.length() > 0 && !teste.fromString(mask)) {
        erro = F("A máscara não é válida. Exemplo: 255.255.255.0.");
      } else if (dns.length() > 0 && !teste.fromString(dns)) {
        erro = F("O DNS não é válido. Exemplo: 192.168.0.1.");
      }
    }

    if (erro.length() > 0) {
      String h = pageHeader();
      h += F("<h1>Dados inválidos</h1><p>");
      h += erro;
      h += F("</p><a href='/'><button>Voltar</button></a></div></body></html>");
      server.send(400, "text/html; charset=utf-8", h);
      return;
    }

    save(ssid, pass);
    saveStatic(ip, gw, mask, dns);

    String h = pageHeader();
    h += F("<h1>Rede salva</h1><p>O checkpoint vai reiniciar e conectar em <b>");
    h += htmlEscape(ssid);
    h += F("</b>");
    if (ip.length() > 0) {
      h += F(", com o IP fixo <b>");
      h += htmlEscape(ip);
      h += F("</b>");
    }
    h += F(". Pode fechar esta página. Se a luz continuar vermelha depois de ");
    h += F("alguns segundos, o portal volta a abrir para você corrigir os dados.</p></div></body></html>");
    server.send(200, "text/html; charset=utf-8", h);

    delay(1500);
    ESP.restart();
  }

  void handleForget() {
    if (!authorized()) return;
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
    if (!active) {
      server.send(404, "text/plain", "Nao encontrado");
      return;
    }
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

  // ---------- IP fixo (opcional) ----------

  // Valor gravado como texto ("" se não houver).
  String rawSetting(const char* key) {
    prefs.begin(PORTAL_NVS_NAMESPACE, false);
    String value = prefs.getString(key, "");
    prefs.end();
    return value;
  }

  void saveStatic(const String& ip, const String& gw, const String& mask, const String& dns) {
    prefs.begin(PORTAL_NVS_NAMESPACE, false);
    prefs.putString("ip", ip);
    prefs.putString("gw", ip.length() > 0 ? gw : String(""));
    prefs.putString("mask", ip.length() > 0 ? mask : String(""));
    prefs.putString("dns", ip.length() > 0 ? dns : String(""));
    prefs.end();
  }

  // Devolve true se há IP fixo válido gravado. Máscara e DNS têm padrão.
  bool loadStatic(IPAddress& ip, IPAddress& gw, IPAddress& mask, IPAddress& dns) {
    const String ipText = rawSetting("ip");
    if (ipText.length() == 0) return false;
    if (!ip.fromString(ipText)) return false;
    if (!gw.fromString(rawSetting("gw"))) return false;

    const String maskText = rawSetting("mask");
    if (maskText.length() == 0 || !mask.fromString(maskText)) mask = IPAddress(255, 255, 255, 0);

    const String dnsText = rawSetting("dns");
    if (dnsText.length() == 0 || !dns.fromString(dnsText)) dns = gw;
    return true;
  }

  // ---------- Ciclo de vida do portal ----------

  bool isActive() const { return active; }

  bool timedOut() const {
    return active && (millis() - startedAt >= PORTAL_TIMEOUT_MS);
  }

  void start(const String& apName) {
    if (active) return;

    // A página na rede do local dá lugar ao portal.
    if (remoteActive) {
      server.stop();
      remoteActive = false;
    }

    // Durante a configuração o ESP32 não pode ficar tentando reconectar:
    // isso troca o canal do Wi-Fi e derruba o celular que está configurando.
    WiFi.setAutoReconnect(false);
    if (WiFi.status() != WL_CONNECTED) WiFi.disconnect();

    WiFi.mode(WIFI_AP_STA);
    WiFi.softAP(apName.c_str(), PORTAL_AP_PASSWORD);
    dns.start(53, "*", WiFi.softAPIP());

    ensureHandlers();
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

  // ---------- Página na rede do local (sem abrir o portal) ----------

  bool isRemoteActive() const { return remoteActive; }

  // Com o ESP32 conectado, a mesma página fica disponível para qualquer
  // celular ligado nessa rede (pede usuário e senha).
  void startRemote() {
    if (active || remoteActive) return;
    ensureHandlers();
    server.begin();
    remoteActive = true;
  }

  void stopRemote() {
    if (!remoteActive) return;
    server.stop();
    remoteActive = false;
  }

  // Chamar a cada volta do loop().
  void handle() {
    if (active) {
      dns.processNextRequest();
      server.handleClient();
    } else if (remoteActive) {
      server.handleClient();
    }
  }
};

#endif
