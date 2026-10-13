// Tela exclusiva do plano PulynBall: informações e regras de cada jogo de paintball do evento.
// As alterações valem para as próximas partidas (o recreacionista ainda pode ajustar antes do primeiro round).
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crosshair, Plus, RotateCcw, Save } from 'lucide-react';
import { usePulynStore } from '../../store/mockData';
import { useEvento } from '../../contexts/EventoContext';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../services/api';

import AdminSidebar from '../../components/layout/AdminSidebar';
import BuffetTopBar from '../../components/layout/BuffetTopBar';
import PageHeader from '../../components/layout/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';

type Config = Record<string, number>;
type Limites = Record<string, [number, number]>;
type Campo = { chave: string; rotulo: string; unidade: string; fator: number; passo: number; ajuda: string };

// Cada jogo PulynBall tem os seus campos. Eles aparecem em unidades que o recreacionista entende (minutos e
// segundos); o servidor guarda segundos e milissegundos.
const CAMPOS_BOMBA: Campo[] = [
  { chave: 'vitoriasParaVencer', rotulo: 'Vitórias para vencer', unidade: 'rounds', fator: 1, passo: 1, ajuda: 'A primeira equipe a chegar nesse número vence a partida.' },
  { chave: 'roundsPorLado', rotulo: 'Trocar de lado a cada', unidade: 'rounds', fator: 1, passo: 1, ajuda: 'Rebeldes e Agentes trocam de papel depois desses rounds.' },
  { chave: 'duracaoRoundSeg', rotulo: 'Duração do round', unidade: 'minutos', fator: 60, passo: 0.5, ajuda: 'Se a bomba não for plantada nesse tempo, os Agentes vencem.' },
  { chave: 'plantarMs', rotulo: 'Tempo para plantar', unidade: 'segundos', fator: 1000, passo: 0.5, ajuda: 'O portador precisa segurar a pulseira no leitor esse tempo.' },
  { chave: 'desarmarMs', rotulo: 'Tempo para desarmar', unidade: 'segundos', fator: 1000, passo: 0.5, ajuda: 'Um Agente precisa segurar a pulseira esse tempo; se soltar, recomeça.' },
  { chave: 'bombaSeg', rotulo: 'Duração da bomba', unidade: 'segundos', fator: 1, passo: 5, ajuda: 'Depois de plantada, explode nesse tempo se ninguém desarmar.' },
];

const CAMPOS_REFEM: Campo[] = [
  { chave: 'vitoriasParaVencer', rotulo: 'Vitórias para vencer', unidade: 'rounds', fator: 1, passo: 1, ajuda: 'A primeira equipe a chegar nesse número vence a partida.' },
  { chave: 'roundsPorLado', rotulo: 'Trocar de lado a cada', unidade: 'rounds', fator: 1, passo: 1, ajuda: 'Rebeldes e Agentes trocam de papel depois desses rounds.' },
  { chave: 'duracaoRoundSeg', rotulo: 'Duração do round', unidade: 'minutos', fator: 60, passo: 0.5, ajuda: 'Se o refém não chegar ao último checkpoint nesse tempo, os Rebeldes vencem.' },
  { chave: 'protecaoSeg', rotulo: 'Proteção do refém', unidade: 'segundos', fator: 1, passo: 1, ajuda: 'Logo que o refém chega a um checkpoint, os Rebeldes não podem recuperá-lo durante esse tempo.' },
];

// 2026-10-09T03:00:00.000Z -> 09/10/2026
const dataBr = (valor?: string | null) => {
  const [ano, mes, dia] = String(valor || '').slice(0, 10).split('-');
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : 'sem data';
};

const numeroBr = (valor: number) => String(valor).replace('.', ',');

function minutosESegundos(segundos: number) {
  const m = Math.floor(segundos / 60);
  const s = Math.round(segundos % 60);
  return m > 0 ? `${m} min${s ? ` ${s} s` : ''}` : `${s} s`;
}

function resumoDasRegrasRefem(c: Config) {
  return `Um Agente é sorteado como refém a cada round e percorre os checkpoints na ordem do id até o último; os Rebeldes o recuperam lendo no checkpoint onde ele está, `
    + `e ele fica protegido por ${numeroBr(c.protecaoSeg)} s ao chegar. Cada round dura ${minutosESegundos(c.duracaoRoundSeg)}. `
    + `Vence quem fizer ${c.vitoriasParaVencer} rounds primeiro, trocando de lado a cada ${c.roundsPorLado}.`;
}

function resumoDasRegras(c: Config) {
  return `Os Rebeldes plantam em ${numeroBr(c.plantarMs / 1000)} s e os Agentes desarmam em ${numeroBr(c.desarmarMs / 1000)} s. `
    + `A bomba explode ${minutosESegundos(c.bombaSeg)} depois de plantada e cada round dura ${minutosESegundos(c.duracaoRoundSeg)}. `
    + `Vence quem fizer ${c.vitoriasParaVencer} rounds primeiro, trocando de lado a cada ${c.roundsPorLado}.`;
}

