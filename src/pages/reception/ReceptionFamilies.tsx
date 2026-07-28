import { useEffect, useState } from 'react';
import { Copy, Link as LinkIcon, Check, Users, UserCheck, UserX, Save } from 'lucide-react';
import { api } from '../../services/api';
import Sidebar from '../../components/layout/Sidebar';
import TopBar from '../../components/layout/TopBar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

const navItems = [
  { icon: <span>▦</span>, label: 'Dashboard', path: '/reception' },
  { icon: <span>＋</span>, label: 'Check-in', path: '/reception/checkin' },
  { icon: <span>♟</span>, label: 'Participantes', path: '/reception/participants' },
  { icon: <span>⌁</span>, label: 'Pulseiras', path: '/reception/bracelets' },
  { icon: <Users size={18} />, label: 'Famílias', path: '/reception/families' },
];

export default function ReceptionFamilies() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [eventId, setEventId] = useState('');
  const [pending, setPending] = useState<any[]>([]);
  const [approved, setApproved] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<Record<string, string>>({});
  const [inviteUrl, setInviteUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [error, setError] = useState('');

  const loadFamilyData = async (selectedEvent = eventId) => {
    try {
      setLoading(true);
      const [pendingData, approvedData, teamData] = await Promise.all([
        api.getPendingFamilyLinks(selectedEvent || undefined),
        api.getApprovedFamilyLinks(selectedEvent || undefined),
        selectedEvent ? api.getTimes(selectedEvent) : Promise.resolve([]),
      ]);
      setPending(pendingData || []);
      setApproved(approvedData || []);
      setTeams(teamData || []);
      setSelectedTeams(Object.fromEntries((approvedData || []).map((item: any) => [item.crianca_id, item.time_id || ''])));
    } catch (err: any) {
      setError(err.message || 'Não foi possível carregar as famílias.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      try {
        const eventData = await api.getEventos();
        setEvents(eventData || []);
        const active = (eventData || []).find((item: any) => item.status === 'active') || eventData?.[0];
        const nextEventId = active?.id || '';
        setEventId(nextEventId);
        await loadFamilyData(nextEventId);
      } catch (err: any) {
        setError(err.message || 'Não foi possível carregar os dados.');
        setLoading(false);
      }
    };
    load();
  }, []);

  const createInvite = async () => {
    if (!eventId) return setError('Selecione um evento.');
    try {
      setError('');
      const result = await api.createFamilyInvite({ eventoId: eventId });
      setInviteUrl(`${window.location.origin}/family/invite/${result.token}`);
      setCopied(false);
    } catch (err: any) {
      setError(err.message || 'Não foi possível criar o convite.');
    }
  };

  const copyInvite = async () => {
    if (!inviteUrl) return;
    await navigator.clipboard?.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const decide = async (linkId: string, action: 'approve' | 'reject') => {
    try {
      setWorking(linkId);
      if (action === 'approve') await api.approveFamilyLink(linkId);
      else await api.rejectFamilyLink(linkId);
      await loadFamilyData();
    } catch (err: any) {
      setError(err.message || 'Não foi possível atualizar a solicitação.');
    } finally {
      setWorking(null);
    }
  };

  const saveChildTeam = async (item: any) => {
    try {
      setWorking(`team-${item.crianca_id}`);
      await api.updateCrianca(item.evento_id, item.crianca_id, {
        name: item.crianca_name,
        nickname: item.nickname || item.crianca_name,
        age: item.age,
        avatar: item.avatar || '👤',
        braceletCode: item.bracelet_code || null,
        timeId: selectedTeams[item.crianca_id] || null,
      });
      await loadFamilyData();
    } catch (err: any) {
      setError(err.message || 'Não foi possível atualizar o time da criança.');
    } finally {
      setWorking(null);
    }
  };
  return (
    <div className="flex h-screen bg-dark">
      <Sidebar items={navItems} activePath="/reception/families" collapsed={sidebarCollapsed} onToggleCollapse={() => setSidebarCollapsed((value) => !value)} accentColor="#F59E0B" />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar title="Famílias" subtitle="Convites e aprovações" />
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <PageHeader title="Famílias" description="Cadastre responsáveis por convite e aprove os vínculos" icon={<Users size={24} />} />
          {error && <div className="rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-red-300">{error}</div>}

          <Card variant="glow">
            <div className="flex items-start gap-3 mb-4">
              <LinkIcon className="text-primary mt-1" size={20} />
              <div>
                <h2 className="text-white font-semibold">Gerar convite</h2>
                <p className="text-sm text-gray-400">Gere um convite para cada criança. O responsável pode usar o mesmo e-mail e senha para vincular várias crianças, sem escolher time ou pulseira.</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <select value={eventId} onChange={(event) => { setEventId(event.target.value); loadFamilyData(event.target.value); }} className="flex-1 rounded-lg border border-border bg-dark-surface px-3 py-2 text-white">
                <option value="">Selecione o evento</option>
                {events.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}
              </select>
              <Button onClick={createInvite} disabled={!eventId}>Gerar link</Button>
            </div>
            {inviteUrl && (
              <div className="mt-4 flex gap-2">
                <input readOnly value={inviteUrl} className="min-w-0 flex-1 rounded-lg border border-border bg-dark-surface px-3 py-2 text-sm text-gray-300" />
                <Button variant="secondary" onClick={copyInvite}>{copied ? <Check size={17} /> : <Copy size={17} />}<span className="ml-2">{copied ? 'Copiado' : 'Copiar'}</span></Button>
              </div>
            )}
          </Card>

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white font-display text-lg font-semibold">Solicitações pendentes</h2>
              <p className="text-sm text-gray-400">A aprovação libera o login e ativa a participação.</p>
            </div>
            <Badge variant={pending.length ? 'warning' : 'muted'}>{pending.length} pendente{pending.length === 1 ? '' : 's'}</Badge>
          </div>

          {loading ? <Card><p className="text-gray-400">Carregando...</p></Card> : pending.length === 0 ? (
            <Card className="text-center py-10"><Users className="mx-auto mb-3 text-gray-500" size={32} /><p className="text-gray-400">Nenhuma solicitação pendente.</p></Card>
          ) : (
            <div className="space-y-3">
              {pending.map((item) => (
                <Card key={item.link_id} className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1">
                    <p className="text-white font-semibold">{item.family_name || item.email}</p>
                    <p className="text-sm text-gray-300">Criança: {item.crianca_name} {item.age ? `(${item.age} anos)` : ''}</p>
                    <p className="text-xs text-gray-500">{item.evento_name} · {item.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" disabled={working === item.link_id} onClick={() => decide(item.link_id, 'approve')}><UserCheck size={16} className="mr-1" /> Aprovar</Button>
                    <Button variant="danger" size="sm" disabled={working === item.link_id} onClick={() => decide(item.link_id, 'reject')}><UserX size={16} className="mr-1" /> Rejeitar</Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-4">
            <div>
              <h2 className="text-white font-display text-lg font-semibold">Crianças aprovadas</h2>
              <p className="text-sm text-gray-400">Defina o time de cada criança depois da aprovação.</p>
            </div>
            <Badge variant={approved.length ? 'success' : 'muted'}>{approved.length} aprovada{approved.length === 1 ? '' : 's'}</Badge>
          </div>

          {loading ? <Card><p className="text-gray-400">Carregando...</p></Card> : approved.length === 0 ? (
            <Card className="text-center py-10"><Users className="mx-auto mb-3 text-gray-500" size={32} /><p className="text-gray-400">Nenhuma criança aprovada neste evento.</p></Card>
          ) : (
            <div className="space-y-3">
              {approved.map((item) => (
                <Card key={item.link_id} className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="flex-1">
                    <p className="text-white font-semibold">{item.crianca_name}</p>
                    <p className="text-sm text-gray-300">Responsável: {item.family_name || item.email}</p>
                    <p className="text-xs text-gray-500">{item.evento_name} · {item.email}</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                    <select
                      value={selectedTeams[item.crianca_id] || ''}
                      onChange={(event) => setSelectedTeams((current) => ({ ...current, [item.crianca_id]: event.target.value }))}
                      className="rounded-lg border border-border bg-dark-surface px-3 py-2 text-white"
                    >
                      <option value="">Sem time</option>
                      {teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
                    </select>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={working === `team-${item.crianca_id}`}
                      onClick={() => saveChildTeam(item)}
                    >
                      <Save size={16} className="mr-1" /> Salvar time
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
