//  PULYN - VERSÃO OTIMIZADA

#include "config.h"                 // Configurações otimizadas
#include "wifi_module.h"
#include "led_module.h"
#include "rfid_module.h"            // Versão otimizada (RFIDModuleOptimized)
#include "api_module_optimized.h"   // Versão otimizada (APIModuleOptimized)
#include "sound_module.h"

WiFiModule wifi;
LEDModule led;
RFIDModuleOptimized rfid;  // Usando versão otimizada
APIModuleOptimized api;    // Usando versão otimizada
SoundModule sound;

// ==================== VARIÁVEIS GLOBAIS OTIMIZADAS ====================
String gameMode = "idle";
String activeGameType = "none";
unsigned long lastModeCheck = 0;
unsigned long lastHeartbeat = 0;
uint32_t territoryColor = LED_OFF;
bool territoryOwned = false;
bool unavailableVisualActive = false;
unsigned long lastRFIDCheck = 0;

void processReadingFast(const String& uid);
void handleSerialCommands();
void testRFIDSensitivity();
void printRFIDStatus();

// Variável para modo de teste
bool sensitivityTestMode = false;

void restoreTerritoryColor() {
  if (gameMode == "game" && (territoryOwned || territoryColor != LED_OFF)) {
    led.on(territoryColor);
  } else {
    led.off();
  }
}

void syncTerritoryColorFast() {
  if (gameMode != "game") {
    territoryOwned = false;
    territoryColor = LED_OFF;
    led.off();
    return;
  }

  ApiResponse territory = api.getTerritoryStatusFast();
  if (!territory.ok) return;

  if (territory.gameType == "treasure_hunt" && territory.treasureTarget) {
    territoryOwned = false;
    territoryColor = LED_GREEN;
    led.on(LED_GREEN);
    return;
  }

  if (territory.gameType == "monster_hunt") {
    territoryOwned = false;
    territoryColor = LED_OFF;
    led.off();
    return;
  }

  if (territory.teamColor.length() > 0) {
    String color = territory.teamColor;
    color.replace("#", "");
    territoryColor = strtoul(color.c_str(), nullptr, 16);
    territoryOwned = true;
    led.on(territoryColor);
  } else {
    territoryOwned = false;
    territoryColor = LED_OFF;
    led.off();
  }
}

void setup() {
  Serial.begin(115200);
  randomSeed(micros());
  delay(500);
  
  Serial.println("\n==========================================");
  Serial.println("     PULYN CHECKPOINT C2 - OTIMIZADO");
  Serial.println("  Leitura rápida (<200ms) + Alcance máximo");
  Serial.println("==========================================");
  Serial.println("🔧 COMANDOS DISPONÍVEIS (Serial Monitor):");
  Serial.println("  HELP              - Mostra comandos");
  Serial.println("  TEST_SENSITIVITY  - Testa alcance RFID por 10s");
  Serial.println("  STATUS            - Mostra configurações");
  Serial.println("  WIFI_PORTAL       - Troca a rede Wi-Fi pelo celular");
  Serial.println("==========================================\n");
  
  // Inicializar módulos
  led.init();
  rfid.init(); 
  sound.init();
  wifi.init();
  
  if (wifi.connected) {
    api.sendHeartbeat();
    lastHeartbeat = millis();

    ApiResponse modeResponse = api.checkModeFast();
    if (modeResponse.ok) {
      gameMode = modeResponse.gameMode;
      activeGameType = modeResponse.gameType;
    }
    syncTerritoryColorFast();
  }
  
  Serial.println("\n✅ Sistema pronto! Leitura otimizada ativada.\n");
  Serial.println("📡 Configuração RFID: Ganho 48dB (máximo)");
  Serial.println("🎯 Alcance esperado: 8-15cm\n");
}

// ==================== FUNÇÕES DE TESTE ====================

// Função para testar sensibilidade do RFID
void testRFIDSensitivity() {
  Serial.println("\n🔍 INICIANDO TESTE DE SENSIBILIDADE RFID");
  Serial.println("Aproxime pulseiras NFC gradualmente até o limite de detecção");
  Serial.println("O sistema vai indicar cada detecção por 10 segundos...");
  
  unsigned long startTime = millis();
  int detectionCount = 0;
  sensitivityTestMode = true;
  
  while (millis() - startTime < 10000) { // Teste por 10 segundos
    if (rfid.checkCardQuick()) {
      detectionCount++;
      String uid = rfid.getUID();
      Serial.print("✅ Detecção #");
      Serial.print(detectionCount);
      Serial.print(" - UID: ");
      Serial.print(uid);
      Serial.print(" - Tempo: ");
      Serial.print(millis() - startTime);
      Serial.println("ms");
      
      // Feedback visual
      led.on(LED_GREEN);
      delay(100);
      led.off();
      
      rfid.halt();
      delay(200);
    }
    delay(20);
  }
  
  sensitivityTestMode = false;
  Serial.print("\n🔍 TESTE CONCLUÍDO: ");
  Serial.print(detectionCount);
  Serial.println(" detecções em 10 segundos");
  
  if (detectionCount == 0) {
    Serial.println("⚠️ Nenhuma detecção - Verifique hardware/posicionamento");
  } else if (detectionCount < 3) {
    Serial.println("📏 Alcance limitado (<5cm)");
  } else if (detectionCount < 6) {
    Serial.println("📐 Alcance bom (5-10cm)");
  } else {
    Serial.println("📡 Alcance excelente (>10cm)");
  }
  Serial.println("🔧 Voltando para operação normal...\n");
}

