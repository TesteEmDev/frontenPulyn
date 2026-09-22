// ==================== SOUND_MODULE.H ====================
// Controlar DFPlayer Mini (som)

#ifndef SOUND_MODULE_H
#define SOUND_MODULE_H

#include <DFRobotDFPlayerMini.h>
#include "config.h"

class SoundModule {
private:
  HardwareSerial mySoftwareSerial;
  DFRobotDFPlayerMini myDFPlayer;
  bool initialized = false;
  
public:
  SoundModule() : mySoftwareSerial(2) {}
  
  void init() {
    Serial.println("🔊 Inicializando DFPlayer...");
    
    mySoftwareSerial.begin(9600, SERIAL_8N1, DFPLAYER_TX, DFPLAYER_RX);
    delay(1000);
    
    if (!myDFPlayer.begin(mySoftwareSerial, false, false)) {
      Serial.println("   ⚠️ Erro no DFPlayer (verifique cartão SD)");
      initialized = false;
      return;
    }
    
    myDFPlayer.volume(30);  // Volume máximo (0-30)
    Serial.println("   ✅ DFPlayer OK");
    
    initialized = true;

    // Teste de som no setup
    Serial.println("   🎵 Testando som...");
    play(SOUND_SUCCESS);
    delay(2000);
    Serial.println("   ✅ Som testado!");
    
    initialized = true;
  }
  
  void play(int fileNumber) {
    if (!initialized) {
      Serial.println("⚠️ DFPlayer não inicializado");
      return;
    }
    
    myDFPlayer.play(fileNumber);
    Serial.print("🎵 Tocando arquivo: ");
    Serial.println(fileNumber);
  }
  
  void stop() {
    if (initialized) {
      myDFPlayer.stop();
    }
  }
  
  void setVolume(int vol) {
    if (initialized) {
      myDFPlayer.volume(vol);
      Serial.print("🔊 Volume: ");
      Serial.println(vol);
    }
  }
  
  bool isReady() {
    return initialized;
  }
};

#endif
