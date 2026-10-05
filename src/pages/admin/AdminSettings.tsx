// src/pages/admin/AdminSettings.tsx
import { useState, useEffect } from 'react';
import {
  Settings, Upload, Save, Database
} from 'lucide-react';
import { usePulynStore } from '../../store/mockData';
import { api } from '../../services/api';
import { maskCnpj, isValidCnpj, onlyDigits } from '../../utils/cnpj';
import AdminSidebar from '../../components/layout/AdminSidebar';
import TopBar from '../../components/layout/TopBar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import ProgressBar from '../../components/ui/ProgressBar';

export default function AdminSettings() {
  const { loadSettings, updateSettings } = usePulynStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // CNPJ é um dado do próprio buffet (tabela empresas), não uma configuração genérica.
  const [cnpj, setCnpj] = useState('');
  const [cnpjError, setCnpjError] = useState('');
  const [companyLoaded, setCompanyLoaded] = useState(false);

  const [unitSettings, setUnitSettings] = useState({
    unit_name: '',
    unit_address: '',
    unit_phone: '',
    unit_email: '',
  });

  const [backupSettings, setBackupSettings] = useState({
    backup_frequency: 'daily',
  });

  // Carregar configurações da API
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const empresa = await api.getEmpresa();
        setCnpj(empresa.cnpj || '');
        setCompanyLoaded(true);
      } catch (error) {
        // Sem carregar, o campo fica bloqueado para não apagar um CNPJ já salvo.
        console.error('Erro ao carregar dados do buffet:', error);
        setCompanyLoaded(false);
      }
      try {
        applySettings(await loadSettings());
        setSettingsLoaded(true);
      } catch (error) {
        // Sem carregar, salvar sobrescreveria os valores reais com campos vazios.
        console.error('Erro ao carregar configurações:', error);
        setSettingsLoaded(false);
        setSaveError('Não foi possível carregar as configurações salvas. Recarregue a página antes de editar.');
      }
      setLoading(false);
    };
    loadData();
  }, [loadSettings]);

  // Preenche o formulário com o que está salvo no servidor (campos vazios ficam vazios).
  const applySettings = (saved: Record<string, string>) => {
    setUnitSettings({
      unit_name: saved.unit_name || '',
      unit_address: saved.unit_address || '',
      unit_phone: saved.unit_phone || '',
      unit_email: saved.unit_email || '',
    });
    setBackupSettings({ backup_frequency: saved.backup_frequency || 'daily' });
  };

  const updateUnit = (field: string, value: string) => {
    setUnitSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaveSuccess(false);
    setSaveError('');
    if (!settingsLoaded) {
      setSaveError('As configurações não foram carregadas. Recarregue a página antes de salvar.');
      return;
    }

    if (companyLoaded && onlyDigits(cnpj) && !isValidCnpj(cnpj)) {
      setCnpjError('CNPJ inválido. Confira os 14 dígitos.');
      return;
    }

    setSaving(true);
    try {
      if (companyLoaded) {
        const saved = await api.updateEmpresa({ cnpj: onlyDigits(cnpj) });
        setCnpj(saved.cnpj || '');
        setCnpjError('');
      }

      const allSettings = {
        ...unitSettings,
        ...backupSettings,
      };

      await updateSettings(allSettings);
      // Mostra o que ficou realmente salvo (o servidor pode ter normalizado algum valor).
      applySettings(usePulynStore.getState().settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      setSaveError(error instanceof Error && error.message ? error.message : 'Erro ao salvar configurações. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-dark text-white overflow-hidden">
        <AdminSidebar />
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
      <AdminSidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Gestão do Buffet" subtitle="Configurações" />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <PageHeader
            title="Configurações"
            description="Configurações gerais do sistema"
            icon={<Settings size={28} />}
          />

          <div className="max-w-3xl space-y-6">
            {!settingsLoaded && saveError && (
              <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{saveError}</p>
            )}
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
                  placeholder="Ex: Buffet Alegria"
                  value={unitSettings.unit_name}
                  onChange={e => updateUnit('unit_name', e.target.value)}
                />
                <div>
                  <Input
                    label="CNPJ"
                    placeholder="00.000.000/0000-00"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={18}
                    value={cnpj}
                    disabled={!companyLoaded}
                    error={cnpjError || undefined}
                    onChange={e => { setCnpj(maskCnpj(e.target.value)); setCnpjError(''); }}
                    onBlur={() => {
                      if (onlyDigits(cnpj) && !isValidCnpj(cnpj)) setCnpjError('CNPJ inválido. Confira os 14 dígitos.');
                    }}
                  />
                  {!companyLoaded && (
                    <p className="mt-1 text-xs text-gray-500">Não foi possível carregar o CNPJ agora. Recarregue a página.</p>
                  )}
                </div>
                <Input
                  label="Endereço"
                  placeholder="Rua, número - cidade, UF"
                  value={unitSettings.unit_address}
                  onChange={e => updateUnit('unit_address', e.target.value)}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Telefone"
                    placeholder="(00) 00000-0000"
                    value={unitSettings.unit_phone}
                    onChange={e => updateUnit('unit_phone', e.target.value)}
                  />
                  <Input
                    label="E-mail"
                    placeholder="contato@seubuffet.com.br"
                    type="email"
                    value={unitSettings.unit_email}
                    onChange={e => updateUnit('unit_email', e.target.value)}
                  />
                </div>
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

            {/* Save */}
            <div className="flex justify-end pb-6">
              <Button variant="primary" size="lg" onClick={handleSave} disabled={saving}>
                <Save size={16} className="mr-1.5" />
                {saving ? 'Salvando...' : 'Salvar Configurações'}
              </Button>
              {saveSuccess && (
                <span role="status" className="ml-3 text-success text-sm">✓ Configurações salvas com sucesso!</span>
              )}
              {saveError && (
                <span role="alert" className="ml-3 max-w-md text-danger text-sm">{saveError}</span>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}