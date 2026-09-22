// ==================== API_MODULE.H ====================
// Comunicação com Backend

#ifndef API_MODULE_H
#define API_MODULE_H

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
  bool treasureFinished = false;
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
  String gameMode = "idle";
};

class APIModule {
private:
  String endpoint(const char* path) const {
    return String(SERVER_BASE_URL) + path;
  }

  bool beginRequest(HTTPClient& http, WiFiClientSecure& client, const String& url) {
    http.setConnectTimeout(30000);
    http.setTimeout(30000);

    if (url.startsWith("https://")) {
      // O serviço HTTPS usa conexão segura; a instalação LAN usa HTTP local.
      client.setInsecure();
      return http.begin(client, url);
    }

    return http.begin(url);
  }

public:
  // Indica somente a disponibilidade do transporte/API, não o resultado da regra de negócio.
  bool available = false;

  ApiResponse checkMode() {
    ApiResponse response;
    HTTPClient http;
    WiFiClientSecure client;

    String path = "/api/debug/checkpoint-mode?checkpointId=" + String(CHECKPOINT_ID);
    if (!beginRequest(http, client, endpoint(path.c_str()))) {
      available = false;
      response.error = true;
      response.errorMessage = "Falha ao iniciar HTTPS";
      return response;
    }

    int httpCode = http.GET();
    if (httpCode == 200) {
      String resp = http.getString();
      StaticJsonDocument<256> doc;
      DeserializationError parseError = deserializeJson(doc, resp);
      if (parseError) {
        available = false;
        response.error = true;
        response.errorMessage = "Resposta JSON inválida";
        http.end();
        return response;
      }

      available = true;
      response.gameMode = doc["mode"] | "idle";
      response.gameType = doc["gameType"] | "none";
      response.ok = true;
    } else {
      available = false;
      response.error = true;
      response.errorMessage = "HTTP " + String(httpCode);
    }
    http.end();
    return response;
  }

  void sendHeartbeat() {
    HTTPClient http;
    WiFiClientSecure client;
    String path = "/api/checkpoints/" + String(CHECKPOINT_ID) + "/heartbeat";

    if (!beginRequest(http, client, endpoint(path.c_str()))) {
      available = false;
      Serial.println("⚠️ Heartbeat: falha ao iniciar HTTPS");
      return;
    }

    int httpCode = http.POST("");
    if (httpCode == 200) {
      available = true;
      Serial.println("💓 Heartbeat enviado");
    } else {
      available = false;
      Serial.print("⚠️ Heartbeat falhou - HTTP ");
      Serial.println(httpCode);
    }
    http.end();
  }

  ApiResponse getTerritoryStatus() {
    ApiResponse response;
    HTTPClient http;
    WiFiClientSecure client;
    String path = "/api/checkpoints/" + String(CHECKPOINT_ID) + "/territory";

    if (!beginRequest(http, client, endpoint(path.c_str()))) {
      available = false;
      response.error = true;
      response.errorMessage = "Falha ao iniciar HTTPS";
      return response;
    }

    int httpCode = http.GET();
    if (httpCode == 200) {
      String resp = http.getString();
      StaticJsonDocument<512> doc;
      DeserializationError parseError = deserializeJson(doc, resp);
      if (parseError) {
        available = false;
        response.error = true;
        response.errorMessage = "Resposta JSON inválida";
        http.end();
        return response;
      }

      available = true;
      response.ok = true;
      response.gameType = doc["gameType"] | "none";
      response.treasureTarget = doc["treasureTarget"] | false;
      JsonObject owner = doc["ownerTeam"].as<JsonObject>();
      if (!owner.isNull()) {
        response.teamColor = owner["color"] | "";
      }
    } else {
      available = false;
      response.error = true;
      response.errorMessage = "HTTP " + String(httpCode);
    }
    http.end();
    return response;
  }

