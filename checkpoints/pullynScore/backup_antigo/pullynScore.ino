// PULYN - LEITOR EXCLUSIVO DO TOTEM DE PONTUAÇÃO
// Este ESP32 somente lê a pulseira e envia o UID para a tela Score Kiosk.
// Não cadastra criança, não pontua e não processa territórios.
//
// Fluxo:
// 1. Faz login com um usuário role score_kiosk.
// 2. Consulta o evento selecionado pela recepção.
// 3. Lê o UID no RC522.
// 4. Envia a leitura pelo canal /api/score-kiosk/readings.
// 5. A tela /score-kiosk consulta e exibe a pontuação.

#include <SPI.h>
#include <MFRC522.h>
#include <Adafruit_NeoPixel.h>
#include <DFRobotDFPlayerMini.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoJson.h>

// ==================== PINAGEM ====================
#define RST_PIN 4
#define SS_PIN 5
#define LED_PIN 21
#define NUM_LEDS 7
#define DFPLAYER_TX 32
#define DFPLAYER_RX 33

// ==================== CONFIGURAÇÃO ====================
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

// Crie um usuário com perfil score_kiosk no painel e informe os dados aqui.
const char* SCORE_KIOSK_EMAIL = "pontuacao@gmail.com";
const char* SCORE_KIOSK_PASSWORD = "123456";

const unsigned long EVENT_REFRESH_INTERVAL = 5000;
const unsigned long RFID_REPEAT_GUARD = 3000;
const unsigned long WIFI_RETRY_INTERVAL = 10000;

#define LED_GREEN 0x00FF00
#define LED_RED 0xFF0000
#define LED_YELLOW 0xFFFF00
#define LED_BLUE 0x0044FF
#define LED_OFF 0x000000
#define SOUND_SUCCESS 1
#define SOUND_ERROR 3

MFRC522 mfrc522(SS_PIN, RST_PIN);
Adafruit_NeoPixel pixels(NUM_LEDS, LED_PIN, NEO_GRB + NEO_KHZ800);
HardwareSerial dfSerial(2);
DFRobotDFPlayerMini dfPlayer;

String authToken;
String activeEventId;
String lastUid;
unsigned long lastEventRefresh = 0;
unsigned long lastUidAt = 0;
unsigned long lastWifiRetry = 0;
bool soundReady = false;

bool beginRequest(HTTPClient& http, WiFiClientSecure& secureClient, const String& url) {
  http.setConnectTimeout(30000);
  http.setTimeout(30000);

  if (url.startsWith("https://")) {
    // Substitua por certificado fixado antes de distribuir em produção.
    secureClient.setInsecure();
    return http.begin(secureClient, url);
  }
  return http.begin(url);
}

void setColor(uint32_t color) {
  for (uint8_t index = 0; index < NUM_LEDS; index++) {
    pixels.setPixelColor(index, color);
  }
  pixels.show();
}

void blinkColor(uint32_t color, uint8_t times, uint16_t waitMs) {
  for (uint8_t index = 0; index < times; index++) {
    setColor(color);
    delay(waitMs);
    setColor(LED_OFF);
    delay(waitMs);
  }
}

String getUid() {
  String uid;
  for (byte index = 0; index < mfrc522.uid.size; index++) {
    if (mfrc522.uid.uidByte[index] < 0x10) uid += "0";
    uid += String(mfrc522.uid.uidByte[index], HEX);
  }
  uid.toUpperCase();
  return uid;
}

bool login() {
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
  const int httpCode = http.POST(body);
  const String responseBody = http.getString();

  if (httpCode != 200) {
    Serial.print("❌ Score: login recusado HTTP ");
    Serial.println(httpCode);
    Serial.println(responseBody);
    http.end();
    return false;
  }

  StaticJsonDocument<768> response;
  const DeserializationError parseError = deserializeJson(response, responseBody);
  http.end();
  const String token = response["token"] | "";
  if (parseError || token.length() == 0) {
    Serial.println("❌ Score: resposta de login inválida");
    return false;
  }

  authToken = token;
  Serial.println("✅ Score: Arduino autenticado");
  return authToken.length() > 0;
}

