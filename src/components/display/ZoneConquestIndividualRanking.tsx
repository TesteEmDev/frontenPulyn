// components/display/ZoneConquestIndividualRanking.tsx
import { Trophy, Medal, Star } from 'lucide-react';
import type { Participant } from '../../hooks/useZoneConquestGame';

interface ZoneConquestIndividualRankingProps {
  participants: Participant[];
  compact?: boolean;
}

export function ZoneConquestIndividualRanking({ participants, compact = false }: ZoneConquestIndividualRankingProps) {
  if (!participants || participants.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        Aguardando participantes...
      </div>
    );
  }

  const sorted = [...participants].sort((a, b) => a.ranking - b.ranking);

  if (compact) {
    // Versão compacta para canto da tela
    return (
      <div className="space-y-2">
        {sorted.slice(0, 5).map((participant, index) => (
          <div
            key={participant.criancaId}
            className="flex items-center gap-2 rounded-lg px-3 py-2 backdrop-blur-sm"
            style={{
              backgroundColor: participant.color + '20',
              borderLeft: `3px solid ${participant.color}`,
            }}
          >
            {/* Rank Icon */}
            <div className="flex h-6 w-6 items-center justify-center rounded-full font-bold text-xs"
              style={{ backgroundColor: participant.color + '40', color: participant.color }}>
              {index === 0 && <Trophy size={16} className="text-yellow-400" />}
              {index === 1 && <Medal size={16} className="text-gray-300" />}
              {index === 2 && <Star size={16} className="text-orange-400" />}
              {index > 2 && <span>{participant.ranking}</span>}
            </div>

            {/* Name */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-white">
                {participant.name}
              </p>
              <p className="text-xs text-gray-400">
                {participant.checkpointsRead} CPs
              </p>
            </div>

            {/* Points */}
            <div className="text-right">
              <p className="text-lg font-bold" style={{ color: participant.color }}>
                {participant.totalPoints.toFixed(1)}
              </p>
              <p className="text-xs text-gray-500">pts</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Versão completa (podium)
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white mb-6">Ranking</h2>

      {/* Podium com top 3 */}
      {sorted.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {/* 2º lugar */}
          {sorted[1] && (
            <div className="flex flex-col items-center">
              <div
                className="w-20 h-24 rounded-t-lg flex flex-col items-center justify-end pb-3"
                style={{ backgroundColor: sorted[1].color + '30', borderTop: `3px solid ${sorted[1].color}` }}
              >
                <Medal size={24} className="text-gray-300 mb-1" />
                <p className="text-2xl font-bold text-gray-300">2º</p>
              </div>
              <p className="text-sm font-semibold text-white mt-2 text-center">{sorted[1].name}</p>
              <p className="text-lg font-bold" style={{ color: sorted[1].color }}>
                {sorted[1].totalPoints.toFixed(1)}
              </p>
            </div>
          )}

          {/* 1º lugar (maior) */}
          {sorted[0] && (
            <div className="flex flex-col items-center">
              <div
                className="w-20 h-32 rounded-t-lg flex flex-col items-center justify-end pb-3"
                style={{ backgroundColor: sorted[0].color + '40', borderTop: `4px solid ${sorted[0].color}` }}
              >
                <Trophy size={28} className="text-yellow-400 mb-1" />
                <p className="text-3xl font-bold text-yellow-400">1º</p>
              </div>
              <p className="text-sm font-bold text-white mt-2 text-center">{sorted[0].name}</p>
              <p className="text-xl font-bold" style={{ color: sorted[0].color }}>
                {sorted[0].totalPoints.toFixed(1)}
              </p>
            </div>
          )}

          {/* 3º lugar */}
          {sorted[2] && (
            <div className="flex flex-col items-center">
              <div
                className="w-20 h-20 rounded-t-lg flex flex-col items-center justify-end pb-3"
                style={{ backgroundColor: sorted[2].color + '30', borderTop: `3px solid ${sorted[2].color}` }}
              >
                <Star size={24} className="text-orange-400 mb-1" />
                <p className="text-2xl font-bold text-orange-400">3º</p>
              </div>
              <p className="text-sm font-semibold text-white mt-2 text-center">{sorted[2].name}</p>
              <p className="text-lg font-bold" style={{ color: sorted[2].color }}>
                {sorted[2].totalPoints.toFixed(1)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Lista completa */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {sorted.map((participant, index) => (
          <div
            key={participant.criancaId}
            className="flex items-center gap-3 rounded-lg px-4 py-3 backdrop-blur-sm border"
            style={{
              backgroundColor: participant.color + '15',
              borderColor: participant.color + '40',
            }}
          >
            {/* Ranking */}
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full font-bold text-sm flex-shrink-0"
              style={{ backgroundColor: participant.color + '40', color: participant.color }}
            >
              {index < 3 ? ['🥇', '🥈', '🥉'][index] : `${participant.ranking}`}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white truncate">{participant.name}</p>
              <p className="text-xs text-gray-400">{participant.checkpointsRead} checkpoints lidos</p>
            </div>

            {/* Points */}
            <div className="text-right flex-shrink-0">
              <p className="text-xl font-bold" style={{ color: participant.color }}>
                {participant.totalPoints.toFixed(1)}
              </p>
              <p className="text-xs text-gray-500">pontos</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
