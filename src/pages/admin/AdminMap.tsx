import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { LayoutDashboard, Calendar, Users, Gamepad2, MapPin, Map, FileText, RefreshCw, Settings, Upload, CreditCard as Edit3, Trash2, Plus, Save, Loader2 } from 'lucide-react';
import { usePulynStore } from '../../store/mockData';
import { api } from '../../services/api';
import Sidebar from '../../components/layout/Sidebar';
import TopBar from '../../components/layout/TopBar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import StatusDot from '../../components/ui/StatusDot';

const navItems = [
  { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/admin' },
  { icon: <Calendar size={20} />, label: 'Eventos', path: '/admin/events' },
  { icon: <Users size={20} />, label: 'Crianças', path: '/admin/children' },
  { icon: <Gamepad2 size={20} />, label: 'Jogos', path: '/admin/games' },
  { icon: <MapPin size={20} />, label: 'Checkpoints', path: '/admin/checkpoints' },
  { icon: <Map size={20} />, label: 'Mapa', path: '/admin/map' },
  { icon: <Users size={20} />, label: 'Usuários', path: '/admin/users' },
  { icon: <Users size={20} />, label: 'Times', path: '/admin/teams' },
  { icon: <FileText size={20} />, label: 'Relatórios', path: '/admin/reports' },
  { icon: <RefreshCw size={20} />, label: 'Sincronização', path: '/admin/sync' },
  { icon: <Settings size={20} />, label: 'Configurações', path: '/admin/settings' },
];

interface Zone {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface MapPosition {
  x: number;
  y: number;
}

const MAP_WIDTH = 450;
const MAP_HEIGHT = 320;

const initialZones: Zone[] = [
  { id: '1', name: 'Entrada', color: '#1E9BD7', x: 50, y: 20, width: 120, height: 80 },
  { id: '2', name: 'Área Verde', color: '#22C55E', x: 200, y: 20, width: 200, height: 150 },
  { id: '3', name: 'Área Azul', color: '#1E9BD7', x: 50, y: 130, width: 120, height: 120 },
  { id: '4', name: 'Área Central', color: '#F59E0B', x: 200, y: 200, width: 200, height: 100 },
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

async function optimizeFloorPlan(file: File): Promise<string> {
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem selecionada.'));
    reader.readAsDataURL(file);
  });

  if (!source.startsWith('data:image/')) {
    throw new Error('Selecione uma imagem válida para a planta.');
  }

  if (file.type === 'image/svg+xml') return source;

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error('Não foi possível processar a imagem da planta.'));
    element.src = source;
  });

  const maxDimension = 1600;
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Seu navegador não conseguiu preparar a imagem.');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  let optimized = canvas.toDataURL('image/jpeg', 0.82);
  if (optimized.length > 8 * 1024 * 1024) optimized = canvas.toDataURL('image/jpeg', 0.65);
  if (optimized.length > 9 * 1024 * 1024) {
    throw new Error('A planta ainda ficou muito grande. Use uma imagem menor.');
  }
  return optimized;
}

