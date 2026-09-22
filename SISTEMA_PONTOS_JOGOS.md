# 🎮 Sistema de Pontos para Caça ao Tesouro e Caça ao Monstro

## 📊 Proposta de Sistema de Pontuação

### 🏆 Caça ao Tesouro

#### Pontos por Ação:
- **Checkpoint Conquistado**: 100 pontos
  - Primeira equipe a conquistar: +50 bônus (150 total)
  - Cada checkpoint adicional: 100 pontos
  
- **Rodada Completa (Todos os checkpoints)**: +200 bônus
  - Total para equipe que completa tudo: 100 × N checkpoints + 200

- **Vitória da Rodada**: +300 pontos
  - Equipe que termina primeiro ganha 300 pontos extras

#### Exemplo com 5 checkpoints:
```
Equipe A (1ª a completar):
- Checkpoint 1: 150 (100 + 50 bônus)
- Checkpoint 2: 100
- Checkpoint 3: 100
- Checkpoint 4: 100
- Checkpoint 5: 100
- Bônus Rodada Completa: 200
- Bônus Vitória: 300
TOTAL: 1050 pontos

Equipe B (2ª a completar):
- Checkpoint 1: 100
- Checkpoint 2: 100
- Checkpoint 3: 100
- Checkpoint 4: 100
- Checkpoint 5: 100
- Bônus Rodada Completa: 200
TOTAL: 700 pontos
```

---

### 👹 Caça ao Monstro

#### Pontos por Ação:
- **Ataque ao Monstro**: 10 pontos por participante
  - Cada criança que ataca: 10 pontos para a equipe
  
- **Ataque Especial Desbloqueado**: +50 pontos
  - Quando todos os participantes atacam
  
- **Monstro Derrotado**: +500 pontos
  - Equipe que derrota o monstro ganha 500 pontos

#### Exemplo com 10 participantes por equipe:
```
Equipe A:
- 10 ataques normais: 10 × 10 = 100 pontos
- Ataque especial desbloqueado: 50 pontos
- Monstro derrotado: 500 pontos
TOTAL: 650 pontos

Equipe B:
- 8 ataques normais: 8 × 10 = 80 pontos
- Ataque especial NÃO desbloqueado: 0 pontos
- Monstro não derrotado: 0 pontos
TOTAL: 80 pontos
```

---

## 🎯 Implementação Técnica

### 1. Banco de Dados
Adicionar tabela `game_scores`:
```sql
CREATE TABLE game_scores (
  id UUID PRIMARY KEY,
  evento_id UUID NOT NULL,
  team_id UUID NOT NULL,
  game_type VARCHAR(50), -- 'treasure_hunt' ou 'monster_hunt'
  round_number INT,
  points INT DEFAULT 0,
  bonus_points INT DEFAULT 0,
  total_points INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (evento_id) REFERENCES eventos(id),
  FOREIGN KEY (team_id) REFERENCES times(id)
);
```

### 2. API Endpoints
```
POST /api/games/treasure-hunt/score
  - Registra pontos quando checkpoint é conquistado
  
POST /api/games/monster-hunt/score
  - Registra pontos quando monstro é derrotado
  
GET /api/games/:eventoId/scores
  - Retorna placar atual do evento
  
POST /api/games/:eventoId/next-round
  - Inicia próxima rodada (reseta pontos da rodada)
```

### 3. Frontend - Componentes Necessários

#### GameMasterControl.tsx
- Botão "Próxima Rodada" (visível quando jogo termina)
- Placar em tempo real
- Histórico de rodadas

#### DisplayMain.tsx
- Placar atualizado em tempo real
- Animação quando pontos são ganhos
- Ranking de equipes por pontos

---

## 🔄 Fluxo de Jogo

### Caça ao Tesouro:
```
1. Game Master seleciona "Caça ao Tesouro"
2. Primeira rodada começa
3. Equipes conquistam checkpoints → Pontos registrados
4. Primeira equipe completa tudo → Bônus de vitória
5. Game Master clica "Próxima Rodada"
6. Placar reseta para nova rodada
7. Repete até Game Master encerrar
```

### Caça ao Monstro:
```
1. Game Master seleciona "Caça ao Monstro"
2. Monstro aparece com HP máximo
3. Crianças atacam → Pontos por ataque
4. Todos atacam → Ataque especial desbloqueado
5. Monstro derrotado → Bônus de vitória
6. Game Master clica "Próxima Rodada"
7. Novo monstro aparece
```

---

## 📱 Tela do Recreacionista (Game Master)

### Elementos Necessários:
```
┌─────────────────────────────────────┐
│  Caça ao Tesouro - Rodada 1         │
├─────────────────────────────────────┤
│                                     │
│  Placar Atual:                      │
│  🔴 Equipe Vermelha:    450 pts     │
│  🔵 Equipe Azul:        350 pts     │
│  🟡 Equipe Amarela:     200 pts     │
│                                     │
│  [Próxima Rodada] [Encerrar Jogo]  │
│                                     │
└─────────────────────────────────────┘
```

---

## ✅ Checklist de Implementação

- [ ] Criar tabela `game_scores` no banco
- [ ] Criar endpoints de pontuação
- [ ] Adicionar botão "Próxima Rodada" no GameMasterControl
- [ ] Implementar lógica de cálculo de pontos
- [ ] Atualizar DisplayMain com placar em tempo real
- [ ] Adicionar animações de pontos ganhos
- [ ] Testar fluxo completo
- [ ] Documentar para o usuário

---

## 🎨 Sugestões de Visual

### Animação de Pontos Ganhos:
```
Quando equipe ganha pontos:
1. Número aparece em grande (ex: "+100")
2. Cor da equipe
3. Animação de subida + fade out
4. Placar atualiza com transição suave
```

### Placar no Telão:
```
Mostrar em tempo real:
- Posição de cada equipe
- Pontos totais
- Pontos da rodada
- Bônus desbloqueados
```

---

## 💡 Próximos Passos

1. Você aprova este sistema de pontos?
2. Quer ajustar os valores de pontos?
3. Quer adicionar mais bônus ou regras?
4. Começamos a implementar?


