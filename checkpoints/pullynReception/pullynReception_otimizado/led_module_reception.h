// ==================== LED_MODULE_RECEPTION.H ====================
// Controle de LEDs otimizado para recepção Pulyn

#ifndef LED_MODULE_RECEPTION_H
#define LED_MODULE_RECEPTION_H

#include <Adafruit_NeoPixel.h>
#include "config_reception.h"

class LEDModuleReception {
private:
  Adafruit_NeoPixel pixels;
  bool unavailableActive = false;
  
public:
  LEDModuleReception() : pixels(NUM_LEDS, LED_PIN, NEO_GRB + NEO_KHZ800) {}
  
  void init() {
    pixels.begin();
    off();
    Serial.println("✅ Recepção - LEDs iniciados");
  }
  
  void setColor(uint32_t color) {
    for (int i = 0; i < NUM_LEDS; i++) {
      pixels.setPixelColor(i, color);
    }
    pixels.show();
  }
  
  void on(uint32_t color) {
    setColor(color);
  }
  
  void off() {
    setColor(LED_OFF);
  }
  
  void blink(uint32_t color, int times, int delay_ms) {
    for (int i = 0; i < times; i++) {
      on(color);
      delay(delay_ms);
      off();
      delay(delay_ms);
    }
  }

  // Indicador de indisponibilidade (WiFi/API offline)
  void updateUnavailable(bool active) {
    static bool running = false;

    if (!active) {
      running = false;
      return;
    }

    if (!running) {
      running = true;
      on(LED_RED);
      Serial.println("🔴 Recepção: Wi-Fi/API indisponível");
    }
  }
  
  // Feedback rápido para leitura
  void readingFeedback(bool success) {
    if (success) {
      blink(LED_GREEN, 2, FEEDBACK_BLINK_FAST);
    } else {
      blink(LED_RED, 2, FEEDBACK_BLINK_SLOW);
    }
  }
};

#endif