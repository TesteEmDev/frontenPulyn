#include <SPI.h>
#include <MFRC522.h>
#include <Adafruit_NeoPixel.h>
#include <DFRobotDFPlayerMini.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ==================== PINAGEM ====================
#define RST_PIN 4
#define SS_PIN  5
#define LED_PIN 21
#define NUM_LEDS 7
#define DFPLAYER_TX 32
#define DFPLAYER_RX 33

// ==================== CONFIGURAÇÕES ====================
const char* WIFI_SSID     = "Adv-wifi-Backup";
const char* WIFI_PASSWORD = "advwifibkp";
const char* CHECKPOINT_ID = "1";
const char* SERVER_IP     = "192.168.0.60";
const int   SERVER_PORT   = 3001;
const int   CONFIG_INTERVAL = 30000;

// ==================== OBJETOS ====================
MFRC522 mfrc522(SS_PIN, RST_PIN);
Adafruit_NeoPixel pixels(NUM_LEDS, LED_PIN, NEO_GRB + NEO_KHZ800);
HardwareSerial mySoftwareSerial(2);
DFRobotDFPlayerMini myDFPlayer;

// ==================== VARIÁVEIS GLOBAIS ====================
String authorizedTags[50];
int authorizedCount = 0;
uint32_t defaultLedColor = 0x00FF00;
int defaultSoundOk = 2;
int defaultSoundFail = 1;
unsigned long lastConfigFetch = 0;
bool wifiConnected = false;

// Variáveis para controle de território
bool territoryLocked = false;
unsigned long territoryUnlockTime = 0;
String currentOwnerColor = "";

// ==================== FUNÇÃO PARA CONTROLAR LED ====================
void setColor(uint32_t color) {
  for (int i = 0; i < NUM_LEDS; i++) {
    pixels.setPixelColor(i, color);
  }
  pixels.show();
  Serial.print("🎨 LED definido para cor: #");
  Serial.println(color, HEX);
}

// ==================== FUNÇÃO PARA APAGAR LED ====================
void clearLED() {
  pixels.clear();
  pixels.show();
  Serial.println("💡 LED apagado!");
}

// ==================== FUNÇÃO PARA BUSCAR CONFIGURAÇÃO ====================
void fetchConfig() {
  if (!wifiConnected) {
    Serial.println("⚠️ WiFi desconectado, não é possível buscar config");
    return;
  }

  HTTPClient http;
  String url = "http://" + String(SERVER_IP) + ":" + String(SERVER_PORT) +
               "/api/checkpoints/" + String(CHECKPOINT_ID) + "/config";
  
  Serial.print("📡 Buscando config em: ");
  Serial.println(url);
  
  http.begin(url);
  int code = http.GET();
  
  if (code == 200) {
    String payload = http.getString();
    Serial.println("✅ Config recebida do servidor!");
    
    StaticJsonDocument<2048> doc;
    DeserializationError error = deserializeJson(doc, payload);
    
    if (!error) {
      authorizedCount = 0;
      JsonArray tags = doc["authorizedTags"].as<JsonArray>();
      for (JsonVariant tag : tags) {
        if (authorizedCount < 50) {
          authorizedTags[authorizedCount++] = tag.as<String>();
        }
      }
      
      String color = doc["ledColor"] | "#00FF00";
      color.replace("#", "");
      defaultLedColor = strtoul(color.c_str(), nullptr, 16);
      
      Serial.print("📋 Tags autorizadas carregadas: ");
      Serial.println(authorizedCount);
      for (int i = 0; i < authorizedCount; i++) {
        Serial.print("   - ");
        Serial.println(authorizedTags[i]);
      }
    }
  } else if (code == 404) {
    Serial.println("⚠️ Checkpoint não cadastrado no servidor ainda!");
  } else {
    Serial.print("❌ Erro ao buscar config: HTTP ");
    Serial.println(code);
  }
  http.end();
}

