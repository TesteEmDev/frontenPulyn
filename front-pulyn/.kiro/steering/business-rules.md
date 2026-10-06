# 📋 REGRA DE NEGÓCIO - PULYN

**Pulyn** é uma plataforma de **gamificação para eventos infantis em buffets**, onde crianças usam pulseiras NFC para conquistar territórios, acumular pontos e competir em times durante festas.

---

## 🎯 VISÃO GERAL

### O que é Pulyn?
- Sistema SaaS multi-tenant para buffets/salões de festa
- Crianças usam **pulseiras NFC** para participar de um jogo interativo
- **Checkpoints (territorios)** espalhados no local aguardam leitura das pulseiras
- Quando criança passa a pulseira: **ganha pontos**, seu time **conquista o territorio**
- **Telão em tempo real** mostra ranking de times e crianças
- Sistema de **roles/permissões** para diferentes usuários (recepção, recreacionista, admin)

---

## 💼 MODELO DE NEGÓCIO

### Planos de Assinatura
| Plano | Preço/mês | Recursos |
|-------|-----------|----------|
| **Starter** | R$ 500 | Base |
| **Professional** | R$ 1.000 | Avançado |
| **Enterprise** | R$ 2.000 | Premium |

### Revenue
- **MRR** (Monthly Recurring Revenue): Soma de todos os planos ativos
- **Crescimento**: Novos clientes (buffets) por mês
- **Análise**: Dashboard Analytics mostra receita, crescimento, eventos

---

## 🏢 ESTRUTURA DE DADOS

### Hierarquia de Acesso

```
PULYN (Plataforma)
└── EMPRESA (1 Buffet = 1 Empresa)
    ├── LOGINS (Usuários: Admin, Recepção, Game Master, Display, Família)
    ├── EVENTOS (Festas/Eventos) 
    │   ├── CRIANCAS (Participantes)
    │   ├── TIMES (Equipes)
    │   └── CHECKPOINTS (Territorios)
    ├── BRINCADEIRAS (Jogos/Atividades)
    └── PULSEIRAS (Wearables NFC)
```

### Isolamento Multi-Tenant
- **Cada tabela** tem coluna `empresa_id`
- Usuário regular: Acessa APENAS dados da sua empresa
- Role **"master"**: Acessa TODAS empresas (Administrador Pulyn)
- Segurança: Validação `empresa_id` em CADA query

---

## 🎮 FLUXO DO JOGO

### 1️⃣ Preparação do Evento

**Admin cria evento:**
```
POST /api/eventos
{
  "name": "Festa Infantil João",
  "date": "2026-07-20",
  "time": "14:00",
  "duration": 120,  // minutos
  "enable_display": true,  // telão
  "enable_location": true  // geolocalização
}
```

**Admin cria times:**
```
POST /api/times
{
  "name": "Time Vermelho",
  "color": "#FF0000",
  "evento_id": "evento-uuid"
}
```

**Admin cadastra crianças + pulseiras:**
```
POST /api/criancas/eventos/:evento_id/criancas
{
  "name": "João Silva",
  "nickname": "João",
  "age": 7,
  "bracelet_code": "NFC-UID-1234",  // Código único pulseira
  "time_id": "time-uuid"
}
```

**Admin configura checkpoints:**
```
POST /api/checkpoints/evento/:evento_id/config/:checkpoint_id
{
  "name": "Torre Encantada",
  "location": "Sala principal",
  "points": 10,  // Pontos ao conquistar
  "territory_locked_until": null,
  "territory_cooldown_until": null
}
```

### 2️⃣ Durante o Evento

**EVENTO INICIA → Status: "active"**

**Criança passa pulseira em checkpoint:**
```
ESP32 envia:
POST /api/leituras
{
  "checkpointId": "checkpoint-uuid",
  "uid": "NFC-UID-1234",
  "brincadeiraId": "opcional",
  "signal": -45  // RSSI do sinal
}
```

**Backend processa:**
1. ✅ Busca criança por `bracelet_code` (UID)
2. ✅ Valida checkpoint existe
3. ✅ Verifica se tag está autorizada
4. ✅ Verifica se checkpoint está disponível (território)

