// ==================== PULYN C2 - VERSÃO MODULARIZADA ====================

#include "config.h"
#include "wifi_module.h"
#include "led_module.h"
#include "rfid_module.h"
#include "api_module.h"
#include "sound_module.h"

// ==================== INSTÂNCIAS ====================
WiFiModule wifi;
LEDModule led;
RFIDModule rfid;
APIModule api;
SoundModule sound;

// ==================== VARIÁVEIS GLOBAIS ====================
String gameMode = "idle";
String activeGameType = "none";
unsigned long lastModeCheck = 0;
unsigned long lastHeartbeat = 0;
uint32_t territoryColor = LED_OFF;
bool territoryOwned = false;
bool unavailableVisualActive = false;

void processReading(const String& uid);

void restoreTerritoryColor() {
  if (gameMode == "game" && (territoryOwned || territoryColor != LED_OFF)) {
    led.on(territoryColor);
  } else {
    led.off();
  }
}

void syncTerritoryColor() {
  // Fora do jogo, apaga o LED e também esquece o domínio anterior.
  if (gameMode != "game") {
    territoryOwned = false;
    territoryColor = LED_OFF;
    led.off();
    return;
  }

  ApiResponse territory = api.getTerritoryStatus();
  if (!territory.ok) return;

  if (territory.gameType == "treasure_hunt" && territory.treasureTarget) {
    territoryOwned = false;
    territoryColor = LED_GREEN;
    led.on(LED_GREEN);
    Serial.println("🗺️ Caça ao Tesouro: checkpoint é o alvo - LED VERDE");
    return;
  }

  if (territory.teamColor.length() > 0) {
    String color = territory.teamColor;
    color.replace("#", "");
    territoryColor = strtoul(color.c_str(), nullptr, 16);
    territoryOwned = true;
    led.on(territoryColor);
    Serial.print("🏳️ Território dominado pela cor #");
    Serial.println(color);
  } else {
    territoryOwned = false;
    territoryColor = LED_OFF;
    led.off();
  }
}

// ==================== SETUP ====================
void setup() {
  Serial.begin(115200);
  randomSeed(micros());
  delay(1000);
  
  Serial.println("\n==========================================");
  Serial.println("     PULYN CHECKPOINT C2");
  Serial.println("         VERSÃO MODULARIZADA");
  Serial.println("==========================================\n");
  
  // Inicializar módulos
  led.init();
  rfid.init();
  sound.init();
  wifi.init();
  
  if (wifi.connected) {
    // Confirmar a API logo na inicialização para não sinalizar offline enquanto
    // o checkpoint já estiver conectado e o backend disponível.
    ApiResponse modeResponse = api.checkMode();
    if (modeResponse.ok) {
      gameMode = modeResponse.gameMode;
      activeGameType = modeResponse.gameType;
    }
    syncTerritoryColor();
  }
  
  Serial.println("\n✅ Sistema pronto!\n");
}