bool refreshActiveEvent(bool retryLogin = true) {
  if (authToken.length() == 0 && !login()) return false;

  HTTPClient http;
  WiFiClientSecure secureClient;
  const String url = String(SERVER_BASE_URL) + "/api/event-control/active";
  if (!beginRequest(http, secureClient, url)) return false;

  http.addHeader("Authorization", "Bearer " + authToken);
  const int httpCode = http.GET();
  const String responseBody = http.getString();

  if (httpCode == 401) {
    http.end();
    authToken = "";
    activeEventId = "";
    return retryLogin && login() && refreshActiveEvent(false);
  }
  if (httpCode != 200) {
    Serial.print("⚠️ Score: evento não consultado HTTP ");
    Serial.println(httpCode);
    http.end();
    return false;
  }

  StaticJsonDocument<768> response;
  const DeserializationError parseError = deserializeJson(response, responseBody);
  http.end();
  if (parseError) return false;

  const String previousEventId = activeEventId;
  activeEventId = response["event"]["id"] | "";
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

bool sendScoreReading(const String& uid, bool retryLogin = true) {
  if (authToken.length() == 0 && !login()) return false;
  if (activeEventId.length() == 0 && !refreshActiveEvent()) return false;
  if (activeEventId.length() == 0) {
    Serial.println("⚠️ Score: nenhum evento controlado pela recepção");
    return false;
  }

  HTTPClient http;
  WiFiClientSecure secureClient;
  const String url = String(SERVER_BASE_URL) + "/api/score-kiosk/readings";
  if (!beginRequest(http, secureClient, url)) return false;

  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "Bearer " + authToken);

  StaticJsonDocument<384> request;
  request["eventId"] = activeEventId;
  request["uid"] = uid;
  String body;
  serializeJson(request, body);

  const int httpCode = http.POST(body);
  const String responseBody = http.getString();
  http.end();

  if (httpCode == 401 && retryLogin) {
    authToken = "";
    activeEventId = "";
    return login() && refreshActiveEvent() && sendScoreReading(uid, false);
  }
  if (httpCode != 200) {
    Serial.print("❌ Score: leitura recusada HTTP ");
    Serial.println(httpCode);
    Serial.println(responseBody);
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

void connectWifiIfNeeded() {
  if (WiFi.status() == WL_CONNECTED) return;
  if (millis() - lastWifiRetry < WIFI_RETRY_INTERVAL) return;

  lastWifiRetry = millis();
  Serial.println("📶 Score: tentando reconectar ao Wi-Fi...");
  WiFi.disconnect();
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("\n==========================================");
  Serial.println("       PULYN SCORE KIOSK");
  Serial.println("   Arduino exclusivo de pontuação");
  Serial.println("==========================================\n");

  pixels.begin();
  setColor(LED_BLUE);

  SPI.begin(18, 19, 23, SS_PIN);
  mfrc522.PCD_Init();
  delay(4);
  mfrc522.PCD_SetAntennaGain(MFRC522::RxGain_max);
  Serial.println("✅ Score: leitor RFID iniciado");

  dfSerial.begin(9600, SERIAL_8N1, DFPLAYER_TX, DFPLAYER_RX);
  delay(1000);
  if (dfPlayer.begin(dfSerial, false, false)) {
    dfPlayer.volume(30);
    soundReady = true;
    Serial.println("✅ Score: DFPlayer iniciado");
  } else {
    Serial.println("⚠️ Score: DFPlayer não inicializado; continuando sem som");
  }

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("📶 Score: conectando ao Wi-Fi");
  for (uint8_t attempt = 0; WiFi.status() != WL_CONNECTED && attempt < 30; attempt++) {
    delay(500);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("✅ Score: Wi-Fi conectado, IP: ");
    Serial.println(WiFi.localIP());
    login();
    refreshActiveEvent();
    setColor(LED_OFF);
  } else {
    Serial.println("❌ Score: Wi-Fi desconectado");
    setColor(LED_RED);
  }
}

void loop() {
  connectWifiIfNeeded();
  if (WiFi.status() != WL_CONNECTED) {
    setColor(LED_RED);
    delay(100);
    setColor(LED_OFF);
    delay(900);
    return;
  }

  if (millis() - lastEventRefresh >= EVENT_REFRESH_INTERVAL) {
    lastEventRefresh = millis();
    refreshActiveEvent();
    if (activeEventId.length() > 0) setColor(LED_OFF);
    else setColor(LED_BLUE);
  }

  if (!mfrc522.PICC_IsNewCardPresent() || !mfrc522.PICC_ReadCardSerial()) return;

  const String uid = getUid();
  mfrc522.PICC_HaltA();
  Serial.print("📇 Score: pulseira detectada: ");
  Serial.println(uid);

  if (uid == lastUid && millis() - lastUidAt < RFID_REPEAT_GUARD) {
    Serial.println("↩️ Score: releitura ignorada");
    delay(150);
    return;
  }
  lastUid = uid;
  lastUidAt = millis();

  setColor(LED_YELLOW);
  if (sendScoreReading(uid)) {
    blinkColor(LED_GREEN, 2, 100);
    if (soundReady) dfPlayer.play(SOUND_SUCCESS);
  } else {
    blinkColor(LED_RED, 2, 100);
    if (soundReady) dfPlayer.play(SOUND_ERROR);
  }

  if (activeEventId.length() > 0) setColor(LED_OFF);
  else setColor(LED_BLUE);
  delay(500);
}
