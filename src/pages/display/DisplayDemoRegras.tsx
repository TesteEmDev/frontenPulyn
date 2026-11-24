import { useEffect, useState } from 'react';
import { type GuideGame } from '../../components/display/GameGuide';
import RegrasDoProximoJogo from '../../components/display/RegrasDoProximoJogo';
import { calar, carregarVoz, falar } from '../../components/display/vozDoLumi';

// Página de demonstração: a tela de regras do próximo jogo com um jogo de exemplo (nada do evento é lido nem gravado).
const CURTO: GuideGame = {
  id: 'demo-curto',
  name: 'Caça ao Tesouro (exemplo)',
  type: 'team',
  duration: 15,
  description: 'Uma equipe de cada vez procura os pontos acesos no mapa. Vence a equipe que acender todos os pontos no menor tempo.',
  rules: [
    'Só a equipe da vez pode ler os checkpoints.',
    'Aproximem a pulseira do checkpoint aceso no mapa.',
    'Metade da equipe precisa ler para liberar o próximo ponto.',
    'Vence quem acender todos os pontos mais rápido.',
  ].join('\n'),
};
const LONGO: GuideGame = {
  ...CURTO,
  id: 'demo-longo',
  name: 'Conquista de Territórios (exemplo)',
  description: 'Cada equipe tenta dominar o maior número de checkpoints. O checkpoint fica com a equipe que o leu mais vezes, e quem chegou primeiro leva em caso de empate. As zonas só mudam de cor quando uma única equipe domina todos os checkpoints dela.',
  rules: [
    'Cada leitura de pulseira vale pontos para a sua equipe.',
    'O checkpoint é da equipe que tem mais leituras nele.',
    'Em caso de empate, vale quem chegou primeiro.',
    'Uma zona só muda de cor quando uma equipe domina todos os checkpoints dela.',
    'Não vale ler o mesmo checkpoint duas vezes seguidas.',
    'Há um tempo de espera antes de ler o mesmo checkpoint de novo.',
    'Chamem um monitor se a pulseira não for reconhecida.',
    'Quando o tempo acabar, vence a equipe com mais pontos.',
  ].join('\n'),
};

// Jogos padrão do sistema (iguais para todos os buffets), gravados pelo scripts/gerar-voz-lumi.py junto com os áudios
interface JogoPadrao { tipo: string; nome: string; duracao?: number; descricao?: string; regras?: string }
const paraGuia = (j: JogoPadrao): GuideGame => ({
  id: `padrao-${j.tipo}`,
  name: j.nome,
  type: j.tipo === 'individual' ? 'individual' : 'team',
  duration: j.duracao ?? null,
  description: j.descricao ?? null,
  rules: j.regras ?? null,
});

// Mensagens prontas do recreacionista (src/pages/game-master/GameMasterMessages.tsx)
const MENSAGENS = ['Preparem-se!', 'Jogo iniciado!', 'Faltam 5 minutos!', 'Equipe vencedora!', 'Parabéns a todos!', 'Atenção ao próximo desafio!'];

export default function DisplayDemoRegras() {
  const [jogosPadrao, setJogosPadrao] = useState<GuideGame[]>([]);
  const [escolhido, setEscolhido] = useState(CURTO.id);
  const [chave, setChave] = useState(1);
  // Voz do Lumi (áudios gravados), só nesta prévia. O clique no botão também libera o som no Chrome.
  const [voz, setVoz] = useState(false);
  const [carregandoVoz, setCarregandoVoz] = useState(false);
  const [mensagem, setMensagem] = useState<{ texto: string; chave: number } | null>(null);

  useEffect(() => {
    fetch('/mascote/voz/jogos.json', { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : []))
      .then((lista: JogoPadrao[]) => setJogosPadrao(Array.isArray(lista) ? lista.map(paraGuia) : []))
      .catch(() => setJogosPadrao([]));
  }, []);

  // A mensagem some sozinha depois de alguns segundos
  useEffect(() => {
    if (!mensagem) return undefined;
    const timer = window.setTimeout(() => setMensagem(null), 5000);
    return () => window.clearTimeout(timer);
  }, [mensagem]);

  const alternarVoz = () => {
    if (voz) { calar(); setVoz(false); setChave((c) => c + 1); return; }
    setCarregandoVoz(true);
    void carregarVoz().then(() => { setCarregandoVoz(false); setVoz(true); setChave((c) => c + 1); });
  };

  // Mensagem do recreacionista no telão, falada pelo Lumi
  const mostrarMensagem = (texto: string) => {
    setMensagem({ texto, chave: Date.now() });
    void carregarVoz().then(() => { calar(); falar(texto); });
  };

  const todos = [CURTO, LONGO, ...jogosPadrao];
  const jogo = todos.find((j) => j.id === escolhido) ?? CURTO;
  const botao = 'rounded-lg border border-white/15 bg-white/[0.06] px-3 py-1 text-sm font-semibold text-white hover:bg-white/[0.12] disabled:opacity-50';
  return (
    <div className="flex h-screen flex-col bg-[#08111f] p-3 text-white">
      <div className="mb-2 flex shrink-0 flex-wrap items-center gap-2">
        <span className="rounded-full bg-warning/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-warning">Prévia · nada do evento é lido</span>
        <select
          value={escolhido}
          onChange={(e) => { calar(); setEscolhido(e.target.value); setChave((c) => c + 1); }}
          className="rounded-lg border border-white/15 bg-[#132338] px-2 py-1 text-sm text-white"
          aria-label="Jogo da prévia"
        >
          <optgroup label="Exemplos">
            <option value={CURTO.id}>Exemplo: regras curtas</option>
            <option value={LONGO.id}>Exemplo: regras longas</option>
          </optgroup>
          {jogosPadrao.length > 0 && (
            <optgroup label="Jogos do sistema">
              {jogosPadrao.map((j) => <option key={j.id} value={j.id}>{j.name}</option>)}
            </optgroup>
          )}
        </select>
        <button className={botao} onClick={() => setChave((c) => c + 1)}>Repetir animação</button>
        <button className={botao} onClick={alternarVoz} disabled={carregandoVoz}>
          {carregandoVoz ? 'Carregando a voz…' : voz ? '🔇 Desligar a voz' : '🔊 Ligar a voz'}
        </button>
        <span className="ml-2 text-xs text-gray-400">Mensagens:</span>
        {MENSAGENS.map((texto) => (
          <button key={texto} className={botao} onClick={() => mostrarMensagem(texto)}>{texto}</button>
        ))}
      </div>
      <div className="relative min-h-0 flex-1">
        <RegrasDoProximoJogo key={`${jogo.id}-${chave}`} jogo={jogo} voz={voz} />
        {mensagem && (
          <div key={mensagem.chave} className="pointer-events-none absolute inset-x-0 top-6 z-20 flex justify-center">
            <div className="animate-balao-entra rounded-3xl border-2 border-yellow-300/60 bg-[#1a2536] px-10 py-6 text-center font-display text-[clamp(1.6rem,5vh,3.6rem)] font-bold text-white shadow-2xl">
              {mensagem.texto}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
