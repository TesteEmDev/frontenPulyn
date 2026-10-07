# 🏗️ Arquitetura do Sistema Pulyn

## 📊 Visão Geral

Pulyn é uma plataforma SaaS de **gamificação para eventos infantis** que usa:
- **Pulseiras NFC** para identificar crianças
- **Checkpoints/Scanners** espalhados no local
- **Telão em tempo real** para mostrar ranking
- **Jogos interativos** (Tesouro, Monstro, Zona Conquest)

---

## 🏢 Hierarquia de Dados (Multi-Tenant)

```
PULYN (Plataforma)
  └─ EMPRESA (Buffet/Salão)
     ├─ LOGINS
     │  ├─ admin (gerencia empresa)
     │  ├─ reception (entrada)
     │  ├─ game_master (controla jogo)
     │  ├─ display (telão)
     │  └─ kiosk (autoatendimento)
     │
     ├─ EVENTOS (Festas)
     │  ├─ CRIANCAS (participantes + pulseira)
     │  ├─ TIMES (equipes)
     │  ├─ CHECKPOINTS (scanners)
     │  └─ BRINCADEIRAS (jogos)
     │
     └─ PULSEIRAS (wearables NFC)
```

**Isolamento:** Cada tabela tem `empresa_id`. Usuários regulares veem SÓ dados de sua empresa.

---

## 🗄️ Banco de Dados PostgreSQL

### Tabelas Principais

| Tabela | Descrição | Chave |
|--------|-----------|-------|
| `logins` | Usuários (admin, recepção, etc) | UUID |
| `empresas` | Buffets/Clientes | UUID |
| `eventos` | Festas/Eventos | UUID |
| `criancas` | Participantes | UUID |
| `times` | Equipes | UUID |
| `checkpoints` | Terminais/Scanners | UUID |
| `pulseiras` | Wearables NFC | UUID |
| `brincadeiras` | Jogos/Atividades | UUID |
| `leituras` | Histórico de scans NFC | BIGINT |
| `pontuacoes` | Scoring/Pontos | BIGINT |
| `game_sessions` | Sessões de jogo | UUID |
| `zone_conquest_*` | Dados jogo Zona Conquest | Mixed |
| `monster_hunt_*` | Dados jogo Caça Monstro | Mixed |

### Relações Principais

```sql
-- Uma criança pertence a um time e um evento
criancas.time_id → times.id
criancas.evento_id → eventos.id

-- Um evento pertence a uma empresa
eventos.empresa_id → empresas.id

-- Um checkpoint pertence a um evento
checkpoints.evento_id → eventos.id

-- Uma leitura é um scan: criança + checkpoint
leituras.crianca_id → criancas.id
leituras.checkpoint_id → checkpoints.id
```

---

## 🎮 Fluxo de um Jogo

### Preparação
1. **Admin cria Evento** (festinha com data/hora)
2. **Admin cria Times** (4 equipes de cores diferentes)
3. **Recepção vincula crianças** (nome + time + pulseira NFC)
4. **Admin configura Checkpoints** (espalha scanners no local)
5. **Admin seleciona Jogo** (Tesouro, Monstro ou Zona Conquest)

### Execução
```
Game Master clica "Iniciar Jogo"
  ↓
Backend cria game_session e altera evento.status='active'
  ↓
WebSocket broadcast "GAME_STARTED" para todos (telão, checkpoints, frontend)
  ↓
Criança passa pulseira no Checkpoint
  ↓
Backend registra leitura → time ganha ponto → telão atualiza
  ↓
Game termina (timeout ou clique "Parar Jogo")
  ↓
evento.status='scheduled' + pontuação salva
```

### Estrutura de uma Leitura (scan NFC)
```json
{
  "checkpoint_id": "checkpoint-01",
  "pulseira_id": "NFC001",
  "crianca_id": "child-001",
  "time_id": "time-red",
  "evento_id": "evento-001",
  "points": 10,
  "timestamp": "2026-10-05T14:23:45Z",
  "game_type": "zone_conquest"
}
```

---

## 🏛️ Arquitetura Técnica

### Frontend (React 18 + TypeScript + Vite)

**Localização:** `front-pulyn/`

