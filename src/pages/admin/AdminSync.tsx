import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, Users, Gamepad2, MapPin, Map,
  Star, FileText, RefreshCw, Settings, Cloud, Server, Clock, AlertTriangle, CheckCircle2
} from 'lucide-react';
import Sidebar from '../../components/layout/Sidebar';
import TopBar from '../../components/layout/TopBar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
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

const pendingItems = [
  { id: '1', type: 'score', description: 'Pontuação CP04 - Sofia (PUL-002)', time: '14:31:45' },
  { id: '2', type: 'score', description: 'Pontuação CP01 - Mateus (PUL-003)', time: '14:31:30' },
  { id: '3', type: 'bracelet', description: 'Vinculação PUL-011 - Helena Ribeiro', time: '14:28:00' },
];

const syncLog = [
  { id: '1', action: 'Sincronização completa', status: 'success', timestamp: '14:30:00' },
  { id: '2', action: '3 registros pendentes enviados', status: 'success', timestamp: '14:25:00' },
  { id: '3', action: 'Conexão restabelecida', status: 'success', timestamp: '14:20:00' },
  { id: '4', action: 'Falha na sincronização - timeout', status: 'error', timestamp: '14:15:00' },
  { id: '5', action: 'Tentativa de reconexão', status: 'warning', timestamp: '14:14:00' },
  { id: '6', action: 'Sincronização completa', status: 'success', timestamp: '14:00:00' },
  { id: '7', action: 'Sincronização completa', status: 'success', timestamp: '13:30:00' },
  { id: '8', action: '5 registros enviados', status: 'success', timestamp: '13:25:00' },
];

export default function AdminSync() {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const isSynced = pendingItems.length === 0;

  const handleForceSync = () => {
    setSyncing(true);
    setTimeout(() => setSyncing(false), 2000);
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
        <TopBar title="Gestão do Buffet" subtitle="Sincronização" />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <PageHeader
            title="Sincronização"
            description="Status de sincronização entre servidor local e nuvem"
            icon={<RefreshCw size={28} />}
            action={
              <Button variant="primary" onClick={handleForceSync} disabled={syncing}>
                <RefreshCw size={16} className={`mr-1.5 ${syncing ? 'animate-spin' : ''}`} />
                Forçar Sincronização
              </Button>
            }
          />

          {/* Status Indicator */}
          <Card variant={isSynced ? 'glow' : 'default'}>
            <div className="flex items-center gap-4">
              {isSynced ? (
                <>
                  <CheckCircle2 size={40} className="text-success" />
                  <div>
                    <h2 className="font-display text-xl text-white">Sincronizado</h2>
                    <p className="text-sm text-gray-400">Todos os dados estão atualizados</p>
                  </div>
                </>
              ) : (
                <>
                  <AlertTriangle size={40} className="text-accent" />
                  <div>
                    <h2 className="font-display text-xl text-white">Com pendências</h2>
                    <p className="text-sm text-gray-400">{pendingItems.length} registros aguardando sincronização</p>
                  </div>
                </>
              )}
              <Badge variant={isSynced ? 'success' : 'warning'} className="ml-auto">
                {isSynced ? 'Sincronizado' : 'Com pendências'}
              </Badge>
            </div>
          </Card>

          {/* Status Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="text-center">
              <Server size={24} className="text-primary mx-auto mb-2" />
              <p className="text-sm text-gray-400">Servidor Local</p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <StatusDot status="online" />
                <span className="text-sm text-success font-semibold">Online</span>
              </div>
            </Card>
            <Card className="text-center">
              <Cloud size={24} className="text-secondary mx-auto mb-2" />
              <p className="text-sm text-gray-400">Nuvem</p>
              <div className="flex items-center justify-center gap-2 mt-2">
                <StatusDot status="online" />
                <span className="text-sm text-success font-semibold">Conectado</span>
              </div>
            </Card>
            <Card className="text-center">
              <Clock size={24} className="text-accent mx-auto mb-2" />
              <p className="text-sm text-gray-400">Última sincronização</p>
              <p className="text-sm text-white font-semibold mt-2">14:30:00</p>
              <p className="text-xs text-gray-500">13/05/2026</p>
            </Card>
          </div>

          {/* Pending Queue */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={20} className="text-accent" />
              <h3 className="font-display text-lg text-white">Fila de Pendências</h3>
              <Badge variant="warning">{pendingItems.length}</Badge>
            </div>
            {pendingItems.length > 0 ? (
              <div className="space-y-2">
                {pendingItems.map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg bg-surface/50">
                    <div className="flex-1">
                      <p className="text-sm text-white">{item.description}</p>
                      <p className="text-xs text-gray-500">{item.type}</p>
                    </div>
                    <span className="text-xs text-gray-500 font-mono">{item.time}</span>
                    <Badge variant="warning">Pendente</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm text-center py-4">Nenhuma pendência</p>
            )}
          </Card>

          {/* Sync Log */}
          <Card>
            <h3 className="font-display text-lg text-white mb-4">Log de Sincronização</h3>
            <div className="space-y-2">
              {syncLog.map(entry => (
                <div key={entry.id} className="flex items-center gap-3 p-2 rounded-lg bg-surface/30">
                  <StatusDot
                    status={
                      entry.status === 'success' ? 'online' :
                      entry.status === 'error' ? 'offline' : 'warning'
                    }
                  />
                  <div className="flex-1">
                    <p className="text-sm text-white">{entry.action}</p>
                  </div>
                  <span className="text-xs text-gray-500 font-mono">{entry.timestamp}</span>
                  <Badge
                    variant={
                      entry.status === 'success' ? 'success' :
                      entry.status === 'error' ? 'danger' : 'warning'
                    }
                  >
                    {entry.status === 'success' ? 'OK' : entry.status === 'error' ? 'Erro' : 'Aviso'}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
}
