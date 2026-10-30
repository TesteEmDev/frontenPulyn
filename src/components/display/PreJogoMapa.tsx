// Telão no pré-jogo: a planta com os checkpoints do evento e, no canto superior direito, um aviso pequeno do último
// checkpoint lido (com o apelido de quem passou a pulseira). Serve para os participantes se prepararem: encostar a
// pulseira num checkpoint e ver que ele respondeu.
import { useEffect, useState } from 'react';
import { Radio } from 'lucide-react';
import { api } from '../../services/api';
import { usePulynStore } from '../../store/mockData';
import { numeroDoCheckpoint } from '../../utils/checkpoints';
import { MAP_HEIGHT, MAP_WIDTH, posicaoNoMapa } from './posicaoNoMapa';

export interface LeituraPreJogo {
  checkpointId: string;
  braceletCode: string;
  // Quando a leitura chegou a este telão (Date.now())
  chegouEm: number;
}

// Quanto tempo o aviso fica na tela
const AVISO_MS = 6000;

const soAlfanumerico = (valor: unknown) => String(valor ?? '').replace(/[^0-9a-z]/gi, '').toUpperCase();

export default function PreJogoMapa({ leitura }: { leitura: LeituraPreJogo | null }) {
  const todosCheckpoints = usePulynStore((state) => state.checkpoints);
  const children = usePulynStore((state) => state.children);
  const [floorPlan, setFloorPlan] = useState<string | null>(null);
  const [avisoVisivel, setAvisoVisivel] = useState(false);

  useEffect(() => {
    let vivo = true;
    api.getFloorPlan()
      .then((planta) => { if (vivo) setFloorPlan(planta?.dataUrl || null); })
      .catch(() => { if (vivo) setFloorPlan(null); });
    return () => { vivo = false; };
  }, []);

  // O aviso aparece a cada leitura nova e some sozinho
  useEffect(() => {
    if (!leitura) return undefined;
    setAvisoVisivel(true);
    const timer = setTimeout(() => setAvisoVisivel(false), AVISO_MS);
    return () => clearTimeout(timer);
  }, [leitura?.chegouEm]); // eslint-disable-line react-hooks/exhaustive-deps

  const checkpointLido = leitura
    ? todosCheckpoints.find((cp) => String(cp.id).toLowerCase() === leitura.checkpointId.toLowerCase())
    : undefined;
  const codigoLido = soAlfanumerico(leitura?.braceletCode);
  const participante = codigoLido
    ? children.find((c) => soAlfanumerico(c.codigoPulseira ?? c.bracelet) === codigoLido)
    : undefined;
  const quem = participante ? (participante.nickname || participante.name) : 'Pulseira não cadastrada';

  // O mapa mostra só os checkpoints ligados (o status vem do último heartbeat da placa). O que acabou de ser lido também
  // aparece: a leitura prova que ele está ligado, mesmo que a lista ainda não tenha sido atualizada. A posição usa o índice
  // da lista inteira, para um checkpoint sem posição salva não mudar de lugar quando outro liga ou desliga.
  const ligados = todosCheckpoints
    .map((checkpoint, indice) => ({ checkpoint, indice }))
    .filter(({ checkpoint }) => String(checkpoint.status || '').toLowerCase() === 'online'
      || (avisoVisivel && checkpoint.id === checkpointLido?.id));

  return (
    <div className="relative h-full overflow-hidden rounded-2xl border border-primary-400/20 bg-dark-card/40">
      {floorPlan && (
        <img src={floorPlan} alt="Planta do espaço" className="pointer-events-none absolute inset-0 z-0 h-full w-full object-contain opacity-40" />
      )}

      <svg className="absolute inset-0 z-10 h-full w-full" viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} preserveAspectRatio="xMidYMid meet">
        {ligados.map(({ checkpoint, indice }) => {
          const { x, y } = posicaoNoMapa(checkpoint, indice, todosCheckpoints.length);
          const lido = avisoVisivel && checkpointLido?.id === checkpoint.id;
          const cor = lido ? '#FACC15' : '#22C55E';
          return (
            <g key={checkpoint.id} transform={`translate(${x} ${y})`}>
              {lido && (
                <circle r={15} fill="none" stroke={cor} strokeWidth={2}>
                  <animate attributeName="r" values="15;34" dur="1.1s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.9;0" dur="1.1s" repeatCount="indefinite" />
                </circle>
              )}
              <circle r={15} fill={cor} fillOpacity={lido ? 0.45 : 0.18} stroke={cor} strokeWidth={3} />
              <text y={1} textAnchor="middle" dominantBaseline="middle" fill="#FFFFFF" fontSize={12} fontWeight={800}>
                {numeroDoCheckpoint(checkpoint)}
              </text>
              <text y={27} textAnchor="middle" fill="#E5E7EB" fontSize={8.5} fontWeight={600}>{checkpoint.name}</text>
            </g>
          );
        })}
      </svg>

      {ligados.length === 0 && (
        <p className="absolute inset-0 z-10 flex items-center justify-center text-center text-gray-400">
          {todosCheckpoints.length === 0 ? 'Nenhum checkpoint neste evento ainda.' : 'Nenhum checkpoint ligado no momento.'}
        </p>
      )}

      {/* Aviso pequeno de checkpoint lido (canto superior direito) */}
      {avisoVisivel && leitura && (
        <div
          role="status"
          aria-live="polite"
          className="absolute right-3 top-3 z-20 flex max-w-[60%] items-center gap-2 rounded-xl border border-yellow-300/40 bg-dark-card/90 px-3 py-2 shadow-lg shadow-black/30 backdrop-blur animate-in fade-in slide-in-from-top-2"
        >
          <Radio size={16} className="shrink-0 text-yellow-300" />
          <div className="min-w-0 leading-tight">
            <p className="text-[clamp(0.6rem,1.3vh,0.8rem)] font-bold uppercase tracking-wider text-yellow-300">
              Checkpoint {checkpointLido ? numeroDoCheckpoint(checkpointLido) : ''} lido
            </p>
            <p className="truncate text-[clamp(0.75rem,1.7vh,1.05rem)] font-semibold text-white">{quem}</p>
          </div>
        </div>
      )}
    </div>
  );
}