// ==================== LOOP PRINCIPAL ====================
void loop() {
  // Verificar WiFi
  wifi.check();
  if (!wifi.connected) {
    api.available = false;
  }

  const bool connectionUnavailable = !wifi.connected || !api.available;
  if (connectionUnavailable) {
    led.updateUnavailable(true);
    unavailableVisualActive = true;
  } else if (unavailableVisualActive) {
    led.updateUnavailable(false);
    unavailableVisualActive = false;
    restoreTerritoryColor();
  }
  
  // Checar modo a cada 5 segundos
  if (millis() - lastModeCheck >= MODE_CHECK_INTERVAL) {
    lastModeCheck = millis();
    if (wifi.connected) {
      ApiResponse modeResponse = api.checkMode();
      if (modeResponse.ok) {
        if (gameMode != modeResponse.gameMode) {
          Serial.print("🎯 Modo: ");
          Serial.println(modeResponse.gameMode);
          gameMode = modeResponse.gameMode;
        }
        activeGameType = modeResponse.gameType;
      }
      // Atualiza a cor persistente caso outro time tenha conquistado.
      syncTerritoryColor();
    }
  }
  
  // Enviar heartbeat a cada 30 segundos
  if (millis() - lastHeartbeat >= HEARTBEAT_INTERVAL) {
    lastHeartbeat = millis();
    if (wifi.connected) {
      api.sendHeartbeat();
    }
  }
  
  // Verificar pulseira
  if (!rfid.isNewCard()) {
    return;
  }
  
  String uid = rfid.getUID();
  Serial.println("✅ [RFID] Cartão/pulseira detectado pelo RC522");
  Serial.print("📇 [RFID] UID lido: ");
  Serial.println(uid);

  // Feedback imediato: confirma a leitura NFC antes de qualquer chamada HTTP.
  led.on(LED_YELLOW);
  Serial.println("💛 [RFID] Pulseira detectada; aguardando resposta do backend...");
  
  // Evitar que uma pulseira deixada sobre o leitor seja processada novamente
  // logo após a troca de equipe ou a conclusão de uma etapa.
  if (wifi.connected && rfid.wasRecentlyProcessed(uid)) {
    Serial.println("↩️ Releitura ignorada: pulseira já processada recentemente");
    delay(120);
    restoreTerritoryColor();
    rfid.halt();
    delay(RFID_COOLDOWN);
    return;
  }
  
  // Enviar leitura somente depois de confirmar o modo atual.
  if (wifi.connected) {
    rfid.rememberProcessed(uid);
    ApiResponse currentMode = api.checkMode();
    if (currentMode.ok) {
      gameMode = currentMode.gameMode;
      activeGameType = currentMode.gameType;
      Serial.print("🎯 Modo confirmado antes da leitura: ");
      Serial.println(gameMode);
      if (gameMode == "game") {
        syncTerritoryColor();
      } else {
        led.off();
      }
    }
    // checkMode/syncTerritoryColor podem alterar o LED; amarelo confirma
    // que a leitura foi detectada enquanto o POST ainda será realizado.
    led.on(LED_YELLOW);
    processReading(uid);
  } else {
    Serial.println("⚠️ WiFi desconectado!");
    led.on(LED_RED);
    delay(800);
    restoreTerritoryColor();
  }
  
  rfid.halt();
  delay(RFID_COOLDOWN);
}

