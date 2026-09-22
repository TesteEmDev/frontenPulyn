# 🚀 OTIMIZAÇÕES PARA TELAS LENTAS - PULYN

## 📊 DIAGNÓSTICO

### **PROBLEMAS IDENTIFICADOS:**

1. **RECEPÇÃO KIOSK** - MUITO LENTA
   - Virtual Keyboard com 29 botões + estilos complexos
   - CSS: shadows, gradients, borders, backdrop-blur
   - Transições CSS pesadas
   - API calls sem cache
   - Renders desnecessários

2. **SCORE KIOSK** - MODERADO
   - Busca API de score + histórico
   - Animações CSS complexas
   - Polling frequente

3. **GERAL**
   - WebSocket reconnect rápido demais
   - Polling com timeout alto
   - Sem cache de dados
   - Sem debounce/throttle

---

## 🔧 SOLUÇÕES APLICADAS

### **1. HOOK NFC OTIMIZADO** (`useNFCReader_otimizado.ts`)
```typescript
- Cache de leituras repetidas (cooldown: 1.5s-2s)
- Debounce rápido (10ms) para evitar flood
- Polling mais frequente (1.5s) mas com timeout baixo (2s)
- Reconexão WebSocket mais lenta (max 10s)
- Processamento em batch
```

### **2. DEBOUNCE/THROTTLE** (`useDebounce.ts`)
```typescript
- useDebounce: Evita renders por mudanças rápidas
- useThrottle: Limita execuções por tempo
- useMemoizedCallback: Cache de funções pesadas
```

### **3. KEYBOARD OTIMIZADO** (`VirtualKeyboardOtimizado.tsx`)
```typescript
- Cada botão memoizado individualmente
- Estilos pré-calculados (constantes)
- Remove recálculos em cada render
- Classes CSS otimizadas
```

---

## 🎯 PATCHES MANUAIS RECOMENDADOS

### **PARA RECEPÇÃO KIOSK** (`ReceptionKiosk.tsx`):

```typescript
// 1. ADICIONAR NO TOPO DO ARQUIVO
import { useDebounce, useMemoizedCallback } from '../../hooks/useDebounce';
import { useNFCOtimizado } from '../../hooks/useNFCReader_otimizado';
import VirtualKeyboardOtimizado from '../../components/ui/VirtualKeyboardOtimizado';

// 2. SUBSTITUIR useNFCReader
const { isConnected } = useNFCOtimizado(
  handleBraceletDetected,
  'checkin',
  selectedEventId || null,
  'reception',
  !registrationVisible && state !== 'saving' && state !== 'success',
);

// 3. SUBSTITUIR handleBraceletDetected
const handleBraceletDetected = useMemoizedCallback((code: string) => {
  // código existente...
}, [selectedEventId]);

// 4. DEBOUNCE NO FORM
const debouncedName = useDebounce(form.name, 100);

// 5. SUBSTITUIR KEYBOARD
// Trocar toda a seção do keyboard por:
<VirtualKeyboardOtimizado
  onKeyPress={handleVirtualKey}
  disabled={!canInteract || state === 'saving'}
  compact={true}
/>
```

### **PARA SCORE KIOSK** (`ScoreKiosk.tsx`):

```typescript
// 1. ADICIONAR NO TOPO
import { useDebounce, useMemoizedCallback } from '../../hooks/useDebounce';
import { useNFCOtimizado } from '../../hooks/useNFCReader_otimizado';

// 2. SUBSTITUIR useNFCReader
const { isConnected } = useNFCOtimizado(
  handleBraceletDetected,
  'score-kiosk',
  selectedEventId || null,
  'score-kiosk',
  true,
  'score-kiosk',
);

// 3. CACHE DE SCORES
const scoreCache = useRef<Map<string, ScoreData>>(new Map());

// 4. OTIMIZAR handleBraceletDetected
const handleBraceletDetected = useMemoizedCallback((code: string) => {
  const normalizedCode = normalizeUid(code);
  if (!normalizedCode || !selectedEventId) return;
  
  // Verificar cache primeiro
  const cacheKey = `${selectedEventId}_${normalizedCode}`;
  if (scoreCache.current.has(cacheKey)) {
    const cachedData = scoreCache.current.get(cacheKey)!;
    scoreStateRef.current = 'displaying';
    setScoreData(cachedData);
    setState('displaying');
    return;
  }
  
  // Resto do código...
}, [selectedEventId]);
```

---

