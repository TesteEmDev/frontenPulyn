// Telão com um jogo escolhido e ainda não iniciado: o Lumi explica e as regras do jogo entram uma a uma ao lado.
// Usado pelo DisplayMain e pela prévia /demo/regras. Troque a `key` (ex.: id do jogo) para recomeçar a animação.
import GameGuide, { parseGuideRules, type GuideGame } from './GameGuide';
import LumiExplicaRegras from './LumiExplicaRegras';
import { linhaDoTempo } from './lumiTempos';

export default function RegrasDoProximoJogo({ jogo }: { jogo: GuideGame }) {
  const regras = parseGuideRules(jogo.rules);
  const { entradas, fim } = linhaDoTempo(regras);
  const entradaDaRegra = (posicao: number) => entradas[Math.min(posicao, entradas.length - 1)] ?? 0;
  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]">
      <div className="h-[260px] min-h-0 lg:h-full">
        <LumiExplicaRegras nomeJogo={jogo.name} temRegras={regras.length > 0} fimMs={fim} />
      </div>
      <div className="min-h-[420px] min-w-0 lg:min-h-0">
        <GameGuide
          games={[jogo]}
          highlightName={jogo.name}
          heading="Regras do próximo jogo"
          subheading="Leia com atenção: o jogo começa em instantes"
          revealRules={entradaDaRegra}
        />
      </div>
    </div>
  );
}
