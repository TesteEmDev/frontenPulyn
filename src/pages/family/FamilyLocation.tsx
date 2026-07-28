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

const zoneColors = ['#1E9BD7', '#22C55E', '#F59E0B', '#E91E8C'];

export default function FamilyLocation() {
  const { children, teams, checkpoints } = usePulynStore();
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const zones = checkpoints.reduce<ZoneInfo[]>((items, checkpoint) => {
    const name = checkpoint.zone || checkpoint.name;
    if (items.some((zone) => zone.name === name)) return items;
    const column = items.length % 2;
    const row = Math.floor(items.length / 2);
    items.push({
      id: `zone-${items.length}`,
      name,
      color: zoneColors[items.length % zoneColors.length],
      x: column === 0 ? 5 : 52,
      y: 8 + row * 24,
      w: 43,
      h: 18,
    });
    return items;
  }, []);
  const activeChildren = children.filter((c) => c.status === 'active');

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
            <span>Última atualização: dados do dispositivo</span>
          </div>
          <Badge variant={checkpoints.length > 0 ? 'success' : 'muted'}>{checkpoints.length > 0 ? 'Disponível' : 'Sem dados'}</Badge>
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

              {/* Localizações só são exibidas quando o backend fornecer coordenadas. */}
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
          {activeChildren.map((child) => {
            const teamId = child.teamId ?? child.team_id ?? child.time_id ?? child.team;
            const team = teams.find((t) => t.id === teamId);
            return (
              <Card key={child.id} className="flex items-center gap-3 py-2.5">
                <Avatar emoji={child.avatar} size="sm" bgColor={team ? `${team.color}30` : 'bg-primary/30'} />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-body font-semibold truncate">{child.nickname || child.name}</p>
                  <p className="text-xs text-gray-400">Localização não informada pelo dispositivo</p>
                </div>
                <Badge variant="muted">Sem sinal</Badge>
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
          <div className="text-sm text-gray-500">
            O histórico de movimentação será exibido quando os dispositivos enviarem leituras de localização.
          </div>
        </Card>
      </div>

      <BottomNav items={navItems} activePath="/family/location" />
    </div>
  );
}
