# 🎯 AVATAR TRACKING - TESTING & DEBUGGING GUIDE

## STATUS: Enhanced Logging Deployed ✅

**Backend Updated:**
- `commit: 7f9bba2` - Enhanced logging for coordinate troubleshooting
- All three games (Zone Conquest, Treasure Hunt, Monster Hunt) now log checkpoint coordinates
- **CRITICAL ERROR LOGS** added to identify if coordinates are NULL

---

## HOW TO TEST & DIAGNOSE

### PHASE 1: Check Infrastructure (Before Testing)

**Database Check - Do Checkpoints Have Coordinates?**

```sql
-- For PostgreSQL (Render):
SELECT 
  id, 
  name, 
  map_x, 
  map_y, 
  evento_id 
FROM checkpoints 
WHERE evento_id = (
  SELECT id FROM eventos WHERE status = 'active' LIMIT 1
)
ORDER BY name;

-- Expected: Should see values like 25.5, 75.3, NOT NULL
```

**If all map_x and map_y are NULL:**
- This is **THE PROBLEM**
- Coordinates need to be set in admin panel before testing
- Contact support to enable admin checkpoint positioning

---

### PHASE 2: Run Monster Hunt Test

**Step 1: Set Up the Test Event**
1. Open admin panel
2. Create a new event (or use existing active event)
3. Create 2-3 teams
4. Add 3-5 children to teams
5. Create Monster Hunt game
6. **CRITICAL**: Ensure checkpoints have map_x, map_y values set (not NULL)

**Step 2: Start Game on Mobile**
1. Open Pulyn Family App
2. Navigate to active event
3. Wait for map to load
4. Watch mobile logs - should see:
   ```
   📍 [HOME_SCREEN] _buildEventMapSection - Crianças carregadas: X
   ```

**If shows "Crianças carregadas: 0":**
- ❌ PROBLEM: No children loaded on map
- Fix: Ensure children are assigned to the event

**Step 3: Start Monster Hunt Game**
1. In admin/game master: Start Monster Hunt game
2. Monster Hunt should begin
3. Mobile should show map with children avatars

**Step 4: Scan Bracelet at Checkpoint**
1. Go to checkpoint (with ESP32 NFC reader)
2. Scan child's bracelet

---

### PHASE 3: Analyze Logs

**Backend Logs (Check Render Console):**

After scanning bracelet, you should see:
```
🎬 [RASTREIO] Monster Hunt - Checkpoint: <id>
🎬 [RASTREIO]   - checkpointCoords: {"id":"...","map_x":25.5,"map_y":75.3}
🎬 [RASTREIO]   - map_x: 25.5 (type: number)
🎬 [RASTREIO]   - map_y: 75.3 (type: number)
📡 [RASTREIO] Enviando TERRITORY_CONQUERED para Monster Hunt:
   - Destinatário: evento <event-id>
   - Criança: João
   - Checkpoint: <checkpoint-id>
   - Coordenadas: mapX=25.5, mapY=75.3
```

**⚠️ CRITICAL ERROR TO WATCH FOR:**
```
❌ [RASTREIO] CRÍTICO: Checkpoint <id> não tem coordenadas! map_x=null, map_y=null
   Verifique se a coluna 'map_x' e 'map_y' existem e têm valores para este checkpoint
```

**Mobile Logs (Connect via USB and watch Flutter logs):**

You should see:
```
📍 [HOME_SCREEN] _buildEventMapSection - Crianças carregadas: 3
   - João: evento_id=event-uuid-123
   - Maria: evento_id=event-uuid-123
   - Pedro: evento_id=event-uuid-123

[WebSocket] ✅ Conectado ao evento event-uuid-123

🎯 [MAP] ========== TERRITORY_CONQUERED RECEBIDO ==========
🎯 [MAP] Dados completos: {...}
🔍 [MAP] Dados extraídos:
🔍 [MAP]   - criancaId: child-uuid-456
🔍 [MAP]   - checkpointId: checkpoint-uuid-789
🔍 [MAP]   - mapX: 25.5, mapY: 75.3
✅ [MAP] Validação passou! Chamando animação...

🎬 [MAP] ========== INICIANDO ANIMAÇÃO ==========
🎬 [MAP] Criança: João (child-uuid-456)
🎬 [MAP] Checkpoint alvo: checkpoint-uuid-789
✅ [MAP] Coordenadas diretas do evento: (25.5, 75.3) pixels
✅ [MAP] Função de animação chamada para João no monster_hunt!
```

**Avatar Should Move Smoothly Across Map:**
- Starting position → checkpoint location
- Animation duration: ~1-2 seconds
- After reaching checkpoint, avatar stays there

---

## TROUBLESHOOTING BY LOG OUTPUT

### Scenario 1: Backend logs show NULL coordinates
```
❌ [RASTREIO] CRÍTICO: Checkpoint ... não tem coordenadas! map_x=null, map_y=null
```
**Solution:**
1. Stop game
2. Contact admin to set checkpoint coordinates in admin panel
3. Verify coordinates are saved to database
4. Restart test

