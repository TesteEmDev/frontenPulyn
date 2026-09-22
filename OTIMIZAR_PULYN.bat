@echo off
echo =========================================
echo   OTIMIZADOR PULYN - LEITURA RÁPIDA
echo =========================================
echo.

echo 1. Copiando arquivos otimizados...
echo.

REM Copiar arquivos otimizados para substituir os originais
copy "checkpoints\pullynC2_modular\rfid_module_optimized.h" "checkpoints\pullynC2_modular\rfid_module.h" /Y
copy "checkpoints\pullynC2_modular\api_module_optimized.h" "checkpoints\pullynC2_modular\api_module.h" /Y
copy "checkpoints\pullynC2_modular\config_optimized.h" "checkpoints\pullynC2_modular\config.h" /Y
copy "checkpoints\pullynC2_modular\pullynC2_modular_optimized.ino" "checkpoints\pullynC2_modular\pullynC2_modular.ino" /Y

echo.
echo 2. Arquivos otimizados copiados com sucesso!
echo.
echo 3. Resumo das otimizações aplicadas:
echo    - RFID Module: Leitura ultra rápida (~50ms)
echo    - API Module: Timeouts reduzidos (4s/6s)
echo    - Config: Timers otimizados
echo    - Firmware: Loop principal otimizado
echo.
echo 4. AGORA COMPILE E GRAVE O FIRMWARE:
echo.
echo    Passo 1: Abra Arduino IDE
echo    Passo 2: Abra checkpoints\pullynC2_modular\pullynC2_modular.ino
echo    Passo 3: Selecione placa "ESP32 Dev Module"
echo    Passo 4: Clique em "Verificar/Compilar" (Ctrl+R)
echo    Passo 5: Clique em "Upload/Gravar" (Ctrl+U)
echo    Passo 6: Abra Serial Monitor (115200 baud)
echo.
echo 5. Resultado esperado:
echo    - Leitura RFID: < 200ms total
echo    - Feedback visual: Imediato (LED amarelo)
echo    - Resposta completa: 1-2 segundos
echo.
echo =========================================
echo   PRONTO PARA TESTAR LEITURA RÁPIDA!
echo =========================================
pause