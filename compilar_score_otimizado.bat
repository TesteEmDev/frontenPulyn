@echo off
echo ==========================================
echo    COMPILADOR PULYN SCORE OTIMIZADO
echo ==========================================
echo.

echo 🔧 Preparando compilacao do Score/Telao otimizado...
echo 📁 Diretorio: checkpoints\pullynScore
echo.

echo 📋 ARQUIVOS OTIMIZADOS CRIADOS:
echo   ✅ config_score.h           - Configuracoes otimizadas
echo   ✅ rfid_module_score.h      - RFID com alcance maximo (48dB)
echo   ✅ api_module_score.h       - API com timeouts otimizados (4s/6s)
echo   ✅ wifi_module_score.h      - WiFi com reconexao automatica
echo   ✅ led_module_score.h       - LEDs com feedback otimizado
echo   ✅ sound_module_score.h     - Som com volume adequado
echo   ✅ pullynScore_otimizado.ino - Programa principal otimizado
echo   ✅ README_OTIMIZADO.md      - Guia de instalacao
echo.

echo 🎯 OTIMIZACOES APLICADAS:
echo   • Ganho RFID: 48dB (maximo configuravel)
echo   • Timeouts HTTP: 4s (conexao) / 6s (resposta)
echo   • Verificacao RFID: 20ms (ultra rapida)
echo   • Guarda repeticao: 1.5s (reduzido de 3s)
echo   • Alcance esperado: 8-15cm
echo   • Tempo resposta: <200ms
echo.

echo 🚀 PROCEDIMENTO DE COMPILACAO:
echo   1. Abra o Arduino IDE
echo   2. Selecione: ESP32 Dev Module
echo   3. Configure porta COM correta
echo   4. Abra: checkpoints\pullynScore\pullynScore_otimizado.ino
echo   5. Compile (Ctrl+R)
echo   6. Grave (Ctrl+U)
echo.

echo 🔧 COMANDOS DE TESTE DISPONIVEIS (Serial Monitor - 115200):
echo   TEST_SENSITIVITY  - Testa alcance RFID por 10 segundos
echo   STATUS            - Mostra configuracoes do sistema
echo   HELP              - Mostra ajuda
echo.

echo ✅ Pronto! Score/Telao otimizado com as mesmas melhorias da recepcao.
echo 📊 Todos os sistemas agora tem: Alcance maximo + Performance otimizada
echo.

pause