export default function AdminMap() {
  const location = useLocation();
  const svgRef = useRef<SVGSVGElement>(null);
  const draggingCheckpointRef = useRef<string | null>(null);
  const dragStartPositionRef = useRef<MapPosition | null>(null);
  const dragPositionRef = useRef<MapPosition | null>(null);
  const dragOffsetRef = useRef<MapPosition | null>(null);
  const renderTimerRef = useRef<number | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingCheckpoints, setLoadingCheckpoints] = useState(false);
  const [savingCheckpointId, setSavingCheckpointId] = useState<string | null>(null);
  const [selectedCheckpointId, setSelectedCheckpointId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [zones, setZones] = useState<Zone[]>(initialZones);
  const [editingZone, setEditingZone] = useState<string | null>(null);
  const [floorPlanUrl, setFloorPlanUrl] = useState<string | null>(null);
  const [floorPlanName, setFloorPlanName] = useState<string | null>(null);
  const [uploadingFloorPlan, setUploadingFloorPlan] = useState(false);
  const [, forceRender] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setEventoAtual } = usePulynStore();
  
  // Estados para criação de zona
  const [creatingZone, setCreatingZone] = useState(false);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneColor, setNewZoneColor] = useState('#1E9BD7');
  const [drawingZone, setDrawingZone] = useState(false);
  const [zoneStartPos, setZoneStartPos] = useState<MapPosition | null>(null);
  const [zoneEndPos, setZoneEndPos] = useState<MapPosition | null>(null);
  
  // Estados para edição de zona
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [resizingZone, setResizingZone] = useState(false);
  const [resizeStart, setResizeStart] = useState<MapPosition | null>(null);
  const [resizeEnd, setResizeEnd] = useState<MapPosition | null>(null);
  const [movingZone, setMovingZone] = useState(false);
  const [moveStart, setMoveStart] = useState<MapPosition | null>(null);
  const [zoneOriginalSize, setZoneOriginalSize] = useState<{ width: number; height: number } | null>(null);
  const [previewZoneSize, setPreviewZoneSize] = useState<{ width: number; height: number } | null>(null);

  const loadCheckpoints = useCallback(async (eventId: string | null) => {
    if (!eventId) {
      setCheckpoints([]);
      return;
    }

    setLoadingCheckpoints(true);
    setError('');
    try {
      const data = await api.getCheckpoints(eventId);
      let checkpoints = Array.isArray(data) ? data : [];
      
      // Proteção: recuperar checkpoints perdidos fora da área visível
      const CHECKPOINT_RADIUS = 17;
      const centerX = MAP_WIDTH / 2;
      const centerY = MAP_HEIGHT / 2;
      
      checkpoints = checkpoints.map((checkpoint) => {
        const x = Number(checkpoint.map_x ?? checkpoint.mapX);
        const y = Number(checkpoint.map_y ?? checkpoint.mapY);
        
        // Se checkpoint está fora dos limites, retornar ao centro
        if (!Number.isFinite(x) || !Number.isFinite(y) || 
            x < CHECKPOINT_RADIUS || x > MAP_WIDTH - CHECKPOINT_RADIUS ||
            y < CHECKPOINT_RADIUS || y > MAP_HEIGHT - CHECKPOINT_RADIUS) {
          return {
            ...checkpoint,
            map_x: centerX,
            map_y: centerY,
          };
        }
        
        return checkpoint;
      });
      
      setCheckpoints(checkpoints);
    } catch (err: any) {
      console.error('❌ Erro ao carregar checkpoints do mapa:', err);
      setCheckpoints([]);
      setError(err.message || 'Não foi possível carregar os checkpoints deste evento.');
    } finally {
      setLoadingCheckpoints(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const loadEvents = async () => {
      setLoadingEvents(true);
      try {
        const data = await api.getEventos();
        if (!active) return;
        const eventList = Array.isArray(data) ? data : [];
        setEvents(eventList);
        const activeEvent = eventList.find((event) => event.status === 'active' || event.status === 'ongoing');
        const eventToSelect = activeEvent || eventList[0] || null;
        setSelectedEventId(eventToSelect?.id || null);
        if (eventToSelect?.id) setEventoAtual(eventToSelect.id);
      } catch (err: any) {
        if (!active) return;
        console.error('❌ Erro ao carregar eventos do mapa:', err);
        setError(err.message || 'Não foi possível carregar os eventos.');
      } finally {
        if (active) setLoadingEvents(false);
      }
    };

    loadEvents();
    return () => {
      active = false;
    };
  }, [setEventoAtual]);

  const loadFloorPlan = useCallback(async (eventId: string | null) => {
    setFloorPlanUrl(null);
    setFloorPlanName(null);
    if (!eventId) return;

    try {
      const floorPlan = await api.getFloorPlan(eventId);
      setFloorPlanUrl(floorPlan?.dataUrl || null);
      setFloorPlanName(floorPlan?.name || null);
    } catch (err: any) {
      console.error('❌ Erro ao carregar planta do evento:', err);
      setError(err.message || 'Não foi possível carregar a planta deste evento.');
    }
  }, []);

  const loadZones = useCallback(async (eventId: string | null) => {
    if (!eventId) {
      setZones(initialZones);
      return;
    }

    try {
      const zonesData = await api.getZones(eventId);
      if (zonesData && Array.isArray(zonesData) && zonesData.length > 0) {
        setZones(zonesData);
      } else {
        setZones(initialZones);
      }
    } catch (err: any) {
      console.error('❌ Erro ao carregar zonas:', err);
      setZones(initialZones);
    }
  }, []);

  useEffect(() => {
    setSelectedCheckpointId(null);
    loadCheckpoints(selectedEventId);
    loadFloorPlan(selectedEventId);
    loadZones(selectedEventId);
    if (selectedEventId) setEventoAtual(selectedEventId);
  }, [loadCheckpoints, loadFloorPlan, loadZones, selectedEventId, setEventoAtual]);

  // Salvar zonas quando mudarem
  useEffect(() => {
    if (!selectedEventId || zones.length === 0) return;

    const saveZones = async () => {
      try {
        await api.saveZones(selectedEventId, zones);
      } catch (err) {
        console.error('❌ Erro ao salvar zonas:', err);
      }
    };

    const debounceTimer = setTimeout(saveZones, 500);
    return () => clearTimeout(debounceTimer);
  }, [zones, selectedEventId]);

  const updateZone = (id: string, field: keyof Zone, value: string | number) => {
    setZones((prev) => prev.map((zone) => zone.id === id ? { ...zone, [field]: value } : zone));
  };

  const removeZone = (id: string) => {
    setZones((prev) => prev.filter((zone) => zone.id !== id));
  };

  const addZone = () => {
    setCreatingZone(true);
    setNewZoneName('');
    setDrawingZone(false);
    setZoneStartPos(null);
    setZoneEndPos(null);
  };

  const startDrawingZone = () => {
    if (!newZoneName.trim()) {
      setError('Digite um nome para a zona');
      return;
    }
    setDrawingZone(true);
    setZoneStartPos(null);
    setZoneEndPos(null);
  };

  const handleZoneDrawStart = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!drawingZone) return;
    const pos = getPointerPosition(event);
    if (pos) {
      setZoneStartPos(pos);
      setZoneEndPos(pos);
    }
  };

  const handleZoneDrawMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!drawingZone || !zoneStartPos) return;
    const pos = getPointerPosition(event);
    if (pos) {
      setZoneEndPos(pos);
    }
  };

  const handleZoneDrawEnd = () => {
    if (!drawingZone || !zoneStartPos || !zoneEndPos) return;
    
    const x = Math.min(zoneStartPos.x, zoneEndPos.x);
    const y = Math.min(zoneStartPos.y, zoneEndPos.y);
    const width = Math.abs(zoneEndPos.x - zoneStartPos.x);
    const height = Math.abs(zoneEndPos.y - zoneStartPos.y);

    if (width < 20 || height < 20) {
      setError('Zona muito pequena. Desenhe uma zona maior.');
      return;
    }

    const newId = String(Date.now());
    setZones((prev) => [...prev, {
      id: newId,
      name: newZoneName,
      color: newZoneColor,
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(width),
      height: Math.round(height),
    }]);

    setCreatingZone(false);
    setDrawingZone(false);
    setNewZoneName('');
    setZoneStartPos(null);
    setZoneEndPos(null);
    setError('');
  };

  const cancelZoneCreation = () => {
    setCreatingZone(false);
    setDrawingZone(false);
    setNewZoneName('');
    setZoneStartPos(null);
    setZoneEndPos(null);
    setError('');
  };

  const startEditingZone = (zoneId: string) => {
    setEditingZoneId(zoneId);
    setResizingZone(false);
    setMovingZone(false);
    setResizeStart(null);
    setResizeEnd(null);
    setMoveStart(null);
    setZoneOriginalSize(null);
  };

  const startMovingZone = (event: React.PointerEvent<SVGRectElement>, zoneId: string) => {
    event.stopPropagation();
    setEditingZoneId(zoneId);
    setMovingZone(true);
    setResizingZone(false);
    const pos = getPointerPosition(event as any);
    if (pos) {
      setMoveStart(pos);
    }
  };

  const startResizingZone = (event: React.PointerEvent<SVGElement>, zoneId: string) => {
    event.stopPropagation();
    const zone = zones.find((z) => z.id === zoneId);
    if (!zone) return;
    
    setEditingZoneId(zoneId);
    setResizingZone(true);
    setMovingZone(false);
    setZoneOriginalSize({ width: zone.width, height: zone.height });
    
    const pos = getPointerPosition(event as any);
    if (pos) {
      setResizeStart(pos);
      setResizeEnd(pos);
    }
  };

  const handleMoveZone = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!movingZone || !editingZoneId || !moveStart) return;
    const pos = getPointerPosition(event);
    if (!pos) return;

    const zone = zones.find((z) => z.id === editingZoneId);
    if (!zone) return;

    const deltaX = pos.x - moveStart.x;
    const deltaY = pos.y - moveStart.y;

    const newX = clamp(zone.x + deltaX, 0, MAP_WIDTH - zone.width);
    const newY = clamp(zone.y + deltaY, 0, MAP_HEIGHT - zone.height);

    updateZone(editingZoneId, 'x', Math.round(newX));
    updateZone(editingZoneId, 'y', Math.round(newY));

    setMoveStart(pos);
  };

  const handleMoveEnd = () => {
    setMovingZone(false);
    setMoveStart(null);
  };

  const handleResizeMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!resizingZone || !editingZoneId || !resizeStart || !zoneOriginalSize) return;
    const pos = getPointerPosition(event);
    if (pos) {
      setResizeEnd(pos);
      
      // Calcular preview de tamanho
      const deltaX = pos.x - resizeStart.x;
      const deltaY = pos.y - resizeStart.y;
      
      const newWidth = Math.max(20, zoneOriginalSize.width + deltaX);
      const newHeight = Math.max(20, zoneOriginalSize.height + deltaY);
      
      setPreviewZoneSize({ width: newWidth, height: newHeight });
    }
  };

  const handleResizeEnd = () => {
    if (!resizingZone || !editingZoneId || !resizeStart || !resizeEnd || !zoneOriginalSize) return;

    const zone = zones.find((z) => z.id === editingZoneId);
    if (!zone) return;

    // Calcular mudança de tamanho em relação ao canto clicado
    const deltaX = resizeEnd.x - resizeStart.x;
    const deltaY = resizeEnd.y - resizeStart.y;

    const newWidth = Math.max(20, zoneOriginalSize.width + deltaX);
    const newHeight = Math.max(20, zoneOriginalSize.height + deltaY);

    // Atualizar apenas ao soltar
    updateZone(editingZoneId, 'width', Math.round(newWidth));
    updateZone(editingZoneId, 'height', Math.round(newHeight));

    setResizingZone(false);
    setResizeStart(null);
    setResizeEnd(null);
    setZoneOriginalSize(null);
    setPreviewZoneSize(null);
    setError('');
  };

  const cancelEditingZone = () => {
    setEditingZoneId(null);
    setResizingZone(false);
    setMovingZone(false);
    setResizeStart(null);
    setResizeEnd(null);
    setMoveStart(null);
    setZoneOriginalSize(null);
    setPreviewZoneSize(null);
  };

  const fallbackPosition = useCallback((checkpoint: any, index: number): MapPosition => {
    const storedX = Number(checkpoint.map_x ?? checkpoint.mapX);
    const storedY = Number(checkpoint.map_y ?? checkpoint.mapY);
    if (Number.isFinite(storedX) && Number.isFinite(storedY)) {
      return {
        x: storedX,
        y: storedY,
      };
    }

    const columns = Math.min(4, Math.max(1, checkpoints.length));
    const column = index % columns;
    const row = Math.floor(index / columns);
    const columnWidth = MAP_WIDTH / (columns + 1);
    return {
      x: Math.round(columnWidth * (column + 1)),
      y: Math.round(55 + row * 70),
    };
  }, [checkpoints.length]);

  const checkpointPositions = useMemo(() => {
    const positions: Record<string, MapPosition> = {};
    checkpoints.forEach((checkpoint, index) => {
      positions[checkpoint.id] = fallbackPosition(checkpoint, index);
    });
    return positions;
  }, [checkpoints, fallbackPosition]);

  const getPointerPosition = (event: React.PointerEvent<SVGSVGElement>): MapPosition | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    
    try {
      // Usar SVG native methods para transformação mais precisa e rápida
      const pt = svg.createSVGPoint();
      pt.x = event.clientX;
      pt.y = event.clientY;
      const screenCTM = svg.getScreenCTM();
      if (!screenCTM) return null;
      const ctm = screenCTM.inverse();
      const svgPt = pt.matrixTransform(ctm);
      
      return {
        x: svgPt.x,
        y: svgPt.y,
      };
    } catch (e) {
      return null;
    }
  };

  const handlePointerDown = (event: React.PointerEvent<SVGGElement>, checkpointId: string) => {
    event.preventDefault();
    event.stopPropagation();
    
    const checkpointPosition = checkpointPositions[checkpointId];
    if (!checkpointPosition) return;

    draggingCheckpointRef.current = checkpointId;
    dragStartPositionRef.current = checkpointPosition ? { ...checkpointPosition } : null;
    dragPositionRef.current = checkpointPosition ? { ...checkpointPosition } : null;
    
    // Calcular o offset: diferença entre onde clicou e o centro do checkpoint
    const clickPosition = getPointerPosition(event as any);
    if (clickPosition) {
      dragOffsetRef.current = {
        x: clickPosition.x - checkpointPosition.x,
        y: clickPosition.y - checkpointPosition.y,
      };
    }
    
    setSelectedCheckpointId(checkpointId);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const checkpointId = draggingCheckpointRef.current;
    if (!checkpointId) return;
    const cursorPosition = getPointerPosition(event);
    if (!cursorPosition) return;

    // Subtrair o offset: posição do checkpoint = posição do cursor - offset
    const checkpointPosition = {
      x: cursorPosition.x - (dragOffsetRef.current?.x || 0),
      y: cursorPosition.y - (dragOffsetRef.current?.y || 0),
    };

    dragPositionRef.current = checkpointPosition;
    
    // Usar requestAnimationFrame para render sincronizado com tela
    if (renderTimerRef.current !== null) {
      cancelAnimationFrame(renderTimerRef.current);
    }
    renderTimerRef.current = requestAnimationFrame(() => {
      forceRender((prev) => prev + 1);
      renderTimerRef.current = null;
    });
  };

  const handlePointerUp = async () => {
    const checkpointId = draggingCheckpointRef.current;
    const startPosition = dragStartPositionRef.current;
    let finalPosition = dragPositionRef.current;
    draggingCheckpointRef.current = null;
    dragStartPositionRef.current = null;
    dragPositionRef.current = null;
    dragOffsetRef.current = null;
    
    if (renderTimerRef.current !== null) {
      cancelAnimationFrame(renderTimerRef.current);
      renderTimerRef.current = null;
    }
    forceRender((prev) => prev + 1);

    if (!checkpointId || !selectedEventId || !finalPosition) return;

    const checkpoint = checkpoints.find((item) => item.id === checkpointId);
    if (!checkpoint) return;
    if (startPosition && startPosition.x === finalPosition.x && startPosition.y === finalPosition.y) return;

    // Arredondar e limitar à área visível do mapa (considerando raio do checkpoint ~17px)
    const CHECKPOINT_RADIUS = 17;
    finalPosition = {
      x: clamp(Math.round(finalPosition.x), CHECKPOINT_RADIUS, MAP_WIDTH - CHECKPOINT_RADIUS),
      y: clamp(Math.round(finalPosition.y), CHECKPOINT_RADIUS, MAP_HEIGHT - CHECKPOINT_RADIUS),
    };

    // Atualizar o estado com a posição final
    setCheckpoints((current) => current.map((item) => item.id === checkpointId
      ? { ...item, map_x: finalPosition.x, map_y: finalPosition.y }
      : item));

    setSavingCheckpointId(checkpointId);
    try {
      await api.saveCheckpointConfig(checkpointId, {
        mapX: finalPosition.x,
        mapY: finalPosition.y,
      }, selectedEventId);
    } catch (err: any) {
      console.error('❌ Erro ao salvar posição do checkpoint:', err);
      setError(err.message || 'Não foi possível salvar a posição do checkpoint.');
      await loadCheckpoints(selectedEventId);
    } finally {
      setSavingCheckpointId(null);
    }
  };

  const handleFloorPlanChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!selectedEventId) {
      setError('Selecione um evento antes de enviar a planta.');
      return;
    }

    setUploadingFloorPlan(true);
    setError('');
    try {
      const dataUrl = await optimizeFloorPlan(file);
      await api.saveFloorPlan(selectedEventId, {
        dataUrl,
        name: file.name,
        type: dataUrl.slice(5, dataUrl.indexOf(';')) || 'image/jpeg',
      });
      setFloorPlanUrl(dataUrl);
      setFloorPlanName(file.name);
    } catch (err: any) {
      console.error('❌ Erro ao enviar planta:', err);
      setError(err.message || 'Não foi possível salvar a planta.');
    } finally {
      setUploadingFloorPlan(false);
    }
  };

  const handleRemoveFloorPlan = async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!selectedEventId || uploadingFloorPlan) return;
    setUploadingFloorPlan(true);
    setError('');
    try {
      await api.deleteFloorPlan(selectedEventId);
      setFloorPlanUrl(null);
      setFloorPlanName(null);
    } catch (err: any) {
      console.error('❌ Erro ao remover planta:', err);
      setError(err.message || 'Não foi possível remover a planta.');
    } finally {
      setUploadingFloorPlan(false);
    }
  };

  const selectedEvent = events.find((event) => event.id === selectedEventId);
  const selectedCheckpoint = checkpoints.find((checkpoint) => checkpoint.id === selectedCheckpointId);
  const checkpointsWithoutPosition = checkpoints.filter((checkpoint) => {
    const x = Number(checkpoint.map_x ?? checkpoint.mapX);
    const y = Number(checkpoint.map_y ?? checkpoint.mapY);
    return !Number.isFinite(x) || !Number.isFinite(y);
  });

  return (
    <div className="flex h-screen bg-dark text-white overflow-hidden">
      <Sidebar
        items={navItems}
        activePath={location.pathname}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        title="Pulyn Admin"
        accentColor="#1E9BD7"
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Gestão do Buffet" subtitle="Mapa do Espaço" />
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <PageHeader
            title="Mapa do Espaço"
            description="Selecione um evento e arraste os checkpoints para posicioná-los na planta"
            icon={<Map size={28} />}
          />

          {error && (
            <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-red-300" role="alert">
              {error}
            </div>
          )}

          <Card>
            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <label className="text-sm font-semibold text-gray-300">Evento:</label>
              <select
                value={selectedEventId || ''}
                onChange={(event) => setSelectedEventId(event.target.value || null)}
                disabled={loadingEvents}
                className="flex-1 rounded-lg border border-dark-border bg-dark-surface px-3 py-2 text-sm text-white focus:border-primary focus:outline-none disabled:opacity-60"
              >
                <option value="">Selecione um evento</option>
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.name} - {event.date ? new Date(event.date).toLocaleDateString('pt-BR') : 'sem data'}
                  </option>
                ))}
              </select>
              <Button variant="ghost" size="sm" onClick={() => loadCheckpoints(selectedEventId)} disabled={!selectedEventId || loadingCheckpoints}>
                {loadingCheckpoints ? <Loader2 size={15} className="mr-1.5 animate-spin" /> : <RefreshCw size={15} className="mr-1.5" />}
                Atualizar
              </Button>
            </div>
            {selectedEvent && (
              <p className="mt-2 text-xs text-gray-500">
                {selectedEvent.name} · {checkpoints.length} checkpoint(s) carregado(s)
              </p>
            )}
          </Card>

          <Card
            className="cursor-pointer border-dashed border-2 hover:border-primary/50 transition-colors"
            onClick={() => !uploadingFloorPlan && fileInputRef.current?.click()}
          >
            <div className="flex items-center gap-4 p-4">
              <Upload size={30} className={floorPlanUrl ? 'text-success' : 'text-gray-500'} />
              <div className="flex-1 min-w-0">
                <p className="font-display text-base text-white">
                  {floorPlanUrl ? 'Planta carregada' : 'Enviar planta do espaço'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {floorPlanName || 'PNG, JPG ou SVG. A imagem ficará salva neste evento.'}
                </p>
              </div>
              {uploadingFloorPlan ? (
                <Loader2 size={18} className="animate-spin text-primary" />
              ) : (
                <>
                  <span className="text-xs text-primary">{floorPlanUrl ? 'Trocar' : 'Selecionar'}</span>
                  {floorPlanUrl && (
                    <Button variant="ghost" size="sm" onClick={handleRemoveFloorPlan}>
                      Remover
                    </Button>
                  )}
                </>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFloorPlanChange} />
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-display text-lg text-white">Pré-visualização</h3>
                  <p className="text-xs text-gray-500">Arraste os marcadores. A posição é salva ao soltar.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="muted">{zones.length} zonas</Badge>
                  <Badge variant="secondary">{checkpoints.length} checkpoints</Badge>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-lg bg-surface" style={{ height: 420 }}>
                {floorPlanUrl && (
                  <img src={floorPlanUrl} alt="Planta do espaço" className="absolute inset-0 h-full w-full object-cover opacity-35" />
                )}
                <svg
                  ref={svgRef}
                  width="100%"
                  height="100%"
                  viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
                  className="relative z-10 touch-none"
                  onPointerMove={(e) => {
                    if (drawingZone) handleZoneDrawMove(e);
                    else if (resizingZone) handleResizeMove(e);
                    else if (movingZone) handleMoveZone(e);
                    else handlePointerMove(e);
                  }}
                  onPointerUp={() => {
                    if (drawingZone) handleZoneDrawEnd();
                    else if (resizingZone) handleResizeEnd();
                    else if (movingZone) handleMoveEnd();
                    else handlePointerUp();
                  }}
                  onPointerDown={(e) => {
                    if (drawingZone) handleZoneDrawStart(e);
                  }}
                  onPointerLeave={() => {
                    if (drawingZone) handleZoneDrawEnd();
                    else handlePointerUp();
                  }}
                >
                  {[...Array(9)].map((_, index) => (
                    <line key={`h${index}`} x1="0" y1={index * 40} x2={MAP_WIDTH} y2={index * 40} stroke="#1E1B2E" strokeWidth="1" />
                  ))}
                  {[...Array(12)].map((_, index) => (
                    <line key={`v${index}`} x1={index * 40} y1="0" x2={index * 40} y2={MAP_HEIGHT} stroke="#1E1B2E" strokeWidth="1" />
                  ))}

                  {zones.map((zone) => (
                    <g key={zone.id} onClick={() => startEditingZone(zone.id)} className="cursor-pointer">
                      <rect
                        x={zone.x}
                        y={zone.y}
                        width={zone.width}
                        height={zone.height}
                        fill={zone.color}
                        fillOpacity={editingZoneId === zone.id ? 0.25 : 0.15}
                        stroke={editingZoneId === zone.id ? '#FFFFFF' : zone.color}
                        strokeWidth={editingZoneId === zone.id ? 3 : 2}
                        strokeDasharray="6 3"
                        rx={8}
                        className={editingZoneId === zone.id && !resizingZone ? 'cursor-move' : ''}
                        onPointerDown={(e) => {
                          if (editingZoneId === zone.id && !resizingZone) startMovingZone(e, zone.id);
                        }}
                      />
                      <text
                        x={zone.x + zone.width / 2}
                        y={zone.y + zone.height / 2}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={zone.color}
                        fontSize={12}
                        fontWeight="600"
                        pointerEvents="none"
                      >
                        {zone.name}
                      </text>
                      
                      {editingZoneId === zone.id && (
                        <>
                          {/* Handles nos cantos */}
                          <circle cx={zone.x + zone.width} cy={zone.y + zone.height} r={5} fill="#FFFFFF" stroke={zone.color} strokeWidth={2} className="cursor-nwse-resize" onPointerDown={(e) => startResizingZone(e, zone.id)} />
                        </>
                      )}
                    </g>
                  ))}

                  {resizingZone && zoneOriginalSize && previewZoneSize && editingZoneId && (
                    <g>
                      {/* Zona com novo tamanho (preview) */}
                      <rect
                        x={zones.find((z) => z.id === editingZoneId)?.x || 0}
                        y={zones.find((z) => z.id === editingZoneId)?.y || 0}
                        width={previewZoneSize.width}
                        height={previewZoneSize.height}
                        fill="rgba(255, 255, 255, 0.05)"
                        stroke="#FFFFFF"
                        strokeWidth={2}
                        strokeDasharray="4 4"
                        rx={8}
                      />
                      {/* Texto mostrando novo tamanho */}
                      <text
                        x={(zones.find((z) => z.id === editingZoneId)?.x || 0) + previewZoneSize.width / 2}
                        y={(zones.find((z) => z.id === editingZoneId)?.y || 0) + previewZoneSize.height / 2}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#FFFFFF"
                        fontSize={11}
                        fontWeight="600"
                        fillOpacity={0.8}
                      >
                        {Math.round(previewZoneSize.width)}×{Math.round(previewZoneSize.height)}
                      </text>
                    </g>
                  )}

                  {drawingZone && zoneStartPos && zoneEndPos && (
                    <g>
                      <rect
                        x={Math.min(zoneStartPos.x, zoneEndPos.x)}
                        y={Math.min(zoneStartPos.y, zoneEndPos.y)}
                        width={Math.abs(zoneEndPos.x - zoneStartPos.x)}
                        height={Math.abs(zoneEndPos.y - zoneStartPos.y)}
                        fill={newZoneColor}
                        fillOpacity={0.25}
                        stroke={newZoneColor}
                        strokeWidth={2}
                        rx={8}
                      />
                      <text
                        x={(Math.min(zoneStartPos.x, zoneEndPos.x) + Math.max(zoneStartPos.x, zoneEndPos.x)) / 2}
                        y={(Math.min(zoneStartPos.y, zoneEndPos.y) + Math.max(zoneStartPos.y, zoneEndPos.y)) / 2}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={newZoneColor}
                        fontSize={12}
                        fontWeight="600"
                      >
                        {newZoneName}
                      </text>
                    </g>
                  )}

                  {checkpoints.map((checkpoint, index) => {
                    const storedPosition = checkpointPositions[checkpoint.id] || fallbackPosition(checkpoint, index);
                    // Se está sendo arrastado, usar dragPositionRef (renderiza em tempo real), caso contrário usar a posição armazenada
                    const position = (draggingCheckpointRef.current === checkpoint.id && dragPositionRef.current)
                      ? dragPositionRef.current
                      : storedPosition;
                    const isSelected = selectedCheckpointId === checkpoint.id;
                    const color = checkpoint.status === 'online' ? '#22C55E' : '#EF4444';
                    const circleRadius = isSelected ? 17 : 14;
                    return (
                      <g
                        key={checkpoint.id}
                        transform={`translate(${position.x} ${position.y})`}
                        className="cursor-grab active:cursor-grabbing"
                        onPointerDown={(event) => handlePointerDown(event, checkpoint.id)}
                        onClick={() => setSelectedCheckpointId(checkpoint.id)}
                      >
                        <circle r={circleRadius} fill={color} fillOpacity={0.18} stroke={isSelected ? '#FFFFFF' : color} strokeWidth={isSelected ? 3 : 2} />
                        <circle r="5" fill={color} />
                        <text y="-22" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="600">{checkpoint.id}</text>
                        <text y="30" textAnchor="middle" fill="#D1D5DB" fontSize="9">{checkpoint.name}</text>
                      </g>
                    );
                  })}

                  {!selectedEventId && (
                    <text x={MAP_WIDTH / 2} y={MAP_HEIGHT / 2} textAnchor="middle" fill="#9CA3AF" fontSize="14">Selecione um evento</text>
                  )}
                  {selectedEventId && !loadingCheckpoints && checkpoints.length === 0 && (
                    <text x={MAP_WIDTH / 2} y={MAP_HEIGHT / 2} textAnchor="middle" fill="#9CA3AF" fontSize="14">Nenhum checkpoint neste evento</text>
                  )}
                </svg>
              </div>
            </Card>

            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-display text-lg text-white">Zonas</h3>
                <Button variant="ghost" size="sm" onClick={addZone} title="Adicionar zona" disabled={creatingZone}><Plus size={14} /></Button>
              </div>

              {creatingZone && (
                <div className="mb-4 rounded-lg border border-primary/50 bg-primary/10 p-3">
                  <p className="mb-2 text-sm font-semibold text-white">Criar nova zona</p>
                  
                  {!drawingZone ? (
                    <div className="space-y-2">
                      <div>
                        <label className="mb-1 block text-xs text-gray-400">Nome da zona</label>
                        <Input
                          value={newZoneName}
                          onChange={(e) => setNewZoneName(e.target.value)}
                          placeholder="Ex: Entrada, Área Verde..."
                          className="text-sm"
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs text-gray-400">Cor</label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={newZoneColor}
                            onChange={(e) => setNewZoneColor(e.target.value)}
                            className="h-10 w-10 cursor-pointer rounded border border-border bg-surface"
                          />
                          <span className="text-xs text-gray-500">{newZoneColor}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="primary" size="sm" onClick={startDrawingZone}>Desenhar no mapa</Button>
                        <Button variant="ghost" size="sm" onClick={cancelZoneCreation}>Cancelar</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-400">Clique e arraste no mapa para desenhar a zona "<strong>{newZoneName}</strong>"</p>
                      <Button variant="ghost" size="sm" onClick={cancelZoneCreation}>Cancelar desenho</Button>
                    </div>
                  )}
                </div>
              )}

              {editingZoneId && (
                <div className="mb-4 rounded-lg border border-warning/50 bg-warning/10 p-3">
                  <p className="mb-2 text-sm font-semibold text-white">Editando zona</p>
                  <div className="space-y-2 text-xs text-gray-400">
                    <p>🖱️ <strong>Mover:</strong> Arraste a zona para outra posição</p>
                    <p>📐 <strong>Redimensionar:</strong> Clique no handle do canto inferior direito e arraste</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={cancelEditingZone} className="mt-2">Concluir edição</Button>
                </div>
              )}

              <div className="space-y-3">
                {zones.map((zone) => (
                  <div key={zone.id} className="rounded-lg bg-surface/50 p-3">
                    {editingZone === zone.id ? (
                      <div className="space-y-2">
                        <Input value={zone.name} onChange={(event) => updateZone(zone.id, 'name', event.target.value)} className="text-sm" />
                        <div className="flex items-center gap-2">
                          <input type="color" value={zone.color} onChange={(event) => updateZone(zone.id, 'color', event.target.value)} className="h-8 w-8 cursor-pointer rounded border border-border bg-surface" />
                          <Input value={zone.color} onChange={(event) => updateZone(zone.id, 'color', event.target.value)} className="flex-1 text-sm" />
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setEditingZone(null)}>OK</Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div className="h-4 w-4 shrink-0 rounded" style={{ backgroundColor: zone.color }} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">{zone.name}</p>
                          <p className="text-xs text-gray-500">{zone.width}x{zone.height}px</p>
                        </div>
                        <button onClick={() => setEditingZone(zone.id)} className="rounded p-1 text-gray-400 hover:text-white" title="Editar zona"><Edit3 size={14} /></button>
                        <button onClick={() => removeZone(zone.id)} className="rounded p-1 text-gray-400 hover:text-danger" title="Remover zona"><Trash2 size={14} /></button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-6 border-t border-border pt-4">
                <h4 className="mb-3 text-sm font-semibold text-gray-400">Checkpoints do evento</h4>
                {checkpointsWithoutPosition.length > 0 && (
                  <p className="mb-3 text-xs text-warning">{checkpointsWithoutPosition.length} marcador(es) ainda usa(m) uma posição automática. Arraste para salvar.</p>
                )}
                <div className="max-h-72 space-y-2 overflow-y-auto">
                  {checkpoints.map((checkpoint) => (
                    <button
                      key={checkpoint.id}
                      type="button"
                      onClick={() => setSelectedCheckpointId(checkpoint.id)}
                      className={`flex w-full items-center gap-2 rounded-lg p-2 text-left transition-colors ${selectedCheckpointId === checkpoint.id ? 'bg-primary/15 ring-1 ring-primary/50' : 'hover:bg-surface/70'}`}
                    >
                      <StatusDot status={checkpoint.status === 'online' ? 'online' : 'offline'} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold text-white">{checkpoint.name}</span>
                        <span className="block truncate text-[11px] text-gray-500">{checkpoint.id} · {checkpoint.zone || checkpoint.location || 'Sem zona'}</span>
                      </span>
                      {savingCheckpointId === checkpoint.id ? <Loader2 size={14} className="animate-spin text-primary" /> : <MapPin size={14} className="text-gray-500" />}
                    </button>
                  ))}
                  {!loadingCheckpoints && checkpoints.length === 0 && <p className="text-xs text-gray-500">Nenhum checkpoint para exibir.</p>}
                </div>
              </div>

              {selectedCheckpoint && (
                <div className="mt-4 rounded-lg border border-primary/30 bg-primary/10 p-3">
                  <div className="flex items-center gap-2">
                    <Save size={15} className="text-primary" />
                    <p className="text-sm font-semibold text-white">{selectedCheckpoint.name}</p>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">Posição: {Math.round(checkpointPositions[selectedCheckpoint.id]?.x || 0)} × {Math.round(checkpointPositions[selectedCheckpoint.id]?.y || 0)}</p>
                  <p className="mt-1 text-xs text-gray-500">Status: {selectedCheckpoint.status === 'online' ? 'Online' : 'Offline'} · {selectedCheckpoint.points || 0} pontos</p>
                </div>
              )}
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
