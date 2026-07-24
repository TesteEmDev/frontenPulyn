// src/pages/admin/AdminSettings.tsx
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Calendar, Users, Gamepad2, MapPin, Map,
  Star, FileText, RefreshCw, Settings, Upload, Save, Shield, Database, Monitor
} from 'lucide-react';
import { usePulynStore } from '../../store/mockData';
import Sidebar from '../../components/layout/Sidebar';
import TopBar from '../../components/layout/TopBar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import ProgressBar from '../../components/ui/ProgressBar';

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

export default function AdminSettings() {
  const location = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { settings, loadSettings, updateSettings, updateSetting } = usePulynStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [unitSettings, setUnitSettings] = useState({
    unit_name: '',
    unit_address: '',
    unit_phone: '',
    unit_email: '',
  });

  const [displaySettings, setDisplaySettings] = useState({
    theme: 'dark',
    update_interval: '5',
  });

  const [fraudSettings, setFraudSettings] = useState({
    cooldown_default: '30',
    repetition_limit: '3',
  });

  const [backupSettings, setBackupSettings] = useState({
    backup_frequency: 'daily',
  });

  // Carregar configurações da API
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const loadedSettings = await loadSettings();
      if (loadedSettings) {
        setUnitSettings({
          unit_name: loadedSettings.unit_name || 'Buffet Pulyn',
          unit_address: loadedSettings.unit_address || 'Rua das Crianças, 123 - São Paulo, SP',
          unit_phone: loadedSettings.unit_phone || '(11) 3456-7890',
          unit_email: loadedSettings.unit_email || 'contato@buffetpulyn.com.br',
        });
        setDisplaySettings({
          theme: loadedSettings.theme || 'dark',
          update_interval: loadedSettings.update_interval || '5',
        });
        setFraudSettings({
          cooldown_default: loadedSettings.cooldown_default || '30',
          repetition_limit: loadedSettings.repetition_limit || '3',
        });
        setBackupSettings({
          backup_frequency: loadedSettings.backup_frequency || 'daily',
        });
      }
      setLoading(false);
    };
    loadData();
  }, [loadSettings]);

  const updateUnit = (field: string, value: string) => {
    setUnitSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    
    try {
      const allSettings = {
        ...unitSettings,
        ...displaySettings,
        ...fraudSettings,
        ...backupSettings,
      };
      
      await updateSettings(allSettings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      alert('Erro ao salvar configurações. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
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
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-400">Carregando configurações...</p>
          </div>
        </div>
      </div>
    );
  }

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
        <TopBar title="Gestão do Buffet" subtitle="Configurações" />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <PageHeader
            title="Configurações"
            description="Configurações gerais do sistema"
            icon={<Settings size={28} />}
          />

          <div className="max-w-3xl space-y-6">
            {/* Logo Upload */}
            <Card>
              <h2 className="font-display text-lg text-white mb-4">Logo da Unidade</h2>
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-xl bg-primary/20 border-2 border-dashed border-primary/50 flex items-center justify-center">
                  <span className="text-3xl font-bold text-primary">P</span>
                </div>
                <div className="flex-1">
                  <Button variant="ghost" className="border border-border">
                    <Upload size={16} className="mr-1.5" />
                    Upload Logo
                  </Button>
                  <p className="text-xs text-gray-500 mt-2">PNG ou SVG, recomendado 200x200px</p>
                </div>
              </div>
            </Card>

            {/* Unit Info */}
            <Card>
              <h2 className="font-display text-lg text-white mb-4">Dados da Unidade</h2>
              <div className="space-y-4">
                <Input
                  label="Nome da unidade"
                  value={unitSettings.unit_name}
                  onChange={e => updateUnit('unit_name', e.target.value)}
                />
                <Input
                  label="Endereço"
                  value={unitSettings.unit_address}
                  onChange={e => updateUnit('unit_address', e.target.value)}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Telefone"
                    value={unitSettings.unit_phone}
                    onChange={e => updateUnit('unit_phone', e.target.value)}
                  />
                  <Input
                    label="E-mail"
                    type="email"
                    value={unitSettings.unit_email}
                    onChange={e => updateUnit('unit_email', e.target.value)}
                  />
                </div>
              </div>
            </Card>

            {/* Display Settings */}
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <Monitor size={20} className="text-secondary" />
                <h2 className="font-display text-lg text-white">Configurações de Display</h2>
              </div>
              <div className="space-y-4">
                <Select
                  label="Tema"
                  options={[
                    { value: 'dark', label: 'Escuro' },
                    { value: 'light', label: 'Claro' },
                    { value: 'auto', label: 'Automático' },
                  ]}
                  value={displaySettings.theme}
                  onChange={e => setDisplaySettings(prev => ({ ...prev, theme: e.target.value }))}
                />
                <Select
                  label="Intervalo de atualização (segundos)"
                  options={[
                    { value: '1', label: '1s (Tempo real)' },
                    { value: '3', label: '3s' },
                    { value: '5', label: '5s' },
                    { value: '10', label: '10s' },
                    { value: '30', label: '30s' },
                  ]}
                  value={displaySettings.update_interval}
                  onChange={e => setDisplaySettings(prev => ({ ...prev, update_interval: e.target.value }))}
                />
              </div>
            </Card>

            {/* Anti-fraud */}
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <Shield size={20} className="text-success" />
                <h2 className="font-display text-lg text-white">Regras Anti-fraude</h2>
              </div>
              <div className="space-y-4">
                <Input
                  label="Cooldown padrão (segundos)"
                  type="number"
                  value={fraudSettings.cooldown_default}
                  onChange={e => setFraudSettings(prev => ({ ...prev, cooldown_default: e.target.value }))}
                />
                <Input
                  label="Limite de repetição"
                  type="number"
                  value={fraudSettings.repetition_limit}
                  onChange={e => setFraudSettings(prev => ({ ...prev, repetition_limit: e.target.value }))}
                />
                <p className="text-xs text-gray-500">
                  O cooldown impede que a mesma pulseira seja lida em intervalo menor que o configurado.
                  O limite de repetição controla quantas vezes o mesmo checkpoint pode ser lido pelo mesmo participante.
                </p>
              </div>
            </Card>

            {/* Backup */}
            <Card>
              <div className="flex items-center gap-2 mb-4">
                <Database size={20} className="text-accent" />
                <h2 className="font-display text-lg text-white">Backup</h2>
              </div>
              <div className="space-y-4">
                <Select
                  label="Frequência de backup automático"
                  options={[
                    { value: 'hourly', label: 'A cada hora' },
                    { value: 'daily', label: 'Diário' },
                    { value: 'weekly', label: 'Semanal' },
                    { value: 'manual', label: 'Apenas manual' },
                  ]}
                  value={backupSettings.backup_frequency}
                  onChange={e => setBackupSettings(prev => ({ ...prev, backup_frequency: e.target.value }))}
                />
                <div className="flex items-center justify-between p-3 rounded-lg bg-surface/50">
                  <div>
                    <p className="text-sm text-white font-semibold">Último backup</p>
                    <p className="text-xs text-gray-500">--/--/---- --:--</p>
                  </div>
                  <Badge variant="success">Não realizado</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-surface/50">
                  <div>
                    <p className="text-sm text-white font-semibold">Uso do armazenamento</p>
                    <p className="text-xs text-gray-500">-- MB de -- GB</p>
                  </div>
                  <span className="text-sm text-gray-400">--%</span>
                </div>
                <ProgressBar value={0} color="#F59E0B" />
                <Button variant="ghost" className="border border-border w-full" disabled>
                  <Database size={16} className="mr-1.5" />
                  Exportar Base de Dados Local
                </Button>
              </div>
            </Card>

            {/* Future Integrations */}
            <Card>
              <h2 className="font-display text-lg text-white mb-4">Integrações Futuras</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-surface/50">
                  <div>
                    <p className="text-sm text-white font-semibold">WhatsApp Business</p>
                    <p className="text-xs text-gray-500">Notificações para responsáveis</p>
                  </div>
                  <Badge variant="muted">Em breve</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-surface/50">
                  <div>
                    <p className="text-sm text-white font-semibold">ERP / Faturamento</p>
                    <p className="text-xs text-gray-500">Integração com sistema financeiro</p>
                  </div>
                  <Badge variant="muted">Em breve</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-surface/50">
                  <div>
                    <p className="text-sm text-white font-semibold">BI / Data Warehouse</p>
                    <p className="text-xs text-gray-500">Exportação para análise avançada</p>
                  </div>
                  <Badge variant="muted">Em breve</Badge>
                </div>
              </div>
            </Card>

            {/* Save */}
            <div className="flex justify-end pb-6">
              <Button variant="primary" size="lg" onClick={handleSave} disabled={saving}>
                <Save size={16} className="mr-1.5" />
                {saving ? 'Salvando...' : 'Salvar Configurações'}
              </Button>
              {saveSuccess && (
                <span className="ml-3 text-success text-sm">✓ Configurações salvas com sucesso!</span>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}