import { useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { LayoutDashboard, Calendar, Users, Gamepad2, MapPin, Map, FileText, RefreshCw, Settings, Upload, CreditCard as Edit3, Trash2, Plus } from 'lucide-react';
import { usePulynStore } from '../../store/mockData';
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

const initialZones: Zone[] = [
  { id: '1', name: 'Entrada', color: '#1E9BD7', x: 50, y: 20, width: 120, height: 80 },
  { id: '2', name: 'Área Verde', color: '#22C55E', x: 200, y: 20, width: 200, height: 150 },
  { id: '3', name: 'Área Azul', color: '#1E9BD7', x: 50, y: 130, width: 120, height: 120 },
  { id: '4', name: 'Área Central', color: '#F59E0B', x: 200, y: 200, width: 200, height: 100 },
];

const checkpointPositions: Record<string, { x: number; y: number }> = {
  CP01: { x: 110, y: 60 },
  CP02: { x: 300, y: 40 },
  CP03: { x: 110, y: 190 },
  CP04: { x: 350, y: 120 },
  CP05: { x: 300, y: 250 },
};

export default function AdminMap() {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { checkpoints } = usePulynStore();
  const [zones, setZones] = useState<Zone[]>(initialZones);
  const [editingZone, setEditingZone] = useState<string | null>(null);
  const [floorPlanUploaded, setFloorPlanUploaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateZone = (id: string, field: keyof Zone, value: string | number) => {
    setZones(prev =>
      prev.map(z => z.id === id ? { ...z, [field]: value } : z)
    );
  };

  const removeZone = (id: string) => {
    setZones(prev => prev.filter(z => z.id !== id));
  };

  const addZone = () => {
    const newId = String(Date.now());
    setZones(prev => [...prev, {
      id: newId,
      name: 'Nova Zona',
      color: '#1E9BD7',
      x: 50,
      y: 50,
      width: 100,
      height: 80,
    }]);
  };

  return (
    <div className="flex h-screen bg-dark text-white overflow-hidden">
      <Sidebar
        items={navItems}
        activePath={location.pathname}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
        title="Pulyn Admin"
        accentColor="#1E9BD7"
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Gestão do Buffet" subtitle="Mapa do Espaço" />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <PageHeader
            title="Mapa do Espaço"
            description="Configure a planta do espaço e posicione os checkpoints"
            icon={<Map size={28} />}
          />

          {/* Upload Area */}
          {!floorPlanUploaded && (
            <Card
              className="cursor-pointer border-dashed border-2 hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex flex-col items-center justify-center py-12">
                <Upload size={48} className="text-gray-500 mb-4" />
                <p className="font-display text-lg text-white mb-2">Upload da Planta do Espaço</p>
                <p className="text-sm text-gray-500">Arraste e solte ou clique para selecionar uma imagem</p>
                <p className="text-xs text-gray-600 mt-2">PNG, JPG ou SVG</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={() => setFloorPlanUploaded(true)}
                />
              </div>
            </Card>
          )}

          {/* Canvas + Zone List */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Canvas */}
            <Card className="lg:col-span-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg text-white">Pré-visualização</h3>
                <div className="flex items-center gap-2">
                  <Badge variant="muted">{zones.length} zonas</Badge>
                  <Badge variant="secondary">{checkpoints.length} checkpoints</Badge>
                </div>
              </div>
              <div className="relative bg-surface rounded-lg overflow-hidden" style={{ height: 340 }}>
                <svg width="100%" height="100%" viewBox="0 0 450 320">
                  {/* Grid lines */}
                  {[...Array(9)].map((_, i) => (
                    <line key={`h${i}`} x1="0" y1={i * 40} x2="450" y2={i * 40} stroke="#1E1B2E" strokeWidth="1" />
                  ))}
                  {[...Array(12)].map((_, i) => (
                    <line key={`v${i}`} x1={i * 40} y1="0" x2={i * 40} y2="320" stroke="#1E1B2E" strokeWidth="1" />
                  ))}

                  {/* Zones */}
                  {zones.map(zone => (
                    <g key={zone.id}>
                      <rect
                        x={zone.x}
                        y={zone.y}
                        width={zone.width}
                        height={zone.height}
                        fill={zone.color}
                        fillOpacity={0.15}
                        stroke={zone.color}
                        strokeWidth={2}
                        strokeDasharray="6 3"
                        rx={8}
                      />
                      <text
                        x={zone.x + zone.width / 2}
                        y={zone.y + zone.height / 2}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={zone.color}
                        fontSize={12}
                        fontWeight="600"
                      >
                        {zone.name}
                      </text>
                    </g>
                  ))}

                  {/* Checkpoint markers */}
                  {checkpoints.map(cp => {
                    const pos = checkpointPositions[cp.id];
                    if (!pos) return null;
                    return (
                      <g key={cp.id}>
                        <circle
                          cx={pos.x}
                          cy={pos.y}
                          r={12}
                          fill={cp.status === 'online' ? '#22C55E' : '#EF4444'}
                          fillOpacity={0.3}
                          stroke={cp.status === 'online' ? '#22C55E' : '#EF4444'}
                          strokeWidth={2}
                        />
                        <circle
                          cx={pos.x}
                          cy={pos.y}
                          r={4}
                          fill={cp.status === 'online' ? '#22C55E' : '#EF4444'}
                        />
                        <text
                          x={pos.x}
                          y={pos.y - 18}
                          textAnchor="middle"
                          fill="#9CA3AF"
                          fontSize={10}
                        >
                          {cp.id}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </Card>

            {/* Zone List */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg text-white">Zonas</h3>
                <Button variant="ghost" size="sm" onClick={addZone}>
                  <Plus size={14} />
                </Button>
              </div>
              <div className="space-y-3">
                {zones.map(zone => (
                  <div key={zone.id} className="p-3 rounded-lg bg-surface/50">
                    {editingZone === zone.id ? (
                      <div className="space-y-2">
                        <Input
                          value={zone.name}
                          onChange={e => updateZone(zone.id, 'name', e.target.value)}
                          className="text-sm"
                        />
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={zone.color}
                            onChange={e => updateZone(zone.id, 'color', e.target.value)}
                            className="w-8 h-8 rounded border border-border bg-surface cursor-pointer"
                          />
                          <Input
                            value={zone.color}
                            onChange={e => updateZone(zone.id, 'color', e.target.value)}
                            className="flex-1 text-sm"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setEditingZone(null)}>
                            OK
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded shrink-0"
                          style={{ backgroundColor: zone.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{zone.name}</p>
                          <p className="text-xs text-gray-500">
                            {zone.width}x{zone.height}px
                          </p>
                        </div>
                        <button
                          onClick={() => setEditingZone(zone.id)}
                          className="p-1 rounded text-gray-400 hover:text-white transition-colors"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          onClick={() => removeZone(zone.id)}
                          className="p-1 rounded text-gray-400 hover:text-danger transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Checkpoint Legend */}
              <div className="mt-6 pt-4 border-t border-border">
                <h4 className="text-sm font-semibold text-gray-400 mb-3">Checkpoints</h4>
                <div className="space-y-2">
                  {checkpoints.map(cp => (
                    <div key={cp.id} className="flex items-center gap-2">
                      <StatusDot status={cp.status === 'online' ? 'online' : 'offline'} />
                      <span className="text-xs text-gray-400">{cp.id}</span>
                      <span className="text-xs text-white truncate">{cp.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
