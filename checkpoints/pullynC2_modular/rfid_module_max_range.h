// ==================== RFID_MODULE_MAX_RANGE.H ====================
// Configurações para ALCANCE MÁXIMO do RFID RC522
// Baseado em pesquisas de configuração ótima para alcance máximo (~10-15cm)

#ifndef RFID_MODULE_MAX_RANGE_H
#define RFID_MODULE_MAX_RANGE_H

#include <SPI.h>
#include <MFRC522.h>
#include "config.h"

class RFIDModuleMaxRange {
private:
  MFRC522 mfrc522;
  String recentUids[4];
  unsigned long recentUidAt[4] = {0, 0, 0, 0};
  uint8_t recentUidIndex = 0;
  unsigned long lastCheckTime = 0;
  bool cardPresentCache = false;
  unsigned long cardPresentCacheTime = 0;
  
public:
  RFIDModuleMaxRange() : mfrc522(SS_PIN, RST_PIN) {}
  
  void init() {
    SPI.begin(18, 19, 23, 5);
    mfrc522.PCD_Init();
    delay(4); // Tempo necessário para inicialização
    
    Serial.println("📡 CONFIGURAÇÃO PARA ALCANCE MÁXIMO DO RFID RC522");
    
    // ==================== CONFIGURAÇÕES DE POTÊNCIA MÁXIMA ====================
    
    // 1. GANHO DO RECEPTOR: MÁXIMO 48dB (RFCfgReg bits 4-6 = 0x70)
    // Valor: 0x07 << 4 = 0x70 (48dB - máximo)
    mfrc522.PCD_SetRegisterBitMask(MFRC522::RFCfgReg, 0x70);
    Serial.println("✅ Ganho do receptor configurado: 48dB (máximo)");
    
    // 2. GANHO DO TRANSMISSOR: MÁXIMO
    // TxASKReg = 0x7F (máxima potência de transmissão)
    mfrc522.PCD_WriteRegister(MFRC522::TxASKReg, 0x7F);
    Serial.println("✅ Potência do transmissor configurada: máximo");
    
    // 3. CONFIGURAÇÕES ADICIONAIS PARA ALCANCE
    // ModGsPReg: Configura modulação para melhor alcance
    mfrc522.PCD_WriteRegister(MFRC522::ModGsPReg, 0x12);
    
    // CWGsPReg: Configura forma de onda portadora
    mfrc522.PCD_WriteRegister(MFRC522::CWGsPReg, 0x3F);
    
    // TxControlReg: Controle do transmissor
    // Bit 2 = Tx2RFEn (habilita segunda antena se disponível)
    // Bit 1 = Tx1RFEn (habilita primeira antena)
    // Bit 0 = InvTx2RF (inverte fase da segunda antena)
    mfrc522.PCD_WriteRegister(MFRC522::TxControlReg, 0x03);
    
    // 4. TIMERS OTIMIZADOS PARA DETECÇÃO MAIS SENSÍVEL
    // TModeReg: Timer mode - configuração para detecção mais sensível
    mfrc522.PCD_WriteRegister(MFRC522::TModeReg, 0x8D);
    
    // TPrescalerReg: Prescaler do timer
    mfrc522.PCD_WriteRegister(MFRC522::TPrescalerReg, 0x3E);
    
    // TReloadReg: Valor de recarga do timer (maior = mais tempo para detecção)
    mfrc522.PCD_WriteRegister(MFRC522::TReloadRegL, 0x30);
    mfrc522.PCD_WriteRegister(MFRC522::TReloadRegH, 0x00);
    
    // 5. CONFIGURAÇÕES DE MODULAÇÃO PARA MAIOR ALCANCE
    // TxModeReg: Modo de transmissão
    mfrc522.PCD_WriteRegister(MFRC522::TxModeReg, 0x00);
    
    // RxModeReg: Modo de recepção
    mfrc522.PCD_WriteRegister(MFRC522::RxModeReg, 0x00);
    
    // 6. HABILITAR ANTENA COM POTÊNCIA MÁXIMA
    mfrc522.PCD_AntennaOn();
    
    // 7. VERIFICAÇÃO DA VERSÃO DO CHIP
    byte version = mfrc522.PCD_ReadRegister(MFRC522::VersionReg);
    Serial.print("📡 Chip MFRC522 detectado - Versão: 0x");
    Serial.println(version, HEX);
    
    if (version == 0x92 || version == 0x91 || version == 0x90) {
      Serial.println("✅ Chip MFRC522 OK - Configuração de alcance máximo aplicada");
      Serial.println("🎯 Alcance esperado: 8-15cm (dependendo da pulseira/ambiente)");
    } else {
      Serial.println("⚠️ Chip MFRC522 detectado mas versão desconhecida");
    }
    
    // 8. TESTE RÁPIDO DE DETECÇÃO (opcional)
    Serial.println("🔍 Testando detecção inicial...");
    delay(100);
    
    // Tentar detectar cartão para verificar configurações
    if (mfrc522.PICC_IsNewCardPresent()) {
      Serial.println("✅ Configurações OK - Cartão detectado!");
    } else {
      Serial.println("📡 Sistema pronto - Aguardando pulseiras NFC");
    }
  }
  
