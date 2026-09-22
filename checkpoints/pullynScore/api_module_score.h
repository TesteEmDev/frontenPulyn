// ==================== API_MODULE_SCORE.H ====================
// Módulo de API otimizado para Score/Telão Pulyn

#ifndef API_MODULE_SCORE_H
#define API_MODULE_SCORE_H

#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include "config_score.h"

class APIModuleScore {
private:
  String authToken;
  String activeEventId;
  bool authenticated;
  unsigned long lastEventRefresh;
  unsigned long lastLoginAttempt;
  
  bool sendScoreReadingFastInternal(const String& uid, bool retryLogin = true);
  
public:
  bool available;
  
  APIModuleScore() : authenticated(false), available(false), 
                     lastEventRefresh(0), lastLoginAttempt(0) {}
  
  bool beginRequest(HTTPClient& http, WiFiClientSecure& secureClient, const String& url) {
    http.setConnectTimeout(HTTP_CONNECT_TIMEOUT);
    http.setTimeout(HTTP_RESPONSE_TIMEOUT);
    
    if (url.startsWith("https://")) {
      secureClient.setInsecure();
      return http.begin(secureClient, url);
    }
    return http.begin(url);
  }
  
  bool login(bool force = false) {
    if (force) {
      authToken = "";
      authenticated = false;
    }
    
    // Evitar múltiplas tentativas muito próximas
    unsigned long now = millis();
    if (!force && now - lastLoginAttempt < 5000 && authToken.length() > 0) {
      return true;
    }
    
    lastLoginAttempt = now;
    
    HTTPClient http;
    WiFiClientSecure secureClient;
    const String url = String(SERVER_BASE_URL) + "/api/auth/login";
    
    if (!beginRequest(http, secureClient, url)) {
      Serial.println("❌ Score: não foi possível iniciar o login");
      return false;
    }
    
    http.addHeader("Content-Type", "application/json");
    StaticJsonDocument<256> request;
    request["email"] = SCORE_KIOSK_EMAIL;
    request["password"] = SCORE_KIOSK_PASSWORD;
    
    String body;
    serializeJson(request, body);
    
    int httpCode = http.POST(body);
    String responseBody = http.getString();
    http.end();
    
    if (httpCode != 200) {
      Serial.print("❌ Score: login recusado HTTP ");
      Serial.println(httpCode);
      return false;
    }
    
    StaticJsonDocument<768> response;
    DeserializationError parseError = deserializeJson(response, responseBody);
    String token = response["token"] | "";
    
    if (parseError || token.length() == 0) {
      Serial.println("❌ Score: resposta de login inválida");
      return false;
    }
    
    authToken = token;
    authenticated = true;
    Serial.println("✅ Score: Arduino autenticado");
    return true;
  }
  
  bool refreshActiveEvent(bool retryLogin = true) {
    unsigned long now = millis();
    
    // Atualizar apenas no intervalo configurado
    if (now - lastEventRefresh < EVENT_REFRESH_INTERVAL && activeEventId.length() > 0) {
      return true;
    }
    
    if (!authenticated && !login()) {
      return false;
    }
    
    HTTPClient http;
    WiFiClientSecure secureClient;
    const String url = String(SERVER_BASE_URL) + "/api/event-control/active";
    
    if (!beginRequest(http, secureClient, url)) {
      return false;
    }
    
    http.addHeader("Authorization", "Bearer " + authToken);
    int httpCode = http.GET();
    String responseBody = http.getString();
    http.end();
    
    if (httpCode == 401) {
      if (retryLogin) {
        authenticated = false;
        return login() && refreshActiveEvent(false);
      }
      return false;
    }
    
    if (httpCode != 200) {
      Serial.print("⚠️ Score: evento não consultado HTTP ");
      Serial.println(httpCode);
      return false;
    }
    
    StaticJsonDocument<768> response;
    DeserializationError parseError = deserializeJson(response, responseBody);
    
    if (parseError) {
      return false;
    }
    
    String previousEventId = activeEventId;
    activeEventId = response["event"]["id"] | "";
    lastEventRefresh = now;
    
    if (activeEventId != previousEventId) {
      if (activeEventId.length() > 0) {
        Serial.print("🎯 Score: evento selecionado pela recepção: ");
        Serial.println(activeEventId);
      } else {
        Serial.println("⏳ Score: aguardando a recepção selecionar um evento");
      }
    }
    
    return true;
  }
  
  bool sendScoreReadingFast(const String& uid) {
    return sendScoreReadingFastInternal(uid, true);
  }
  
  bool sendScoreReadingFastInternal(const String& uid, bool retryLogin) {
    // Verificar autenticação se necessário
    if (!authenticated && !login()) {
      return false;
    }
    
    // Garantir que temos um evento ativo
    if (activeEventId.length() == 0 && !refreshActiveEvent()) {
      return false;
    }
    
    if (activeEventId.length() == 0) {
      Serial.println("⚠️ Score: nenhum evento controlado pela recepção");
      return false;
    }
    
    HTTPClient http;
    WiFiClientSecure secureClient;
    const String url = String(SERVER_BASE_URL) + "/api/score-kiosk/readings";
    
    if (!beginRequest(http, secureClient, url)) {
      return false;
    }
    
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Authorization", "Bearer " + authToken);
    
    StaticJsonDocument<384> request;
    request["eventId"] = activeEventId;
    request["uid"] = uid;
    
    String body;
    serializeJson(request, body);
    
    int httpCode = http.POST(body);
    String responseBody = http.getString();
    http.end();
    
    if (httpCode == 401 && retryLogin) {
      authenticated = false;
      return login() && refreshActiveEvent() && sendScoreReadingFastInternal(uid, false);
    }
    
    if (httpCode != 200) {
      Serial.print("❌ Score: leitura recusada HTTP ");
      Serial.println(httpCode);
      return false;
    }
    
    StaticJsonDocument<512> response;
    if (deserializeJson(response, responseBody)) {
      Serial.println("❌ Score: resposta da leitura inválida");
      return false;
    }
    
    if (!(response["ok"] | false)) {
      Serial.println("❌ Score: backend não confirmou a leitura");
      return false;
    }
    
    Serial.print("✅ Score: UID enviado para o evento ");
    Serial.println(activeEventId);
    return true;
  }
  
  String getActiveEventId() {
    return activeEventId;
  }
  
  bool isAuthenticated() {
    return authenticated;
  }
};

#endif