// ==================== RFID_MODULE_OPTIMIZED.H ====================
// Versão otimizada para leitura mais rápida de pulseiras RFID/NFC

#ifndef RFID_MODULE_OPTIMIZED_H
#define RFID_MODULE_OPTIMIZED_H

#include <SPI.h>
#include <MFRC522.h>
#include "config.h"

class RFIDModuleOptimized {
private:
  MFRC522 mfrc522;
  String recentUids[4];
  unsigned long recentUidAt[4] = {0, 0, 0, 0};
  uint8_t recentUidIndex = 0;
  unsigned long lastCheckTime = 0;
  bool cardPresentCache = false;
  unsigned long cardPresentCacheTime = 0;
  
public:
  RFIDModuleOptimized() : mfrc522(SS_PIN, RST_PIN) {}
  
  void init() {
    SPI.begin(18, 19, 23, 5);
    mfrc522.PCD_Init();
    delay(2); // Reduzido de 4 para 2ms
    
    // Configurações otimizadas para leitura mais rápida E alcance máximo
    // 1. Configurar ganho MÁXIMO do receptor: 48dB (bits 4-6 = 0x70)
    mfrc522.PCD_SetRegisterBitMask(MFRC522::RFCfgReg, 0x70);
    Serial.println("✅ Ganho receptor configurado: 48dB (máximo)");
    
    // 2. Configurar potência de transmissão para MÁXIMO
    mfrc522.PCD_WriteRegister(MFRC522::TxASKReg, 0x7F);
    Serial.println("✅ Potência transmissor configurada: máximo");
    
    // 3. Configuração de modulação para melhor alcance
    mfrc522.PCD_WriteRegister(MFRC522::ModGsPReg, 0x12);
    
    // 4. Configurar tempo de comando mais rápido
    mfrc522.PCD_WriteRegister(MFRC522::TModeReg, 0x8D);
    mfrc522.PCD_WriteRegister(MFRC522::TPrescalerReg, 0x3E);
    mfrc522.PCD_WriteRegister(MFRC522::TReloadRegL, 30);
    mfrc522.PCD_WriteRegister(MFRC522::TReloadRegH, 0);
    
    // 5. Configurar CRC mais rápido
    mfrc522.PCD_WriteRegister(MFRC522::TxModeReg, 0x00);
    mfrc522.PCD_WriteRegister(MFRC522::RxModeReg, 0x00);
    
    // 6. Habilitar antena
    mfrc522.PCD_AntennaOn();
    
    // Verificação rápida da versão
    byte version = mfrc522.PCD_ReadRegister(MFRC522::VersionReg);
    Serial.print("⚡ RFID RC522 OTIMIZADO - Versão: 0x");
    Serial.println(version, HEX);
    
    if (version == 0x92 || version == 0x91 || version == 0x90) {
      Serial.println("✅ Chip MFRC522 detectado OK - Configuração otimizada");
    }
  }
  
  // Função otimizada para detecção mais rápida
  bool isNewCard() {
    unsigned long now = millis();
    
    // Cache da detecção por 50ms para evitar verificações muito frequentes
    if (now - lastCheckTime < 50) {
      return cardPresentCache;
    }
    lastCheckTime = now;
    
    // Verificação mais rápida usando PICC_IsNewCardPresent com timeout reduzido
    bool newCard = mfrc522.PICC_IsNewCardPresent();
    
    if (newCard) {
      // Tenta ler o cartão imediatamente
      if (mfrc522.PICC_ReadCardSerial()) {
        cardPresentCache = true;
        cardPresentCacheTime = now;
        return true;
      } else {
        // Cartão detectado mas não lido - tentar novamente no próximo ciclo
        cardPresentCache = false;
        return false;
      }
    }
    
    cardPresentCache = false;
    return false;
  }
  
  // Função otimizada para verificar cartão sem delay
  bool checkCardQuick() {
    // Verificação ultra rápida - sem delay
    if (mfrc522.PICC_IsNewCardPresent()) {
      if (mfrc522.PICC_ReadCardSerial()) {
        return true;
      }
    }
    return false;
  }
  
  String getUID() {
    // Versão otimizada sem conversão para String intermediária
    char uidBuffer[9]; // 8 chars hex + null terminator
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
    
    // Verificação otimizada - loop direto
    for (uint8_t i = 0; i < 4; i++) {
      if (recentUids[i] == uid) {
        if ((now - recentUidAt[i]) < RFID_REPEAT_GUARD) {
          return true;
        }
        // Se passou do tempo de guarda, podemos reutilizar este slot
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
  
  // Função para resetar cache de cartão presente
  void resetCache() {
    cardPresentCache = false;
    lastCheckTime = 0;
  }
};

#endif