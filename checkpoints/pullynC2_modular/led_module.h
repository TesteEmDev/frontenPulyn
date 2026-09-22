// ==================== LED_MODULE.H ====================
// Controlar LEDs NeoPixel

#ifndef LED_MODULE_H
#define LED_MODULE_H

#include <Adafruit_NeoPixel.h>
#include "config.h"

class LEDModule {
private:
  Adafruit_NeoPixel pixels;
  
public:
  LEDModule() : pixels(NUM_LEDS, LED_PIN, NEO_GRB + NEO_KHZ800) {}
  
  void init() {
    pixels.begin();
    off();
    Serial.println("✅ LEDs iniciados");
  }
  
  void setColor(uint32_t color) {
    for (int i = 0; i < NUM_LEDS; i++) {
      pixels.setPixelColor(i, color);
    }
    pixels.show();
    Serial.print("🎨 LED definido para #");
    Serial.println(color, HEX);
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

  // Indicador contínuo e não bloqueante de indisponibilidade.
  // Vermelho fixo evita confundir falha de conexão com o alvo do Tesouro.
  // A restauração da cor normal fica sob responsabilidade do firmware principal.
  void updateUnavailable(bool active) {
    static bool running = false;

    if (!active) {
      running = false;
      return;
    }

    if (!running) {
      running = true;
      on(LED_RED);
      Serial.println("🔴 LED vermelho: Wi-Fi/API indisponível");
    }
  }
};

#endif
