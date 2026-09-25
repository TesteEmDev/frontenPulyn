# 🎯 AVATAR TRACKING DEBUGGING GUIDE

## CRITICAL: Follow these steps EXACTLY to identify where the data flow breaks

---

## STEP 1: Verify Checkpoint Coordinates in Database

**Why:** If checkpoints have NULL `map_x` and `map_y`, avatars have no target to move to.

### Option A: PostgreSQL (Render Production)
```sql
-- On Render PostgreSQL console:
SELECT id, name, map_x, map_y, evento_id 
FROM checkpoints 
WHERE evento_id = '<YOUR_EVENTO_ID>'
ORDER BY name;

-- Expected: map_x and map_y should be numbers like 25.5, 75.3, NOT NULL
```

### Option B: SQL Server (Local)
```sql
SELECT id, name, map_x, map_y, evento_id 
FROM checkpoints 
WHERE evento_id = '<YOUR_EVENTO_ID>'
ORDER BY name;
```

**What to look for:**
- ✅ All checkpoints have `map_x` and `map_y` with numeric values (0-100)
- ❌ ANY checkpoint with NULL coordinates = **ROOT CAUSE**

---

## STEP 2: Verify Children are Loading on Mobile

**Why:** If no children render on the map, there's nothing to animate.

### Mobile Debug Logs:
Run Monster Hunt game and watch mobile logs for:

```
📍 [HOME_SCREEN] _buildEventMapSection - Crianças carregadas: X
```

**What to look for:**
- ✅ Should see: `Crianças carregadas: 3+` (or however many children in event)
- ✅ Should see individual children logged with their `evento_id`
- ❌ If shows: `Crianças carregadas: 0` = **NO CHILDREN ON MAP**

If no children logged, check:
1. Did you add children to the event in admin?
2. Are children assigned to teams?
3. Is the mobile logged in with the correct family account?

---

## STEP 3: Verify Backend is Broadcasting TERRITORY_CONQUERED

**Why:** If backend doesn't send the event, mobile won't receive anything.

### Backend Logs on Render:
When you scan a bracelet in Monster Hunt, look for:

```
📡 [RASTREIO] Enviando TERRITORY_CONQUERED para Monster Hunt: {...}
```

**What to look for:**
- ✅ Should see log IMMEDIATELY after scanning
- ✅ Log should contain:
  ```json
  {
    "type": "TERRITORY_CONQUERED",
    "payload": {
      "id": "...",
      "checkpointId": "...",
      "criancaName": "João",
      "mapX": 25.5,    // <- CRITICAL: should NOT be null
      "mapY": 75.3,    // <- CRITICAL: should NOT be null
      "eventoId": "...",
      "gameType": "monster_hunt"
    }
  }
  ```

**If missing:**
- Check if game actually started
- Verify checkpoint exists and is enabled
- Verify bracelet is registered in system

---

## STEP 4: Verify Mobile Receives WebSocket Event

**Why:** Backend might send it but mobile doesn't receive (wrong evento_id, connection issue, etc).

### Mobile Debug Logs:
Look for:

```
🎯 [MAP] ========== TERRITORY_CONQUERED RECEBIDO ==========
🎯 [MAP] Dados completos: {...}
🔍 [MAP] Dados extraídos:
🔍 [MAP]   - criancaId: ...
🔍 [MAP]   - checkpointId: ...
🔍 [MAP]   - mapX: ..., mapY: ...
✅ [MAP] Validação passou! Chamando animação...
✅ [MAP] Função de animação chamada para João no monster_hunt!
```

**If you DON'T see these logs:**
- WebSocket event didn't arrive on mobile
- Check WebSocket connection: `[WebSocket] ✅ Conectado ao evento`

**If you see logs but NO mapX/mapY or they're NULL:**
- Backend sent them as null
- Go back to STEP 3 and check backend logs

---

## STEP 5: Verify Avatar Position Animation Logic

**If logs show through STEP 4 but avatar still doesn't move:**

