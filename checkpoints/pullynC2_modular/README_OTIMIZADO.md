# 🚀 PULYN C2 - VERSÃO OTIMIZADA

## 📋 PRINCIPAIS MELHORIAS

### ⚡ Redução de Delay (alvo: <200ms)
- **RFID**: Cooldown reduzido de 600ms para 300ms
- **Loop principal**: Verificação a cada 20ms (antes: bloqueante)
- **API Timeouts**: Reduzidos de 8s/10s para 4s/6s
- **Feedback visual**: Tempos de resposta reduzidos em ~50%

### 🔧 Arquitetura Otimizada
- **Métodos Fast**: `getTerritoryStatusFast()`, `checkModeFast()`, `sendReadingFast()`
- **Cache local**: Evita releituras repetidas
- **HTTP reutilizável**: Conexões mantidas para requests subsequentes
- **JSON mínimo**: Payload reduzido para respostas mais rápidas

## 📁 ESTRUTURA DE ARQUIVOS

```
checkpoints/pullynC2_modular/
├── pullynC2_modular.ino          # Arquivo PRINCIPAL
├── config.h                      # Configurações (rede padrão, servidor, ID do checkpoint)
├── api_module_optimized.h        # Comunicação com a API
├── rfid_module.h                 # Leitor RFID (RFIDModuleOptimized)
├── led_module.h                  # Controle dos LEDs
├── sound_module.h                # Sons
├── wifi_module.h                 # Conexão Wi-Fi
├── wifi_portal.h                 # Portal para trocar a rede pelo celular
└── README_OTIMIZADO.md           # Este arquivo
```

## 🛠️ COMO COMPILAR

### 🚨 PROBLEMA COMUM
**ERRO**: `'class APIModuleOptimized' has no member named 'getTerritoryStatus'`

**CAUSA**: Você está compilando o arquivo **ERRADO** da pasta antiga:
- ❌ `checkpoints/pullynC2/pullynC2_modular.ino` (VERSÃO ANTIGA)
- ✅ `checkpoints/pullynC2_modular/pullynC2_modular.ino` (VERSÃO OTIMIZADA)

### ✅ SOLUÇÃO CORRETA
1. **Abra o Arduino IDE**
2. **Vá em Arquivo → Abrir**
3. **Navegue até**: `checkpoints/pullynC2_modular`
4. **Selecione**: `pullynC2_modular.ino`
5. **Configure placa**: ESP32 Dev Module
6. **Porta**: USB do ESP32
7. **Compile** (Ctrl+R)
8. **Carregue** (Ctrl+U)

## 🧪 TESTE APÓS GRAVAÇÃO

### Monitor Serial (115200 baud)
Verifique se aparece:
```
==========================================
     PULYN CHECKPOINT C2 - OTIMIZADO
      Leitura rápida (<200ms target)
==========================================

⚡ Sistema pronto! Leitura otimizada ativada.
```

### Teste de Leitura NFC
1. Aproxime uma pulseira NFC
2. **Log esperado**:
```
⚡ UID: (ex: 04 E7 2C 1A 89 68 80)
📡 Processando leitura...
⚡ Leitura enviada em 150ms  # Deve ser <200ms
✅ (resultado)
```

## 🔍 COMPARAÇÃO: ANTES vs DEPOIS

| Métrica | Versão Antiga | Versão Otimizada | Redução |
|---------|---------------|------------------|---------|
| RFID Cooldown | 600ms | 300ms | 50% |
| Timeout API | 8s/10s | 4s/6s | 50% |
| Loop Check | Bloqueante | 20ms | >90% |
| Heartbeat | 30s | 60s | 50% menos |
| Feedback Error | 2000ms | 800ms | 60% |

## 📊 OTIMIZAÇÕES IMPLEMENTADAS

### 1. **RFID Ultra Rápido**
- `RFIDModuleOptimized` com detecção mais rápida
- `checkCardQuick()` verifica em 20ms
- Cache para evitar processamento repetido

### 2. **API Otimizada**
- `APIModuleOptimized` com métodos `*Fast()`
- Timeouts agressivos: 4s (conectar), 6s (responder)
- JSON payload mínimo (menos dados = mais rápido)

### 3. **Loop Não-Bloqueante**
- Processamento assíncrono
- WiFi verificado sem bloquear leitura
- Heartbeat menos frequente (60s vs 30s)

### 4. **Feedback Visual Rápido**
- LED amarelo IMEDIATO ao detectar pulseira
- Tempos de animação reduzidos
- Restauração de cor otimizada