**Sistema de Ocupação (Territorio):**
```
┌─────────────────────────────────────────────┐
│ Se territorio está LIVRE                    │
│                                             │
│ ✅ Time CONQUISTA o checkpoint              │
│ ✅ Criança ganha PONTOS                     │
│ ✅ Territory LOCKED por 15 segundos         │
│    (ninguém mais pode conquistar)           │
│ ✅ Depois: COOLDOWN de 60 segundos          │
│    (mesmo time não pode reconquistar)       │
│ ✅ Outros times podem conquistar            │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Se territorio está LOCKED                   │
│ (ocupado por outro time)                    │
│                                             │
│ ❌ Rejeita: "Territorio ocupado!            │
│    Aguarde X segundos"                      │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Se territorio está em COOLDOWN              │
│ (mesmo time já conquistou)                  │
│                                             │
│ ❌ Se mesmo time: "Seu time já              │
│    conquistou! Aguarde X segundos"          │
│ ✅ Se outro time: Pode conquistar           │
└─────────────────────────────────────────────┘
```

**Resposta ao ESP32:**
```json
{
  "ok": true,
  "authorized": true,
  "teamColor": "#FF0000",
  "points": 10,
  "criancaName": "João",
  "lockDurationSeconds": 15,
  "remainingSeconds": 45
}
```

**Broadcast em Tempo Real (WebSocket):**
```json
{
  "type": "TERRITORY_CONQUERED",
  "payload": {
    "checkpointId": "checkpoint-uuid",
    "criancaName": "João",
    "timeId": "time-uuid",
    "teamColor": "#FF0000",
    "points": 10,
    "timestamp": "2026-07-15T10:30:00Z"
  }
}
```

### 3️⃣ Pontuação

**Atualização de Pontos:**
```
Quando criança passa a pulseira:
├─ Criança recebe X pontos (configurável por checkpoint)
├─ Time recebe X pontos (soma das crianças)
├─ Registro criado em PONTUACOES table (histórico)
└─ WebSocket broadcast → Telão atualiza ranking em tempo real
```

**Ranking:**
- **Ranking de Crianças**: TOP 10 crianças com maior pontuação
- **Ranking de Times**: TOP 5 times com maior pontuação total
- Endpoint: `GET /api/ranking/eventos/:evento_id/ranking/criancas`

### 4️⃣ Telão (Display)

**Conecta via WebSocket:**
```
ws://localhost:3004
```

**Recebe atualizações em tempo real:**
- Pulseira lida (animação de conquista)
- Pontuação atualizada
- Ranking atualizado
- Cores dos times

---

## 👥 ROLES E PERMISSÕES

### Perfis de Usuário

| Role | Empresa | Acesso | Funções |
|------|---------|--------|---------|
| **admin** | Própria | Admin Panel | Criar eventos, gerenciar crianças, criar times, ver analytics |
| **reception** | Própria | Check-in | Cadastrar crianças, vincular pulseiras, receber leituras NFC |
| **game_master** | Própria | Controle | Gerenciar jogo, validar pontuação, controlar checkpoints |
| **display** | Própria | Telão | Somente leitura para exibir ranking em tempo real |
| **family** | Própria | App | Ver pontuação do filho apenas |
| **master** | TODAS | Master Dashboard | Admin Pulyn: ver todas empresas, métricas globais, alertas |

### Autenticação

**Login:**
```
POST /api/auth/login
{
  "email": "admin@buffet.com",
  "password": "senha123"
}

Resposta:
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "login-uuid",
    "email": "admin@buffet.com",
    "role": "admin",
    "empresa_id": "empresa-uuid",
    "empresa_nome": "Buffet Alegria"
  },
  "redirect": "/dashboard"  // Baseado no role
}
```

**Token JWT:**
- Válido por 24 horas
- Contém: `id`, `email`, `empresa_id`, `role`
- Método: Bearer token no header
- Verificado em TODOS endpoints protegidos

---

## 📊 DADOS E ANALYTICS

### Métricas Disponíveis

**Dashboard Master:**
- Total de empresas (clientes)
- Total de eventos realizados
- Total de crianças cadastradas
- Total de checkpoints
- MRR (receita mensal)

**Métricas por Período:**
- Crescimento de clientes por mês
- Eventos por mês
- Checkpoints conquistados (tendência)
- Receita por plano (Starter, Professional, Enterprise)

**Endpoints:**
```
GET /api/analytics/metrics              → Métricas gerais
GET /api/analytics/client-growth        → Crescimento clientes
GET /api/analytics/events-per-month     → Eventos por período
GET /api/analytics/revenue-by-plan      → Receita por plano
GET /api/analytics/mrr                  → MRR total
```

