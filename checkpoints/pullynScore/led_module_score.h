// ==================== LED_MODULE_SCORE.H ====================
// Módulo LED otimizado para Score/Telão Pulyn

#ifndef LED_MODULE_SCORE_H
#define LED_MODULE_SCORE_H

#include <Adafruit_NeoPixel.h>
#include "config_score.h"

class LEDModuleScore {
private:
  Adafruit_NeoPixel pixels;
  unsigned long unavailableVisualStart;
  bool unavailableVisualActive;
  uint32_t currentColor;
  unsigned long lastBlinkTime;
  bool blinkState;
  
public:
  LEDModuleScore() : pixels(NUM_LEDS, LED_PIN, NEO_GRB + NEO_KHZ800),
                    unavailableVisualActive(false), currentColor(LED_OFF),
                    lastBlinkTime(0), blinkState(false) {}
  
  void init() {
    pixels.begin();
    off();
    Serial.println("✅ Score: LEDs iniciados");
  }
  
  void on(uint32_t color) {
    currentColor = color;
    for (uint8_t i = 0; i < NUM_LEDS; i++) {
      pixels.setPixelColor(i, color);
    }
    pixels.show();
  }
  
  void off() {
    on(LED_OFF);
  }
  
  void blink(uint32_t color, uint8_t times, uint16_t waitMs) {
    for (uint8_t i = 0; i < times; i++) {
      on(color);
      delay(waitMs);
      off();
      delay(waitMs);
    }
  }
  
  void readingFeedback(bool success) {
    if (success) {
      // Feedback verde rápido para sucesso
      blink(LED_GREEN, 2, 80);
    } else {
      // Feedback vermelho para erro
      blink(LED_RED, 2, 150);
    }
  }
  
  void updateUnavailable(bool unavailable) {
    if (unavailable && !unavailableVisualActive) {
      unavailableVisualActive = true;
      unavailableVisualStart = millis();
      Serial.println("⚠️ Score: indicador de indisponibilidade ativado");
    } else if (!unavailable && unavailableVisualActive) {
      unavailableVisualActive = false;
      off();
      Serial.println("✅ Score: indicador de indisponibilidade desativado");
    }
  }
  
  void update() {
    unsigned long now = millis();
    
    if (unavailableVisualActive) {
      // Piscar azul lentamente quando sistema indisponível
      if (now - lastBlinkTime >= 800) {
        lastBlinkTime = now;
        blinkState = !blinkState;
        
        if (blinkState) {
          on(LED_BLUE);
        } else {
          off();
        }
      }
    }
  }
};

#endif