// PULYN - LEITOR EXCLUSIVO DA RECEPÇÃO
// Lê pulseiras e envia somente o evento NFC para a tela de recepção.
// Não processa pontuação, territórios ou Caça ao Tesouro.

#include <SPI.h>
#include <MFRC522.h>
#include <Adafruit_NeoPixel.h> 
#include <DFRobotDFPlayerMini.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>

#define RST_PIN 4
#define SS_PIN 5
#define LED_PIN 21
#define NUM_LEDS 7
#define DFPLAYER_TX 32
#define DFPLAYER_RX 33

const char* WIFI_SSID = "Adv-wifi-Backup";
const char* WIFI_PASSWORD = "advwifibkp";
// 0 = Render/online, 1 = servidor local na mesma rede Wi-Fi.
#define PULYN_LAN_MODE 0    
#define PULYN_LAN_SERVER "http://192.168.0.60:3001"
#if PULYN_LAN_MODE
const char* SERVER_BASE_URL = PULYN_LAN_SERVER;
#else
const char* SERVER_BASE_URL = "https://backendpulyn.onrender.com";
#endif

// Deve ser um checkpoint existente associado ao evento selecionado na recepção.
const char* RECEPTION_CHECKPOINT_ID = "1";

const unsigned long RFID_COOLDOWN = 500;

MFRC522 mfrc522(SS_PIN, RST_PIN);
Adafruit_NeoPixel pixels(NUM_LEDS, LED_PIN, NEO_GRB + NEO_KHZ800);
HardwareSerial dfSerial(2);
DFRobotDFPlayerMini dfPlayer;
bool soundReady = false;

#define LED_GREEN 0x00FF00
#define LED_RED 0xFF0000
#define LED_OFF 0x000000
#define SOUND_SUCCESS 1
#define SOUND_ERROR 3

void setColor(uint32_t color) {
  for (int i = 0; i < NUM_LEDS; i++) pixels.setPixelColor(i, color);
  pixels.show();
}

void blinkColor(uint32_t color, uint8_t times, uint16_t waitMs) {
  for (uint8_t i = 0; i < times; i++) {
    setColor(color);
    delay(waitMs);
    setColor(LED_OFF);
    delay(waitMs);
  }
}

String getUid() {
  String uid;
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(mfrc522.uid.uidByte[i], HEX);
  }
  uid.toUpperCase();
  return uid;
}

bool sendReceptionReading(const String& uid) {
  HTTPClient http;
  WiFiClientSecure secureClient;
  const String url = String(SERVER_BASE_URL) + "/api/leituras/reception";
  bool started = false;

  if (url.startsWith("https://")) {
    secureClient.setInsecure();
    started = http.begin(secureClient, url);
  } else {
    started = http.begin(url);
  }

  if (!started) {
    Serial.println("❌ Não foi possível iniciar a API de recepção");
    return false;
  }

  http.setConnectTimeout(30000);
  http.setTimeout(30000);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<256> request;
  request["checkpointId"] = RECEPTION_CHECKPOINT_ID;
  request["uid"] = uid;

  String body;
  serializeJson(request, body);
  Serial.print("📤 Recepção enviando UID: ");
  Serial.println(uid);

  const int httpCode = http.POST(body);
  const String responseBody = http.getString();

  Serial.print("📥 API de recepção HTTP ");
  Serial.println(httpCode);

  if (httpCode != 200) {
    Serial.print("❌ Corpo da resposta: ");
    Serial.println(responseBody);
    http.end();
    return false;
  }

  StaticJsonDocument<512> response;
  const DeserializationError parseError = deserializeJson(response, responseBody);
  http.end();
  if (parseError) {
    Serial.print("❌ JSON inválido: ");
    Serial.println(parseError.c_str());
    Serial.print("❌ Corpo da resposta: ");
    Serial.println(responseBody);
    return false;
  }

  if (!(response["ok"] | false)) {
    Serial.print("❌ API recusou a leitura: ");
    Serial.println(responseBody);
    return false;
  }

  Serial.print("✅ Pulseira transmitida. Cadastrada: ");
  Serial.println(response["registered"] | false);
  return true;
}

void setup() {
  Serial.begin(115200);
  delay(500);

  pixels.begin();
  setColor(LED_OFF);

  SPI.begin(18, 19, 23, SS_PIN);
  mfrc522.PCD_Init();
  delay(4);
  mfrc522.PCD_SetAntennaGain(MFRC522::RxGain_max);
  Serial.println("✅ Leitor RFID da recepção iniciado");

  dfSerial.begin(9600, SERIAL_8N1, DFPLAYER_TX, DFPLAYER_RX);
  delay(1000);
  if (dfPlayer.begin(dfSerial, false, false)) {
    dfPlayer.volume(30);
    soundReady = true;
    Serial.println("✅ DFPlayer da recepção iniciado");
    dfPlayer.play(SOUND_SUCCESS);
  } else {
    Serial.println("⚠️ DFPlayer não inicializado");
  }

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("📶 Conectando ao WiFi");
  for (uint8_t attempt = 0; WiFi.status() != WL_CONNECTED && attempt < 30; attempt++) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();
  Serial.println(WiFi.status() == WL_CONNECTED ? "✅ WiFi conectado" : "❌ WiFi desconectado");
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    setColor(LED_RED);
    delay(100);
    setColor(LED_OFF);
    delay(900);
    return;
  }

  if (!mfrc522.PICC_IsNewCardPresent() || !mfrc522.PICC_ReadCardSerial()) {
    return;
  }

  const String uid = getUid();
  Serial.print("📇 Pulseira detectada na recepção: ");
  Serial.println(uid);

  if (sendReceptionReading(uid)) {
    blinkColor(LED_GREEN, 2, 100);
    if (soundReady) dfPlayer.play(SOUND_SUCCESS);
  } else {
    blinkColor(LED_RED, 2, 100);
    if (soundReady) dfPlayer.play(SOUND_ERROR);
  }

  mfrc522.PICC_HaltA();
  delay(RFID_COOLDOWN);
}