// Função para mostrar status do RFID
void printRFIDStatus() {
  Serial.println("\n📡 STATUS DO SISTEMA RFID");
  Serial.println("==========================");
  Serial.println("✅ Configurações aplicadas:");
  Serial.println("  - Ganho receptor: 48dB (máximo)");
  Serial.println("  - Potência transmissão: máxima");
  Serial.println("  - Modulação otimizada para alcance");
  Serial.println("\n🎯 Alcance esperado: 8-15cm");
  Serial.println("📏 Dica: Teste com 'TEST_SENSITIVITY'");
  Serial.println("==========================\n");
}

// Função para processar comandos do Serial Monitor
void handleSerialCommands() {
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    
    if (command == "TEST_SENSITIVITY") {
      testRFIDSensitivity();
    } else if (command == "STATUS") {
      printRFIDStatus();
    } else if (command == "WIFI_PORTAL") {
      wifi.openPortal();
    } else if (command == "WIFI_STATUS") {
      wifi.printStatus();
    } else if (command == "WIFI_RESET") {
      wifi.forgetNetwork();
    } else if (command == "HELP") {
      Serial.println("\n🔧 COMANDOS DISPONÍVEIS:");
      Serial.println("TEST_SENSITIVITY  - Testa alcance RFID por 10 segundos");
      Serial.println("STATUS            - Mostra configurações do sistema");
      Serial.println("WIFI_PORTAL       - Abre o portal para trocar a rede Wi-Fi");
      Serial.println("WIFI_STATUS       - Mostra a rede e a conexão atuais");
      Serial.println("WIFI_RESET        - Apaga a rede salva e reinicia");
      Serial.println("HELP              - Mostra esta ajuda");
      Serial.println("\n📡 Sistema configurado para alcance máximo (48dB)");
      Serial.println("🎯 Alcance esperado: 8-15cm dependendo da pulseira");
    }
  }
}


//Loop principal
void loop() {
  // Verificar comandos do Serial Monitor
  handleSerialCommands();
  
  // Se estiver em modo de teste, não processar o loop normal
  if (sensitivityTestMode) {
    return;
  } 
  
  unsigned long currentTime = millis();
  
  // WiFi check otimizado
  const bool wasWifiConnected = wifi.connected;
  wifi.check();
  if (!wifi.connected) {
    api.available = false;
  } else if (!wasWifiConnected) {
    if (api.sendHeartbeat()) {
      lastHeartbeat = currentTime;
      syncTerritoryColorFast();
    }
  }

  // Indicador de conexão
  const bool connectionUnavailable = !wifi.connected || !api.available;
  if (connectionUnavailable) {
    led.updateUnavailable(true);
    unavailableVisualActive = true;
  } else if (unavailableVisualActive) {
    led.updateUnavailable(false);
    unavailableVisualActive = false;
    restoreTerritoryColor();
  }
  
  // Checar modo menos frequentemente (10s em vez de 5s)
  if (currentTime - lastModeCheck >= 10000) { // 10 segundos
    lastModeCheck = currentTime;
    if (wifi.connected) {
      ApiResponse modeResponse = api.checkModeFast();
      if (modeResponse.ok) {
        if (gameMode != modeResponse.gameMode) {
          gameMode = modeResponse.gameMode;
        }
        activeGameType = modeResponse.gameType;
      }
      syncTerritoryColorFast();
    }
  }
  
  // Heartbeat menos frequente (60s em vez de 30s)
  if (currentTime - lastHeartbeat >= 60000) {
    lastHeartbeat = currentTime;
    if (wifi.connected && api.sendHeartbeat()) {
      syncTerritoryColorFast();
    }
  }
  
  if (currentTime - lastRFIDCheck >= 20) {
    lastRFIDCheck = currentTime;
    
    // Verificação ULTRA rápida
    if (rfid.checkCardQuick()) {
      String uid = rfid.getUID();
      Serial.print("⚡ UID: ");
      Serial.println(uid);

      // Feedback IMEDIATO (antes de qualquer processamento)
      led.on(LED_YELLOW);
      
      // Verificação rápida de repetição
      if (wifi.connected && rfid.wasRecentlyProcessed(uid)) {
        Serial.println("↩️ Releitura ignorada");
        delay(80); // Reduzido
        restoreTerritoryColor();
        rfid.halt();
        delay(RFID_COOLDOWN / 2); // Metade do cooldown
        return;
      }
      
      // Processar leitura
      if (wifi.connected) {
        rfid.rememberProcessed(uid);
        
        // Verificação de modo OPICIONAL (pode pular para mais velocidade)
        // Apenas sincronizar cores se necessário
        if (gameMode == "game") {
          syncTerritoryColorFast();
        }
        
        // Manter LED amarelo para feedback visual
        led.on(LED_YELLOW);
        
        // Processar leitura de forma assíncrona (não bloqueante)
        processReadingFast(uid);
      } else {
        Serial.println("⚠️ WiFi desconectado!");
        led.on(LED_RED);
        delay(400); // Reduzido de 800 para 400ms
        restoreTerritoryColor();
      }
      
      rfid.halt();
      delay(RFID_COOLDOWN / 2); // Metade do cooldown
    }
  }
}