```
src/
├── pages/
│   ├── admin/              # Painel administrativo
│   │   ├── AdminDashboard
│   │   ├── AdminEvents
│   │   ├── AdminChildren
│   │   ├── AdminGameForm
│   │   └── AdminCheckpointConfig
│   │
│   ├── display/            # Telão em tempo real
│   │   ├── Display
│   │   ├── DisplayGame
│   │   └── DisplayRanking
│   │
│   └── kiosk/              # Autoatendimento
│       ├── KioskEntry
│       └── KioskScore
│
├── hooks/
│   ├── useGameWebSocket    # Conexão WebSocket
│   ├── useEventControl     # Controle de eventos
│   ├── useNFCReader        # Simulador NFC
│   └── useGameState        # Estado global
│
└── stores/                 # Zustand state management
```

**Dependências:**
- React 18.3
- React Router v7
- TailwindCSS
- Zustand (estado)
- Recharts (gráficos)
- Three.js (3D avatares)

### Backend (Node.js + Express)

**Localização:** `backendPulyn/`

```
├── index.js                # Servidor principal + WebSocket
├── database.js             # Pool PostgreSQL
├── routes/                 # API endpoints
│   ├── auth.js             # Login/JWT
│   ├── events.js           # Gerenciar eventos
│   ├── children.js         # Gerenciar crianças
│   ├── checkpoints.js      # Gerenciar scanners
│   ├── leituras.js         # Registrar scans
│   ├── treasure.js         # Jogo: Caça ao Tesouro
│   ├── monster.js          # Jogo: Caça ao Monstro
│   ├── zoneConquest.js     # Jogo: Zona Conquest
│   └── ...
│
├── utils/
│   ├── middleware.js       # JWT, roles, permissions
│   ├── gameState.js        # Persistência estado jogo
│   ├── treasure.js         # Lógica Tesouro
│   ├── monster.js          # Lógica Monstro
│   ├── zoneConquest.js     # Lógica Zona Conquest
│   └── ...
│
├── migrations/             # SQL schemas (auto-executadas)
│   ├── family.js
│   ├── avatar.js
│   ├── zoneConquest.js
│   └── ...
│
└── test/                   # Testes automatizados
```

**Dependências:**
- Express 4.22
- PostgreSQL driver (`pg`)
- WebSocket (`ws`)
- JWT (`jsonwebtoken`)
- UUID

### Hardware (Arduino)

**Localização:** `checkpoints/`

```
checkpoints/
├── pullynC2_modular/       # Checkpoint com RFID
│   ├── pullynC2_modular.ino
│   ├── wifi_module.h       # WiFi + WebSocket
│   ├── rfid_module.h       # Leitor NFC/RFID
│   └── api_module.h        # HTTP requests
│
├── pullynReception/        # Recepção (entrada)
├── pullynScore/            # Scoreboard (telão)
└── ...
```

**Funcionalidade:**
- Conecta ao WiFi
- Lê pulseira NFC
- Envia leitura via HTTP/WebSocket
- Recebe modo (idle/game/checkin)

---

## 📡 Comunicação em Tempo Real (WebSocket)

### Conexão
```javascript
// Frontend
const ws = new WebSocket(
  'ws://localhost:3001?evento_id=evento-001&token=JWT_TOKEN'
);

// Backend recebe e autentica
wss.on('connection', (ws, req) => {
  const eventoId = url.searchParams.get('evento_id');
  // Valida JWT e evento_id
});
```

### Tipos de Mensagens

| Tipo | Origem | Descrição |
|------|--------|-----------|
| `GAME_STARTED` | Backend → Todos | Jogo iniciado |
| `GAME_STOPPED` | Backend → Todos | Jogo parado |
| `NFC_SCAN` | Arduino → Backend | Leitura de pulseira |
| `CHECKPOINT_MODE_CHANGED` | Backend → Arduino | Mudar modo checkpoint |
| `RANKING_UPDATED` | Backend → Display | Telão atualizar ranking |
| `TERRITORY_CHANGED` | Backend → Display | Novo domínio em zona conquest |

---

## 🔐 Autenticação & Autorização

### JWT Token
```json
{
  "id": "user-001",
  "email": "admin@buffet.com",
  "role": "admin",
  "empresa_id": "empresa-001",
  "iat": 1728124800,
  "exp": 1728128400
}
```

### Roles & Permissões
| Role | Permissões |
|------|-----------|
| **master** | Acessa TUDO (todas empresas) |
| **admin** | Cria eventos, gerencia empresa |
| **game_master** | Controla jogo (iniciar/parar) |
| **reception** | Registra crianças + pulseiras |
| **display** | Recebe dados telão (read-only) |
| **kiosk** | Entrada + scoring (autoatendimento) |
| **family** | Vê seu filho no ranking |

