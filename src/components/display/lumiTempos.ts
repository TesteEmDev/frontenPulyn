// Linha do tempo do Lumi explicando as regras (LumiExplicaRegras) e da entrada das regras ao lado (GameGuide).
export const LUMI_CHEGADA_MS = 3000;
export const LUMI_INTERVALO_REGRA_MS = 1800;
// Quantas regras entram no ritmo do Lumi; as demais entram juntas com a última (regras longas não seguram o joinha)
const MAX_REGRAS_NO_RITMO = 6;

// Tempo em que a regra `posicao` (0, 1, ...) entra na tela
export const atrasoDaRegra = (posicao: number) =>
  LUMI_CHEGADA_MS + Math.min(posicao, MAX_REGRAS_NO_RITMO - 1) * LUMI_INTERVALO_REGRA_MS;
