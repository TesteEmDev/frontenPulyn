// ==================== RFID_MODULE.H ====================
// Ler pulseiras RFID/NFC

#ifndef RFID_MODULE_H
#define RFID_MODULE_H

#include <SPI.h>
#include <MFRC522.h>
#include "config.h"

class RFIDModule {
private:
  MFRC522 mfrc522;
  String recentUids[4];
  unsigned long recentUidAt[4] = {0, 0, 0, 0};
  uint8_t recentUidIndex = 0;
  
public:
  RFIDModule() : mfrc522(SS_PIN, RST_PIN) {}
  
  void init() {
    SPI.begin(18, 19, 23, 5);
    mfrc522.PCD_Init();
    delay(4);
    
    // Configurações de potência máxima para RC522
    // RxGain_max = ganho máximo do receptor (0-7, onde 7 é máximo ~48dB)
    mfrc522.PCD_SetAntennaGain(MFRC522::RxGain_max);
    
    // Configurar potência de transmissão manualmente no registrador
    // Registro TxASKReg (0x15) controla a amplitude do sinal transmitido
    // Valor máximo é 0x7F (127) para potência máxima
    byte txAsk = mfrc522.PCD_ReadRegister(MFRC522::TxASKReg);
    txAsk |= 0x7F;  // Máxima amplitude (bit 6=1, bits 0-5=63)
    mfrc522.PCD_WriteRegister(MFRC522::TxASKReg, txAsk);
    
    // Configurar MFOUT (Modulation and Driver output) para máximo
    // Registro RFCfgReg (0x26) controla ganho do driver RF
    byte rxCfg = mfrc522.PCD_ReadRegister(MFRC522::RFCfgReg);
    rxCfg |= 0x07;  // Bits 0-2: driver output máximo (valor 7)
    mfrc522.PCD_WriteRegister(MFRC522::RFCfgReg, rxCfg);
    
    // Habilitar completamente a antena
    mfrc522.PCD_AntennaOn();
    
    // Testar conexão com o RC522
    byte version = mfrc522.PCD_ReadRegister(MFRC522::VersionReg);
    Serial.print("✅ RFID RC522 iniciado - Versão: 0x");
    Serial.print(version, HEX);
    Serial.print(" - Potência configurada para máximo");
    
    // Ler configurações atuais para debug
    byte currentGain = mfrc522.PCD_ReadRegister(MFRC522::RFCfgReg) & 0x07;
    byte currentTxAsk = mfrc522.PCD_ReadRegister(MFRC522::TxASKReg);
    Serial.print(" (Ganho: ");
    Serial.print(currentGain);
    Serial.print(", TxASK: 0x");
    Serial.print(currentTxAsk, HEX);
    Serial.print(")");
    
    // Verificar versão
    if (version == 0x92 || version == 0x91 || version == 0x90) {
      Serial.println(" - Chip MFRC522 detectado OK");
    } else if (version == 0x00 || version == 0xFF) {
      Serial.println(" - ERRO: Chip não responde, verifique conexões!");
    } else {
      Serial.print(" - ATENÇÃO: Chip desconhecido 0x");
      Serial.println(version, HEX);
    }
  }
  
  bool isNewCard() {
    if (!mfrc522.PICC_IsNewCardPresent()) {
      return false;
    }

    if (!mfrc522.PICC_ReadCardSerial()) {
      Serial.println("⚠️ [RFID] Tag detectada, mas não foi possível ler o UID");
      return false;
    }

    Serial.println("✅ [RFID] RC522 leu o cartão com sucesso");
    return true;
  }
  
  String getUID() {
    String uid = "";
    for (byte i = 0; i < mfrc522.uid.size; i++) {
      if (mfrc522.uid.uidByte[i] < 0x10) uid += "0";
      uid += String(mfrc522.uid.uidByte[i], HEX);
    }
    
    // Converter para maiúsculas
    for (int i = 0; i < uid.length(); i++) {
      uid[i] = toupper(uid[i]);
    }
    
    return uid;
  }
  
  bool wasRecentlyProcessed(const String& uid) {
    const unsigned long now = millis();
    for (uint8_t i = 0; i < 4; i++) {
      if (recentUids[i] == uid && (now - recentUidAt[i]) < RFID_REPEAT_GUARD) {
        return true;
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
  }
};

#endif