### Validação em Cada Query
```javascript
// Middleware garante isolamento
app.get('/api/eventos', verifyToken, async (req, res) => {
  const eventos = await query(
    `SELECT * FROM eventos 
     WHERE empresa_id = @empresaId OR role = 'master'`,
    { empresaId: req.user.empresa_id }
  );
});
```

---

## 🎮 Tipos de Jogos

### 1. Caça ao Tesouro
- **Objetivo:** Encontrar um checkpoint especial (tesouro)
- **Rodadas:** Turnos entre times
- **Conclusão:** Quando um time encontra o tesouro (automático)
- **BD:** `treasure_hunt_*` tables

### 2. Caça ao Monstro
- **Objetivo:** Derrotar um "monstro" em equipe
- **Mecânica:** Cada scan reduz vida do monstro
- **Conclusão:** Quando HP chega a 0 ou timeout
- **BD:** `monster_hunt_*` tables

### 3. Zona Conquest
- **Objetivo:** Conquistar o máximo de territórios
- **Versões:**
  - **Team:** Por equipe (modo cooperativo)
  - **Individual:** Cada criança por si (competitivo)
- **Mecânica:** Scan = marca territorial (com cooldown)
- **BD:** `zone_conquest_*` tables

---

## 📊 Scoring

### Ganho de Pontos
- **Leitura válida:** +10 pontos (configurável)
- **Checkpoint novo:** +5 pontos extra
- **Jogo vencido:** +50 pontos

### Histórico
```sql
SELECT * FROM pontuacoes
WHERE crianca_id = 'child-001'
  AND evento_id = 'evento-001'
ORDER BY created_at DESC;
```

### Ranking em Tempo Real
```sql
SELECT 
  c.name, 
  c.scores, 
  t.name as time,
  COUNT(l.id) as reads
FROM criancas c
LEFT JOIN times t ON t.id = c.time_id
LEFT JOIN leituras l ON l.crianca_id = c.id
WHERE c.evento_id = @eventoId
GROUP BY c.id
ORDER BY c.scores DESC;
```

---

## 🔄 Fluxo de Dados (Arquitetura)

```
┌─────────────────────────────────────────────────────────┐
│                    PULYN SYSTEM                         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  FRONTEND (React)  ←WebSocket→  BACKEND (Node.js)     │
│  ├─ Admin Panel                  ├─ API Routes       │
│  ├─ Display (Telão)              ├─ WebSocket Hub    │
│  ├─ Kiosk                        └─ Business Logic   │
│  └─ Family App                                        │
│                                                         │
│                         ↓ SQL                          │
│                    PostgreSQL DB                       │
│                                                         │
│  HARDWARE (Arduino)                                     │
│  ├─ Checkpoint 1 ──HTTP─→ Backend                     │
│  ├─ Checkpoint 2 ──HTTP─→ Backend                     │
│  └─ Checkpoint N ──HTTP─→ Backend                     │
│                                                         │
│  WEARABLES (NFC)                                        │
│  └─ Pulseira ─read→ Checkpoint ─POST→ Backend         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 📈 Performance & Escalabilidade

### PostgreSQL Optimization
- **Índices:** Em `evento_id`, `empresa_id`, `crianca_id`
- **Connection Pool:** Max 10 conexões (Supabase limit)
- **Queries:** Prepared statements para evitar SQL injection
- **Caching:** Estado em memória (gameStatus, currentMode)

### Limitações Atuais
- 1 processo Node.js → múltiplos eventos requeem sincronização
- WebSocket em memória (não escalável horizontalmente)
- Pool PostgreSQL limitado

### Escalar para Produção
1. Usar **load balancer** + múltiplos Node.js
2. Usar **Redis** para compartilhar estado entre instâncias
3. Usar **Supabase** (PostgreSQL gerenciado)
4. Implementar **salas WebSocket** isoladas por empresa

---

## 🚀 Deployment

### Desenvolvimento
```bash
npm run dev  # Backend rodando em :3001
npm run dev  # Frontend rodando em :5173
```

### Produção
```bash
npm run build      # Frontend → dist/
npm run start      # Backend → :3001

# Banco: Supabase PostgreSQL
DATABASE_URL=postgresql://...supabase.co
```

---

## 📚 Próximas Leituras

1. **Business Rules:** `.kiro/steering/business-rules.md`
2. **API Endpoints:** `backendPulyn/routes/`
3. **Data Models:** `backendPulyn/migrations/`
4. **Frontend Components:** `front-pulyn/src/pages/`

---

**Sistema pronto para desenvolvimento!** 🎉
