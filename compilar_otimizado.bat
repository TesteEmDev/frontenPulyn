@echo off
echo =========================================
echo    COMPILAR PULYN C2 OTIMIZADO
echo    Versão de leitura rápida (<200ms)
echo =========================================
echo.

echo [1] Verificando arquivos otimizados...
echo.

echo Arquivo principal: checkpoints\pullynC2_modular\pullynC2_modular.ino
echo Métodos otimizados: getTerritoryStatusFast, checkModeFast, sendReadingFast
echo.

echo [2] Instruções para compilar no Arduino IDE:
echo.
echo 1. Abra o Arduino IDE
echo 2. Vá em Arquivo -> Abrir
echo 3. Navegue até: %cd%\checkpoints\pullynC2_modular
echo 4. Selecione: pullynC2_modular.ino
echo 5. Configure as configurações da placa (ESP32 Dev Module)
echo 6. Clique em "Compilar" (Ctrl+R)
echo 7. Conecte o ESP32 via USB e clique em "Carregar" (Ctrl+U)
echo.

echo [3] Configurações otimizadas:
echo - RFID cooldown: 300ms (reduzido de 600ms)
echo - Timeout API: 4s/6s (reduzido de 8s/10s)
echo - Loop check: 20ms (ultra rápido)
echo - Heartbeat: 60s (reduzido de 30s)
echo.

echo [4] Teste após gravação:
echo - Abra o Serial Monitor (115200 baud)
echo - Aproxime uma pulseira NFC
echo - Deve detectar em <200ms
echo - Verifique logs: "Leitura enviada em Xms"
echo.

pause