## 🎨 OTIMIZAÇÕES CSS (CRÍTICO!)

### **REMOVER/OTIMIZAR NO ReceptionKiosk.tsx:**

```css
/* REMOVER OU SIMPLIFICAR: */
backdrop-blur-xl           /* PESADÍSSIMO! */
blur-3xl                   /* PESADO! */
shadow-[0_12px_35px_...]   /* Múltiplas shadows */
animate-ping               /* Usar só quando necessário */
gradients complexos        /* Simplificar */

/* SUBSTITUIR POR: */
backdrop-blur-sm           /* Reduzir */
blur-xl                    /* Reduzir */
shadow-lg                  /* Usar classes tailwind */
animate-pulse              /* Mais leve */
gradients simples          /* 2 cores no máximo */
```

### **CLASSES CSS OTIMIZADAS PARA TELÃO:**

```css
/* PERFORMANCE-CRITICAL CLASSES */
.kiosk-performance {
  /* Hardware acceleration */
  transform: translateZ(0);
  backface-visibility: hidden;
  perspective: 1000px;
  
  /* Optimize animations */
  will-change: transform, opacity;
}

/* Fast transitions */
.fast-transition {
  transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* Simplified shadows */
.simple-shadow {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}
```

---

## ⚡ OTIMIZAÇÕES DE PERFORMANCE REACT

### **1. REACT.MEMO ESTRATÉGICO**
```typescript
// Componentes que não mudam frequentemente
const BraceletReaderIllustration = memo(({ active }) => { /* ... */ });
const ScoreResult = memo(({ data, onReset }) => { /* ... */ });
```

### **2. USE_CALLBACK PARA HANDLERS**
```typescript
// Todas as funções que passam como props
const handleKeyPress = useCallback((key) => {
  // handler otimizado
}, [deps]);
```

### **3. EVITAR RENDERS DESNECESSÁRIOS**
```typescript
// Usar useMemo para cálculos pesados
const processedData = useMemo(() => {
  return heavyCalculation(data);
}, [data]);

// Usar useRef para valores que não triggeram render
const lastValueRef = useRef(null);
```

---

## 📊 BENCHMARK ESPERADO

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| **Tempo troca tela** | 800-1500ms | <300ms | 70-80% |
| **FPS** | 30-40 | 50-60 | +50% |
| **CPU uso** | Alto | Moderado | -40% |
| **Memória** | Alto | Reduzido | -30% |
| **Responsividade** | Lenta | Instantânea | +++ |

---

## 🚀 IMPLEMENTAÇÃO RÁPIDA

### **PRIORIDADE 1 (MAIOR IMPACTO):**
1. Substituir `useNFCReader` por `useNFCOtimizado`
2. Substituir keyboard por `VirtualKeyboardOtimizado`
3. Aplicar patches CSS (remover `backdrop-blur-xl`, `blur-3xl`)

### **PRIORIDADE 2:**
1. Adicionar `useDebounce` no form
2. Adicionar cache de scores
3. Usar `React.memo` em componentes estáticos

### **PRIORIDADE 3:**
1. Otimizar todas as animações CSS
2. Implementar `useMemo` para cálculos
3. Review de todos os `useEffect`

---

## 🧪 TESTES DE PERFORMANCE

### **ANTES DE APLICAR:**
1. Abrir DevTools → Performance tab
2. Gravar troca de tela
3. Anotar: FPS, CPU, Memory

### **DEPOIS DE APLICAR:**
1. Mesmo teste
2. Comparar resultados
3. Ajustar conforme necessário

---

## 🆘 TROUBLESHOOTING

### **SE AINDA ESTIVER LENTO:**
1. Verificar se há console.log excessivos
2. Checar network tab (API responses lentas)
3. Desabilitar temporariamente animações CSS
4. Testar em modo incógnito (sem extensions)

### **SE QUEBRAR ALGO:**
1. Reverter patch por patch
2. Verificar imports corretos
3. Testar em ambiente de desenvolvimento
4. Checar console por erros

---

## ✅ CHECKLIST FINAL

- [ ] Hook NFC otimizado aplicado
- [ ] Keyboard otimizado aplicado  
- [ ] Debounce/throttle implementado
- [ ] CSS otimizado (removido backdrop-blur-xl)
- [ ] React.memo em componentes estáticos
- [ ] Cache de API implementado
- [ ] Performance testado e validado
- [ ] Responsividade mantida

**🎯 META: Troca de tela em <300ms com 50+ FPS!**