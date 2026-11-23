// Telão com um jogo escolhido e ainda não iniciado: o Lumi explica e as regras do jogo entram uma a uma ao lado.
// Usado pelo DisplayMain e pela prévia /demo/regras. Troque a `key` (ex.: id do jogo) para recomeçar a animação.
// `voz`: o Lumi fala com os áudios gravados (por enquanto só na prévia; carregue antes com carregarVoz()).
import { useMemo } from 'react';
import GameGuide, { parseGuideRules, type GuideGame } from './GameGuide';
import LumiExplicaRegras from './LumiExplicaRegras';
import { linhaDoTempo } from './lumiTempos';
import { duracaoDaFala } from './vozDoLumi';

export default function RegrasDoProximoJogo({ jogo, voz = false }: { jogo: GuideGame; voz?: boolean }) {
  const regras = useMemo(() => parseGuideRules(jogo.rules), [jogo.rules]);
  const tempo = useMemo(() => linhaDoTempo(regras, { voz, nomeJogo: jogo.name, duracaoDaFala }), [regras, voz, jogo.name]);
  const entradaDaRegra = (posicao: number) => tempo.entradas[Math.min(posicao, tempo.entradas.length - 1)] ?? 0;
  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,3fr)]">
      <div className="h-[260px] min-h-0 lg:h-full">
        <LumiExplicaRegras nomeJogo={jogo.name} regras={regras} tempo={tempo} voz={voz} />
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
