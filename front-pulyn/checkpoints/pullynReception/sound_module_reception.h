// ==================== SOUND_MODULE_RECEPTION.H ====================
// Controle de som otimizado para recepção Pulyn

#ifndef SOUND_MODULE_RECEPTION_H
#define SOUND_MODULE_RECEPTION_H

#include <DFRobotDFPlayerMini.h>
#include "config_reception.h"

class SoundModuleReception {
private:
  HardwareSerial mySoftwareSerial;
  DFRobotDFPlayerMini myDFPlayer;
  bool initialized = false;
  
public:
  SoundModuleReception() : mySoftwareSerial(2) {}
  
  void init() {
    Serial.println("🔊 Recepção - Inicializando DFPlayer...");
    
    mySoftwareSerial.begin(9600, SERIAL_8N1, DFPLAYER_TX, DFPLAYER_RX);
    delay(1000);
    
    if (!myDFPlayer.begin(mySoftwareSerial, false, false)) {
      Serial.println("   ⚠️ Recepção - Erro no DFPlayer (verifique cartão SD)");
      initialized = false;
      return;
    }
    
    myDFPlayer.volume(30);  // Volume máximo (0-30)
    Serial.println("   ✅ Recepção - DFPlayer OK");
    
    // Teste de som no setup
    Serial.println("   🎵 Recepção - Testando som...");
    play(SOUND_SUCCESS);
    delay(1000);
    Serial.println("   ✅ Recepção - Som testado!");
    
    initialized = true;
  }
  
  void play(int fileNumber) {
    if (!initialized) {
      Serial.println("⚠️ Recepção - DFPlayer não inicializado");
      return;
    }
    
    myDFPlayer.play(fileNumber);
  }
  
  void stop() {
    if (initialized) {
      myDFPlayer.stop();
    }
  }
  
  void setVolume(int vol) {
    if (initialized) {
      myDFPlayer.volume(vol);
    }
  }
  
  bool isReady() {
    return initialized;
  }
  
  // Feedback sonoro para leitura
  void readingFeedback(bool success) {
    if (initialized) {
      play(success ? SOUND_SUCCESS : SOUND_ERROR);
    }
  }
};

#endif