// ==================== PROCESSAR LEITURA ====================
void processReading(const String& uid) {
  Serial.println("📡 [RFID] UID recebido; iniciando processamento");
  Serial.print("   UID: ");
  Serial.println(uid);
  Serial.print("   Modo: ");
  Serial.println(gameMode);
  Serial.print("   Tipo de jogo: ");
  Serial.println(activeGameType);
  Serial.print("   API disponível antes do envio: ");
  Serial.println(api.available ? "SIM" : "NÃO");

  String readingId = String((uint32_t)ESP.getEfuseMac(), HEX) + String(millis(), HEX);
  Serial.print("   readingId: ");
  Serial.println(readingId);

  ApiResponse response = api.sendReading(uid, readingId);
  Serial.print("📥 [RFID] Resultado: ok=");
  Serial.print(response.ok ? "true" : "false");
  Serial.print(" registered=");
  Serial.print(response.registered ? "true" : "false");
  Serial.print(" treasureAccepted=");
  Serial.print(response.treasureAccepted ? "true" : "false");
  Serial.print(" error=");
  Serial.println(response.error ? "true" : "false");
  Serial.print("   randomColor: ");
  Serial.println(response.randomColor);
  Serial.print("   Mensagem: ");
  Serial.println(response.errorMessage.length() > 0 ? response.errorMessage : response.message);
  
  if (!response.ok) {
    Serial.print("❌ [RFID] API não confirmou a leitura. HTTP/transport ou JSON falhou. ");
    Serial.println(response.errorMessage);
    led.blink(LED_RED, 3, 200);
    return;
  }
  
  // Durante o jogo, somente pulseiras vinculadas a uma criança podem participar.
  // Pulseira sem vínculo não acende verde durante o jogo.
  if (gameMode == "game" && !response.registered) {
    Serial.println("❌ Pulseira não vinculada: rejeitada durante o jogo");
    sound.play(SOUND_ERROR);
    led.on(LED_RED);
    delay(2000);
    restoreTerritoryColor();
    return;
  }

  // Fora do jogo, o backend pode enviar randomColor para uma pulseira vinculada.
  // Durante qualquer jogo, ignorar essa resposta: nenhuma cor aleatória deve
  // aparecer no checkpoint por divergência momentânea entre os estados.
  if (gameMode != "game" && response.registered && response.randomColor.length() > 0) {
    String color = response.randomColor;
    color.replace("#", "");
    const uint32_t idleColor = strtoul(color.c_str(), nullptr, 16);
    Serial.print("🎨 [IDLE] Cor aleatória recebida: #");
    Serial.println(color);
    led.on(idleColor);
    delay(IDLE_COLOR_DURATION);
    led.off();
    Serial.println("🎨 [IDLE] Cor aleatória apagada");
    return;
  }

  // Fora dos modos de preparação e do jogo, uma pulseira não vinculada
  // permanece apagada. O feedback amarelo pertence à recepção, que possui
  // firmware separado.
  if (!response.registered) {
    Serial.println("✅ Pulseira detectada fora do modo de preparação");
    sound.play(SOUND_SUCCESS);
    led.off();
    return;
  }

  // Se o backend não enviou randomColor, não usar amarelo no C2.
  if (gameMode != "game") {
    Serial.println("⚠️ Leitura fora de jogo sem cor aleatória");
    led.off();
    return;
  }
  
  // Pulseira cadastrada - comportamento por modo
  Serial.print("📍 Modo: ");
  Serial.println(gameMode);
  
  // Caça ao Tesouro: leitura aceita pode ser parcial; só a última criança conclui a etapa.
  if (gameMode == "game" && activeGameType == "treasure_hunt") {
    if (response.error || !response.treasureAccepted) {
      const int waitSeconds = response.remainingSeconds > response.turnRemainingSeconds
        ? response.remainingSeconds
        : response.turnRemainingSeconds;
      if (waitSeconds > 0) {
        Serial.print("⏳ Aguardando a próxima equipe: ");
        Serial.print(waitSeconds);
        Serial.println("s");
        led.on(LED_YELLOW);
        delay(500);
        syncTerritoryColor();
        return;
      }

      Serial.print("❌ ");
      Serial.println(response.errorMessage.length() > 0 ? response.errorMessage : response.message);
      sound.play(SOUND_ERROR);
      led.on(LED_RED);
      delay(1200);
      syncTerritoryColor();
      return;
    }

    // Feedback rápido para cada integrante aceito, inclusive antes da equipe completar a etapa.
    Serial.println("✅ [TESOURO] Leitura aceita; piscando verde 2 vezes");
    led.blink(LED_GREEN, 2, 80);
    Serial.print("🗺️ Participante confirmado no Caça ao Tesouro: ");
    Serial.print(response.treasureScanned);
    Serial.print("/");
    Serial.println(response.treasureTotal);
    sound.play(response.treasureTeamComplete ? SOUND_POINT : SOUND_SUCCESS);

    if (response.treasureTeamComplete && response.teamColor.length() > 0) {
      String color = response.teamColor;
      color.replace("#", "");
      territoryColor = strtoul(color.c_str(), nullptr, 16);
      territoryOwned = true;
      led.on(territoryColor);
      Serial.println(response.treasureFinished
        ? "🏆 Caça ao Tesouro concluído!"
        : "✅ Etapa concluída! Novo alvo sorteado.");
      if (response.treasureFinished) {
        delay(1200);
        led.off();
      }
    } else {
      // O alvo permanece verde enquanto a equipe reúne todos os participantes.
      led.on(LED_GREEN);
      delay(800);
      syncTerritoryColor();
    }
    return;
  }

  // Game mode: processar conquista
  if (gameMode == "game") {
    if (response.error || !response.authorized) {
      Serial.print("❌ ");
      Serial.println(response.errorMessage.length() > 0 ? response.errorMessage : response.message);
      sound.play(SOUND_ERROR);
      led.on(LED_RED);
      delay(2000);
      restoreTerritoryColor();
      return;
    }
    
    // Conquista bem sucedida
    Serial.println("🎉 TERRITÓRIO CONQUISTADO!");
    Serial.print("👤 ");
    Serial.print(response.criancaName);
    Serial.print(" +");
    Serial.print(response.points);
    Serial.println("pt");
    
    sound.play(SOUND_POINT);
    
    // O último time vencedor permanece visível até outro time conquistar.
    if (response.teamColor.length() > 0) {
      response.teamColor.replace("#", "");
      territoryColor = strtoul(response.teamColor.c_str(), nullptr, 16);
      territoryOwned = true;
      led.on(territoryColor);
      Serial.print("🏳️ Novo domínio: #");
      Serial.println(response.teamColor);
    }
    return;
  }
  
  // Modo desconhecido
  Serial.println("⚠️ Modo desconhecido");
  sound.play(SOUND_ERROR);
  restoreTerritoryColor();
}
