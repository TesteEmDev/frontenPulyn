// ==================== SOUND_MODULE_SCORE.H ====================
// Módulo de som otimizado para Score/Telão Pulyn

#ifndef SOUND_MODULE_SCORE_H
#define SOUND_MODULE_SCORE_H

#include <DFRobotDFPlayerMini.h>
#include "config_score.h"

class SoundModuleScore {
private:
  HardwareSerial& dfSerial;
  DFRobotDFPlayerMini dfPlayer;
  bool ready;
  unsigned long lastSoundTime;
  
public:
  SoundModuleScore() : dfSerial(Serial2), ready(false), lastSoundTime(0) {}
  
  void init() {
    dfSerial.begin(9600, SERIAL_8N1, DFPLAYER_TX, DFPLAYER_RX);
    delay(1000);
    
    if (dfPlayer.begin(dfSerial, false, false)) {
      dfPlayer.volume(25); // Volume reduzido para ambiente de telão
      ready = true;
      Serial.println("✅ Score: DFPlayer iniciado");
    } else {
      Serial.println("⚠️ Score: DFPlayer não inicializado; continuando sem som");
      ready = false;
    }
  }
  
  void readingFeedback(bool success) {
    if (!ready) return;
    
    unsigned long now = millis();
    
    // Evitar sons muito próximos
    if (now - lastSoundTime < 300) {
      return;
    }
    
    lastSoundTime = now;
    
    if (success) {
      dfPlayer.play(SOUND_SUCCESS);
    } else {
      dfPlayer.play(SOUND_ERROR);
    }
  }
  
  void playWaiting() {
    if (!ready) return;
    
    unsigned long now = millis();
    if (now - lastSoundTime < 500) {
      return;
    }
    
    lastSoundTime = now;
    dfPlayer.play(SOUND_WAITING);
  }
  
  bool isReady() {
    return ready;
  }
};

#endif