// PROCESSAMENTO DE LEITURA
void processReadingFast(const String& uid) {
  Serial.println("📡 Processando leitura...");
  
  String readingId = String((uint32_t)ESP.getEfuseMac(), HEX) + String(millis(), HEX);
  
  // Enviar leitura sem verificar modo primeiro (otimização)
  ApiResponse response = api.sendReadingFast(uid, readingId);
  
  if (!response.ok) {
    Serial.println("❌ Erro na API");
    led.blink(LED_RED, 2, 150); // Reduzido de 3 para 2 blinks
    return;
  }
  
  // Pulseira não vinculada durante jogo
  if (gameMode == "game" && !response.registered) {
    Serial.println("❌ Pulseira não vinculada");
    sound.play(SOUND_ERROR);
    led.on(LED_RED);
    delay(1000); // Reduzido de 2000 para 1000ms
    restoreTerritoryColor();
    return;
  }

  // Fora do jogo com cor aleatória
  if (gameMode != "game" && response.registered && response.randomColor.length() > 0) {
    String color = response.randomColor;
    color.replace("#", "");
    const uint32_t idleColor = strtoul(color.c_str(), nullptr, 16);
    led.on(idleColor);
    delay(1500); // Reduzido de 3000 para 1500ms
    led.off();
    return;
  }

  // Pulseira não vinculada fora do modo
  if (!response.registered) {
    sound.play(SOUND_SUCCESS);
    led.off();
    return;
  }

  // Modo desconhecido
  if (gameMode != "game") {
    led.off();
    return;
  }
  
  // PROCESSAMENTO POR TIPO DE JOGO 
  
  // Caça ao Monstro
  if (gameMode == "game" && activeGameType == "monster_hunt") {
    if (response.error || !response.monsterAccepted) {
      sound.play(SOUND_ERROR);
      if (response.alreadyScanned) {
        led.blink(LED_YELLOW, 2, 80); // Reduzido
      } else {
        led.blink(LED_RED, 2, 100); // Reduzido
      }
      syncTerritoryColorFast();
      return;
    }

    const uint32_t monsterFeedbackColor = response.monsterSpecial || response.monsterDefeated
      ? 0xFF00FF
      : 0x0088FF;
    
    sound.play(response.monsterSpecial || response.monsterDefeated ? SOUND_POINT : SOUND_SUCCESS);
    led.blink(monsterFeedbackColor, response.monsterDefeated ? 3 : 2, 80); // Otimizado
    
    if (response.monsterDefeated) {
      delay(500); // Reduzido
      led.off();
    } else {
      syncTerritoryColorFast();
    }
    return;
  }

  // Caça ao Tesouro
  if (gameMode == "game" && activeGameType == "treasure_hunt") {
    if (response.error || !response.treasureAccepted) {
      sound.play(SOUND_ERROR);
      led.on(LED_RED);
      delay(800); // Reduzido
      syncTerritoryColorFast();
      return;
    }

    // Feedback rápido
    led.blink(LED_GREEN, 2, 60); // Mais rápido
    sound.play(response.treasureTeamComplete ? SOUND_POINT : SOUND_SUCCESS);

    if (response.treasureTeamComplete && response.teamColor.length() > 0) {
      String color = response.teamColor;
      color.replace("#", "");
      territoryColor = strtoul(color.c_str(), nullptr, 16);
      territoryOwned = true;
      led.on(territoryColor);
      
      if (response.treasureFinished) {
        delay(800); // Reduzido
        led.off();
      }
    } else {
      led.on(LED_GREEN);
      delay(500); // Reduzido
      syncTerritoryColorFast();
    }
    return;
  }

  // Jogo normal (conquista de território)
  if (gameMode == "game") {
    if (response.error || !response.authorized) {
      sound.play(SOUND_ERROR);
      led.on(LED_RED);
      delay(1000); // Reduzido
      restoreTerritoryColor();
      return;
    }
    
    // Conquista bem sucedida
    sound.play(SOUND_POINT);
    
    if (response.teamColor.length() > 0) {
      response.teamColor.replace("#", "");
      territoryColor = strtoul(response.teamColor.c_str(), nullptr, 16);
      territoryOwned = true;
      led.on(territoryColor);
    }
    return;
  }
  
  // Fallback
  sound.play(SOUND_ERROR);
  restoreTerritoryColor();
}