---

## 🔐 SEGURANÇA

### Implementações
✅ **JWT**: Tokens com expiração 24h
✅ **Multi-Tenant**: Isolamento de dados por `empresa_id`
✅ **Role-Based Access Control (RBAC)**: Cada role tem permissões específicas
✅ **Data Ownership**: Usuários veem apenas dados da sua empresa
✅ **Hash de Senha**: Base64 (⚠️ em produção usar bcrypt)

### Validações
- Email único em LOGINS
- Role validado em CADA request protegido
- `empresa_id` validado em CADA query
- Endpoints sem autenticação: Apenas leitura de dados públicos

---

## 📱 INTEGRAÇÃO COM HARDWARE

### ESP32 (Checkpoint)
```
Sensor NFC: RC522 (RFID/NFC)
Leitura: UID pulseira
Envio: POST /api/leituras com payload

Loop:
├─ Aguarda pulseira ser lida
├─ Envia UID + checkpoint_id + signal para backend
├─ Recebe resposta (ok, points, color, lockDuration)
├─ Exibe resultado na LCD/LED
└─ Volta para aguardar nova leitura
```

### Pulseira NFC
```
Tipo: ISO14443A / ISO15693
Formato: UUID ou UID padrão NFC
Ciclo: Criança passa pulseira → Checkpoint lê → Backend atualiza
```

---

## 📈 FLUXO COMPLETO DO EVENTO

```
[1] ADMIN PREPARA
    ├─ Cria evento (data, duração, habilita display/location)
    ├─ Cria times (nome, cor)
    ├─ Cadastra crianças (nome, pulseira, time)
    └─ Configura checkpoints (pontos, autorização)

[2] EVENTO INICIA
    ├─ Status: scheduled → active
    ├─ Telão conecta via WebSocket
    ├─ ESP32s aguardam leituras
    └─ Recepção habilita pulseiras

[3] CRIANÇA BRINCA
    ├─ Passa pulseira no checkpoint
    ├─ ESP32 lê UID + envia ao backend
    ├─ Backend valida e atualiza:
    │  ├─ criancas.scores += pontos
    │  ├─ times.points += pontos
    │  └─ registra em pontuacoes
    ├─ Broadcast: TERRITORY_CONQUERED
    └─ Telão anima conquista em TEMPO REAL

[4] COMPETIÇÃO
    ├─ Checkpoints mudam de dono ao longo do tempo
    ├─ Pontuação acumula
    ├─ Rankings atualizam a cada conquista
    └─ Telão mantém visualização em sync

[5] EVENTO TERMINA
    ├─ Status: active → completed
    ├─ Rankings finais consultados
    ├─ Histórico salvo
    └─ Certificados gerados (opcional)
```

---

## 🎯 CASOS DE USO

### Caso 1: Festa de Aniversário
```
- Admin cria evento para 20 crianças
- Divide em 4 times (5 crianças cada)
- Configura 8 checkpoints (salas temáticas)
- Evento dura 2 horas
- Equipes competem para conquistar territórios
- Telão mostra ranking em tempo real
- Resultado: Time Vermelho vence com 450 pontos
```

### Caso 2: Integração com Buffet Completo
```
- Buffet usa Pulyn em múltiplos eventos por semana
- Admin dashboard mostra receita, eventos, crianças cadastradas
- Master pode ver que esse buffet cresceu 20% este mês
- MRR aumenta com novos eventos
```

### Caso 3: App Familiar
```
- Pai cria login com role "family"
- Acessa app e vê pontuação do filho em tempo real
- Recebe notificação: "João conquistou 3 territórios!"
- Compartilha score com amigos
```

---

## 🚀 PRÓXIMAS FUNCIONALIDADES

- Certificados digitais ao final do evento
- Notificações push para pais
- Integração com pagamento (Stripe/MercadoPago)
- Customização de temas/cores por empresa
- Relatórios PDF de eventos
- Sistema de badges/conquistas

---

## 📌 RESUMO

**Pulyn** é um **game engine** para eventos infantis, focado em:

✅ Gamificação com territorios (checkpoints)
✅ Pontuação em tempo real
✅ Múltiplos perfis/roles
✅ SaaS multi-tenant
✅ Telão ao vivo
✅ Integração com hardware NFC

**Stack:** Node.js + Express + SQL Server + WebSocket + React
**Database:** SQL Server com multi-tenant isolation
**Autenticação:** JWT com role-based access control