// ==================== FUNÇÃO PARA VERIFICAR STATUS DO TERRITÓRIO ====================
void checkTerritoryStatus() {
  if (!wifiConnected) return;
  
  HTTPClient http;
  String url = "http://" + String(SERVER_IP) + ":" + String(SERVER_PORT) +
               "/api/checkpoints/" + String(CHECKPOINT_ID) + "/status";
  http.begin(url);
  
  int code = http.GET();
  if (code == 200) {
    String payload = http.getString();
    StaticJsonDocument<256> doc;
    deserializeJson(doc, payload);
    
    bool wasLocked = territoryLocked;
    territoryLocked = doc["isLocked"] | false;
    
    if (territoryLocked) {
      String color = doc["ownerColor"] | "";
      if (color.length() > 0 && color != "null") {
        color.replace("#", "");
        uint32_t rgbColor = strtoul(color.c_str(), nullptr, 16);
        
        // Só atualiza a cor se mudou ou se o LED está apagado
        if (currentOwnerColor != color) {
          currentOwnerColor = color;
          setColor(rgbColor);
          Serial.print("🔒 Território ocupado! LED na cor: #");
          Serial.println(color);
        }
      }
    } else {
      // Território livre - APAGA O LED
      if (wasLocked || currentOwnerColor != "") {
        currentOwnerColor = "";
        clearLED();
        Serial.println("🔓 Território livre! LED apagado.");
      }
    }
  }
  http.end();
}

// ==================== FUNÇÃO PARA ENVIAR LEITURA ====================
void enviarLeitura(String uid, bool autorizada) {
  if (!wifiConnected) {
    Serial.println("⚠️ WiFi desconectado, leitura não enviada");
    return;
  }

  HTTPClient http;
  String url = "http://" + String(SERVER_IP) + ":" + String(SERVER_PORT) + "/api/readings";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<512> doc;
  doc["checkpointId"] = CHECKPOINT_ID;
  doc["uid"] = uid;
  doc["authorized"] = autorizada;
  doc["signal"] = -45;
  doc["timestamp"] = millis();

  String body;
  serializeJson(doc, body);
  
  Serial.print("📤 Enviando leitura para API...");
  int httpCode = http.POST(body);
  
  if (httpCode == 200) {
    String response = http.getString();
    Serial.println(" ✅");
    Serial.print("📥 Resposta: ");
    Serial.println(response);
    
    StaticJsonDocument<512> responseDoc;
    deserializeJson(responseDoc, response);
    
    if (responseDoc["authorized"] == true) {
      // Verificar se houve erro (território ocupado ou cooldown)
      if (responseDoc["error"] && responseDoc["error"] != "") {
        Serial.print("❌ ");
        Serial.println(responseDoc["error"].as<String>());
        
        if (responseDoc["remainingSeconds"]) {
          Serial.print("⏳ Aguarde ");
          Serial.print(responseDoc["remainingSeconds"].as<int>());
          Serial.println(" segundos!");
        }
        
        // Piscar LED vermelho para indicar erro
        setColor(0xFF0000);
        delay(2000);
        clearLED();
        return;
      }
      
      // Conquista bem sucedida!
      String teamColor = responseDoc["teamColor"] | "";
      String childName = responseDoc["childName"] | "";
      int points = responseDoc["points"] | 0;
      int lockDuration = responseDoc["lockDurationSeconds"] | 15;
      
      if (teamColor.length() > 0) {
        teamColor.replace("#", "");
        uint32_t color = strtoul(teamColor.c_str(), nullptr, 16);
        setColor(color);
        currentOwnerColor = teamColor;
        
        Serial.println("🎉 TERRITÓRIO CONQUISTADO!");
        Serial.print("🎨 Cor do time: #");
        Serial.println(teamColor);
        Serial.print("👤 Criança: ");
        Serial.println(childName);
        Serial.print("📊 Pontos: +");
        Serial.println(points);
        Serial.print("⏱️ Território bloqueado por ");
        Serial.print(lockDuration);
        Serial.println(" segundos!");
        
        // Manter LED ligado pelo tempo determinado
        Serial.print("⏰ Aguardando ");
        Serial.print(lockDuration);
        Serial.println(" segundos para liberar o território...");
        delay(lockDuration * 1000);
        
        // APAGA O LED APÓS O LOCK
        clearLED();
        Serial.println("✅ Território liberado! Pronto para nova conquista.");
        
        // Verificar status atualizado do território
        checkTerritoryStatus();
      }
    } else {
      Serial.println("❌ Falha na conquista!");
    }
  } else {
    Serial.print(" ❌ HTTP ");
    Serial.println(httpCode);
  }
  http.end();
}

