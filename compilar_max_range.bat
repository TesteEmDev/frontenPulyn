@echo off
echo =========================================
echo    COMPILAR PULYN C2 - ALCANCE MÁXIMO
echo    Versão otimizada para 8-15cm alcance
echo =========================================
echo.

echo [1] ARQUIVO PRINCIPAL: checkpoints\pullynC2_modular\pullynC2_max_range.ino
echo.

echo [2] CONFIGURAÇÕES DE ALCANCE MÁXIMO:
echo - Ganho receptor: 48dB (máximo) 0x70
echo - Potência transmissor: máximo 0x7F
echo - Corrente driver: máxima 0x20
echo - Ambas antenas habilitadas
echo.

echo [3] INSTRUÇÕES PARA COMPILAR:
echo.
echo 1. Abra o Arduino IDE
echo 2. Vá em Arquivo -> Abrir
echo 3. Navegue até: %cd%\checkpoints\pullynC2_modular
echo 4. Selecione: pullynC2_max_range.ino
echo 5. Configure placa: ESP32 Dev Module
echo 6. Compile (Ctrl+R)
echo 7. Conecte ESP32 via USB e carregue (Ctrl+U)
echo.

echo [4] TESTE APÓS GRAVAÇÃO:
echo.
echo 1. Abra Serial Monitor (115200 baud)
echo 2. Digite HELP para ver comandos
echo 3. Digite TEST_SENSITIVITY para testar alcance
echo 4. Aproxime pulseira a até 15cm
echo 5. Observe detecções no Serial Monitor
echo.

echo [5] EXPECTATIVAS DE ALCANCE:
echo - Normal: 5-8cm
echo - Bom: 8-12cm
echo - Excelente: 12-15cm (depende da pulseira)
echo.

echo [6] COMANDOS DISPONÍVEIS (Serial Monitor):
echo - HELP              : Mostra comandos
echo - TEST_SENSITIVITY  : Testa alcance por 10s
echo - STATUS            : Mostra configurações RFID
echo.

echo [7] ARQUIVOS DE CONFIGURAÇÃO:
echo - rfid_module_max_range.h : Módulo com alcance máximo
echo - api_module_optimized.h  : API otimizada
echo - config.h                : Configurações gerais
echo.

echo ✅ Sistema configurado para ALCANCE MÁXIMO!
echo 📡 Teste com diferentes distâncias e pulseiras.
echo.

pause