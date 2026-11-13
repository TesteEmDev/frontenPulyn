import { useState } from 'react';
import GameGuide, { type GuideGame } from '../../components/display/GameGuide';

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

export default function DisplayDemoRegras() {
  const [longo, setLongo] = useState(false);
  const jogo = longo ? LONGO : CURTO;
  const botao = 'rounded-lg border border-white/15 bg-white/[0.06] px-3 py-1 text-sm font-semibold text-white hover:bg-white/[0.12]';
  return (
    <div className="flex h-screen flex-col bg-[#08111f] p-3 text-white">
      <div className="mb-2 flex shrink-0 flex-wrap items-center gap-2">
        <span className="rounded-full bg-warning/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-warning">Prévia · jogo de exemplo</span>
        <button className={botao} onClick={() => setLongo(false)}>Regras curtas</button>
        <button className={botao} onClick={() => setLongo(true)}>Regras longas</button>
      </div>
      <div className="min-h-0 flex-1">
        <GameGuide
          key={jogo.id}
          games={[jogo]}
          highlightName={jogo.name}
          heading="Regras do próximo jogo"
          subheading="Leia com atenção: o jogo começa em instantes"
        />
      </div>
    </div>
  );
}
