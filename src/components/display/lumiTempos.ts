// Linha do tempo do Lumi explicando as regras (LumiExplicaRegras) e da entrada das regras ao lado (GameGuide).
// Cada regra fica sozinha na tela o tempo de lê-la (mais para as longas), antes de a próxima entrar.
const CHEGADA_MS = 3500;
const LEITURA_BASE_MS = 2000;
const LEITURA_POR_LETRA_MS = 45;
const LEITURA_MIN_MS = 3000;
const LEITURA_MAX_MS = 7000;

// Frases do balão do Lumi
export const FALA_LENDO = 'Prestem atenção nas regras!';
export const FALA_SEM_REGRAS = 'Olhem só como funciona!';
export const FALA_FINAL = 'Entenderam? Boa diversão!';

const tempoDeLeitura = (regra: string) =>
  Math.min(Math.max(LEITURA_BASE_MS + regra.length * LEITURA_POR_LETRA_MS, LEITURA_MIN_MS), LEITURA_MAX_MS);

export interface LinhaDoTempo {
  // quando o Lumi passa a ler (fim da abertura)
  chegada: number;
  // quando cada regra entra na tela (ms desde o começo)
  entradas: number[];
  // quando a explicação termina (o Lumi faz o joinha)
  fim: number;
}

export function linhaDoTempo(regras: string[]): LinhaDoTempo {
  const chegada = CHEGADA_MS;
  let t = chegada;
  const entradas = regras.map((regra) => {
    const entrada = t;
    t += tempoDeLeitura(regra);
    return entrada;
  });
  return { chegada, entradas, fim: regras.length > 0 ? t : chegada + 1500 };
}