  ApiResponse sendReading(String uid, String readingId) {
    ApiResponse response;
    HTTPClient http;
    WiFiClientSecure client;

    if (!beginRequest(http, client, endpoint("/api/leituras"))) {
      available = false;
      response.error = true;
      response.errorMessage = "Falha ao iniciar HTTPS";
      return response;
    }
    http.addHeader("Content-Type", "application/json");

    StaticJsonDocument<512> doc;
    doc["checkpointId"] = CHECKPOINT_ID;
    doc["uid"] = uid;
    doc["signal"] = -45;
    doc["readingId"] = readingId;
    doc["brincadeiraId"] = "";

    String body;
    serializeJson(doc, body);

    Serial.println("📤 [API] Enviando leitura NFC");
    Serial.print("   checkpointId: ");
    Serial.println(CHECKPOINT_ID);
    Serial.print("   uid: ");
    Serial.println(uid);
    Serial.print("   readingId: ");
    Serial.println(readingId);
    Serial.print("   payload: ");
    Serial.println(body);

    int httpCode = http.POST(body);
    Serial.print("📡 [API] Código HTTP da leitura: ");
    Serial.println(httpCode);

    if (httpCode == 200) {
      String resp = http.getString();
      Serial.println("📥 [API] Corpo da resposta da leitura:");
      Serial.println(resp);

      StaticJsonDocument<2048> respDoc;
      DeserializationError parseError = deserializeJson(respDoc, resp);
      if (parseError) {
        available = false;
        Serial.print("❌ JSON inválido ou maior que o buffer: ");
        Serial.println(parseError.c_str());
        response.error = true;
        response.errorMessage = "Resposta JSON inválida";
        http.end();
        return response;
      }

      // JSON válido significa que a API respondeu, mesmo se a regra de negócio rejeitar a leitura.
      available = true;
      response.ok = respDoc["ok"] | false;
      response.registered = respDoc["registered"] | false;
      response.treasure = respDoc["treasure"] | false;
      response.treasureAccepted = respDoc["treasureAccepted"] | false;
      response.treasureTeamComplete = respDoc["treasureTeamComplete"] | false;
      response.treasureFinished = respDoc["treasureFinished"] | false;
      response.treasureScanned = respDoc["treasureProgress"]["scanned"] | 0;
      response.treasureTotal = respDoc["treasureProgress"]["total"] | 0;
      response.treasureRound = respDoc["treasureRound"] | 0;
      response.nextTargetCheckpointId = respDoc["nextTargetCheckpointId"] | "";
      response.authorized = respDoc["authorized"] | false;
      response.territoryLocked = respDoc["territoryLocked"] | false;
      response.teamAlreadyOwns = respDoc["teamAlreadyOwns"] | false;
      response.message = respDoc["message"] | "";
      response.teamColor = respDoc["teamColor"] | "";
      response.randomColor = respDoc["randomColor"] | "";
      response.criancaName = respDoc["criancaName"] | "";
      response.points = respDoc["points"] | 0;
      response.remainingSeconds = respDoc["remainingSeconds"] | 0;
      response.turnRemainingSeconds = respDoc["turnRemainingSeconds"] | 0;

      Serial.print("📥 API: ok=");
      Serial.print(response.ok);
      Serial.print(" registered=");
      Serial.println(response.registered);

      if (!respDoc["error"].isNull()) {
        response.error = true;
        response.errorMessage = respDoc["error"].as<String>();
      }
      // No tesouro, uma leitura aceita pode ainda estar incompleta: isso não é erro.
      if (!response.error
          && !response.treasure
          && response.randomColor.length() == 0
          && response.message.length() > 0
          && !response.authorized) {
        response.error = true;
        response.errorMessage = response.message;
      }
    } else {
      available = false;
      String errorBody = http.getString();
      Serial.print("❌ [API] HTTP da leitura: ");
      Serial.println(httpCode);
      Serial.print("❌ [API] Corpo do erro: ");
      Serial.println(errorBody);
      response.error = true;
      response.errorMessage = "HTTP " + String(httpCode);
    }

    http.end();
    return response;
  }
};

#endif
