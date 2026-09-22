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
const char* CHECKPOINT_ID = "3";
const char* SERVER_IP     = "192.168.0.60";
const int   SERVER_PORT   = 3001;
const int   CONFIG_INTERVAL = 30000;

// ==================== OBJETOS ====================
MFRC522 mfrc522(SS_PIN, RST_PIN);
Adafruit_NeoPixel pixels(NUM_LEDS, LED_PIN, NEO_GRB + NEO_KHZ800);
HardwareSerial mySoftwareSerial(2);
DFRobotDFPlayerMini myDFPlayer;

// ==================== VARIÁVEIS GLOBAIS ====================
uint32_t defaultLedColor = 0x00FF00;
int defaultSoundOk = 1;  // Som de sucesso (mudar se necessário)
int defaultSoundFail = 3;  // Som de erro (mudar se necessário)
bool wifiConnected = false;
bool gameRunning = false;  // 🎮 Rastreia se jogo está rodando
String gameMode = "idle";  // idle, checkin, bracelets, participants, game
String eventoId = "";  // ID do evento atual
unsigned long lastModeCheck = 0;  // Timer para checkar modo periodicamente
const unsigned long MODE_CHECK_INTERVAL = 5000;  // Checar a cada 5 segundos
unsigned long lastHeartbeat = 0;  // Timer para heartbeat
const unsigned long HEARTBEAT_INTERVAL = 30000;  // Enviar heartbeat a cada 30 segundos
unsigned long gameStartedTime = 0;  // Hora que o jogo foi iniciado
String gameType = "none";  // zone_conquest, treasure_hunt, monster_hunt

void syncTreasureIndicator();

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
// REMOVIDA - Agora o backend faz toda a validação

// ==================== FUNÇÃO PARA VERIFICAR STATUS DO TERRITÓRIO ====================
// REMOVIDA - Agora apenas o backend controla o estado do território

// ==================== FUNÇÃO PARA VERIFICAR MODO DO CHECKPOINT ====================
void checkCheckpointMode() {
  if (!wifiConnected) return;
  
  HTTPClient http;
  String url = "http://" + String(SERVER_IP) + ":" + String(SERVER_PORT) + "/api/debug/checkpoint-mode?checkpointId=" + String(CHECKPOINT_ID);
  http.begin(url);
  
  int httpCode = http.GET();
  if (httpCode == 200) {
    String response = http.getString();
    StaticJsonDocument<256> doc;
    deserializeJson(doc, response);
    
    String modoAnterior = gameMode;
    String tipoAnterior = gameType;
    gameMode = doc["mode"] | "idle";
    gameType = doc["gameType"] | "none";
    
    if (gameMode != modoAnterior || gameType != tipoAnterior) {
      Serial.print("🎯 Estado do checkpoint MUDOU: ");
      Serial.print(modoAnterior);
      Serial.print("/");
      Serial.print(tipoAnterior);
      Serial.print(" → ");
      Serial.print(gameMode);
      Serial.print("/");
      Serial.println(gameType);
    }
    
    // Atualizar gameRunning baseado no modo
    if (gameMode == "game") {
      if (!gameRunning) {
        gameRunning = true;
        gameStartedTime = millis();
        Serial.println("🎮 ▶️  JOGO INICIADO!");
        setColor(0x00FF00);  // LED VERDE indicando jogo ativo
        delay(500);
        clearLED();
      }
    } else {
      if (gameRunning) {
        gameRunning = false;
        Serial.println("⛔ ⏹️  JOGO PARADO!");
        setColor(0xFF0000);  // LED VERMELHO indicando jogo parado
        delay(500);
        clearLED();
      }
    }

    if (gameMode == "game" && gameType == "treasure_hunt") {
      syncTreasureIndicator();
    }
  } else {
    Serial.print("⚠️ Erro ao checar modo - HTTP ");
    Serial.println(httpCode);
  }
  http.end();
}