### Look for:
```
🎬 [MAP] ========== INICIANDO ANIMAÇÃO ==========
🎬 [MAP] Criança: João (child-id-123)
🎬 [MAP] Checkpoint alvo: checkpoint-id-456
✅ [MAP] Coordenadas diretas do evento: (25.5, 75.3) pixels
```

**Expected flow:**
1. Animation initialized
2. Coordinates loaded from event (or database fallback)
3. Animation controller starts
4. Avatar moves smoothly across map

**If you see "❌ [MAP] Checkpoint ... não encontrado":**
- Database checkpoint lookup is failing
- Check if checkpoint IDs match between mobile and backend

---

## QUICK TEST CHECKLIST

Run through this to isolate the issue:

```
[ ] 1. Check PostgreSQL: Do checkpoints have map_x, map_y values?
[ ] 2. Run Monster Hunt and check mobile: "Crianças carregadas: X" shows X > 0?
[ ] 3. Scan bracelet and check backend logs: See TERRITORY_CONQUERED with mapX/mapY?
[ ] 4. Check mobile logs: See "TERRITORY_CONQUERED RECEBIDO" with coordinates?
[ ] 5. Check mobile logs: See animation starting and coordinates being used?
```

---

## COMMAND EXAMPLES

### Get Event ID
On backend:
```sql
SELECT id, name, status FROM eventos WHERE status = 'active' LIMIT 1;
```

### Get Checkpoints for Event
```sql
SELECT id, name, map_x, map_y FROM checkpoints WHERE evento_id = 'EVENT_ID';
```

### Get Children for Event
```sql
SELECT id, name, evento_id, time_id FROM criancas WHERE evento_id = 'EVENT_ID';
```

---

## COMMON ISSUES & SOLUTIONS

### Issue: "Crianças carregadas: 0"
**Possible causes:**
1. No children assigned to event
2. Mobile not linked to correct family
3. API endpoint returning empty list

**Fix:**
- Check admin panel: are children added to event?
- Check mobile API logs: what does `/familias/children` return?

### Issue: Backend not logging TERRITORY_CONQUERED
**Possible causes:**
1. Game not actually started (status not 'active')
2. Checkpoint not properly configured
3. Monster Hunt logic not being executed

**Fix:**
- Verify game status is 'active': `SELECT status FROM brincadeiras WHERE id = 'GAME_ID';`
- Verify Monster Hunt partition exists: `SELECT * FROM monster_hunt_partidas WHERE evento_id = 'EVENT_ID';`

### Issue: Mobile receives event but coordinates are NULL
**Possible causes:**
1. Backend SQL query not fetching map_x, map_y
2. Checkpoints don't have coordinates in database

**Fix:**
- Check checkpoint table schema: `DESCRIBE checkpoints;` or `\d checkpoints`
- Ensure `map_x` and `map_y` columns exist and have values
- Update checkpoints if needed:
  ```sql
  UPDATE checkpoints 
  SET map_x = 25.5, map_y = 75.3 
  WHERE id = 'checkpoint-id';
  ```

### Issue: Mobile receives event with coordinates but avatar doesn't move
**Possible causes:**
1. Animation controller not properly initialized
2. setState not being called in Flutter
3. Avatar position dictionary not being updated

**Fix:**
- Check mobile logs for animation errors
- Verify _avatarPositions map is being updated
- Restart mobile app to clear state

---

## FILE REFERENCES FOR DEBUGGING

**Backend:**
- `backendPulyn/routes/leituras.js` (lines 420-470) - Monster Hunt broadcast
- `backendPulyn/routes/leituras.js` (lines 540-600) - Treasure Hunt broadcast
- `backendPulyn/index.js` (line 140) - broadcastToEvent function

**Mobile:**
- `pulyn_app/lib/widgets/event_map_widget.dart` (lines 145-233) - Event listener & handler
- `pulyn_app/lib/widgets/event_map_widget.dart` (lines 227-350) - Animation logic
- `pulyn_app/lib/screens/home/home_screen.dart` (lines 385-420) - Children loading

---

## NEXT ACTIONS

1. **Follow STEP 1-5 above and note which step fails**
2. **Share the specific logs and error messages**
3. **Based on where it fails, we'll implement the targeted fix**

