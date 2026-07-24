import { useState, useMemo, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { usePulynStore } from '../../store/mockData';
import { api } from '../../services/api';
import { useNFCReader } from '../../hooks/useNFCReader';
import Sidebar from '../../components/layout/Sidebar';
import TopBar from '../../components/layout/TopBar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import StatusDot from '../../components/ui/StatusDot';

type BraceletStatus = 'disponivel' | 'em uso' | 'perdida' | 'bloqueada';

interface Bracelet {
  code: string;
  status: BraceletStatus;
  crianca_id: string | null;  // 🔴 NOVO: ID da criança (quando em uso)
  crianca_name: string | null; // 🔴 NOVO: Nome da criança
}

const navItems = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
    label: 'Dashboard',
    path: '/reception',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    ),
    label: 'Check-in',
    path: '/reception/checkin',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    label: 'Participantes',
    path: '/reception/participants',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
      </svg>
    ),
    label: 'Pulseiras',
    path: '/reception/bracelets',
  },
];

const STATUS_BADGE_VARIANT: Record<BraceletStatus, 'success' | 'primary' | 'danger' | 'muted'> = {
  disponivel: 'success',
  'em uso': 'primary',
  perdida: 'danger',
  bloqueada: 'muted',
};

const STATUS_LABEL: Record<BraceletStatus, string> = {
  disponivel: 'Disponível',
  'em uso': 'Em uso',
  perdida: 'Perdida',
  bloqueada: 'Bloqueada',
};