// ==================== FUNÇÃO PARA SINCRONIZAR ALVO DO TESOURO ====================
void syncTreasureIndicator() {
  if (!wifiConnected || gameMode != "game" || gameType != "treasure_hunt") return;

  HTTPClient http;
  String url = "http://" + String(SERVER_IP) + ":" + String(SERVER_PORT)
    + "/api/checkpoints/" + String(CHECKPOINT_ID) + "/territory";
  http.begin(url);
  int httpCode = http.GET();

  if (httpCode == 200) {
    String response = http.getString();
    StaticJsonDocument<768> doc;
    DeserializationError parseError = deserializeJson(doc, response);
    if (!parseError && String(doc["gameType"] | "none") == "treasure_hunt") {
      if (doc["treasureTarget"] | false) {
        setColor(0x00FF00);
        Serial.println("🗺️ Caça ao Tesouro: este checkpoint é o alvo - LED VERDE");
      } else {
        String ownerColor = doc["ownerTeam"]["color"] | "";
        if (ownerColor.length() > 0) {
          ownerColor.replace("#", "");
          setColor(strtoul(ownerColor.c_str(), nullptr, 16));
          Serial.print("🏳️ Caça ao Tesouro: checkpoint dominado pela cor #");
          Serial.println(ownerColor);
        } else {
          clearLED();
        }
      }
    }
  } else {
    Serial.print("⚠️ Erro ao sincronizar alvo do tesouro - HTTP ");
    Serial.println(httpCode);
  }

  http.end();
}

// ==================== FUNÇÃO PARA HEARTBEAT ====================
void sendHeartbeat() {
  if (!wifiConnected) return;
  
  HTTPClient http;
  String url = "http://" + String(SERVER_IP) + ":" + String(SERVER_PORT) + "/api/checkpoints/" + String(CHECKPOINT_ID) + "/heartbeat";
  http.begin(url);
  
  int httpCode = http.POST("");
  if (httpCode == 200) {
    Serial.println("💓 Heartbeat enviado - Checkpoint ONLINE");
  } else {
    Serial.print("⚠️ Heartbeat falhou - HTTP ");
    Serial.println(httpCode);
  }
  http.end();
}