type JogoGenerico = { brincadeiraId: string; eventoId: string; nome: string; descricao: string; regras: string; status: string; config: Config };
type Grupo = {
  tipo: 'bomb_defusal' | 'hostage_rescue'; titulo: string; campos: Campo[]; resumo: (c: Config) => string;
  salvar: (id: string, dados: { nome: string; descricao: string; regras: string; config: any }) => Promise<JogoGenerico>;
  jogos: JogoGenerico[]; padroes: Config; limites: Limites;
};

function JogoCard({ jogo, grupo, onSalvo }: {
  jogo: JogoGenerico; grupo: Grupo; onSalvo: (jogo: JogoGenerico) => void;
}) {
  const { campos: CAMPOS, padroes, limites } = grupo;
  const [nome, setNome] = useState(jogo.nome);
  const [descricao, setDescricao] = useState(jogo.descricao);
  const [regras, setRegras] = useState(jogo.regras);
  // Texto digitado em cada campo (unidade de exibição); convertido ao salvar.
  const paraTexto = (config: Config) => Object.fromEntries(
    CAMPOS.map(campo => [campo.chave, numeroBr(config[campo.chave] / campo.fator)])
  ) as Record<string, string>;
  const [valores, setValores] = useState(() => paraTexto(jogo.config));
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  // Converte o texto de cada campo para o número do servidor; null = inválido.
  const convertido = useMemo(() => {
    const resultado: Config = {};
    const erros: string[] = [];
    for (const campo of CAMPOS) {
      const numero = Number(String(valores[campo.chave]).replace(',', '.'));
      const interno = Math.round(numero * campo.fator);
      const [min, max] = limites[campo.chave];
      if (!Number.isFinite(numero) || valores[campo.chave].trim() === '' || interno < min || interno > max) {
        erros.push(`${campo.rotulo}: use um valor entre ${numeroBr(min / campo.fator)} e ${numeroBr(max / campo.fator)} ${campo.unidade}`);
      } else {
        resultado[campo.chave] = interno;
      }
    }
    return { config: resultado, erros };
  }, [valores, limites, CAMPOS]);

  const alterado = nome !== jogo.nome || descricao !== jogo.descricao || regras !== jogo.regras
    || CAMPOS.some(campo => convertido.config[campo.chave] !== jogo.config[campo.chave]);
  const podeSalvar = alterado && !salvando && convertido.erros.length === 0 && nome.trim().length > 0;

  const salvar = async () => {
    setSalvando(true);
    setAviso(null);
    try {
      const salvo = await grupo.salvar(jogo.brincadeiraId, { nome: nome.trim(), descricao, regras, config: convertido.config });
      onSalvo(salvo);
      setAviso({ tipo: 'ok', texto: 'Alterações salvas. Valem a partir da próxima partida.' });
    } catch (e) {
      setAviso({ tipo: 'erro', texto: e instanceof Error ? e.message : 'Não foi possível salvar o jogo' });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Card>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/15 text-accent"><Crosshair size={22} /></div>
            <div>
              <h2 className="font-display text-xl text-white">{jogo.nome}</h2>
              <p className="text-xs text-gray-500">{grupo.titulo}</p>
            </div>
          </div>
        </div>

        <section className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Informações do jogo</h3>
          <Input label="Nome do jogo" value={nome} maxLength={100} onChange={e => setNome(e.target.value)} />
          <div>
            <label className="mb-1.5 block text-sm font-body font-semibold text-gray-300">Descrição</label>
            <textarea
              className="min-h-[70px] w-full rounded-xl border border-white/[0.10] bg-dark-card px-3.5 py-3 font-body text-sm text-white placeholder-gray-500 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/15"
              value={descricao} maxLength={2000} onChange={e => setDescricao(e.target.value)} placeholder="Como o jogo funciona, em poucas linhas"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-body font-semibold text-gray-300">Regras (texto mostrado aos jogadores)</label>
            <textarea
              className="min-h-[110px] w-full rounded-xl border border-white/[0.10] bg-dark-card px-3.5 py-3 font-body text-sm text-white placeholder-gray-500 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500/15"
              value={regras} maxLength={4000} onChange={e => setRegras(e.target.value)} placeholder="Regras do jogo..."
            />
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-400">Regras da partida</h3>
            <button
              type="button"
              className="flex items-center gap-1.5 text-xs text-primary-300 hover:text-white"
              onClick={() => setValores(paraTexto(padroes))}
            >
              <RotateCcw size={14} /> Restaurar padrões
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CAMPOS.map(campo => (
              <div key={campo.chave}>
                <Input
                  label={`${campo.rotulo} (${campo.unidade})`}
                  type="text" inputMode="decimal"
                  value={valores[campo.chave]}
                  onChange={e => setValores(prev => ({ ...prev, [campo.chave]: e.target.value }))}
                  aria-describedby={`${jogo.brincadeiraId}-${campo.chave}`}
                />
                <p id={`${jogo.brincadeiraId}-${campo.chave}`} className="mt-1 text-xs text-gray-500">{campo.ajuda}</p>
              </div>
            ))}
          </div>
          {convertido.erros.length === 0 ? (
            <p className="rounded-lg bg-surface/50 p-3 text-sm text-gray-300">{grupo.resumo(convertido.config)}</p>
          ) : (
            <ul className="space-y-1 text-sm text-danger" role="alert">
              {convertido.erros.map(erro => <li key={erro}>{erro}</li>)}
            </ul>
          )}
        </section>

        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary" disabled={!podeSalvar} onClick={salvar}>
            <Save size={16} className="mr-1.5 inline" />{salvando ? 'Salvando...' : 'Salvar alterações'}
          </Button>
          {aviso && <span className={`text-sm ${aviso.tipo === 'ok' ? 'text-success' : 'text-danger'}`} role="status">{aviso.texto}</span>}
        </div>
      </div>
    </Card>
  );
}

