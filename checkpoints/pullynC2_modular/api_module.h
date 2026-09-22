// API_MODULE_OPTIMIZED
// Versão otimizada para comunicação mais rápida com backend

#ifndef API_MODULE_OPTIMIZED_H
#define API_MODULE_OPTIMIZED_H

#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include "config.h"

struct ApiResponse {
  bool ok = false;
  bool registered = false;
  bool authorized = false;
  bool error = false;
  bool territoryLocked = false;
  bool teamAlreadyOwns = false;
  bool treasure = false;
  bool treasureAccepted = false;
  bool treasureTeamComplete = false;
  bool treasureTarget = false;
  bool monsterActive = false;
  bool monsterSpecialCheckpoint = false;
  bool treasureFinished = false;
  bool monster = false;
  bool monsterAccepted = false;
  bool monsterSpecial = false;
  bool monsterDefeated = false;
  bool alreadyScanned = false;
  int treasureScanned = 0;
  int treasureTotal = 0;
  int treasureRound = 0;
  String nextTargetCheckpointId = "";
  String errorMessage = "";
  String message = "";
  String teamColor = "";
  String randomColor = "";
  String gameType = "none";
  String criancaName = "";
  int points = 0;
  int remainingSeconds = 0;
  int turnRemainingSeconds = 0;
  int monsterHp = 0;
  int monsterMaxHp = 0;
  int monsterDamage = 0;
  String attackType = "";
  String gameMode = "idle";
};

class APIModuleOptimized {
private:
  String endpoint(const char* path) const {
    return String(SERVER_BASE_URL) + path;
  }

  uint8_t consecutiveFailures = 0;
  WiFiClientSecure secureClient;
  HTTPClient http;
  
  // Timeouts otimizados para resposta mais rápida
  const uint16_t CONNECT_TIMEOUT_FAST = 4000;    // 4s para conectar
  const uint16_t RESPONSE_TIMEOUT_FAST = 6000;   // 6s para resposta
  const uint16_t CONNECT_TIMEOUT_SLOW = 8000;    // 8s para conectar (heartbeat)
  const uint16_t RESPONSE_TIMEOUT_SLOW = 10000;  // 10s para resposta (heartbeat)

  void registerFailure(const char* origem) {
    if (consecutiveFailures < 255) consecutiveFailures++;

    if (consecutiveFailures >= API_FAILURE_TOLERANCE) {
      if (available) {
        Serial.print("⚠️ API indisponível após falhas consecutivas em ");
        Serial.println(origem);
      }
      available = false;
    } else {
      Serial.print("↩️ Falha de rede tolerada (");
      Serial.print(consecutiveFailures);
      Serial.print("/");
      Serial.print(API_FAILURE_TOLERANCE);
      Serial.print(") em ");
      Serial.println(origem);
    }
  }

  void registerSuccess() {
    consecutiveFailures = 0;
    available = true;
  }

  bool beginRequestFast(const String& url) {
    secureClient.setTimeout(1000); // Timeout de socket reduzido
    secureClient.setInsecure();    // HTTPS sem verificação (mais rápido)
    
    http.setReuse(true);           // Reutilizar conexão
    http.setConnectTimeout(CONNECT_TIMEOUT_FAST);
    http.setTimeout(RESPONSE_TIMEOUT_FAST);
    
    return http.begin(secureClient, url);
  }

  bool beginRequestSlow(const String& url) {
    secureClient.setTimeout(2000);
    secureClient.setInsecure();
    
    http.setReuse(true);
    http.setConnectTimeout(CONNECT_TIMEOUT_SLOW);
    http.setTimeout(RESPONSE_TIMEOUT_SLOW);
    
    return http.begin(secureClient, url);
  }

public:
  bool available = false;

  // Check mode rápido - para uso durante leitura
  ApiResponse checkModeFast() {
    ApiResponse response;
    
    String path = "/api/debug/checkpoint-mode?checkpointId=" + String(CHECKPOINT_ID);
    if (!beginRequestFast(endpoint(path.c_str()))) {
      registerFailure("checkModeFast/begin");
      response.error = true;
      return response;
    }

    int httpCode = http.GET();
    if (httpCode == 200) {
      String resp = http.getString();
      StaticJsonDocument<128> doc; // Documento menor para resposta rápida
      DeserializationError parseError = deserializeJson(doc, resp);
      
      if (!parseError) {
        registerSuccess();
        response.gameMode = doc["mode"] | "idle";
        response.gameType = doc["gameType"] | "none";
        response.ok = true;
      } else {
        registerFailure("checkModeFast/json");
      }
    } else {
      registerFailure("checkModeFast/http");
    }
    
    http.end();
    return response;
  }