// ==================== FUNÇÃO PARA VERIFICAR TAG ====================
bool verificarTag(String uid) {
  for (int i = 0; i < authorizedCount; i++) {
    if (authorizedTags[i] == uid) {
      return true;
    }
  }
  return false;
}

// ==================== FUNÇÃO PARA LER UID DA TAG ====================
String lerUID() {
  String uid = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(mfrc522.uid.uidByte[i], HEX);
    if (i < mfrc522.uid.size - 1) uid += ":";
  }
  uid.toUpperCase();
  return uid;
}

// ==================== SETUP ====================
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n==========================================");
  Serial.println("     SISTEMA DE CHECKPOINT PULYN");
  Serial.println("          MODO CONQUISTA");
  Serial.println("==========================================\n");

  Serial.println("📡 Inicializando RFID...");
  SPI.begin(18, 19, 23, 5);
  mfrc522.PCD_Init();
  Serial.println("   ✅ RFID OK");

  Serial.println("💡 Inicializando LEDs...");
  pixels.begin();
  clearLED();
  Serial.println("   ✅ LEDs OK");

  Serial.println("🔊 Inicializando DFPlayer...");
  mySoftwareSerial.begin(9600, SERIAL_8N1, DFPLAYER_TX, DFPLAYER_RX);
  if (!myDFPlayer.begin(mySoftwareSerial, false, false)) {
    Serial.println("   ⚠️ Erro no DFPlayer (verifique cartão SD)");
  } else {
    myDFPlayer.volume(30);  // 🔊 Volume máximo (0-30, sendo 30 = máximo)
    Serial.println("   ✅ DFPlayer OK");
  }

  Serial.print("📶 Conectando ao WiFi: ");
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
    wifiConnected = true;
    Serial.print("   ✅ WiFi CONECTADO! IP: ");
    Serial.println(WiFi.localIP());
  } else {
    wifiConnected = false;
    Serial.println("   ❌ ERRO: Não foi possível conectar ao WiFi!");
  }

  if (wifiConnected) {
    Serial.println("\n📥 Buscando configuração do servidor...");
    fetchConfig();
    Serial.println("\n📥 Verificando status do território...");
    checkTerritoryStatus();
  }
  
  Serial.println("\n==========================================");
  Serial.println("     SISTEMA PRONTO PARA USAR!");
  Serial.println("==========================================");
  Serial.println("Aproxime uma pulseira do leitor...\n");
}

// ==================== LOOP PRINCIPAL ====================
void loop() {
  // Verifica conexão WiFi periodicamente
  if (WiFi.status() != WL_CONNECTED) {
    if (wifiConnected) {
      wifiConnected = false;
      Serial.println("⚠️ WiFi desconectado!");
    }
  } else {
    if (!wifiConnected) {
      wifiConnected = true;
      Serial.println("✅ WiFi reconectado!");
      fetchConfig();
      checkTerritoryStatus();
    }
  }
  
  // Atualiza configuração periodicamente
  if (wifiConnected && (millis() - lastConfigFetch > CONFIG_INTERVAL)) {
    Serial.println("\n🔄 Atualizando configuração...");
    fetchConfig();
    lastConfigFetch = millis();
  }
  
  // Verificar status do território a cada 2 segundos
  static unsigned long lastStatusCheck = 0;
  if (wifiConnected && (millis() - lastStatusCheck > 2000)) {
    checkTerritoryStatus();
    lastStatusCheck = millis();
  }

  // Verifica se tem nova tag presente
  if (!mfrc522.PICC_IsNewCardPresent()) {
    return;
  }
  
  if (!mfrc522.PICC_ReadCardSerial()) {
    return;
  }

  // Lê o UID da tag
  String uid = lerUID();
  Serial.print("\n📇 TAG detectada! UID: ");
  Serial.println(uid);
  
  // Verifica se a tag é autorizada
  bool autorizada = verificarTag(uid);
  
  if (!autorizada) {
    Serial.println("❌ TAG NÃO AUTORIZADA!");
    myDFPlayer.play(defaultSoundFail);
    setColor(0xFF0000);
    delay(3000);
    clearLED();
    mfrc522.PICC_HaltA();
    return;
  }
  
  Serial.println("✅ TAG AUTORIZADA!");
  myDFPlayer.play(defaultSoundOk);
  
  // Envia leitura para o servidor
  enviarLeitura(uid, autorizada);
  
  // Prepara para próxima leitura
  mfrc522.PICC_HaltA();
}