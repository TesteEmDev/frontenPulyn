// src/pages/admin/AdminSettings.tsx
import { useState, useEffect, useRef } from 'react';
import {
  Settings, Upload, Save, Database, Trash2, Loader2
} from 'lucide-react';
import { api } from '../../services/api';
import { maskPhone } from '../../utils/phone';
import { useAuth } from '../../hooks/useAuth';
import { useBuffetNameStore } from '../../hooks/useBuffetName';
import { optimizeLogo, LOGO_ACCEPT } from '../../utils/logoImage';
import AdminSidebar from '../../components/layout/AdminSidebar';
import BuffetTopBar from '../../components/layout/BuffetTopBar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import ProgressBar from '../../components/ui/ProgressBar';
import LinkTelao from '../../components/display/LinkTelao';

export default function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const empresaId = useAuth(state => state.user?.empresaId);

  // Só dá para salvar depois de carregar o cadastro: salvar com o formulário vazio
  // por falha de carregamento apagaria os dados reais.
  const [companyLoaded, setCompanyLoaded] = useState(false);

  // Cadastro da unidade (tabela clientes). O CNPJ fica na tabela empresas.
  const [cnpj, setCnpj] = useState('');

  // Logo/foto da unidade: enviada e salva na hora (não depende do botão Salvar).
  const [logoUrl, setLogoUrl] = useState('');
  const [logoName, setLogoName] = useState('');
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoError, setLogoError] = useState('');
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [unitSettings, setUnitSettings] = useState({
    unit_name: '',
    unit_address: '',
    unit_phone: '',
    unit_email: '',
  });

  const [backupSettings, setBackupSettings] = useState({
    backupFrequency: 'daily',
  });

  // Preenche o formulário com o que está salvo no servidor (campos vazios ficam vazios).
  const applyProfile = (profile: Awaited<ReturnType<typeof api.getEmpresa>>) => {
    setUnitSettings({
      unit_name: profile.name || '',
      unit_address: profile.address || '',
      unit_phone: maskPhone(profile.phone || ''),
      unit_email: profile.email || '',
    });
    setBackupSettings({ backupFrequency: profile.backupFrequency || 'daily' });
    setCnpj(profile.cnpj || '');
    // O cabeçalho das telas do admin mostra este nome.
    if (empresaId) useBuffetNameStore.getState().setName(empresaId, profile.name || '');
  };

  useEffect(() => {
    let active = true;
    api.getEmpresaLogo()
      .then(logo => {
        if (!active) return;
        setLogoUrl(logo?.dataUrl || '');
        setLogoName(logo?.name || '');
      })
      .catch(error => {
        console.error('Erro ao carregar a logo:', error);
        if (active) setLogoError('Não foi possível carregar a logo atual.');
      });
    api.getEmpresa()
      .then(profile => {
        if (!active) return;
        applyProfile(profile);
        setCompanyLoaded(true);
      })
      .catch(error => {
        console.error('Erro ao carregar dados do buffet:', error);
        if (active) setSaveError('Não foi possível carregar os dados do buffet. Recarregue a página antes de editar.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const syncHeaderLogo = (dataUrl: string) => {
    if (empresaId) useBuffetNameStore.getState().setLogo(empresaId, dataUrl);
  };

  const handleLogoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setLogoBusy(true);
    setLogoError('');
    try {
      const { dataUrl } = await optimizeLogo(file);
      await api.saveEmpresaLogo({ dataUrl, name: file.name });
      setLogoUrl(dataUrl);
      setLogoName(file.name);
      syncHeaderLogo(dataUrl);
    } catch (error) {
      console.error('Erro ao enviar a logo:', error);
      setLogoError(error instanceof Error && error.message ? error.message : 'Não foi possível salvar a logo.');
    } finally {
      setLogoBusy(false);
    }
  };

  const handleLogoRemove = async () => {
    if (logoBusy) return;
    setLogoBusy(true);
    setLogoError('');
    try {
      await api.deleteEmpresaLogo();
      setLogoUrl('');
      setLogoName('');
      syncHeaderLogo('');
    } catch (error) {
      console.error('Erro ao remover a logo:', error);
      setLogoError(error instanceof Error && error.message ? error.message : 'Não foi possível remover a logo.');
    } finally {
      setLogoBusy(false);
    }
  };

  const handleSave = async () => {
    setSaveSuccess(false);
    setSaveError('');
    if (!companyLoaded) {
      setSaveError('Os dados do buffet não foram carregados. Recarregue a página antes de salvar.');
      return;
    }

    setSaving(true);
    try {
      // Só a frequência de backup é do admin; os dados do cadastro são fixos
      const saved = await api.updateEmpresa({ backupFrequency: backupSettings.backupFrequency });
      // Mostra o que ficou realmente salvo (o servidor pode ter normalizado algum valor).
      applyProfile(saved);
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
        <BuffetTopBar subtitle="Configurações" />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <PageHeader
            title="Configurações"
            description="Configurações gerais do sistema"
            icon={<Settings size={28} />}
          />

          <div className="max-w-3xl space-y-6">
            {!companyLoaded && saveError && (
              <p role="alert" className="rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{saveError}</p>
            )}
            {/* Logo / foto da unidade */}
            <Card>
              <h2 className="font-display text-lg text-white mb-4">Logo / foto da unidade</h2>
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-primary/50 bg-primary/20">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo da unidade" className="h-full w-full object-contain" />
                  ) : (
                    <span className="text-3xl font-bold text-primary" aria-hidden="true">
                      {(unitSettings.unit_name.trim().charAt(0) || 'P').toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="ghost"
                      className="border border-border"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={logoBusy}
                    >
                      {logoBusy ? <Loader2 size={16} className="mr-1.5 animate-spin" /> : <Upload size={16} className="mr-1.5" />}
                      {logoUrl ? 'Trocar imagem' : 'Enviar imagem'}
                    </Button>
                    {logoUrl && (
                      <Button variant="ghost" onClick={handleLogoRemove} disabled={logoBusy}>
                        <Trash2 size={16} className="mr-1.5" />
                        Remover
                      </Button>
                    )}
                  </div>
                  <p className="mt-2 truncate text-xs text-gray-500">
                    {logoName || 'PNG, JPG, WEBP ou SVG. Recomendado 200x200 px.'}
                  </p>
                  <p className="text-xs text-gray-500">Aparece no menu lateral e é salva assim que você escolhe a imagem.</p>
                  {logoError && <p role="alert" className="mt-2 text-sm text-danger">{logoError}</p>}
                </div>
                <input ref={logoInputRef} type="file" accept={LOGO_ACCEPT} className="hidden" onChange={handleLogoChange} />
              </div>
            </Card>

            {/* Unit Info */}
            <Card>
              <h2 className="font-display text-lg text-white mb-4">Dados da Unidade</h2>
              <div className="space-y-4">
                <p className="text-xs text-gray-500">
                  Estes dados vêm do cadastro feito pelo master e não podem ser alterados aqui. Para corrigir algum, fale com o suporte.
                </p>
                <Input label="Nome da unidade" value={unitSettings.unit_name} readOnly disabled />
                <Input label="CNPJ" value={cnpj} readOnly disabled />
                <Input label="Endereço" value={unitSettings.unit_address} readOnly disabled />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Telefone" value={unitSettings.unit_phone} readOnly disabled />
                  <Input label="E-mail" value={unitSettings.unit_email} readOnly disabled />
                </div>
              </div>
            </Card>

            {/* Link do telão (TV sem login) */}
            <LinkTelao />

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
                  value={backupSettings.backupFrequency}
                  onChange={e => setBackupSettings(prev => ({ ...prev, backupFrequency: e.target.value }))}
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