// ==================== FUNÇÃO PARA ENVIAR LEITURA ====================
void enviarLeitura(String uid, bool autorizada) {
  if (!wifiConnected) {
    Serial.println("⚠️ WiFi desconectado, leitura não enviada");
    setColor(0xFF0000);
    delay(800);
    clearLED();
    return;
  }

  HTTPClient http;
  String url = "http://" + String(SERVER_IP) + ":" + String(SERVER_PORT) + "/api/leituras";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  StaticJsonDocument<512> doc;
  doc["checkpointId"] = CHECKPOINT_ID;
  doc["uid"] = uid;
  doc["signal"] = -45;
  doc["brincadeiraId"] = "";

  String body;
  serializeJson(doc, body);
  
  Serial.print("📤 Enviando leitura para API...");
  int httpCode = http.POST(body);
  
  if (httpCode == 200) {
    String response = http.getString();
    Serial.println(" ✅");
    Serial.print("📥 Resposta: ");
    Serial.println(response);
    
    StaticJsonDocument<4096> responseDoc;
    DeserializationError parseError = deserializeJson(responseDoc, response);
    if (parseError) {
      Serial.print("❌ JSON da leitura maior que o buffer: ");
      Serial.println(parseError.c_str());
      setColor(0xFF0000);
      delay(1200);
      clearLED();
      http.end();
      return;
    }
    
    if (responseDoc["ok"] == true) {
      // Se é uma pulseira NOVA (não cadastrada)
      bool registered = responseDoc["registered"] | false;
      
      if (!registered) {
        if (gameMode == "game") {
          setColor(0xFF0000);
          myDFPlayer.play(3);
          Serial.println("❌ Pulseira não vinculada durante o jogo - LED VERMELHO");
          delay(2000);
          clearLED();
          return;
        }

        if (gameMode == "checkin" || gameMode == "bracelets" || gameMode == "participants") {
          // Pulseira não vinculada a uma criança - LED VERDE por 3 segundos
          setColor(0x00FF00);
          myDFPlayer.play(1);
          Serial.println("✅ Pulseira disponível - LED VERDE");
          delay(3000);
          clearLED();
          return;
        }

        clearLED();
        Serial.println("ℹ️ Pulseira detectada fora do modo de preparação - LED apagado");
        return;
      }
      
      // Pulseira já cadastrada - comportamento depende do MODO
      Serial.print("📍 Modo atual: ");
      Serial.println(gameMode);
      
      // CAÇA AO TESOURO: trechos aceitos também são sucesso antes de a equipe completar.
      if (gameMode == "game" && gameType == "treasure_hunt") {
        const bool treasure = responseDoc["treasure"] | false;
        const bool accepted = responseDoc["treasureAccepted"] | false;
        const int remainingSeconds = max(
          responseDoc["remainingSeconds"] | 0,
          responseDoc["turnRemainingSeconds"] | 0
        );
        String errorMessage = responseDoc["error"] | "";

        if (!treasure || !accepted) {
          if (remainingSeconds > 0) {
            Serial.print("⏳ Caça ao Tesouro aguardando ");
            Serial.print(remainingSeconds);
            Serial.println(" segundos");
            setColor(0xFFFF00);
          } else {
            Serial.print("❌ Tesouro: ");
            Serial.println(errorMessage.length() > 0 ? errorMessage : "leitura não aceita");
            setColor(0xFF0000);
          }
          delay(800);
          syncTreasureIndicator();
          return;
        }

        const bool teamComplete = responseDoc["treasureTeamComplete"] | false;
        String teamColor = responseDoc["teamColor"] | "";
        setColor(0x00FF00);
        Serial.print("✅ Tesouro: participante confirmado ");
        Serial.print(responseDoc["treasureProgress"]["scanned"] | 0);
        Serial.print("/");
        Serial.println(responseDoc["treasureProgress"]["total"] | 0);
        delay(800);

        if (teamComplete && teamColor.length() > 0) {
          teamColor.replace("#", "");
          setColor(strtoul(teamColor.c_str(), nullptr, 16));
          delay(1200);
        }

        syncTreasureIndicator();
        return;
      }
      
      // RECEPTION CHECK-IN: pulseira já vinculada mostra AMARELO
      if (gameMode == "checkin") {
        setColor(0xFFFF00);
        myDFPlayer.play(1);
        Serial.println("⚠️ Check-in: Pulseira já vinculada - LED AMARELO");
        delay(3000);
        clearLED();
        return;
      }
      
      // RECEPTION BRACELETS, PARTICIPANTS: Mostrar AMARELO (apenas detecta)
      if (gameMode == "bracelets" || gameMode == "participants") {
        setColor(0xFFFF00);
        myDFPlayer.play(1);
        Serial.print("⚠️ ");
        Serial.print(gameMode);
        Serial.println(": Pulseira detectada - LED AMARELO");
        delay(3000);
        clearLED();
        return;
      }
      
      // GAME MODE: Processar conquista de território
      if (gameMode != "game") {
        // Se não for um dos modos conhecidos, usar padrão
        setColor(0xFFFF00);
        myDFPlayer.play(1);
        Serial.println("⚠️ Modo desconhecido - LED AMARELO");
        delay(3000);
        clearLED();
        return;
      }
      
      // 🎮 JOGO ESTÁ RODANDO: Processar conquista de território
      Serial.println("🎮 Modo GAME: Processando conquista de território...");
      
      // Agora processa conquista de território
      if (responseDoc["error"] && responseDoc["error"] != "") {
        Serial.print("❌ ");
        Serial.println(responseDoc["error"].as<String>());
        
        if (responseDoc["remainingSeconds"]) {
          Serial.print("⏳ Aguarde ");
          Serial.print(responseDoc["remainingSeconds"].as<int>());
          Serial.println(" segundos!");
        }
        
        setColor(0xFF0000);
        myDFPlayer.play(3);
        delay(3000);
        clearLED();
        return;
      }
      
      String teamColor = responseDoc["teamColor"] | "";
      String childName = responseDoc["criancaName"] | "";
      int points = responseDoc["points"] | 0;
      int lockDuration = responseDoc["lockDurationSeconds"] | 15;
      
      if (teamColor.length() > 0) {
        teamColor.replace("#", "");
        uint32_t color = strtoul(teamColor.c_str(), nullptr, 16);
        
        clearLED();
        delay(100);
        setColor(color);  // Cor do time
        
        delay(500);
        myDFPlayer.play(defaultSoundOk);
        delay(1500);
        
        Serial.println("🎉 TERRITÓRIO CONQUISTADO!");
        Serial.print("🎨 Cor do time: #");
        Serial.println(teamColor);
        Serial.print("👤 Criança: ");
        Serial.println(childName);
        Serial.print("📊 Pontos: +");
        Serial.println(points);
        
        Serial.print("⏰ LED aceso por ");
        Serial.print(lockDuration);
        Serial.println(" segundos...");
        delay(lockDuration * 1000);
        
        clearLED();
        Serial.println("✅ Território liberado!");
      } else {
        Serial.println("❌ ERRO: teamColor vazio!");
        setColor(0xFF0000);
        myDFPlayer.play(3);
        delay(3000);
        clearLED();
      }
    } else {
      Serial.println("❌ Falha na conquista!");
      String error = responseDoc["error"] | "Erro desconhecido";
      Serial.println(error);
    }
  } else {
    Serial.print(" ❌ HTTP ");
    Serial.println(httpCode);
  }
  http.end();
}

