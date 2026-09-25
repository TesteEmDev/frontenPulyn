// ==================== PULYN SCORE KIOSK - VERSÃO OTIMIZADA ====================
// Foco: Leitura rápida para telão com alcance máximo
// Fluxo otimizado: RFID → Feedback → Envio → Telão

#include "config_score.h"
#include "wifi_module_score.h"
#include "led_module_score.h"
#include "rfid_module_score.h"
#include "api_module_score.h"
#include "sound_module_score.h"

// ==================== INSTÂNCIAS ====================
WiFiModuleScore wifi;
LEDModuleScore led;
RFIDModuleScore rfid;
APIModuleScore api;
SoundModuleScore sound;

// ==================== VARIÁVEIS GLOBAIS OTIMIZADAS ====================
unsigned long lastRFIDCheck = 0;
bool unavailableVisualActive = false;
unsigned long lastEventRefresh = 0;

// ==================== FUNÇÕES DE TESTE E COMANDOS ====================
void testRFIDSensitivity();
void printSystemStatus();
void handleSerialCommands();

// Função para testar sensibilidade do RFID no score
void testRFIDSensitivity() {
  Serial.println("\n🔍 SCORE - TESTE DE SENSIBILIDADE RFID");
  Serial.println("Aproxime pulseiras NFC gradualmente até o limite de detecção");
  Serial.println("O sistema vai indicar cada detecção por 10 segundos...");
  
  unsigned long startTime = millis();
  int detectionCount = 0;
  
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
      delay(200); // Pequena pausa entre detecções
    }
    delay(20);
  }
  
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

// Função para mostrar status do sistema do score
void printSystemStatus() {
  Serial.println("\n📡 SCORE - STATUS DO SISTEMA");
  Serial.println("==============================");
  Serial.println("✅ Configurações aplicadas:");
  Serial.println("  - Ganho receptor: 48dB (máximo)");
  Serial.println("  - Potência transmissão: máxima");
  Serial.println("  - Modulação otimizada para alcance");
  Serial.print("  - WiFi: ");
  Serial.println(wifi.connected ? "CONECTADO" : "DESCONECTADO");
  Serial.print("  - API: ");
  Serial.println(api.isAuthenticated() ? "AUTENTICADO" : "NÃO AUTENTICADO");
  Serial.print("  - Evento ativo: ");
  Serial.println(api.getActiveEventId().length() > 0 ? "SIM" : "NÃO");
  Serial.println("\n🎯 Alcance esperado: 8-15cm");
  Serial.println("📏 Dica: Teste com 'TEST_SENSITIVITY'");
  Serial.println("==============================");
}

// Função para processar comandos do Serial Monitor
void handleSerialCommands() {
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    
    if (command == "TEST_SENSITIVITY") {
      testRFIDSensitivity();
    } else if (command == "STATUS") {
      printSystemStatus();
    } else if (command == "HELP") {
      Serial.println("\n🔧 SCORE - COMANDOS DISPONÍVEIS:");
      Serial.println("TEST_SENSITIVITY  - Testa alcance RFID por 10 segundos");
      Serial.println("STATUS            - Mostra configurações do sistema");
      Serial.println("HELP              - Mostra esta ajuda");
      Serial.println("\n📡 Sistema configurado para alcance máximo (48dB)");
      Serial.println("🎯 Alcance esperado: 8-15cm dependendo da pulseira");
      Serial.println("🎮 Funcionalidade: Envia leituras para telão em tempo real");
    }
  }
}

// ==================== SETUP OTIMIZADO ====================
void setup() {
  Serial.begin(115200);
  delay(500);
  
  Serial.println("\n==========================================");
  Serial.println("      PULYN SCORE KIOSK - OTIMIZADO");
  Serial.println("  Leitura rápida + Alcance máximo + Telão");
  Serial.println("==========================================");
  Serial.println("🔧 COMANDOS DISPONÍVEIS (Serial Monitor):");
  Serial.println("  HELP              - Mostra comandos");
  Serial.println("  TEST_SENSITIVITY  - Testa alcance RFID por 10s");
  Serial.println("  STATUS            - Mostra configurações");
  Serial.println("==========================================\n");
  
  // Inicializar módulos otimizados
  led.init();
  rfid.init();  // RFID com alcance máximo configurado
  sound.init();
  wifi.init();
  
  // Tentar login inicial
  if (wifi.connected) {
    api.login();
    api.refreshActiveEvent();
  }
  
  Serial.println("\n✅ Score otimizado pronto! Sistema ativado.");
  Serial.println("📡 Configuração RFID: Ganho 48dB (máximo)");
  Serial.println("🎯 Alcance esperado: 8-15cm");
  Serial.println("📊 Funcionalidade: Envia leituras para telão em tempo real");
  Serial.println("👋 Aproxime pulseiras para consultar pontuação no telão\n");
  
  // LED inicial indica estado
  if (api.getActiveEventId().length() > 0) {
    led.off();
  } else {
    led.on(LED_BLUE);
  }
}