export default function ReceptionBracelets() {
  const location = useLocation();
  const { children = [], loadChildren, loadPulseiras } = usePulynStore();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [statusFilter, setStatusFilter] = useState<BraceletStatus | 'all'>('all');
  const [bracelets, setBracelets] = useState<Bracelet[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [modalBracelet, setModalBracelet] = useState<Bracelet | null>(null);
  const [modalAction, setModalAction] = useState<'lost' | 'block' | 'release' | null>(null);
  
  // Cadastrar nova pulseira
  const [cadastrarModalOpen, setCadastrarModalOpen] = useState(false);
  const [novaPulseiraCode, setNovaPulseiraCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [nfcConnected, setNFCConnected] = useState(false);

  // Callback para quando uma pulseira é detectada pelo Arduino
  const handleBraceletDetected = useCallback((code: string) => {
    // Só preenche se o modal de cadastro estiver aberto
    if (cadastrarModalOpen) {
      const normalizedCode = code.trim().toUpperCase();
      setNovaPulseiraCode(normalizedCode);
      
      // Verificar se já está cadastrada (comparação case-insensitive)
      const pulseira = bracelets.find(p => 
        p.code.trim().toUpperCase() === normalizedCode
      );
      
      if (pulseira) {
        setErrorMessage(`⚠️ Pulseira já cadastrada com status: ${STATUS_LABEL[pulseira.status]}`);
        console.log(`✅ Pulseira encontrada no sistema:`, pulseira);
      } else {
        setErrorMessage('');
        console.log(`⚠️ Pulseira não encontrada. Código detectado: ${normalizedCode}`);
        console.log(`📋 Total de pulseiras carregadas: ${bracelets.length}`);
        console.log(`🔍 Códigos disponíveis:`, bracelets.map(p => p.code.toUpperCase()));
      }
    }
  }, [cadastrarModalOpen, bracelets]);

  // Hook WebSocket para ouvir leituras NFC do Arduino
  const { isConnected } = useNFCReader(handleBraceletDetected, 'bracelets');

  useEffect(() => {
    setNFCConnected(isConnected);
  }, [isConnected]);

  // Carregar pulseiras da API (CORRIGIDO: usa getPulseiras)
  const loadBracelets = useCallback(async () => {
    try {
      setLoading(true);
      const data = await loadPulseiras();
      console.log(`📋 Pulseiras carregadas:`, data);
      
      // Mapear para o formato esperado
      const mapped = Array.isArray(data) ? data.map(p => ({
        code: p.code,
        status: (p.status || 'disponivel') as BraceletStatus,
        crianca_id: p.crianca_id || null,
        crianca_name: p.crianca_name || null
      })) : [];
      
      console.log(`✅ ${mapped.length} pulseiras mapeadas:`, mapped);
      setBracelets(mapped);
    } catch (error) {
      console.error('❌ Erro ao carregar pulseiras:', error);
      setBracelets([]);
    } finally {
      setLoading(false);
    }
  }, [loadPulseiras]);

  // Carregar dados ao montar
  useEffect(() => {
    loadBracelets();
    loadChildren();
  }, [loadBracelets, loadChildren]);

  // Counts
  const statusCounts = useMemo(() => {
    const counts: Record<BraceletStatus, number> = { disponivel: 0, 'em uso': 0, perdida: 0, bloqueada: 0 };
    if (Array.isArray(bracelets)) {
      bracelets.forEach(b => { counts[b.status]++; });
    }
    return counts;
  }, [bracelets]);

  // Filtered bracelets
  const filteredBracelets = useMemo(() => {
    if (statusFilter === 'all') return bracelets;
    return bracelets.filter(b => b.status === statusFilter);
  }, [bracelets, statusFilter]);

  const handleAction = useCallback((bracelet: Bracelet, action: 'lost' | 'block' | 'release') => {
    setModalBracelet(bracelet);
    setModalAction(action);
    setModalOpen(true);
  }, []);

  const handleConfirmAction = useCallback(async () => {
    if (!modalBracelet || !modalAction) return;

    try {
      if (modalAction === 'release' && modalBracelet.childId) {
        // 🔴 IMPORTANTE: Chamar unassignBracelet (que atualiza status para disponível)
        console.log(`🔗 Desvinculando pulseira ${modalBracelet.code} da criança ${modalBracelet.childId}`);
        await api.unassignBracelet(modalBracelet.childId);
      } else if (modalAction === 'lost' || modalAction === 'block') {
        // Para perdida ou bloqueada, usar updatePulseiraStatus
        const status = modalAction === 'lost' ? 'perdida' : 'bloqueada';
        console.log(`📝 Atualizando status da pulseira ${modalBracelet.code} para ${status}`);
        await api.updatePulseiraStatus(modalBracelet.code, status);
      } else if (modalAction === 'release' && !modalBracelet.childId) {
        // Se for release mas não tem criança (pulseira já estava disponível), apenas atualizar status
        console.log(`📝 Pulseira ${modalBracelet.code} sem criança vinculada, apenas atualizando status`);
        await api.updatePulseiraStatus(modalBracelet.code, 'disponivel');
      }
      
      // Recarregar dados
      console.log(`🔄 Recarregando dados após ação`);
      await loadBracelets();
      await loadChildren();
      
    } catch (error) {
      console.error('❌ Erro ao executar ação:', error);
      alert(`Erro ao executar ação: ${error.message || 'Tente novamente.'}`);
    }

    setModalOpen(false);
    setModalBracelet(null);
    setModalAction(null);
  }, [modalBracelet, modalAction, loadBracelets, loadChildren]);

  // Função para cadastrar nova pulseira (CORRIGIDO: usa createPulseira)
  const handleCadastrarPulseira = useCallback(async () => {
    setErrorMessage('');
    setSaving(true);
    
    if (!novaPulseiraCode.trim()) {
      setErrorMessage('Digite o código da pulseira');
      setSaving(false);
      return;
    }

    const code = novaPulseiraCode.trim().toUpperCase();
    
    // Verificar se já existe
    const jaExiste = bracelets.find(p => p.code.trim().toUpperCase() === code);
    if (jaExiste) {
      setErrorMessage(`❌ Pulseira já existe! Status: ${STATUS_LABEL[jaExiste.status]}`);
      setSaving(false);
      return;
    }
    
    try {
      console.log(`📝 Cadastrando pulseira: ${code}`);
      await api.createPulseira(code);
      await loadBracelets();
      
      setNovaPulseiraCode('');
      setCadastrarModalOpen(false);
      alert(`✅ Pulseira ${code} cadastrada com sucesso!`);
      console.log(`✅ Pulseira ${code} cadastrada`);
      
    } catch (error: any) {
      console.error('❌ Erro ao cadastrar:', error);
      setErrorMessage(error.message || 'Erro ao cadastrar pulseira');
    } finally {
      setSaving(false);
    }
  }, [novaPulseiraCode, loadBracelets, bracelets]);

  // Função para cadastrar múltiplas pulseiras
  const handleCadastrarMultiplas = useCallback(async () => {
    setErrorMessage('');
    setSaving(true);
    
    if (!novaPulseiraCode.trim()) {
      setErrorMessage('Digite os códigos (separados por vírgula)');
      setSaving(false);
      return;
    }

    const codes = novaPulseiraCode.split(',').map(c => c.trim().toUpperCase());
    let novos = 0;
    let erros = 0;

    for (const code of codes) {
      if (!code) continue;
      
      try {
        await api.createPulseira(code);
        novos++;
      } catch (error) {
        erros++;
        console.error(`Erro ao cadastrar ${code}:`, error);
      }
    }

    await loadBracelets();
    
    setNovaPulseiraCode('');
    setCadastrarModalOpen(false);
    alert(`Cadastradas: ${novos} pulseira(s)\nErros: ${erros}`);
    setSaving(false);
  }, [novaPulseiraCode, loadBracelets]);

  const filterTabs: { key: BraceletStatus | 'all'; label: string }[] = [
    { key: 'all', label: `Todas (${bracelets.length})` },
    { key: 'disponivel', label: `Disponíveis (${statusCounts.disponivel})` },
    { key: 'em uso', label: `Em uso (${statusCounts['em uso']})` },
    { key: 'perdida', label: `Perdidas (${statusCounts.perdida})` },
    { key: 'bloqueada', label: `Bloqueadas (${statusCounts.bloqueada})` },
  ];

  if (loading) {
    return (
      <div className="flex h-screen bg-dark">
        <Sidebar
          items={navItems}
          activePath={location.pathname}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
          title="Recepcao"
          accentColor="#F59E0B"
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-400">Carregando pulseiras...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-dark">
      <Sidebar
        items={navItems}
        activePath={location.pathname}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(prev => !prev)}
        title="Recepcao"
        accentColor="#F59E0B"
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Pulseiras" subtitle="Inventário e gestão de pulseiras NFC" />

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <PageHeader
            title="Pulseiras"
            description="Gerencie o inventário de pulseiras NFC"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
              </svg>
            }
            action={
              <Button variant="primary" onClick={() => setCadastrarModalOpen(true)}>
                <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Cadastrar Pulseira
              </Button>
            }
          />

          {/* Status counts */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {([
              { status: 'disponivel' as BraceletStatus, label: 'Disponíveis', accent: 'border-success/30' },
              { status: 'em uso' as BraceletStatus, label: 'Em uso', accent: 'border-primary/30' },
              { status: 'perdida' as BraceletStatus, label: 'Perdidas', accent: 'border-danger/30' },
              { status: 'bloqueada' as BraceletStatus, label: 'Bloqueadas', accent: 'border-gray-500/30' },
            ]).map(item => (
              <Card key={item.status} className={`text-center ${item.accent}`}>
                <p className="text-sm font-body text-gray-400 mb-1">{item.label}</p>
                <p className="font-display text-3xl font-bold text-white">{statusCounts[item.status]}</p>
              </Card>
            ))}
          </div>

          {/* Filter tabs */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {filterTabs.map(tab => (
              <Button
                key={tab.key}
                variant={statusFilter === tab.key ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setStatusFilter(tab.key)}
              >
                {tab.label}
              </Button>
            ))}
          </div>

          {/* Bracelet grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredBracelets.map(bracelet => (
              <Card
                key={bracelet.code}
                className={`
                  flex flex-col gap-3
                  ${bracelet.status === 'bloqueada' ? 'opacity-60' : ''}
                `}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-white text-lg font-bold">{bracelet.code}</span>
                  <Badge variant={STATUS_BADGE_VARIANT[bracelet.status]}>
                    {STATUS_LABEL[bracelet.status]}
                  </Badge>
                </div>

                {bracelet.crianca_name && (
                  <p className="text-sm text-gray-400 font-body truncate">
                    {bracelet.crianca_name}
                  </p>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-auto pt-2 border-t border-dark-border flex-wrap">
                  {bracelet.status === 'em uso' && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAction(bracelet, 'lost')}
                        className="flex-1 text-xs"
                      >
                        Perdida
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAction(bracelet, 'block')}
                        className="flex-1 text-xs"
                      >
                        Bloquear
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAction(bracelet, 'release')}
                        className="flex-1 text-xs"
                      >
                        Liberar
                      </Button>
                    </>
                  )}
                  {bracelet.status === 'disponivel' && (
                    <p className="text-xs text-success font-body">✓ Pronta para uso</p>
                  )}
                  {bracelet.status === 'perdida' && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAction(bracelet, 'release')}
                        className="flex-1 text-xs"
                      >
                        Recuperada
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAction(bracelet, 'block')}
                        className="flex-1 text-xs"
                      >
                        Bloquear
                      </Button>
                    </>
                  )}
                  {bracelet.status === 'bloqueada' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAction(bracelet, 'release')}
                      className="flex-1 text-xs"
                    >
                      Desbloquear
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {/* Empty state */}
          {filteredBracelets.length === 0 && (
            <Card className="flex flex-col items-center justify-center py-16 text-center">
              <span className="text-5xl mb-4">🏷️</span>
              <h3 className="font-display text-lg text-white mb-2">Nenhuma pulseira encontrada</h3>
              <p className="text-sm text-gray-400 font-body">
                Tente ajustar o filtro de status ou cadastre novas pulseiras
              </p>
              <Button variant="primary" onClick={() => setCadastrarModalOpen(true)} className="mt-4">
                Cadastrar Pulseira
              </Button>
            </Card>
          )}

          {/* Modal para cadastrar nova pulseira */}
          <Modal
            isOpen={cadastrarModalOpen}
            onClose={() => {
              setCadastrarModalOpen(false);
              setNovaPulseiraCode('');
              setErrorMessage('');
            }}
            title="Cadastrar Nova Pulseira"
          >
            <div className="space-y-4">
              {/* Status de conexão Arduino */}
              <div className="flex items-center justify-between bg-surface rounded-lg p-3">
                <div className="flex items-center gap-2">
                  {nfcConnected ? (
                    <>
                      <StatusDot status="online" size="sm" />
                      <span className="text-sm text-success font-body">Arduino Conectado</span>
                    </>
                  ) : (
                    <>
                      <StatusDot status="offline" size="sm" />
                      <span className="text-sm text-gray-400 font-body">Aguardando Arduino...</span>
                    </>
                  )}
                </div>
              </div>

              <p className="text-sm text-gray-400">
                {nfcConnected 
                  ? '📱 Aproxime a pulseira do Arduino para detecção automática, ou digite manualmente:'
                  : 'Digite o código da pulseira NFC (ex: PUL-001 ou 23:46:83:14)'}
              </p>
              
              <Input
                label="Código da Pulseira"
                placeholder={nfcConnected ? "Aproxime a pulseira ou digite..." : "Ex: PUL-001 ou 23:46:83:14"}
                value={novaPulseiraCode}
                onChange={(e) => {
                  setNovaPulseiraCode(e.target.value);
                  setErrorMessage('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCadastrarPulseira();
                }}
              />

              {errorMessage && (
                <p className="text-sm text-danger">{errorMessage}</p>
              )}

              {!nfcConnected && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                  <p className="text-xs text-yellow-200 font-body">
                    ⚠️ Arduino não conectado. Verifique se o servidor está rodando e o checkpoint está ligado.
                  </p>
                </div>
              )}

              <div className="border-t border-border pt-3 mt-2">
                <p className="text-xs text-gray-500 mb-2">
                  💡 Dica: Para cadastrar múltiplas pulseiras, separe os códigos por vírgula:
                </p>
                <code className="text-xs text-gray-400 bg-surface p-2 rounded block">
                  Ex: PUL-001, PUL-002, 23:46:83:14, 04:5A:2C:91
                </code>
              </div>

              <div className="flex gap-3 justify-end mt-4">
                <Button variant="ghost" onClick={() => setCadastrarModalOpen(false)}>
                  Cancelar
                </Button>
                <Button variant="secondary" onClick={handleCadastrarMultiplas} disabled={saving}>
                  {saving ? 'Cadastrando...' : 'Cadastrar Múltiplas'}
                </Button>
                <Button variant="primary" onClick={handleCadastrarPulseira} disabled={saving}>
                  {saving ? 'Cadastrando...' : 'Cadastrar'}
                </Button>
              </div>
            </div>
          </Modal>

          {/* Confirmation modal para ações de status */}
          <Modal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            title={
              modalAction === 'lost'
                ? 'Marcar como Perdida'
                : modalAction === 'block'
                ? 'Bloquear Pulseira'
                : 'Liberar Pulseira'
            }
          >
            <p className="text-sm text-gray-300 font-body mb-6">
              {modalBracelet && modalAction === 'lost' && (
                <>Deseja marcar a pulseira <span className="text-white font-semibold">{modalBracelet.code}</span> como perdida?</>
              )}
              {modalBracelet && modalAction === 'block' && (
                <>Deseja bloquear a pulseira <span className="text-white font-semibold">{modalBracelet.code}</span>? Ela não poderá ser utilizada.</>
              )}
              {modalBracelet && modalAction === 'release' && (
                <>Deseja liberar a pulseira <span className="text-white font-semibold">{modalBracelet.code}</span>? Ela voltará a ficar disponível{modalBracelet.childId ? ' e será desvinculada da criança' : ''}.</>
              )}
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="ghost" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant={
                  modalAction === 'release' ? 'secondary' : modalAction === 'block' ? 'danger' : 'danger'
                }
                onClick={handleConfirmAction}
              >
                {modalAction === 'lost' && 'Marcar Perdida'}
                {modalAction === 'block' && 'Bloquear'}
                {modalAction === 'release' && 'Liberar'}
              </Button>
            </div>
          </Modal>
        </main>
      </div>
    </div>
  );
}