# ⚡ QUICK TEST GUIDE - Avatar Tracking

## 🎯 5-Minute Setup

### Before Testing
```
1. Open admin panel → Active Event
2. Verify game has 2+ children assigned
3. Verify game has 2+ checkpoints
4. DATABASE CHECK (most important!):
   SELECT map_x, map_y FROM checkpoints LIMIT 3;
   Should see numbers like: 25.5, 75.3
   If sees NULL: ❌ STOP - fix coordinates first
```

---

## 🚀 Quick Test (10 minutes)

### On Mobile
```
1. Open Pulyn Family App
2. Look for: "Crianças carregadas: X"
   ✅ If X > 0: Children loaded
   ❌ If X = 0: Stop, add children to event

3. Game starts, see children on map
```

### On Backend  
```
1. Scan bracelet at checkpoint
2. Check Render logs for:
   📡 [RASTREIO] Enviando TERRITORY_CONQUERED
   Look for: mapX=25.5, mapY=75.3 (numbers, not null!)
   ❌ If sees mapX=null: Checkpoint has no coordinates
```

### On Mobile
```
1. After scan, check mobile logs for:
   🎯 [MAP] TERRITORY_CONQUERED RECEBIDO
   Should see: mapX=25.5, mapY=75.3
   
2. Watch avatar: Should move from center → checkpoint
   ✅ Smooth animation = SUCCESS
   ❌ Avatar doesn't move = See troubleshooting below
```

---

## 🔴 Avatar Not Moving? Check These (In Order)

1. **Backend shows NULL coordinates?**
   ```
   ❌ [RASTREIO] CRÍTICO: Checkpoint ... map_x=null, map_y=null
   ```
   → **STOP**: Need to set checkpoint coordinates in admin

2. **Mobile shows "Crianças carregadas: 0"?**
   → **STOP**: Add children to event in admin

3. **Mobile doesn't see TERRITORY_CONQUERED event?**
   ```
   Should see: 🎯 [MAP] TERRITORY_CONQUERED RECEBIDO
   If missing: WebSocket connection issue
   ```
   → Restart mobile app, check WebSocket connection

4. **Mobile sees event but coordinates are NULL?**
   ```
   🔍 [MAP]   - mapX: null, mapY: null
   ```
   → Backend didn't query coordinates properly
   → Check database, may need migration

5. **All logs look good but animation doesn't start?**
   ```
   Should see: 🎬 [MAP] ========== INICIANDO ANIMAÇÃO ==========
   If missing: Animation logic issue
   ```
   → Check mobile logs for errors, may need code fix

---

## 📊 Log Checklist

```
BACKEND:
[ ] "📡 [RASTREIO] Enviando TERRITORY_CONQUERED"
[ ] Contains: "mapX=XX.X, mapY=YY.Y" (numbers, not null)
[ ] NO error message: "❌ CRÍTICO: Checkpoint ... map_x=null"

MOBILE:
[ ] "📍 [HOME_SCREEN] Crianças carregadas: X" where X > 0
[ ] "[WebSocket] ✅ Conectado"
[ ] "🎯 [MAP] TERRITORY_CONQUERED RECEBIDO"
[ ] "🔍 [MAP] Dados extraídos: mapX=XX.X, mapY=YY.Y"
[ ] "🎬 [MAP] ========== INICIANDO ANIMAÇÃO =========="

VISUAL:
[ ] Avatar moves on screen when bracelet scanned
```

---

## 💡 Common Fixes

| Problem | Fix | Time |
|---------|-----|------|
| map_x/map_y = NULL | Set in admin panel checkpoint editor | 2 min |
| No children on map | Add to event in admin panel | 1 min |
| WebSocket not connecting | Restart mobile app | 1 min |
| Event not received on mobile | Check evento_id in connection | 3 min |
| Animation logs missing | Check if mobile app crashed | 2 min |

---

## 🎮 Games Tested

- [x] Zone Conquest - Coordinates broadcasting
- [x] Treasure Hunt - Coordinates broadcasting  
- [x] Monster Hunt - Coordinates broadcasting

All three games send TERRITORY_CONQUERED with mapX/mapY

---

## 📞 Need Help?

Share these logs:
1. Backend logs with "📡 [RASTREIO]" messages
2. Mobile logs showing TERRITORY_CONQUERED events
3. Database query: `SELECT id, name, map_x, map_y FROM checkpoints;`

With these, the exact issue can be identified in minutes.

---

## ✅ Success Looks Like

```
Scan bracelet → Backend logs coordinates → Mobile receives event → Avatar moves smoothly across map
```

Done! 🎉

