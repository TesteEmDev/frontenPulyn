// ==================== API_MODULE_RECEPTION.H ====================
// API otimizada para recepção Pulyn

#ifndef API_MODULE_RECEPTION_H
#define API_MODULE_RECEPTION_H

#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>
#include "config_reception.h"

class APIModuleReception {
private:
  uint8_t consecutiveFailures = 0;
  WiFiClientSecure secureClient;
  HTTPClient http;
  
  // Timeouts otimizados para resposta mais rápida
  const uint16_t CONNECT_TIMEOUT_FAST = 4000;    // 4s para conectar
  const uint16_t RESPONSE_TIMEOUT_FAST = 6000;   // 6s para resposta
  const uint16_t CONNECT_TIMEOUT_SLOW = 8000;    // 8s para conectar
  const uint16_t RESPONSE_TIMEOUT_SLOW = 10000;  // 10s para resposta

  void registerFailure(const char* origem) {
    if (consecutiveFailures < 255) consecutiveFailures++;

    if (consecutiveFailures >= API_FAILURE_TOLERANCE) {
      if (available) {
        Serial.print("⚠️ Recepção API indisponível após falhas em ");
        Serial.println(origem);
      }
      available = false;
    } else {
      Serial.print("↩️ Recepção: Falha de rede tolerada (");
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

  String endpoint(const char* path) const {
    return String(SERVER_BASE_URL) + path;
  }

public:
  bool available = false;

  // Envio de leitura ULTRA rápido para recepção
  bool sendReceptionReadingFast(String uid) {
    if (!beginRequestFast(endpoint("/api/leituras/reception"))) {
      registerFailure("reception/begin");
      return false;
    }
    
    http.addHeader("Content-Type", "application/json");
    
    // JSON mínimo para reduzir tamanho do payload
    String body = "{\"checkpointId\":\"" + String(RECEPTION_CHECKPOINT_ID) + 
                  "\",\"uid\":\"" + uid + "\"}";

    unsigned long startTime = millis();
    int httpCode = http.POST(body);
    unsigned long endTime = millis();
    
    Serial.print("⚡ Recepção enviada em ");
    Serial.print(endTime - startTime);
    Serial.println("ms");

    if (httpCode == 200) {
      String resp = http.getString();
      
      // Buffer com folga: a resposta da recepção é pequena, mas 256 ficava no limite
      // (o JSON copia as strings) e uma mensagem maior viraria "erro" mesmo com sucesso.
      StaticJsonDocument<384> respDoc;
      DeserializationError parseError = deserializeJson(respDoc, resp);
      
      if (!parseError) {
        registerSuccess();
        bool ok = respDoc["ok"] | false;
        bool registered = respDoc["registered"] | false;
        
        Serial.print("✅ Recepção: ");
        Serial.print(ok ? "OK" : "Erro");
        Serial.print(" - Cadastrada: ");
        Serial.println(registered ? "SIM" : "NÃO");

        // Igual ao checkpoint de jogo: encerra a requisição sempre, mantendo a
        // conexão aberta para a próxima leitura (setReuse).
        http.end();
        return ok;
      } else {
        registerFailure("reception/json");
      }
    } else {
      registerFailure("reception/http");
    }
    
    http.end();
    return false;
  }
  
  // Liberar recursos
  void cleanup() {
    http.end();
  }
};

#endif