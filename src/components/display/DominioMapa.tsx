// Telão da Zona - Domínio total: a planta só com os checkpoints (sem zonas). Cada checkpoint fica cinza enquanto está livre e
// muda para a cor da equipe quando ela o domina; o placar e o aviso de vencedor ficam sobre o mapa (ZonaDominioPlacar).
import type { DominioEstado } from '../../services/api';
import { usePulynStore } from '../../store/mockData';
import { MAP_HEIGHT, MAP_WIDTH, posicaoNoMapa } from './posicaoNoMapa';
import ZonaDominioPlacar from './ZonaDominioPlacar';

const COR_LIVRE = '#64748B';

export default function DominioMapa({ eventoId, estado, floorPlan }: { eventoId: string; estado: DominioEstado; floorPlan?: string | null }) {
  const checkpoints = usePulynStore((s) => s.checkpoints);
  const doJogo = estado.checkpoints || [];

  // Só os checkpoints do jogo, na posição em que foram colocados no mapa.
  const pontos = doJogo.map((item) => {
    const indice = checkpoints.findIndex((c) => String(c.id).toLowerCase() === String(item.checkpointId).toLowerCase());
    const base = indice >= 0 ? checkpoints[indice] : {};
    return { ...item, ...posicaoNoMapa(base, indice >= 0 ? indice : 0, Math.max(1, checkpoints.length)) };
  });

  return (
    <div className="relative h-full overflow-hidden rounded-2xl border border-primary-400/20 bg-dark-card/40">
      {floorPlan && (
        <img src={floorPlan} alt="Planta do espaço" className="pointer-events-none absolute inset-0 z-0 h-full w-full object-contain opacity-40" />
      )}

      <svg className="absolute inset-0 z-10 h-full w-full" viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} preserveAspectRatio="xMidYMid meet">
        {pontos.map((ponto) => {
          const cor = ponto.dono?.cor || COR_LIVRE;
          return (
            <g key={ponto.checkpointId} transform={`translate(${ponto.x} ${ponto.y})`}>
              <circle
                r={15}
                fill={cor}
                fillOpacity={ponto.dono ? 0.45 : 0.15}
                stroke={cor}
                strokeWidth={3}
                style={{ transition: 'fill 400ms ease, stroke 400ms ease, fill-opacity 400ms ease' }}
              />
              <text y={1} textAnchor="middle" dominantBaseline="middle" fill="#FFFFFF" fontSize={12} fontWeight={800}>{ponto.codigo}</text>
              <text y={27} textAnchor="middle" fill="#E5E7EB" fontSize={8.5} fontWeight={600}>{ponto.nome}</text>
              {ponto.dono && (
                <text y={37} textAnchor="middle" fill={cor} fontSize={7.5} fontWeight={700}>{ponto.dono.nome}</text>
              )}
            </g>
          );
        })}
      </svg>

      <ZonaDominioPlacar eventoId={eventoId} estado={estado} />
    </div>
  );
}
