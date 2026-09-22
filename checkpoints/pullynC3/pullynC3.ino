#include <SPI.h>
#include <MFRC522.h>
#include <Adafruit_NeoPixel.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ==================== CONFIGURAÇÃO ====================
#define RST_PIN 4
#define SS_PIN  5
#define LED_PIN 21
#define NUM_LEDS 7

const char* WIFI_SSID = "Adv-wifi-Backup";
const char* WIFI_PASSWORD = "advwifibkp";
const char* CHECKPOINT_ID = "3";  // 🔧 MUDE ISSO
const char* SERVER_IP = "192.168.0.60";
const int SERVER_PORT = 3001;

// ==================== OBJETOS ====================
MFRC522 mfrc522(SS_PIN, RST_PIN);
Adafruit_NeoPixel pixels(NUM_LEDS, LED_PIN, NEO_GRB + NEO_KHZ800);

// ==================== CORES ====================
#define COR_VERDE   0x00FF00
#define COR_VERMELHO 0xFF0000
#define COR_AZUL    0x0000FF
#define COR_AMARELO 0xFFFF00
#define COR_OFF     0x000000

// ==================== SETUP ====================
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n=== PULYN CHECKPOINT ===");
  Serial.print("ID: ");
  Serial.println(CHECKPOINT_ID);
  
  // Inicializar RFID
  SPI.begin(18, 19, 23, 5);
  mfrc522.PCD_Init();
  Serial.println("✅ RFID iniciado");
  
  // Inicializar LEDs
  pixels.begin();
  setColor(COR_OFF);
  Serial.println("✅ LEDs iniciado");
  
  // Conectar WiFi
  connectWiFi();
}

// ==================== CONECTAR WiFi ====================
void connectWiFi() {
  Serial.print("📶 Conectando WiFi: ");
  Serial.println(WIFI_SSID);
  
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  int tentativas = 0;
  while (WiFi.status() != WL_CONNECTED && tentativas < 30) {
    delay(500);
    Serial.print(".");
    tentativas++;
  }
  Serial.println();
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("✅ WiFi OK - IP: ");
    Serial.println(WiFi.localIP());
    setColor(COR_VERDE);
    delay(1000);
    setColor(COR_OFF);
  } else {
    Serial.println("❌ WiFi ERRO - Reiniciando...");
    delay(5000);
    ESP.restart();
  }
}

// ==================== CONTROLAR LEDs ====================
void setColor(uint32_t color) {
  for (int i = 0; i < NUM_LEDS; i++) {
    pixels.setPixelColor(i, color);
  }
  pixels.show();
}

// ==================== LER UID ====================
String getLedUID() {
  String uid = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(mfrc522.uid.uidByte[i], HEX);
  }
  // Converter para maiúsculas manualmente
  for (int i = 0; i < uid.length(); i++) {
    uid[i] = toupper(uid[i]);
  }
  return uid;
}

// ==================== ENVIAR LEITURA ====================
void enviarLeitura(String uid) {
  Serial.print("📤 Enviando: ");
  Serial.println(uid);
  Serial.print("   Tamanho: ");
  Serial.print(uid.length());
  Serial.println(" chars");
  
  HTTPClient http;
  String url = "http://" + String(SERVER_IP) + ":" + String(SERVER_PORT) + "/api/leituras";
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  
  // Criar JSON
  StaticJsonDocument<256> doc;
  doc["checkpointId"] = CHECKPOINT_ID;
  doc["uid"] = uid;
  doc["signal"] = -45;
  
  String jsonString;
  serializeJson(doc, jsonString);
  
  Serial.print("   JSON enviado: ");
  Serial.println(jsonString);
  
  // Enviar
  int httpCode = http.POST(jsonString);
  
  if (httpCode == 200) {
    String response = http.getString();
    
    Serial.print("   Response HTTP 200: ");
    Serial.println(response);
    
    StaticJsonDocument<512> responseDoc;
    deserializeJson(responseDoc, response);
    
    // Verificar resposta
    if (responseDoc["ok"]) {
      bool authorized = responseDoc["authorized"] | false;
      bool registered = responseDoc["registered"] | false;
      
      Serial.print("   ok: ");
      Serial.print(responseDoc["ok"]);
      Serial.print(" | registered: ");
      Serial.print(registered);
      Serial.print(" | authorized: ");
      Serial.println(authorized);
      
      if (authorized) {
        // ✅ SUCESSO - Conquistou território
        setColor(COR_VERDE);
        delay(500);
        
        String teamColor = responseDoc["teamColor"] | "";
        int points = responseDoc["points"] | 0;
        String name = responseDoc["criancaName"] | "?";
        
        Serial.print("🎉 ");
        Serial.print(name);
        Serial.print(" ganhou +");
        Serial.print(points);
        Serial.print("pt - Cor: ");
        Serial.println(teamColor);
        
        // Exibir cor do time por 3 segundos
        if (teamColor.length() > 0) {
          teamColor.replace("#", "");
          uint32_t color = strtoul(teamColor.c_str(), nullptr, 16);
          setColor(color);
          delay(3000);
        } else {
          delay(3000);
        }
        
        setColor(COR_OFF);
      } else {
        // ⚠️ NÃO AUTORIZADO ou ERRO
        String message = responseDoc["message"] | "Bloqueado";
        
        Serial.print("⚠️ ");
        Serial.println(message);
        
        setColor(COR_VERMELHO);
        delay(2000);
        setColor(COR_OFF);
      }
    } else {
      // ❌ ERRO NA API
      Serial.println("❌ Erro na API (ok=false)");
      String error = responseDoc["error"] | "Desconhecido";
      Serial.print("   Error: ");
      Serial.println(error);
      
      setColor(COR_VERMELHO);
      delay(1000);
      setColor(COR_OFF);
    }
  } else {
    // ❌ ERRO HTTP
    Serial.print("❌ HTTP ");
    Serial.println(httpCode);
    setColor(COR_VERMELHO);
    delay(1000);
    setColor(COR_OFF);
  }
  
  http.end();
}

// ==================== LOOP PRINCIPAL ====================
void loop() {
  // Verificar WiFi
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ WiFi desconectado");
    setColor(COR_AMARELO);
    connectWiFi();
  }
  
  // Aguardar pulseira
  if (!mfrc522.PICC_IsNewCardPresent()) {
    return;
  }
  
  if (!mfrc522.PICC_ReadCardSerial()) {
    return;
  }
  
  // Ler UID
  String uid = getLedUID();
  Serial.print("\n📇 TAG: ");
  Serial.println(uid);
  
  // Enviar para backend
  enviarLeitura(uid);
  
  // Preparar para próxima leitura
  mfrc522.PICC_HaltA();
  delay(500);
}