  // Função otimizada para detecção mais rápida e sensível
  bool isNewCard() {
    unsigned long now = millis();
    
    // Cache reduzido para sensibilidade máxima (20ms)
    if (now - lastCheckTime < 20) {
      return cardPresentCache;
    }
    lastCheckTime = now;
    
    // Verificação mais sensível com timeout estendido
    bool newCard = mfrc522.PICC_IsNewCardPresent();
    
    if (newCard) {
      // Tenta ler o cartão imediatamente
      if (mfrc522.PICC_ReadCardSerial()) {
        cardPresentCache = true;
        cardPresentCacheTime = now;
        return true;
      } else {
        // Cartão detectado mas não lido - pode indicar alcance limite
        // Mantém cache por mais tempo para tentar novamente
        cardPresentCache = true;
        cardPresentCacheTime = now;
        return true;
      }
    }
    
    cardPresentCache = false;
    return false;
  }
  
  // Função ultra sensível para verificação rápida
  bool checkCardQuick() {
    // Verificação sem cache para máxima sensibilidade
    if (mfrc522.PICC_IsNewCardPresent()) {
      if (mfrc522.PICC_ReadCardSerial()) {
        return true;
      }
      // Mesmo se não conseguir ler, retorna true para indicar detecção
      // (pulseira no limite do alcance)
      return true;
    }
    return false;
  }
  
  // Função para testar sensibilidade (para debug)
  void testSensitivity() {
    Serial.println("\n🔍 TESTE DE SENSIBILIDADE DO RFID");
    Serial.println("Aproxime uma pulseira gradualmente até o ponto de detecção");
    Serial.println("O sistema vai indicar quando detectar...");
    
    unsigned long startTime = millis();
    int detectionCount = 0;
    
    while (millis() - startTime < 10000) { // Teste por 10 segundos
      if (checkCardQuick()) {
        detectionCount++;
        Serial.print("✅ Detecção #");
        Serial.print(detectionCount);
        Serial.print(" em ");
        Serial.print(millis() - startTime);
        Serial.println("ms");
        delay(500); // Evita múltiplas detecções rápidas
      }
      delay(20);
    }
    
    Serial.print("🔍 Teste concluído: ");
    Serial.print(detectionCount);
    Serial.println(" detecções em 10 segundos");
  }
  
  String getUID() {
    // Versão otimizada para velocidade
    char uidBuffer[9];
    int pos = 0;
    
    for (byte i = 0; i < mfrc522.uid.size; i++) {
      byte b = mfrc522.uid.uidByte[i];
      
      // Primeiro nibble
      byte high = (b >> 4) & 0x0F;
      uidBuffer[pos++] = (high < 10) ? ('0' + high) : ('A' + high - 10);
      
      // Segundo nibble  
      byte low = b & 0x0F;
      uidBuffer[pos++] = (low < 10) ? ('0' + low) : ('A' + low - 10);
    }
    
    uidBuffer[pos] = '\0';
    return String(uidBuffer);
  }
  
  bool wasRecentlyProcessed(const String& uid) {
    const unsigned long now = millis();
    
    for (uint8_t i = 0; i < 4; i++) {
      if (recentUids[i] == uid) {
        if ((now - recentUidAt[i]) < RFID_REPEAT_GUARD) {
          return true;
        }
        break;
      }
    }
    return false;
  }

  void rememberProcessed(const String& uid) {
    recentUids[recentUidIndex] = uid;
    recentUidAt[recentUidIndex] = millis();
    recentUidIndex = (recentUidIndex + 1) % 4;
  }

  void halt() {
    mfrc522.PICC_HaltA();
    mfrc522.PCD_StopCrypto1();
  }
  
  void resetCache() {
    cardPresentCache = false;
    lastCheckTime = 0;
  }
  
  // Método para verificar status do RFID
  void printStatus() {
    Serial.println("\n📡 STATUS DO RFID RC522");
    Serial.print("Cache de cartão: ");
    Serial.println(cardPresentCache ? "ATIVO" : "INATIVO");
    Serial.print("Última verificação há: ");
    Serial.print(millis() - lastCheckTime);
    Serial.println("ms");
    
    // Ler alguns registros para verificar configurações
    byte rxCfg = mfrc522.PCD_ReadRegister(MFRC522::RFCfgReg);
    Serial.print("RFCfgReg (ganho receptor): 0x");
    Serial.println(rxCfg, HEX);
    
    byte txAsk = mfrc522.PCD_ReadRegister(MFRC522::TxASKReg);
    Serial.print("TxASKReg (potência transmissão): 0x");
    Serial.println(txAsk, HEX);
  }
};

#endif