// ==================== LOOP PRINCIPAL OTIMIZADO ====================
void loop() {
  // Verificar comandos do Serial Monitor
  handleSerialCommands();
  
  unsigned long currentTime = millis();
  
  // Atualizar WiFi
  wifi.check();
  
  // Verificar autenticação/evento periodicamente
  if (wifi.connected && currentTime - lastEventRefresh >= EVENT_REFRESH_INTERVAL) {
    lastEventRefresh = currentTime;
    api.refreshActiveEvent();
    
    // Atualizar LED de acordo com estado do evento
    if (api.getActiveEventId().length() > 0) {
      led.off();
    } else {
      led.on(LED_BLUE);
    }
  }
  
  // Indicador de conexão indisponível
  const bool connectionUnavailable = !wifi.connected || !api.isAuthenticated();
  if (connectionUnavailable) {
    led.updateUnavailable(true);
    unavailableVisualActive = true;
  } else if (unavailableVisualActive) {
    led.updateUnavailable(false);
    unavailableVisualActive = false;
    led.off();
  }
  
  // Atualizar LEDs se necessário
  led.update();
  
  // ==================== LEITURA RFID COM ALCANCE MÁXIMO ====================
  // Verificar RFID a cada 20ms com sensibilidade máxima (OTIMIZADO)
  if (currentTime - lastRFIDCheck >= RFID_CHECK_INTERVAL) {
    lastRFIDCheck = currentTime;
    
    // Verificação ULTRA rápida com sensibilidade máxima
    if (rfid.checkCardQuick()) {
      String uid = rfid.getUID();
      
      // Verificação de UID válido (mínimo 8 caracteres)
      if (uid.length() >= MIN_UID_LENGTH && uid != "00000000") {
        Serial.print("⚡ SCORE - UID: ");
        Serial.println(uid);
        
        // Feedback IMEDIATO (antes de qualquer processamento)
        led.on(LED_YELLOW);
        
        // Verificação rápida de repetição (OTIMIZADA)
        if (wifi.connected && rfid.wasRecentlyProcessed(uid)) {
          Serial.println("↩️ Releitura ignorada (repetição rápida)");
          delay(50); // Delay reduzido
          led.off();
          rfid.halt();
          delay(RFID_REPEAT_GUARD / 3); // Cooldown reduzido
          return;
        }
        
        // Processar leitura se WiFi disponível
        if (wifi.connected) {
          rfid.rememberProcessed(uid);
          
          // Manter LED amarelo para feedback visual
          led.on(LED_YELLOW);
          
          // Enviar leitura para backend (telão)
          Serial.println("📡 Enviando para telão...");
          bool success = api.sendScoreReadingFast(uid);
          
          // Feedback visual e sonoro otimizado
          led.readingFeedback(success);
          sound.readingFeedback(success);
          
          if (success) {
            Serial.println("✅ Leitura enviada para telão!");
          } else {
            Serial.println("❌ Erro ao enviar para telão");
          }
        } else {
          Serial.println("⚠️ WiFi desconectado!");
          led.on(LED_RED);
          delay(300);
          led.off();
        }
        
        rfid.halt();
        delay(200); // Cooldown reduzido
      } else {
        // UID inválido ou vazio - pode ser detecção no limite do alcance
        Serial.println("⚠️ Detecção mas UID inválido (pode estar no limite do alcance)");
        led.on(LED_YELLOW);
        delay(150);
        led.off();
        rfid.halt();
        delay(150);
      }
    }
  }
}