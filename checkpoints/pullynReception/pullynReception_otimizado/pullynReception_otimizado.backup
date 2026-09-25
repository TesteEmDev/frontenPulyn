// ==================== PULYN RECEPÇÃO - VERSÃO OTIMIZADA ====================
// Foco: Check-in rápido de crianças com alcance máximo

#include "config_reception.h"
#include "wifi_module_reception.h"
#include "led_module_reception.h"
#include "rfid_module_reception.h"
#include "api_module_reception.h"
#include "sound_module_reception.h"

// ==================== INSTÂNCIAS ====================
WiFiModuleReception wifi;
LEDModuleReception led;
RFIDModuleReception rfid;
APIModuleReception api;
SoundModuleReception sound;

// ==================== VARIÁVEIS GLOBAIS ====================
unsigned long lastRFIDCheck = 0;
bool unavailableVisualActive = false;

// ==================== FUNÇÕES DE TESTE ====================
void testRFIDSensitivity();
void printSystemStatus();
void handleSerialCommands();

// Função para testar sensibilidade do RFID
void testRFIDSensitivity() {
  Serial.println("\n🔍 RECEPÇÃO - TESTE DE SENSIBILIDADE RFID");
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

// Função para mostrar status do sistema
void printSystemStatus() {
  Serial.println("\n📡 RECEPÇÃO - STATUS DO SISTEMA");
  Serial.println("================================");
  Serial.println("✅ Configurações aplicadas:");
  Serial.println("  - Ganho receptor: 48dB (máximo)");
  Serial.println("  - Potência transmissão: máxima");
  Serial.println("  - Modulação otimizada para alcance");
  Serial.print("  - WiFi: ");
  Serial.println(wifi.connected ? "CONECTADO" : "DESCONECTADO");
  Serial.print("  - API: ");
  Serial.println(api.available ? "DISPONÍVEL" : "INDISPONÍVEL");
  Serial.println("\n🎯 Alcance esperado: 8-15cm");
  Serial.println("📏 Dica: Teste com 'TEST_SENSITIVITY'");
  Serial.println("================================");
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
      Serial.println("\n🔧 RECEPÇÃO - COMANDOS DISPONÍVEIS:");
      Serial.println("TEST_SENSITIVITY  - Testa alcance RFID por 10 segundos");
      Serial.println("STATUS            - Mostra configurações do sistema");
      Serial.println("HELP              - Mostra esta ajuda");
      Serial.println("\n📡 Sistema configurado para alcance máximo (48dB)");
      Serial.println("🎯 Alcance esperado: 8-15cm dependendo da pulseira");
    }
  }
}

// ==================== SETUP OTIMIZADO ====================
void setup() {
  Serial.begin(115200);
  delay(500);
  
  Serial.println("\n==========================================");
  Serial.println("     PULYN RECEPÇÃO - OTIMIZADO");
  Serial.println("  Check-in rápido + Alcance máximo");
  Serial.println("==========================================");
  Serial.println("🔧 COMANDOS DISPONÍVEIS (Serial Monitor):");
  Serial.println("  HELP              - Mostra comandos");
  Serial.println("  TEST_SENSITIVITY  - Testa alcance RFID por 10s");
  Serial.println("  STATUS            - Mostra configurações");
  Serial.println("==========================================\n");
  
  // Inicializar módulos
  led.init();
  rfid.init();  // RFID com alcance máximo
  sound.init();
  wifi.init();
  
  Serial.println("\n✅ Recepção pronta! Sistema otimizado ativado.");
  Serial.println("📡 Configuração RFID: Ganho 48dB (máximo)");
  Serial.println("🎯 Alcance esperado: 8-15cm");
  Serial.println("👋 Aproxime pulseiras para check-in\n");
}

// ==================== LOOP PRINCIPAL OTIMIZADO ====================
void loop() {
  // Verificar comandos do Serial Monitor
  handleSerialCommands();
  
  unsigned long currentTime = millis();
  
  // WiFi check otimizado
  wifi.check();
  if (!wifi.connected) {
    api.available = false;
  }

  // Indicador de conexão
  const bool connectionUnavailable = !wifi.connected || !api.available;
  if (connectionUnavailable) {
    led.updateUnavailable(true);
    unavailableVisualActive = true;
  } else if (unavailableVisualActive) {
    led.updateUnavailable(false);
    unavailableVisualActive = false;
    led.off();
  }
  
  // ==================== LEITURA RFID COM ALCANCE MÁXIMO ====================
  // Verificar RFID a cada 20ms com sensibilidade máxima
  if (currentTime - lastRFIDCheck >= 20) {
    lastRFIDCheck = currentTime;
    
    // Verificação ULTRA rápida com sensibilidade máxima
    if (rfid.checkCardQuick()) {
      String uid = rfid.getUID();
      
      // Verificação de UID válido
      if (uid.length() > 0 && uid != "00000000") {
        Serial.print("⚡ RECEPÇÃO - UID: ");
        Serial.println(uid);
        
        // Feedback IMEDIATO (antes de qualquer processamento)
        led.on(LED_YELLOW);
        
        // Verificação rápida de repetição
        if (wifi.connected && rfid.wasRecentlyProcessed(uid)) {
          Serial.println("↩️ Releitura ignorada (repetição rápida)");
          delay(80);
          led.off();
          rfid.halt();
          delay(RFID_COOLDOWN / 2);
          return;
        }
        
        // Processar leitura
        if (wifi.connected) {
          rfid.rememberProcessed(uid);
          
          // Manter LED amarelo para feedback visual
          led.on(LED_YELLOW);
          
          // Enviar leitura para backend
          Serial.println("📡 Enviando para backend...");
          bool success = api.sendReceptionReadingFast(uid);
          
          // Feedback visual e sonoro
          led.readingFeedback(success);
          sound.readingFeedback(success);
          
          if (success) {
            Serial.println("✅ Check-in registrado com sucesso!");
          } else {
            Serial.println("❌ Erro no check-in");
          }
        } else {
          Serial.println("⚠️ WiFi desconectado!");
          led.on(LED_RED);
          delay(400);
          led.off();
        }
        
        rfid.halt();
        delay(RFID_COOLDOWN / 2);
      } else {
        // UID inválido ou vazio - pode ser detecção no limite do alcance
        Serial.println("⚠️ Detecção mas UID inválido (pode estar no limite do alcance)");
        led.on(LED_YELLOW);
        delay(200);
        led.off();
        rfid.halt();
        delay(200);
      }
    }
  }
}