export default function AdminPulynBall() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { events, loadEventos } = usePulynStore();
  const { eventoAtualId, setEventoAtualId } = useEvento();
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState('');

  const temPlano = user?.plan === 'pulynball' || user?.role === 'master';
  const listaEventos = Array.isArray(events) ? events : [];

  useEffect(() => { loadEventos(); }, [loadEventos]);

  // Sem evento escolhido, usa o primeiro da lista.
  useEffect(() => {
    if (!eventoAtualId && listaEventos.length > 0) setEventoAtualId(listaEventos[0].eventoId);
  }, [eventoAtualId, listaEventos, setEventoAtualId]);

  useEffect(() => {
    if (!eventoAtualId || !temPlano) return;
    let ativo = true;
    setCarregando(true);
    setErro('');
    Promise.all([api.getBombaJogos(eventoAtualId), api.getRefemJogos(eventoAtualId)])
      .then(([bomba, refem]) => {
        if (!ativo) return;
        setGrupos([
          {
            tipo: 'bomb_defusal', titulo: 'Conquistar e Destruir', campos: CAMPOS_BOMBA, resumo: resumoDasRegras,
            salvar: (id, dados) => api.salvarBombaJogo(id, dados) as unknown as Promise<JogoGenerico>,
            jogos: bomba.jogos as unknown as JogoGenerico[], padroes: bomba.padroes as unknown as Config, limites: bomba.limites as Limites,
          },
          {
            tipo: 'hostage_rescue', titulo: 'Resgate do Refém', campos: CAMPOS_REFEM, resumo: resumoDasRegrasRefem,
            salvar: (id, dados) => api.salvarRefemJogo(id, dados) as unknown as Promise<JogoGenerico>,
            jogos: refem.jogos as unknown as JogoGenerico[], padroes: refem.padroes as unknown as Config, limites: refem.limites as Limites,
          },
        ]);
      })
      .catch(e => { if (ativo) setErro(e instanceof Error ? e.message : 'Não foi possível carregar os jogos'); })
      .finally(() => { if (ativo) setCarregando(false); });
    return () => { ativo = false; };
  }, [eventoAtualId, temPlano]);

  return (
    <div className="flex h-screen bg-dark text-white overflow-hidden">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <BuffetTopBar subtitle="PulynBall" />
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <PageHeader
            title="PulynBall"
            description="Informações e regras dos jogos de paintball do seu evento"
            icon={<Crosshair size={28} />}
            action={temPlano ? (
              <Button variant="accent" onClick={() => navigate('/admin/games/new')}>
                <Plus size={16} className="mr-1.5 inline" />Novo jogo
              </Button>
            ) : undefined}
          />

          {!temPlano ? (
            <Card><p className="text-gray-300">Esta área é exclusiva do plano PulynBall.</p></Card>
          ) : (
            <>
              <div className="max-w-md">
                <Select
                  label="Evento"
                  options={listaEventos.map(evento => ({ value: evento.eventoId, label: `${evento.nome || 'Evento'} — ${dataBr(evento.data)}` }))}
                  value={eventoAtualId || ''}
                  onChange={e => setEventoAtualId(e.target.value)}
                />
              </div>

              {erro && <Card><p className="text-danger" role="alert">{erro}</p></Card>}
              {carregando && <p className="text-sm text-gray-400">Carregando os jogos...</p>}

              {!carregando && !erro && grupos.every(grupo => grupo.jogos.length === 0) && (
                <Card>
                  <div className="space-y-3 text-center">
                    <p className="text-gray-300">Este evento ainda não tem jogos do PulynBall.</p>
                    <Button variant="accent" onClick={() => navigate('/admin/games/new')}>Criar o primeiro jogo</Button>
                  </div>
                </Card>
              )}

              {grupos.flatMap(grupo => grupo.jogos.map(jogo => (
                <JogoCard
                  key={jogo.brincadeiraId}
                  jogo={jogo}
                  grupo={grupo}
                  onSalvo={salvo => setGrupos(lista => lista.map(item => item.tipo !== grupo.tipo ? item : {
                    ...item, jogos: item.jogos.map(atual => atual.brincadeiraId === salvo.brincadeiraId ? salvo : atual),
                  }))}
                />
              )))}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
