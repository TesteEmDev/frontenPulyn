// components/display/ZoneConquestIndividualZones.tsx
import type { ZoneState } from '../../hooks/useZoneConquestGame';

interface ZoneConquestIndividualZonesProps {
  zones: ZoneState[];
  width: number;
  height: number;
}

export function ZoneConquestIndividualZones({ zones, width, height }: ZoneConquestIndividualZonesProps) {
  if (!zones || zones.length === 0) {
    return null;
  }

  return (
    <>
      {zones.map((zone) => {
        // Calcular opacidade e animação baseada no status
        const isLivre = zone.status === 'livre';
        const isDominada = zone.status === 'dominada';
        const isDisputa = zone.status === 'disputa';

        let fillColor = '#FFFFFF';
        let fillOpacity = isLivre ? 0.05 : 0.1;
        let strokeColor = '#FFFFFF';
        let strokeOpacity = 0.2;
        let strokeWidth = 1;
        let animation = '';

        if (isDominada && zone.color) {
          fillColor = zone.color;
          fillOpacity = 0.15;
          strokeColor = zone.color;
          strokeOpacity = 0.6;
          strokeWidth = 2;
          animation = 'glow';
        } else if (isDisputa) {
          fillColor = '#FFFFFF';
          fillOpacity = 0.05;
          strokeColor = '#FF9500';
          strokeOpacity = 0.4;
          strokeWidth = 2;
          animation = 'pulse';
        }

        const x = zone.id?.includes('x-') ? parseFloat(zone.id.split('x-')[1]) : 0;
        const y = zone.id?.includes('y-') ? parseFloat(zone.id.split('y-')[1]) : 0;
        const zoneWidth = zone.id?.includes('w-') ? parseFloat(zone.id.split('w-')[1]) : width * 0.25;
        const zoneHeight = zone.id?.includes('h-') ? parseFloat(zone.id.split('h-')[1]) : height * 0.25;

        return (
          <g key={zone.id}>
            <defs>
              <style>{`
                @keyframes glow {
                  0%, 100% { filter: drop-shadow(0 0 4px ${zone.color}80); }
                  50% { filter: drop-shadow(0 0 8px ${zone.color}); }
                }
                @keyframes pulse {
                  0%, 100% { stroke-width: 2; opacity: 0.4; }
                  50% { stroke-width: 3; opacity: 0.7; }
                }
                .zone-dominada { animation: glow 2s infinite; }
                .zone-disputa { animation: pulse 1.5s infinite; }
              `}</style>
            </defs>

            {/* Zona - Retângulo */}
            <rect
              x={zone.id?.includes('x-') ? x : parseFloat(zone.id?.split('-')[1] || '0')}
              y={zone.id?.includes('y-') ? y : parseFloat(zone.id?.split('-')[2] || '0')}
              width={zoneWidth}
              height={zoneHeight}
              fill={fillColor}
              fillOpacity={fillOpacity}
              stroke={strokeColor}
              strokeOpacity={strokeOpacity}
              strokeWidth={strokeWidth}
              rx={8}
              className={isDominada ? 'zone-dominada' : isDisputa ? 'zone-disputa' : ''}
            />

            {/* Label da zona */}
            {isDominada || isDisputa ? (
              <g>
                {/* Fundo semi-transparente para o texto */}
                <rect
                  x={zone.id?.includes('x-') ? x + 4 : parseFloat(zone.id?.split('-')[1] || '0') + 4}
                  y={zone.id?.includes('y-') ? y + 4 : parseFloat(zone.id?.split('-')[2] || '0') + 4}
                  width={Math.min(120, zoneWidth - 8)}
                  height={24}
                  fill={fillColor}
                  fillOpacity={0.8}
                  rx={4}
                />

                {/* Nome do participante / zona */}
                <text
                  x={zone.id?.includes('x-') ? x + 8 : parseFloat(zone.id?.split('-')[1] || '0') + 8}
                  y={zone.id?.includes('y-') ? y + 18 : parseFloat(zone.id?.split('-')[2] || '0') + 18}
                  fontSize="12"
                  fontWeight="bold"
                  fill={fillColor}
                  textAnchor="start"
                  dominantBaseline="middle"
                >
                  {zone.status === 'dominada' ? zone.participantName || zone.name : zone.name}
                </text>
              </g>
            ) : (
              <text
                x={zone.id?.includes('x-') ? x + zoneWidth / 2 : parseFloat(zone.id?.split('-')[1] || '0') + zoneWidth / 2}
                y={zone.id?.includes('y-') ? y + zoneHeight / 2 : parseFloat(zone.id?.split('-')[2] || '0') + zoneHeight / 2}
                fontSize="14"
                fontWeight="bold"
                fill="#FFFFFF"
                fillOpacity={0.4}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {zone.name}
              </text>
            )}
          </g>
        );
      })}
    </>
  );
}
