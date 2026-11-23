// Linha do tempo do Lumi explicando as regras (LumiExplicaRegras) e da entrada das regras ao lado (GameGuide).
// Cada regra fica sozinha na tela o tempo de lê-la (mais para as longas), antes de a próxima entrar.
export const LUMI_CHEGADA_MS = 3500;
const LEITURA_BASE_MS = 2000;
const LEITURA_POR_LETRA_MS = 45;
const LEITURA_MIN_MS = 3000;
const LEITURA_MAX_MS = 7000;

const tempoDeLeitura = (regra: string) =>
  Math.min(Math.max(LEITURA_BASE_MS + regra.length * LEITURA_POR_LETRA_MS, LEITURA_MIN_MS), LEITURA_MAX_MS);

// Quando cada regra entra na tela (ms desde o começo) e quando a explicação termina (o Lumi faz o joinha)
export function linhaDoTempo(regras: string[]): { entradas: number[]; fim: number } {
  let t = LUMI_CHEGADA_MS;
  const entradas = regras.map((regra) => {
    const entrada = t;
    t += tempoDeLeitura(regra);
    return entrada;
  });
  return { entradas, fim: regras.length > 0 ? t : LUMI_CHEGADA_MS + 1500 };
}
