# 📍 RASTREIO DE AVATARES - REGRA DETALHADA

## ENTENDIMENTO DA REGRA (Já funcionando no Web)

### O QUE FAZ:
Quando uma criança lê a pulseira em um checkpoint, o avatar dela se move para perto daquele checkpoint no mapa. É como se o mapa mostrasse **"onde cada criança está no espaço físico"**.

---

## COMO FUNCIONA NO WEB (Zone Conquest)

### 1. **Estrutura de Dados**
```typescript
// scoreLog: Histórico de todas as leituras
scoreLog = [
  {
    id: "1",
    childId: "crianca-123",
    childName: "João",
    checkpointId: "checkpoint-456",
    checkpoint: "Zona Entrada",
    points: 10,
    timestamp: "2026-09-25T10:30:00Z",
    teamColor: "#FF0000"
  },
  {
    id: "2",
    childId: "crianca-123",
    childName: "João",
    checkpointId: "checkpoint-789",
    checkpoint: "Zona Verde",
    points: 15,
    timestamp: "2026-09-25T10:35:00Z",
    teamColor: "#FF0000"
  }
]

// children: Crianças ativas
children = [
  {
    id: "crianca-123",
    name: "João",
    nickname: "João",
    avatar: "👦",
    status: "active",
    teamId: "time-1"
  }
]

// checkpoints: Localização dos checkpoints no mapa
checkpoints = [
  {
    id: "checkpoint-456",
    name: "Zona Entrada",
    map_x: 50,      // Coordenada X em pixels
    map_y: 100,     // Coordenada Y em pixels
    zone: "Entrada"
  },
  {
    id: "checkpoint-789",
    name: "Zona Verde",
    map_x: 200,
    map_y: 150,
    zone: "Area Verde"
  }
]
```

### 2. **Lógica de Posicionamento**
```javascript
// Algoritmo no DisplayMap.tsx:

// Step 1: Determinar ÚLTIMO checkpoint de cada criança
const childLastZone = useMemo(() => {
  const zoneMap = {};
  const sorted = [...scoreLog].reverse();  // Mais recentes primeiro
  
  for (const entry of sorted) {
    const childId = entry.childId;
    const checkpointId = entry.checkpointId;
    
    // Se ainda não tem registo para esta criança, usar este checkpoint
    if (!zoneMap[childId]) {
      zoneMap[childId] = {
        zone: checkpoint.zone,
        checkpointId: checkpoint.id
      };
    }
  }
  return zoneMap;
}, [scoreLog, checkpoints]);

// Step 2: Calcular posição do avatar
const childPositions = useMemo(() => {
  const positions = [];
  
  for (const child of children) {
    const lastCheckpointId = childLastZone[child.id]?.checkpointId;
    const lastCheckpoint = checkpoints.find(c => c.id === lastCheckpointId);
    
    if (lastCheckpoint) {
      // Avatar vai para a posição do checkpoint
      const basePosition = getCheckpointDisplayPosition(lastCheckpoint);
      
      // Se múltiplas crianças estão no mesmo checkpoint,
      // distribui em volta (não fica uma em cima da outra)
      const slot = checkpointChildren[lastCheckpoint.id] || 0;
      checkpointChildren[lastCheckpoint.id]++;
      
      const offsetX = [-35, 0, 35][slot % 3];  // Distribui horizontalmente
      const row = Math.floor(slot / 3);
      
      positions.push({
        id: child.id,
        avatar: child.avatar,
        nickname: child.nickname,
        x: basePosition.x + offsetX,
        y: basePosition.y + 68 + row * 50
      });
    } else {
      // Se não tem leitura, coloca na zona de entrada (distribuído)
      // ... lógica de distribuição por zona
    }
  }
  
  return positions;
}, [children, childLastZone, checkpoints]);

// Step 3: Renderizar avatares no SVG
{childPositions.map(position => (
  <foreignObject
    key={position.id}
    x={position.x - 28}
    y={position.y - 60}
    width={56}
    height={150}
  >
    <div style={{ transform: 'scale(0.8)' }}>
      <Avatar emoji={position.avatar} size="sm" />
      <span>{position.nickname}</span>
    </div>
  </foreignObject>
))}
```

### 3. **Animação de Movimento**
No web, quando o scoreLog é atualizado:
1. `loadScoreLog()` é chamado (polling ou via WebSocket)
2. `childLastZone` recalcula (baseado em novo scoreLog)
3. `childPositions` recalcula as posições
4. Avatares se movem suavemente via CSS transition: `duration-700 ease-out`

```css
/* transition-[left,top] duration-700 ease-out */
transform: transition 700ms cubic-bezier(0.4, 0, 0.2, 1);
```

---

## ESTRUTURA NO BANCO DE DADOS

### Tabela: `pontuacoes` ou `score_history`
```sql
CREATE TABLE pontuacoes (
  id UUID PRIMARY KEY,
  evento_id UUID NOT NULL,
  crianca_id UUID NOT NULL,
  checkpoint_id UUID NOT NULL,
  points INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (evento_id) REFERENCES eventos(id),
  FOREIGN KEY (crianca_id) REFERENCES criancas(id),
  FOREIGN KEY (checkpoint_id) REFERENCES checkpoints(id)
);
```