// ==================== FUNÇÃO PARA VERIFICAR TAG ====================
// REMOVIDA - Agora o backend faz a validação

// ==================== FUNÇÃO PARA LER UID DA TAG ====================
String lerUID() {
  String uid = "";
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (mfrc522.uid.uidByte[i] < 0x10) uid += "0";
    uid += String(mfrc522.uid.uidByte[i], HEX);
    if (i < mfrc522.uid.size - 1) uid += ":";
  }
  // 🔴 FIX: toUpperCase() não retorna em C++, precisa fazer loop
  for (int i = 0; i < uid.length(); i++) {
    uid[i] = toupper(uid[i]);
  }
  return uid;
}

// ==================== SETUP ====================
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n==========================================");
  Serial.println("     SISTEMA DE CHECKPOINT PULYN");
  Serial.println("       MODO LEITURA SIMPLIFICADO");
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
  delay(1000);  // Aguardar inicialização
  
  if (!myDFPlayer.begin(mySoftwareSerial, false, false)) {
    Serial.println("   ⚠️ Erro no DFPlayer (verifique cartão SD)");
  } else {
    myDFPlayer.volume(30);  // 🔊 Volume máximo (0-30, sendo 30 = máximo)
    Serial.println("   ✅ DFPlayer OK");
    delay(500);
    
    // 🎵 Teste de Som no Setup
    Serial.println("   🎵 Testando som...");
    myDFPlayer.play(1);  // Toca arquivo 01.mp3 para teste
    delay(2000);
    Serial.println("   ✅ Som testado!");
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
    }
  }

  // ✨ NOVO: Checar modo periodicamente (a cada 5 segundos)
  if (millis() - lastModeCheck >= MODE_CHECK_INTERVAL) {
    lastModeCheck = millis();
    checkCheckpointMode();  // Atualiza gameMode automaticamente
    Serial.print("🔄 Modo atualizado: ");
    Serial.println(gameMode);
  }

  // ✨ NOVO: Enviar heartbeat periodicamente (a cada 30 segundos)
  if (millis() - lastHeartbeat >= HEARTBEAT_INTERVAL) {
    lastHeartbeat = millis();
    sendHeartbeat();  // Registra que está online
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

  // Feedback imediato: confirma a leitura NFC antes de qualquer chamada HTTP.
  setColor(0xFFFF00);
  Serial.println("💛 Pulseira detectada; aguardando resposta do backend...");
  
  // 🎯 Verificar modo do checkpoint antes de processar
  Serial.println("🎯 Verificando modo do checkpoint...");
  checkCheckpointMode();
  
  // checkCheckpointMode pode alterar o LED; reaplicar o amarelo antes do POST.
  setColor(0xFFFF00);

  // 🔄 Sempre enviar para o backend
  Serial.println("📤 Enviando para backend...");
  enviarLeitura(uid, true);
  
  // Prepara para próxima leitura
  mfrc522.PICC_HaltA();
}