## 🔧 CONFIGURAÇÕES CHAVE

```cpp
// config.h (versão otimizada)
const unsigned long RFID_COOLDOWN = 300;           // 300ms
const unsigned long FAST_LOOP_INTERVAL = 20;       // 20ms
const unsigned long HEARTBEAT_INTERVAL = 60000;    // 60s

// API timeouts otimizados
const uint16_t HTTP_CONNECT_TIMEOUT_FAST = 4000;   // 4s
const uint16_t HTTP_RESPONSE_TIMEOUT_FAST = 6000;  // 6s
```

## 🚨 NOTAS IMPORTANTES

1. **Use o arquivo correto**: `checkpoints/pullynC2_modular/pullynC2_modular.ino`
2. **Backend online**: `https://backendpulyn.onrender.com`
3. **Checkpoint ID**: `15` (configurado no banco)
4. **WiFi**: "Adv-wifi-Backup" / "advwifibkp"
5. **Teste com Serial Monitor aberto** para ver logs

## 🎯 RESULTADO ESPERADO

**Delay de leitura**: <200ms (antes: ~1000ms)
**Feedback visual**: Instantâneo
**Experiência do usuário**: Muito mais responsiva
**Jogos funcionando**: Todos 3 (território, tesouro, monstro)

---

**Status**: ✅ **PRONTO PARA COMPILAR E TESTAR**
**Arquivo correto**: `checkpoints/pullynC2_modular/pullynC2_modular.ino`
**Objetivo**: Reduzir delay de ~1s para <200ms
## 📶 TROCAR A REDE WI-FI SEM REGRAVAR O FIRMWARE

A rede deixou de ser fixa no código. O ESP32 usa a rede gravada pelo portal e,
se não houver nenhuma, a de `WIFI_SSID` / `WIFI_PASSWORD` do `config.h`.

**Como trocar a rede (pelo celular):**
1. Abra o portal de um destes jeitos:
   - ele abre sozinho se não conseguir conectar na inicialização ou ficar 2 min sem rede;
   - segure o botão **BOOT** por 3 segundos com o aparelho já ligado;
   - ou digite `WIFI_PORTAL` no Monitor Serial (115200).
2. No celular, conecte no Wi-Fi **`Pulyn-CP-<id do checkpoint>`** (senha `pulyn1234`,
   alterável em `PORTAL_AP_PASSWORD`).
3. A página abre sozinha; se não abrir, acesse `http://192.168.4.1`.
4. Escolha a rede, digite a senha e toque em **Salvar e reiniciar**.

O portal fecha sozinho depois de 3 minutos sem uso. Para voltar à rede padrão do
firmware, use **Esquecer rede salva** na página ou `WIFI_RESET` no Monitor Serial.

Arquivos: `wifi_portal.h` (portal e memória) e `wifi_module.h` (conexão).

### Trocar a rede com o checkpoint já conectado (sem apertar botão)

Enquanto está conectado, o ESP32 também serve a página de configuração na rede do
local. Com o celular **no mesmo Wi-Fi do checkpoint**, abra no navegador:

- `http://pulyn-cp-<id>.local` (exemplo: `http://pulyn-cp-23.local`), ou
- `http://<IP do checkpoint>` (o IP aparece no Monitor Serial ao conectar, com o
  comando `WIFI_STATUS`, ou na lista de aparelhos do roteador).

A página pede **usuário `admin`** e a **senha do portal** (`PORTAL_AP_PASSWORD`,
padrão `pulyn1234`). Escolha a nova rede, salve, e o checkpoint reinicia nela.
Se a nova rede não funcionar, o portal próprio (`Pulyn-CP-<id>`) abre sozinho.

### IP fixo (opcional)

Na mesma página de configuração há os campos **IP fixo**, **Gateway**, **Máscara** e
**DNS**. Deixe o IP em branco para o roteador escolher sozinho (padrão).

- Use um IP livre, da mesma faixa do roteador e fora da faixa automática dele
  (ex.: roteador `192.168.0.1`, checkpoint `192.168.0.50`).
- Máscara em branco = `255.255.255.0`; DNS em branco = igual ao gateway.
- Para mudar só o IP, deixe o nome da rede e a senha em branco: a rede salva é mantida.
- Ao mudar de local, apague o IP (ou ajuste à nova faixa); se o IP não servir na nova
  rede, o aparelho não conecta e o portal próprio abre sozinho.
- Alternativa sem mexer no aparelho: no roteador, reserve um IP para o MAC do ESP32
  (função "DHCP estático" / "reserva de IP").