### Scenario 2: Mobile doesn't receive event
```
// NOT SEEN in mobile logs:
🎯 [MAP] ========== TERRITORY_CONQUERED RECEBIDO ==========
```
**Possible causes:**
1. WebSocket not connected: Check for `[WebSocket] ✅ Conectado`
2. Wrong evento_id in WebSocket: Verify it matches active event
3. Backend event filter issue: Check backend logs for broadcast attempt

**Fix:**
- Restart mobile app
- Verify WebSocket connection in logs
- Check that evento_id is correctly passed

### Scenario 3: Mobile receives event but coordinates are NULL
```
🔍 [MAP] Dados extraídos:
🔍 [MAP]   - mapX: null, mapY: null
```
**Possible causes:**
- Backend didn't query coordinates properly
- Checkpoint record corrupted

**Fix:**
- Check database: SELECT * FROM checkpoints WHERE id = '<id>';
- Re-run database setup/migration if needed

### Scenario 4: Coordinates exist but animation doesn't happen
```
✅ [MAP] Validação passou! Chamando animação...
// BUT animation doesn't start or avatar doesn't move
```
**Possible causes:**
1. Avatar not initialized in _avatarPositions
2. setState not being called
3. Animation controller not started

**Fix:**
- Verify logs show: `🎬 [MAP] Criada posição inicial em center`
- Check if animation completes: Look for logs after animation

---

## DATA FLOW VERIFICATION CHECKLIST

Print this and check off as you go:

```
DATABASE LEVEL:
[ ] Checkpoints exist
[ ] Checkpoints have map_x values (numeric, not NULL)
[ ] Checkpoints have map_y values (numeric, not NULL)
[ ] Children exist for event
[ ] Children have evento_id set

BACKEND LEVEL (Running Monster Hunt):
[ ] Game status is 'active'
[ ] Bracelet scan is received by /api/leituras
[ ] Monster Hunt logic executes
[ ] Checkpoint coordinates are fetched
[ ] Backend logs show map_x and map_y are NOT null
[ ] Broadcast is sent with correct event_id filter
[ ] No "CRÍTICO" error messages

MOBILE LEVEL (Running Monster Hunt):
[ ] App shows "Crianças carregadas: X" where X > 0
[ ] WebSocket shows "✅ Conectado ao evento"
[ ] After scan: "🎯 [MAP] ========== TERRITORY_CONQUERED RECEBIDO =========="
[ ] Coordinates are extracted (NOT null)
[ ] Animation starts: "🎬 [MAP] ========== INICIANDO ANIMAÇÃO =========="
[ ] Animation uses direct coordinates from event

VISUAL RESULT:
[ ] Avatar moves from center to checkpoint location
[ ] Movement is smooth and visible
[ ] Avatar position updates in real-time as game progresses
```

---

## QUICK COMMANDS FOR TESTING

### Check Event Status
```sql
SELECT id, name, status FROM eventos WHERE status = 'active' LIMIT 1;
```

### Check Checkpoints Have Coordinates
```sql
SELECT id, name, 
       CASE WHEN map_x IS NULL THEN '❌ NULL' ELSE map_x::text END as map_x,
       CASE WHEN map_y IS NULL THEN '❌ NULL' ELSE map_y::text END as map_y
FROM checkpoints 
WHERE evento_id = 'EVENT_ID_HERE';
```

### Check Children Assigned
```sql
SELECT id, name, evento_id, time_id 
FROM criancas 
WHERE evento_id = 'EVENT_ID_HERE'
LIMIT 5;
```

### Monitor Render Logs Live
```bash
# If you have Render CLI configured:
render logs --service backendPulyn --tail
```

---

## EXPECTED BEHAVIOR AFTER FIX

### Perfect Test Run:
1. ✅ Mobile shows 3+ children on map
2. ✅ Scan bracelet at checkpoint
3. ✅ See backend logs: `📡 [RASTREIO] Enviando TERRITORY_CONQUERED` with coordinates
4. ✅ See mobile logs: `🎯 [MAP] TERRITORY_CONQUERED RECEBIDO` with coordinates
5. ✅ Avatar smoothly animates from center to checkpoint
6. ✅ Avatar stays at checkpoint location
7. ✅ When scanning at different checkpoint: Avatar moves there

### When Complete:
- **Zone Conquest**: Children avatars move between zone checkpoints
- **Treasure Hunt**: Children avatars move to treasure hunt locations
- **Monster Hunt**: Children avatars move to monster fight locations
- **Real-time**: All movements show in real-time on the map

---

## NEXT STEPS IF STILL NOT WORKING

1. **Capture logs** from BOTH backend and mobile
2. **Share which step fails** (see "Troubleshooting by Log Output")
3. **We'll implement targeted fix** based on exact failure point

The enhanced logging will help us **pinpoint exactly where the data flow breaks**.

