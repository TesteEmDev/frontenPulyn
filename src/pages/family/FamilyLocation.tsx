import { useState } from 'react';
import { usePulynStore } from '../../store/mockData';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import BottomNav from '../../components/layout/BottomNav';
import PageHeader from '../../components/layout/PageHeader';
import {
  Home,
  MapPin,
  Trophy,
  Star,
  Gamepad2,
  Clock,
  RefreshCw,
  ArrowRight,
  Activity,
} from 'lucide-react';

const navItems = [
  { icon: <Home size={20} />, label: 'Home', path: '/family' },
  { icon: <MapPin size={20} />, label: 'Localização', path: '/family/location' },
  { icon: <Star size={20} />, label: 'Pontuação', path: '/family/scores' },
  { icon: <Trophy size={20} />, label: 'Conquistas', path: '/family/achievements' },
  { icon: <Gamepad2 size={20} />, label: 'Perfil', path: '/family/profile' },
];

interface ZoneInfo {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

const zones: ZoneInfo[] = [
  { id: 'z1', name: 'Entrada', color: '#1E9BD7', x: 5, y: 5, w: 90, h: 18 },
  { id: 'z2', name: 'Área Verde', color: '#22C55E', x: 5, y: 27, w: 43, h: 35 },
  { id: 'z3', name: 'Área Azul', color: '#1E9BD7', x: 52, y: 27, w: 43, h: 35 },
  { id: 'z4', name: 'Área Central', color: '#F59E0B', x: 5, y: 66, w: 90, h: 30 },
];

const childZones: Record<string, { zoneId: string; x: number; y: number; status: string }> = {
  '1': { zoneId: 'z2', x: 20, y: 42, status: 'Em jogo' },
  '2': { zoneId: 'z3', x: 70, y: 42, status: 'Em jogo' },
  '3': { zoneId: 'z2', x: 35, y: 50, status: 'Área Livre' },
  '5': { zoneId: 'z4', x: 50, y: 78, status: 'Em jogo' },
  '6': { zoneId: 'z3', x: 60, y: 35, status: 'Em jogo' },
  '7': { zoneId: 'z4', x: 30, y: 82, status: 'Aguardando' },
  '8': { zoneId: 'z1', x: 50, y: 12, status: 'Aguardando' },
  '9': { zoneId: 'z2', x: 25, y: 38, status: 'Em jogo' },
  '11': { zoneId: 'z4', x: 70, y: 80, status: 'Área Livre' },
  '12': { zoneId: 'z3', x: 75, y: 48, status: 'Em jogo' },
};

const movementHistory = [
  { childName: 'Pedro', from: 'Entrada', to: 'Área Verde', time: '14:32' },
  { childName: 'Sofia', from: 'Área Verde', to: 'Área Azul', time: '14:28' },
  { childName: 'Lucas', from: 'Área Azul', to: 'Área Central', time: '14:25' },
  { childName: 'Mateus', from: 'Entrada', to: 'Área Verde', time: '14:20' },
  { childName: 'Ana Júlia', from: 'Área Central', to: 'Área Azul', time: '14:18' },
  { childName: 'Gabriel', from: 'Área Azul', to: 'Área Central', time: '14:12' },
];

const statusColor: Record<string, string> = {
  'Em jogo': 'text-success',
  'Área Livre': 'text-secondary',
  'Aguardando': 'text-accent',
};

const statusBg: Record<string, string> = {
  'Em jogo': 'bg-success/20',
  'Área Livre': 'bg-secondary/20',
  'Aguardando': 'bg-accent/20',
};

export default function FamilyLocation() {
  const { children, teams } = usePulynStore();
  const [selectedZone, setSelectedZone] = useState<string | null>(null);

  const activeChildren = children.filter((c) => c.status === 'active' && c.team);

  return (
    <div className="min-h-screen bg-dark pb-24">
      <div className="max-w-md mx-auto px-4 pt-6">
        <PageHeader
          title="Localização"
          description="Acompanhe em tempo real"
          icon={<MapPin size={24} />}
          action={
            <button className="p-2 rounded-lg bg-surface border border-border hover:border-primary/50 transition-colors">
              <RefreshCw size={18} className="text-gray-300" />
            </button>
          }
        />

        {/* Last Update */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Clock size={14} />
            <span>Última atualização: 14:32:05</span>
          </div>
          <Badge variant="success">Online</Badge>
        </div>

        {/* Floor Plan */}
        <Card variant="glow" className="mb-4 p-2">
          <div className="relative w-full" style={{ paddingBottom: '60%' }}>
            <svg
              viewBox="0 0 100 100"
              className="absolute inset-0 w-full h-full rounded-lg"
              style={{ background: '#1a1a2e' }}
            >
              {/* Zone rectangles */}
              {zones.map((zone) => (
                <g key={zone.id}>
                  <rect
                    x={zone.x}
                    y={zone.y}
                    width={zone.w}
                    height={zone.h}
                    rx={2}
                    fill={zone.color}
                    fillOpacity={selectedZone === zone.id ? 0.35 : 0.15}
                    stroke={zone.color}
                    strokeWidth={selectedZone === zone.id ? 1.5 : 0.5}
                    strokeOpacity={0.6}
                    className="cursor-pointer transition-all"
                    onClick={() => setSelectedZone(selectedZone === zone.id ? null : zone.id)}
                  />
                  <text
                    x={zone.x + zone.w / 2}
                    y={zone.y + 5}
                    textAnchor="middle"
                    fill={zone.color}
                    fontSize={3.5}
                    fontWeight="600"
                    opacity={0.8}
                  >
                    {zone.name}
                  </text>
                </g>
              ))}

              {/* Child avatars */}
              {activeChildren
                .filter((c) => childZones[c.id])
                .map((child) => {
                  const loc = childZones[child.id];
                  const team = teams.find((t) => t.id === child.team);
                  return (
                    <g key={child.id}>
                      <circle
                        cx={loc.x}
                        cy={loc.y}
                        r={4}
                        fill={team?.color || '#1E9BD7'}
                        fillOpacity={0.3}
                        stroke={team?.color || '#1E9BD7'}
                        strokeWidth={0.5}
                      />
                      <text
                        x={loc.x}
                        y={loc.y + 1.5}
                        textAnchor="middle"
                        fontSize={5}
                        dominantBaseline="middle"
                      >
                        {child.avatar}
                      </text>
                      <text
                        x={loc.x}
                        y={loc.y + 5.5}
                        textAnchor="middle"
                        fill="#e5e7eb"
                        fontSize={2.5}
                      >
                        {child.nickname}
                      </text>
                    </g>
                  );
                })}
            </svg>
          </div>
          <p className="text-center text-xs text-gray-500 mt-2">
            Toque em uma zona para filtrar
          </p>
        </Card>

        {/* Children Status */}
        <h3 className="text-white font-display font-semibold text-lg mb-3">
          Status das crianças
        </h3>
        <div className="space-y-2 mb-6">
          {activeChildren
            .filter((c) => childZones[c.id])
            .map((child) => {
              const loc = childZones[child.id];
              const zone = zones.find((z) => z.id === loc.zoneId);
              const team = teams.find((t) => t.id === child.team);
              return (
                <Card key={child.id} className="flex items-center gap-3 py-2.5">
                  <Avatar emoji={child.avatar} size="sm" bgColor={team ? `${team.color}30` : 'bg-primary/30'} />
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-body font-semibold truncate">
                      {child.nickname}
                    </p>
                    <p className="text-xs text-gray-400">{zone?.name}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusBg[loc.status]} ${statusColor[loc.status]}`}>
                    {loc.status}
                  </span>
                </Card>
              );
            })}
        </div>

        {/* Movement History */}
        <Card className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Activity size={18} className="text-primary" />
            <h3 className="text-white font-display font-semibold">
              Movimentação do dia
            </h3>
          </div>
          <div className="space-y-2.5">
            {movementHistory.map((m, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <span className="text-xs text-gray-500 w-10 shrink-0">{m.time}</span>
                <span className="text-gray-300 font-medium shrink-0">{m.childName}</span>
                <span className="text-gray-400 truncate">
                  {m.from}
                  <ArrowRight size={12} className="inline mx-1" />
                  {m.to}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <BottomNav items={navItems} activePath="/family/location" />
    </div>
  );
}
