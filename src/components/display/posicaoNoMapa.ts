// Posição de um checkpoint no mapa do telão (planta de 450 x 320). Sem posição salva, distribui os checkpoints
// numa grade para nenhum ficar escondido.
export const MAP_WIDTH = 450;
export const MAP_HEIGHT = 320;

type ComPosicao = { mapaX?: number | null; mapaY?: number | null; mapX?: number | null; mapY?: number | null };

export function posicaoNoMapa(checkpoint: ComPosicao, indice: number, total: number) {
  const x = Number(checkpoint.mapaX ?? checkpoint.mapX);
  const y = Number(checkpoint.mapaY ?? checkpoint.mapY);
  if (Number.isFinite(x) && Number.isFinite(y)) return { x, y };
  const colunas = Math.max(1, Math.ceil(Math.sqrt(total)));
  const linhas = Math.ceil(total / colunas);
  return {
    x: MAP_WIDTH * ((indice % colunas) + 1) / (colunas + 1),
    y: MAP_HEIGHT * (Math.floor(indice / colunas) + 1) / (linhas + 1),
  };
}