### Tabela: `checkpoints`
```sql
CREATE TABLE checkpoints (
  id UUID PRIMARY KEY,
  evento_id UUID NOT NULL,
  name VARCHAR(255),
  zone VARCHAR(255),
  map_x DECIMAL(10, 2),  -- Coordenada X em pixels (0-450)
  map_y DECIMAL(10, 2),  -- Coordenada Y em pixels (0-320)
  status VARCHAR(50),    -- 'online', 'offline'
  FOREIGN KEY (evento_id) REFERENCES eventos(id)
);
```

---

## ENDPOINT DA API

### GET `/api/familias/children/scores`

**Response:**
```json
{
  "success": true,
  "scores": [
    {
      "id": "score-1",
      "childId": "crianca-123",
      "childName": "João",
      "checkpointId": "checkpoint-456",
      "checkpoint": "Zona Entrada",
      "points": 10,
      "timestamp": "2026-09-25T10:30:00Z",
      "teamColor": "#FF0000",
      "created_at": "2026-09-25T10:30:00Z"
    }
  ]
}
```

---

## IMPLEMENTAÇÃO NO MOBILE (Flutter)

### O QUE PRECISA FAZER:

1. **Receber TERRITORY_CONQUERED via WebSocket** ✅ (já funcionando)
   ```javascript
   {
     type: 'TERRITORY_CONQUERED',
     payload: {
       id: '...',
       checkpointId: '...',
       criancaId: '...',
       criancaName: 'João',
       mapX: 50,          // Novo campo
       mapY: 100,         // Novo campo
       eventoId: '...',
       gameType: 'zone_conquest'  ou  'treasure_hunt'  ou  'monster_hunt'
     }
   }
   ```

2. **Armazenar registro de leitura localmente**
   - Manter histórico similar ao `scoreLog` do web
   - Provider para rastrear último checkpoint de cada criança

3. **Calcular posição de cada avatar**
   - Baseado no último checkpoint da scoreLog
   - Se múltiplas crianças no mesmo checkpoint, distribuir em volta

4. **Animar avatar para nova posição**
   - Já temos implementado via `_animateAvatarToCheckpoint()`
   - Usar as coordenadas do checkpoint

5. **Aplicar para TODOS os jogos**
   - Zone Conquest ✅
   - Treasure Hunt (implementar)
   - Monster Hunt (implementar)

---

## PRÓXIMOS PASSOS NO MOBILE

1. **Criar provider para scoreLog**
   ```dart
   final scoreLogProvider = StreamProvider<List<ScoreEntry>>((ref) async* {
     // Retornar histórico de leituras
     // Atualizar quando receber TERRITORY_CONQUERED
   });
   ```

2. **Calcular último checkpoint de cada criança**
   ```dart
   final childLastCheckpointProvider = Provider((ref) {
     final scoreLog = ref.watch(scoreLogProvider);
     // Retornar Map<childId, checkpointId>
   });
   ```

3. **Atualizar posições de avatares**
   ```dart
   final childPositionsProvider = Provider((ref) {
     final children = ref.watch(childrenProvider);
     final lastCheckpoints = ref.watch(childLastCheckpointProvider);
     // Calcular x, y para cada criança
   });
   ```

4. **Chamar animação quando scoreLog muda**
   ```dart
   ref.listen(scoreLogProvider, (prev, next) {
     // Detectar novos checkpoints conquistados
     // Chamar _animateAvatarToCheckpoint() para cada um
   });
   ```

---

## DIFERENÇAS POR JOGO

| Jogo | Regra | Mobile |
|------|-------|--------|
| **Zone Conquest** | Avatar vai para checkpoint conquistado | ✅ Funciona |
| **Treasure Hunt** | Avatar vai para treasure checkpoint encontrado | ⚠️ Implementar |
| **Monster Hunt** | Avatar vai para monster checkpoint atacado | ⚠️ Implementar |

---

## VALIDAÇÕES IMPORTANTES

1. **Verificar se checkpoint tem coordenadas**
   ```dart
   if (mapX == null || mapY == null) {
     // Usar fallback ao banco de dados
     // ou usar posição genérica
   }
   ```

2. **Múltiplas crianças no mesmo checkpoint**
   ```dart
   // Distribuir em volta (não sobrepor)
   final slots = [-35, 0, 35];
   final offsetX = slots[slotIndex % slots.length];
   ```

3. **Animação suave**
   ```dart
   // Duration: 700-1000ms
   // Curve: ease-out ou cubic-bezier(0.4, 0, 0.2, 1)
   ```

---

## RESUMO

**Regra Core:**
> **Cada criança é mostrada no mapa próxima ao último checkpoint onde ela foi detectada (leu a pulseira)**

**Implementação:**
1. Manter histórico de leituras (scoreLog)
2. Encontrar último checkpoint de cada criança
3. Buscar coordenadas daquele checkpoint
4. Posicionar avatar naquelas coordenadas
5. Animar suavemente para a nova posição

**Benefício:**
- Pais veem em tempo real onde as crianças estão
- Rastreio automático do jogo
- Funciona em todos os 3 jogos