  // Heartbeat normal (pode ser mais lento)
  bool sendHeartbeat() {
    String path = "/api/checkpoints/" + String(CHECKPOINT_ID) + "/heartbeat";

    if (!beginRequestSlow(endpoint(path.c_str()))) {
      registerFailure("heartbeat/begin");
      return false;
    }

    int httpCode = http.POST("");
    if (httpCode == 200) {
      registerSuccess();
      http.end();
      return true;
    }

    registerFailure("heartbeat/http");
    http.end();
    return false;
  }

  // Status de território otimizado
  ApiResponse getTerritoryStatusFast() {
    ApiResponse response;
    
    String path = "/api/checkpoints/" + String(CHECKPOINT_ID) + "/territory";
    if (!beginRequestFast(endpoint(path.c_str()))) {
      registerFailure("territory/begin");
      return response;
    }

    int httpCode = http.GET();
    if (httpCode == 200) {
      String resp = http.getString();
      StaticJsonDocument<512> doc; // Buffer reduzido
      DeserializationError parseError = deserializeJson(doc, resp);
      
      if (!parseError) {
        registerSuccess();
        response.ok = true;
        response.gameType = doc["gameType"] | "none";
        response.treasureTarget = doc["treasureTarget"] | false;
        response.monsterActive = doc["monsterActive"] | false;
        
        JsonObject owner = doc["ownerTeam"].as<JsonObject>();
        if (!owner.isNull()) {
          response.teamColor = owner["color"] | "";
        }
      } else {
        registerFailure("territory/json");
      }
    } else {
      registerFailure("territory/http");
    }
    
    http.end();
    return response;
  }

  // Envio de leitura ULTRA rápido
  ApiResponse sendReadingFast(String uid, String readingId) {
    ApiResponse response;
    
    if (!beginRequestFast(endpoint("/api/leituras"))) {
      registerFailure("leitura/begin");
      response.error = true;
      return response;
    }
    
    http.addHeader("Content-Type", "application/json");
    
    // JSON mínimo para reduzir tamanho do payload
    String body = "{\"checkpointId\":\"" + String(CHECKPOINT_ID) + 
                  "\",\"uid\":\"" + uid + 
                  "\",\"signal\":-45,\"readingId\":\"" + readingId + 
                  "\",\"brincadeiraId\":\"\"}";

    unsigned long startTime = millis();
    int httpCode = http.POST(body);
    unsigned long endTime = millis();
    
    Serial.print("⚡ Leitura enviada em ");
    Serial.print(endTime - startTime);
    Serial.println("ms");

    if (httpCode == 200) {
      String resp = http.getString();
      
      // Buffer otimizado - apenas campos necessários
      StaticJsonDocument<1024> respDoc;
      DeserializationError parseError = deserializeJson(respDoc, resp);
      
      if (!parseError) {
        registerSuccess();
        response.ok = respDoc["ok"] | false;
        response.registered = respDoc["registered"] | false;
        response.treasure = respDoc["treasure"] | false;
        response.treasureAccepted = respDoc["treasureAccepted"] | false;
        response.treasureTeamComplete = respDoc["treasureTeamComplete"] | false;
        response.monster = respDoc["monster"] | false;
        response.monsterAccepted = respDoc["monsterAccepted"] | false;
        response.attackType = respDoc["attackType"] | "";
        response.monsterSpecial = response.attackType == "special_attack";
        response.monsterDefeated = respDoc["monsterDefeated"] | false;
        response.alreadyScanned = respDoc["alreadyScanned"] | false;
        response.monsterHp = respDoc["monsterHp"] | 0;
        response.monsterDamage = respDoc["damage"] | 0;
        response.treasureScanned = respDoc["treasureProgress"]["scanned"] | 0;
        response.treasureTotal = respDoc["treasureProgress"]["total"] | 0;
        response.authorized = respDoc["authorized"] | false;
        response.message = respDoc["message"] | "";
        response.teamColor = respDoc["teamColor"] | "";
        response.randomColor = respDoc["randomColor"] | "";
        response.criancaName = respDoc["criancaName"] | "";
        response.points = respDoc["points"] | 0;
        response.remainingSeconds = respDoc["remainingSeconds"] | 0;

        if (!respDoc["error"].isNull()) {
          response.error = true;
          response.errorMessage = respDoc["error"].as<String>();
        }
      } else {
        registerFailure("leitura/json");
      }
    } else {
      registerFailure("leitura/http");
      response.error = true;
    }
    
    http.end();
    return response;
  }
  
  // Liberar recursos
  void cleanup() {
    http.end();
  }
};

#endif