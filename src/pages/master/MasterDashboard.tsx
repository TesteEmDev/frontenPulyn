import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Activity,
  ScrollText,
  LifeBuoy,
  BarChart3,
  MapPin,
  Bell,
  AlertTriangle,
  Wifi,
  WifiOff,
  Clock,
  Zap,
} from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import StatusDot from '../../components/ui/StatusDot';
import { api } from '../../services/api';
import { BRAZIL_STATES, type BrazilStateShape } from './brazilMapData';
import { findCityPosition, type CityData } from './brazilCities';

const masterNavItems = [
  { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/master' },
  { icon: <Users size={20} />, label: 'Clientes', path: '/master/clients' },
  { icon: <CreditCard size={20} />, label: 'Planos', path: '/master/plans' },
  { icon: <Activity size={20} />, label: 'Monitoramento', path: '/master/monitoring' },
  { icon: <ScrollText size={20} />, label: 'Logs', path: '/master/logs' },
  { icon: <LifeBuoy size={20} />, label: 'Suporte', path: '/master/support' },
  { icon: <BarChart3 size={20} />, label: 'Analytics', path: '/master/analytics' },
];

interface MasterClient {
  id: string;
  name: string;
  city: string;
  state: string;
  status: 'active' | 'blocked' | 'trial';
  plan: 'starter' | 'professional' | 'enterprise';
}

interface MasterAlert {
  id: string;
  type: 'offline' | 'sync_error' | 'warning';
  message: string;
  client: string;
  time: string;
}

const normalizeText = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();

// O cadastro guarda o estado como o usuário digitou ("sp", "SP", "São Paulo"),
// então aceita sigla ou nome completo, sem depender de maiúscula/acento.
const findStateShape = (raw: string | null | undefined) => {
  if (!raw) return undefined;
  const key = normalizeText(raw);
  return BRAZIL_STATES.find((s) => s.uf.toLowerCase() === key || normalizeText(s.name) === key);
};

const STATUS_COLORS: Record<string, string> = {
  active: '#22C55E',
  blocked: '#EF4444',
  trial: '#F59E0B',
};

interface MasterEvent {
  id: string;
  name: string;
  clientId: string;
  client: string;
  childrenCount: number;
  status: string;
  date?: string;
  elapsed: number;
}

interface MapFocus {
  uf: string | null;
  cityKey: string | null;
  clientId: string | null;
}

const NO_FOCUS: MapFocus = { uf: null, cityKey: null, clientId: null };

interface CityGroup {
  key: string;
  shape: BrazilStateShape;
  city: string;
  x: number;
  y: number;
  clients: MasterClient[];
  events: MasterEvent[];
}

const cityKeyFor = (uf: string, city: string | null | undefined) => `${uf}|${normalizeText(city || '')}`;

const FULL_VIEW = { x: 0, y: 0, w: 613, h: 639 };
const MAP_ASPECT = FULL_VIEW.w / FULL_VIEW.h;
const CITY_VIEW_W = 28;
const EVENT_COLOR = '#8B5CF6';

const viewForState = (shape: BrazilStateShape) => {
  const [x0, y0, x1, y1] = shape.bbox;
  // Margem em volta do estado; largura mínima evita zoom absurdo em estados
  // minúsculos como o DF.
  const w = Math.max((x1 - x0) * 1.35, (y1 - y0) * 1.35 * MAP_ASPECT, 150);
  const h = w / MAP_ASPECT;
  return { x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - h / 2, w, h };
};

// Ao entrar em um estado com clientes, enquadra as cidades que têm cliente (e não o estado
// inteiro), para separar cidades vizinhas. Nunca fica mais aberto que o estado inteiro.
const MIN_GROUPS_VIEW_W = 46;
const viewForGroups = (shape: BrazilStateShape, points: { x: number; y: number }[]) => {
  const whole = viewForState(shape);
  // Com uma cidade só não há o que separar: mostra o estado inteiro, com contexto.
  if (points.length < 2) return whole;
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const spanX = x1 - x0, spanY = y1 - y0;
  // Folga em volta dos marcadores; o lado direito leva um pouco mais por causa dos nomes.
  const pad = Math.max(Math.max(spanX, spanY) * 0.3, 14);
  const w = Math.min(
    Math.max(spanX + pad * 2.6, (spanY + pad * 2) * MAP_ASPECT, MIN_GROUPS_VIEW_W),
    whole.w,
  );
  const h = w / MAP_ASPECT;
  return { x: (x0 + x1) / 2 - w / 2 + pad * 0.3, y: (y0 + y1) / 2 - h / 2, w, h };
};

// Escolhe quais cidades mostram o nome no mapa: os nomes são desenhados em tamanho fixo na tela,
// então cidades coladas (Grande São Paulo) se sobrepõem. Prioriza a cidade em foco e as com mais
// clientes; quem não couber fica só com o ponto (o nome continua no tooltip) e ganha o nome ao dar zoom.
const pickLabeledGroups = (groups: CityGroup[], k: number, focusKey: string | null) => {
  const order = [...groups].sort(
    (a, b) =>
      Number(b.key === focusKey) - Number(a.key === focusKey) ||
      b.clients.length - a.clients.length ||
      a.key.localeCompare(b.key),
  );
  const placed: { x0: number; y0: number; x1: number; y1: number }[] = [];
  const shown = new Set<string>();
  order.forEach((group) => {
    const name = group.city || group.shape.uf;
    const x0 = group.x + (group.clients.length > 1 ? 14 : 9) * k;
    const box = { x0, y0: group.y - 9 * k, x1: x0 + name.length * 7.2 * k, y1: group.y + 6 * k };
    const clash = placed.some((p) => box.x0 < p.x1 && box.x1 > p.x0 && box.y0 < p.y1 && box.y1 > p.y0);
    if (group.key === focusKey || !clash) {
      shown.add(group.key);
      placed.push(box);
    }
  });
  return shown;
};

// Zoom/movimento manual: a largura da câmera fica entre o zoom máximo e o Brasil inteiro, e o
// centro não sai do mapa.
const MIN_MANUAL_VIEW_W = 6;
type MapView = { x: number; y: number; w: number; h: number };
const clampView = (v: MapView): MapView => {
  const cx = Math.min(Math.max(v.x + v.w / 2, 0), FULL_VIEW.w);
  const cy = Math.min(Math.max(v.y + v.h / 2, 0), FULL_VIEW.h);
  return { x: cx - v.w / 2, y: cy - v.h / 2, w: v.w, h: v.h };
};

const viewForPoint = (x: number, y: number, w: number) => {
  const h = w / MAP_ASPECT;
  return { x: x - w / 2, y: y - h / 2, w, h };
};

const STATUS_LABELS: Record<string, string> = { active: 'Ativo', blocked: 'Bloqueado', trial: 'Trial' };

const formatEventWhen = (event: MasterEvent) => {
  if (event.status === 'active') return `em andamento há ${event.elapsed}min`;
  if (!event.date) return 'agendado';
  const day = new Date(event.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  return `agendado para ${day}`;
};

function BrazilMap({
  clients,
  events,
  focus,
  onFocusChange,
}: {
  clients: MasterClient[];
  events: MasterEvent[];
  focus: MapFocus;
  onFocusChange: (focus: MapFocus) => void;
}) {
  const [hoveredUf, setHoveredUf] = useState<string | null>(null);
  const [view, setView] = useState(FULL_VIEW);
  const viewRef = useRef(FULL_VIEW);
  const svgRef = useRef<SVGSVGElement>(null);
  const frameRef = useRef(0);
  // manual = o usuário mexeu na câmera (Ctrl + roda / arrastar); mostra "Recentralizar".
  const [manual, setManual] = useState(false);
  const [panning, setPanning] = useState(false);
  const panRef = useRef<{ clientX: number; clientY: number; view: MapView; scale: number } | null>(null);

  // Posições dos municípios (arquivo grande, carregado sob demanda). null = carregando;
  // se falhar, {} faz todas as cidades caírem no posicionamento aproximado por estado.
  const [cityData, setCityData] = useState<CityData | null>(null);
  useEffect(() => {
    let disposed = false;
    import('./brazilCityData')
      .then((mod) => { if (!disposed) setCityData(mod.BRAZIL_CITY_DATA); })
      .catch(() => { if (!disposed) setCityData({}); });
    return () => { disposed = true; };
  }, []);

  // Agrupa clientes por cidade (cada cidade vira um marcador) e coloca cada marcador
  // na posição real do município. O cadastro só tem cidade/estado em texto, então a
  // cidade é procurada pelo nome; as que não forem encontradas ficam espalhadas em
  // volta do centro do estado.
  const { groups, unplaced } = useMemo(() => {
    if (!cityData) return { groups: [] as CityGroup[], unplaced: 0 };
    const byKey = new Map<string, CityGroup>();
    let missing = 0;
    const eventsByClient = new Map<string, MasterEvent[]>();
    (Array.isArray(events) ? events : []).forEach((event) => {
      const list = eventsByClient.get(event.clientId) || [];
      list.push(event);
      eventsByClient.set(event.clientId, list);
    });

    (Array.isArray(clients) ? clients : []).forEach((client) => {
      const shape = findStateShape(client.state);
      if (!shape) {
        missing += 1;
        return;
      }
      const key = cityKeyFor(shape.uf, client.city);
      let group = byKey.get(key);
      if (!group) {
        group = { key, shape, city: (client.city || '').trim(), x: shape.cx, y: shape.cy, clients: [], events: [] };
        byKey.set(key, group);
      }
      group.clients.push(client);
      group.events.push(...(eventsByClient.get(client.id) || []));
    });

    const perState: Record<string, CityGroup[]> = {};
    Array.from(byKey.values()).forEach((group) => {
      const position = findCityPosition(cityData, group.shape.uf, group.city);
      if (position) {
        group.x = position.x;
        group.y = position.y;
        return;
      }
      (perState[group.shape.uf] ||= []).push(group);
    });
    Object.values(perState).forEach((list) => {
      list.sort((a, b) => a.city.localeCompare(b.city, 'pt-BR'));
      list.forEach((group, index) => {
        if (index === 0) return;
        const angle = index * 2.4;
        const radius = 8 + 3 * index;
        group.x = group.shape.cx + Math.cos(angle) * radius;
        group.y = group.shape.cy + Math.sin(angle) * radius;
      });
    });

    return { groups: Array.from(byKey.values()), unplaced: missing };
  }, [clients, events, cityData]);

  const statesWithClients = new Set(groups.map((g) => g.shape.uf));
  const focusShape = BRAZIL_STATES.find((s) => s.uf === focus.uf) || null;
  const focusGroup = focus.cityKey ? groups.find((g) => g.key === focus.cityKey) || null : null;
  const scopeGroups = focusShape ? groups.filter((g) => g.shape.uf === focusShape.uf) : [];

  const target = focusGroup
    ? viewForPoint(focusGroup.x, focusGroup.y, CITY_VIEW_W)
    : focusShape
      ? viewForGroups(focusShape, scopeGroups)
      : FULL_VIEW;
  const targetKey = `${target.x.toFixed(2)},${target.y.toFixed(2)},${target.w.toFixed(2)}`;

  // Anima a câmera (viewBox) até o alvo: Brasil, estado ou cidade.
  const animateTo = (to: MapView) => {
    cancelAnimationFrame(frameRef.current);
    const from = viewRef.current;
    const duration = 450;
    let start: number | null = null;
    const tick = (now: number) => {
      if (start === null) start = now;
      const t = Math.min((now - start) / duration, 1);
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const next = {
        x: from.x + (to.x - from.x) * e,
        y: from.y + (to.y - from.y) * e,
        w: from.w + (to.w - from.w) * e,
        h: from.h + (to.h - from.h) * e,
      };
      viewRef.current = next;
      setView(next);
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
  };

  // Ao trocar o foco (clique em estado/cidade/voltar), a câmera volta ao enquadramento automático.
  useEffect(() => {
    setManual(false);
    animateTo(target);
    return () => cancelAnimationFrame(frameRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKey]);

  const applyManualView = (next: MapView) => {
    cancelAnimationFrame(frameRef.current);
    const clamped = clampView(next);
    viewRef.current = clamped;
    setView(clamped);
    setManual(true);
  };

  // Converte a posição do mouse (tela) para coordenadas do mapa. O SVG é centralizado e
  // mantém a proporção, então pode haver margem nas laterais ou em cima/embaixo.
  const screenToMap = (clientX: number, clientY: number, current: MapView) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const scale = Math.min(rect.width / current.w, rect.height / current.h);
    const offX = (rect.width - current.w * scale) / 2;
    const offY = (rect.height - current.h * scale) / 2;
    return {
      x: current.x + (clientX - rect.left - offX) / scale,
      y: current.y + (clientY - rect.top - offY) / scale,
      scale,
    };
  };

  // Ctrl + roda do mouse (ou o gesto de pinça do touchpad) dá zoom em volta do cursor. Sem Ctrl a
  // página rola normalmente. O listener é nativo porque o do React é passivo e não deixa
  // cancelar o zoom da própria página.
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return undefined;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      const current = viewRef.current;
      const { x: mx, y: my } = screenToMap(event.clientX, event.clientY, current);
      const delta = event.deltaMode === 1 ? event.deltaY * 33 : event.deltaY;
      const w = Math.min(Math.max(current.w * Math.exp(delta * 0.0015), MIN_MANUAL_VIEW_W), FULL_VIEW.w);
      const ratio = w / current.w;
      applyManualView({
        x: mx - (mx - current.x) * ratio,
        y: my - (my - current.y) * ratio,
        w,
        h: current.h * ratio,
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clicar na roda (botão do meio) e arrastar move o mapa.
  const onPanStart = (event: React.PointerEvent<SVGSVGElement>) => {
    if (event.button !== 1) return;
    event.preventDefault();
    cancelAnimationFrame(frameRef.current);
    const current = viewRef.current;
    panRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      view: current,
      scale: screenToMap(event.clientX, event.clientY, current).scale,
    };
    try {
      // Mantém o arrasto mesmo se o mouse sair do mapa.
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // sem captura o arrasto continua funcionando enquanto o mouse estiver sobre o mapa
    }
    setPanning(true);
  };
  const onPanMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const pan = panRef.current;
    if (!pan) return;
    applyManualView({
      ...pan.view,
      x: pan.view.x - (event.clientX - pan.clientX) / pan.scale,
      y: pan.view.y - (event.clientY - pan.clientY) / pan.scale,
    });
  };
  const onPanEnd = () => {
    panRef.current = null;
    setPanning(false);
  };

  const recenter = () => {
    setManual(false);
    animateTo(target);
  };

  // Com o zoom, pontos e textos encolhem na mesma proporção para não ficarem gigantes.
  const k = view.w / FULL_VIEW.w;
  const labeledGroups = pickLabeledGroups(groups, k, focusGroup?.key ?? null);

  const goUp = () => {
    if (focus.cityKey && focus.uf) onFocusChange({ uf: focus.uf, cityKey: null, clientId: null });
    else onFocusChange(NO_FOCUS);
  };

  const selectGroup = (group: CityGroup) =>
    onFocusChange({
      uf: group.shape.uf,
      cityKey: group.key,
      clientId: group.clients.length === 1 ? group.clients[0].id : null,
    });

  const selectState = (uf: string) =>
    onFocusChange(focus.uf === uf && !focus.cityKey ? NO_FOCUS : { uf, cityKey: null, clientId: null });

  const listGroups = focusGroup ? [focusGroup] : scopeGroups;
  const listClients = listGroups.flatMap((g) => g.clients.map((client) => ({ client, group: g })));
  const clientEvents = (client: MasterClient) =>
    (Array.isArray(events) ? events : []).filter((event) => event.clientId === client.id);

  return (
    <div>
      <div className="flex items-center justify-between gap-3 min-h-[28px] mb-2">
        <p className="text-sm text-gray-400 min-w-0 truncate">
          {focusShape ? (
            <>
              <button type="button" onClick={() => onFocusChange(NO_FOCUS)} className="hover:text-primary transition-colors">
                Brasil
              </button>
              {' › '}
              {focusGroup ? (
                <button
                  type="button"
                  onClick={() => onFocusChange({ uf: focusShape.uf, cityKey: null, clientId: null })}
                  className="hover:text-primary transition-colors"
                >
                  {focusShape.name}
                </button>
              ) : (
                <span className="text-white font-medium">{focusShape.name}</span>
              )}
              {focusGroup && (
                <>
                  {' › '}
                  <span className="text-white font-medium">{focusGroup.city || 'Cidade não informada'}</span>
                </>
              )}
            </>
          ) : (
            'Clique em um estado ou cliente para dar zoom'
          )}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          {manual && (
            <button
              type="button"
              onClick={recenter}
              className="text-xs px-3 py-1 rounded-md border border-white/20 text-gray-300 hover:bg-white/10 transition-colors"
            >
              Recentralizar
            </button>
          )}
          {focusShape && (
            <button
              type="button"
              onClick={goUp}
              className="text-xs px-3 py-1 rounded-md border border-primary/40 text-primary hover:bg-primary/10 transition-colors"
            >
              {focusGroup ? `Voltar para ${focusShape.name}` : 'Ver Brasil inteiro'}
            </button>
          )}
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
        className="w-full h-auto max-h-[440px] mx-auto"
        style={panning ? { cursor: 'grabbing' } : undefined}
        role="group"
        aria-label="Mapa do Brasil com a localização dos clientes"
        onClick={goUp}
        onPointerDown={onPanStart}
        onPointerMove={onPanMove}
        onPointerUp={onPanEnd}
        onPointerCancel={onPanEnd}
        onMouseDown={(event) => { if (event.button === 1) event.preventDefault(); }}
      >
        {BRAZIL_STATES.map((state) => {
          const hasClients = statesWithClients.has(state.uf);
          const isSelected = state.uf === focus.uf;
          const isHovered = state.uf === hoveredUf;
          const fill = isSelected
            ? 'rgba(30,155,215,0.38)'
            : isHovered
              ? 'rgba(30,155,215,0.30)'
              : hasClients
                ? 'rgba(30,155,215,0.24)'
                : 'rgba(30,155,215,0.07)';
          return (
            <path
              key={state.uf}
              d={state.path}
              fill={fill}
              stroke={isSelected ? 'rgba(30,155,215,1)' : 'rgba(30,155,215,0.55)'}
              strokeWidth={(isSelected ? 2 : 1) * k}
              strokeLinejoin="round"
              style={{ cursor: 'pointer', transition: 'fill 150ms' }}
              tabIndex={0}
              role="button"
              aria-label={`${state.name}${hasClients ? ' (com clientes)' : ''}`}
              aria-pressed={isSelected}
              onMouseEnter={() => setHoveredUf(state.uf)}
              onMouseLeave={() => setHoveredUf(null)}
              onClick={(e) => {
                e.stopPropagation();
                selectState(state.uf);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  selectState(state.uf);
                }
              }}
            >
              <title>{state.name}</title>
            </path>
          );
        })}

        {groups.map((group) => {
          const isFocusedCity = focusGroup?.key === group.key;
          const count = group.clients.length;
          const single = count === 1 ? group.clients[0] : null;
          const color = single ? STATUS_COLORS[single.status] || STATUS_COLORS.trial : '#1E9BD7';
          const label = `${group.city || group.shape.uf}: ${count} ${count === 1 ? 'cliente' : 'clientes'}${
            group.events.length ? `, ${group.events.length} ${group.events.length === 1 ? 'evento' : 'eventos'}` : ''
          }`;

          // Dentro da cidade, os clientes se abrem em leque para dar para escolher um por um.
          if (isFocusedCity) {
            const radius = count > 1 ? Math.max(48, count * 11) * k : 0;
            return (
              <g key={group.key}>
                {count > 1 && (
                  <circle cx={group.x} cy={group.y} r={radius} fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth={1 * k} strokeDasharray={`${4 * k} ${4 * k}`} style={{ pointerEvents: 'none' }} />
                )}
                {group.clients.map((client, index) => {
                  const angle = count > 1 ? (2 * Math.PI * index) / count - Math.PI / 2 : 0;
                  const cx = group.x + Math.cos(angle) * radius;
                  const cy = group.y + Math.sin(angle) * radius;
                  const clientColor = STATUS_COLORS[client.status] || STATUS_COLORS.trial;
                  const isSelected = focus.clientId === client.id;
                  const evs = clientEvents(client);
                  const leftSide = Math.cos(angle) < -0.3;
                  const select = () =>
                    onFocusChange({ uf: group.shape.uf, cityKey: group.key, clientId: isSelected ? null : client.id });
                  return (
                    <g
                      key={client.id}
                      style={{ cursor: 'pointer' }}
                      tabIndex={0}
                      role="button"
                      aria-label={`${client.name}${evs.length ? `, ${evs.length} eventos` : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        select();
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          select();
                        }
                      }}
                    >
                      <title>{`${client.name} — ${client.city || 'cidade não informada'}/${group.shape.uf}`}</title>
                      <circle cx={cx} cy={cy} r={12 * k} fill="transparent" />
                      <circle cx={cx} cy={cy} r={(isSelected ? 11 : 9) * k} fill={clientColor} opacity="0.3" />
                      <circle cx={cx} cy={cy} r={5 * k} fill={clientColor} stroke={isSelected ? '#FFFFFF' : '#0B1220'} strokeWidth={(isSelected ? 2 : 1.5) * k} />
                      {evs.length > 0 && (
                        <g>
                          <circle cx={cx + 7 * k} cy={cy - 7 * k} r={5.5 * k} fill={EVENT_COLOR} stroke="#0B1220" strokeWidth={1 * k} />
                          <text x={cx + 7 * k} y={cy - 7 * k + 3 * k} textAnchor="middle" fontSize={8 * k} fontWeight="700" fill="#FFFFFF" fontFamily="sans-serif">
                            {evs.length}
                          </text>
                        </g>
                      )}
                      <text
                        x={leftSide ? cx - 9 * k : cx + 9 * k}
                        y={cy + 4 * k}
                        textAnchor={leftSide ? 'end' : 'start'}
                        fill="rgba(255,255,255,0.95)"
                        fontSize={13 * k}
                        fontFamily="sans-serif"
                        paintOrder="stroke"
                        stroke="#0B1220"
                        strokeWidth={3 * k}
                      >
                        {client.name}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          }

          const select = () => selectGroup(group);
          return (
            <g
              key={group.key}
              style={{ cursor: 'pointer' }}
              tabIndex={0}
              role="button"
              aria-label={label}
              onClick={(e) => {
                e.stopPropagation();
                select();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  select();
                }
              }}
            >
              <title>{label}</title>
              <circle cx={group.x} cy={group.y} r={12 * k} fill="transparent" />
              <circle cx={group.x} cy={group.y} r={(count > 1 ? 12 : 9) * k} fill={color} opacity="0.3">
                <animate attributeName="opacity" values="0.3;0.08;0.3" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle cx={group.x} cy={group.y} r={(count > 1 ? 8 : 5) * k} fill={color} stroke="#0B1220" strokeWidth={1.5 * k} />
              {count > 1 && (
                <text x={group.x} y={group.y + 4 * k} textAnchor="middle" fontSize={11 * k} fontWeight="700" fill="#0B1220" fontFamily="sans-serif">
                  {count}
                </text>
              )}
              {group.events.length > 0 && (
                <g>
                  <circle cx={group.x + 9 * k} cy={group.y - 9 * k} r={6 * k} fill={EVENT_COLOR} stroke="#0B1220" strokeWidth={1 * k} />
                  <text x={group.x + 9 * k} y={group.y - 9 * k + 3 * k} textAnchor="middle" fontSize={8.5 * k} fontWeight="700" fill="#FFFFFF" fontFamily="sans-serif">
                    {group.events.length}
                  </text>
                </g>
              )}
              {labeledGroups.has(group.key) && (
                <text
                  x={group.x + (count > 1 ? 14 : 9) * k}
                  y={group.y + 4 * k}
                  fill="rgba(255,255,255,0.9)"
                  fontSize={13 * k}
                  fontFamily="sans-serif"
                  paintOrder="stroke"
                  stroke="#0B1220"
                  strokeWidth={3 * k}
                >
                  {group.city || group.shape.uf}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <p className="mt-1 text-center text-[11px] text-gray-500">
        Ctrl + roda do mouse: zoom · Clique na roda e arraste: mover o mapa
      </p>

      {focusShape && (
        <div className="mt-3 border-t border-white/10 pt-3">
          {listClients.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum cliente em {focusShape.name}.</p>
          ) : (
            <ul className="space-y-2">
              {listClients.map(({ client, group }) => {
                const evs = clientEvents(client);
                const isSelected = focus.clientId === client.id;
                const expanded = !!focusGroup || isSelected;
                return (
                  <li
                    key={client.id}
                    className={`rounded-lg px-3 py-2 border transition-colors ${
                      isSelected ? 'border-primary/60 bg-primary/10' : 'border-transparent hover:bg-white/5'
                    }`}
                  >
                    <button
                      type="button"
                      className="w-full flex items-center justify-between gap-3 text-sm text-left"
                      onClick={() =>
                        onFocusChange({ uf: group.shape.uf, cityKey: group.key, clientId: isSelected && focusGroup ? null : client.id })
                      }
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: STATUS_COLORS[client.status] || STATUS_COLORS.trial }} />
                        <span className="text-white truncate">{client.name}</span>
                        <span className="text-gray-500 truncate">{client.city}</span>
                      </span>
                      <span className="flex items-center gap-2 shrink-0">
                        {evs.length > 0 && (
                          <span className="text-xs font-semibold" style={{ color: EVENT_COLOR }}>
                            {evs.length} {evs.length === 1 ? 'evento' : 'eventos'}
                          </span>
                        )}
                        <Badge variant={client.status === 'active' ? 'success' : client.status === 'blocked' ? 'danger' : 'warning'}>
                          {STATUS_LABELS[client.status] || client.status}
                        </Badge>
                      </span>
                    </button>
                    {expanded && (
                      <ul className="mt-2 ml-5 space-y-1">
                        {evs.length === 0 ? (
                          <li className="text-xs text-gray-500">Nenhum evento ativo ou agendado</li>
                        ) : (
                          evs.map((event) => (
                            <li key={event.id} className="text-xs text-gray-400 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: EVENT_COLOR }} />
                              <span className="text-gray-200 truncate">{event.name}</span>
                              <span className="shrink-0">
                                {event.childrenCount} crianças · {formatEventWhen(event)}
                              </span>
                            </li>
                          ))
                        )}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {unplaced > 0 && (
        <p className="text-xs text-gray-500 text-center mt-2">
          {unplaced} {unplaced === 1 ? 'cliente sem estado cadastrado não aparece' : 'clientes sem estado cadastrado não aparecem'} no mapa
        </p>
      )}
    </div>
  );
}

export default function MasterDashboard() {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [dashboardData, setDashboardData] = useState({
    activeClients: 0,
    activeEvents: 0,
    onlineCheckpoints: 0,
    activeChildren: 0,
    offlineCheckpoints: 0,
    totalClients: 0,
  });
  const [clients, setClients] = useState<MasterClient[]>([]);
  const [activeEvents, setActiveEvents] = useState<MasterEvent[]>([]);
  const [mapFocus, setMapFocus] = useState<MapFocus>(NO_FOCUS);
  const mapCardRef = useRef<HTMLDivElement>(null);

  // Clicar em um evento leva o mapa até a cidade do cliente dele.
  const focusClientOnMap = (clientId: string) => {
    const client = clients.find((c) => c.id === clientId);
    const shape = client ? findStateShape(client.state) : undefined;
    if (!client || !shape) return;
    setMapFocus({ uf: shape.uf, cityKey: cityKeyFor(shape.uf, client.city), clientId: client.id });
    mapCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const [alerts, setAlerts] = useState<MasterAlert[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      const [dashboard, clientsData, eventsData, alertsData] = await Promise.all([
        api.getMasterDashboard(),
        api.getMasterClients(),
        api.getMasterActiveEvents(),
        api.getMasterAlerts(),
      ]);

      setDashboardData(dashboard);
      setClients(clientsData || []);
      setActiveEvents(eventsData || []);
      setAlerts(alertsData || []);
    } catch (error) {
      console.error('❌ Error loading dashboard:', error);
    }
  };

  const activeClients = dashboardData.activeClients;
  const activeEventsCount = dashboardData.activeEvents;
  const onlineCheckpoints = dashboardData.onlineCheckpoints;
  const activeChildrenToday = dashboardData.activeChildren;
  const offlineCheckpointsCount = dashboardData.offlineCheckpoints;
  const totalClientsCount = dashboardData.totalClients;

  const kpis = [
    { label: 'Clientes ativos', value: activeClients, icon: <Users size={20} />, color: 'text-primary' },
    { label: 'Eventos em andamento', value: activeEventsCount, icon: <Zap size={20} />, color: 'text-secondary' },
    { label: 'Checkpoints online', value: onlineCheckpoints, icon: <Wifi size={20} />, color: 'text-success' },
    { label: 'Crianças ativas hoje', value: activeChildrenToday, icon: <Clock size={20} />, color: 'text-accent' },
  ];

  return (
    <div className="flex h-screen bg-dark text-white overflow-hidden">
      <Sidebar
        items={masterNavItems}
        activePath={location.pathname}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        accentColor="#1E9BD7"
      />

      <main className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto">
          <PageHeader
            title="Painel Master"
            description="Visão global da plataforma Pulyn"
            icon={<LayoutDashboard size={28} />}
            action={
              <div className="flex items-center gap-3">
                <Badge variant="success">Todos os sistemas operacionais</Badge>
                <span className="text-sm text-gray-400 font-mono">
                  {currentTime.toLocaleTimeString('pt-BR')}
                </span>
              </div>
            }
          />

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {Array.isArray(kpis) && kpis.map(kpi => (
              <Card key={kpi.label} variant="glow" className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className={kpi.color}>{kpi.icon}</span>
                  <p className="text-sm font-body text-gray-400">{kpi.label}</p>
                </div>
                <p className={`font-display text-3xl font-bold ${kpi.color}`}>{kpi.value}</p>
              </Card>
            ))}
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Brazil Map */}
            <Card variant="glow" className="lg:col-span-2">
              <div ref={mapCardRef} className="flex items-center gap-2 mb-4">
                <MapPin size={20} className="text-primary" />
                <h3 className="font-display text-lg text-white">Clientes no Brasil</h3>
                <Badge variant="primary">{clients.length} unidades</Badge>
              </div>
              <div className="flex items-center justify-center py-4">
                <div className="w-full max-w-md">
                  <BrazilMap clients={clients} events={activeEvents} focus={mapFocus} onFocusChange={setMapFocus} />
                  <div className="flex items-center justify-center gap-6 mt-4">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-success" />
                      <span className="text-xs text-gray-400">Ativo</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-accent" />
                      <span className="text-xs text-gray-400">Trial</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-danger" />
                      <span className="text-xs text-gray-400">Bloqueado</span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* System Alerts */}
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={20} className="text-danger" />
                <h3 className="font-display text-lg text-white">Alertas do Sistema</h3>
                <Badge variant="danger">{alerts.length}</Badge>
              </div>
              <div className="space-y-3">
                {Array.isArray(alerts) && alerts.length > 0 ? (
                  alerts.map(alert => (
                    <div
                      key={alert.id}
                      className="flex items-start gap-3 p-3 rounded-lg bg-surface/50 border border-danger/20"
                    >
                      <StatusDot
                        status={alert.type === 'offline' ? 'offline' : 'warning'}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white">{alert.message}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{alert.client}</p>
                      </div>
                      <span className="text-xs text-gray-500 shrink-0">{alert.time}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-gray-400 text-sm">
                    Nenhum alerta no momento
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Active Events */}
          <Card variant="secondary" className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap size={20} className="text-secondary" />
                <h3 className="font-display text-lg text-white">Eventos em Andamento</h3>
              </div>
              <Badge variant="success">{activeEvents.length} ativos</Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.isArray(activeEvents) && activeEvents.length > 0 ? (
                activeEvents.map((event) => {
                  const client = clients.find(c => c.id === event.clientId);
                  const locatable = !!client && !!findStateShape(client.state);
                  return (
                    <div
                      key={event.id}
                      role={locatable ? 'button' : undefined}
                      tabIndex={locatable ? 0 : undefined}
                      title={locatable ? 'Ver no mapa' : 'Cliente sem estado cadastrado'}
                      onClick={() => locatable && focusClientOnMap(event.clientId)}
                      onKeyDown={(e) => {
                        if (locatable && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault();
                          focusClientOnMap(event.clientId);
                        }
                      }}
                      className={`rounded-lg border border-border p-4 bg-surface/30 hover:bg-surface/50 transition-colors ${
                        locatable ? 'cursor-pointer' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <StatusDot status="online" size="sm" />
                        <span className="text-sm font-semibold text-white truncate">{event.name}</span>
                      </div>
                      <p className="text-xs text-gray-400 mb-1">{event.client}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">{event.childrenCount} crianças</span>
                        <span className="text-xs text-secondary font-mono">
                          {event.status === 'active' ? `${event.elapsed}min` : 'agendado'}
                        </span>
                      </div>
                      {client && (
                        <Badge
                          variant={client.plan === 'enterprise' ? 'primary' : client.plan === 'professional' ? 'secondary' : 'muted'}
                          className="mt-2"
                        >
                          {client.plan}
                        </Badge>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full text-center py-8 text-gray-400">
                  Nenhum evento ativo no momento
                </div>
              )}
            </div>
          </Card>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <Card className="text-center">
              <WifiOff size={24} className="text-danger mx-auto mb-2" />
              <p className="font-display text-2xl text-danger font-bold">{offlineCheckpointsCount}</p>
              <p className="text-sm text-gray-400">Checkpoints offline</p>
            </Card>
            <Card className="text-center">
              <Bell size={24} className="text-accent mx-auto mb-2" />
              <p className="font-display text-2xl text-accent font-bold">{alerts.length}</p>
              <p className="text-sm text-gray-400">Alertas pendentes</p>
            </Card>
            <Card className="text-center">
              <Users size={24} className="text-primary mx-auto mb-2" />
              <p className="font-display text-2xl text-primary font-bold">{totalClientsCount}</p>
              <p className="text-sm text-gray-400">Total de clientes</p>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
