// Linha do tempo do Lumi explicando as regras (LumiExplicaRegras) e da entrada das regras ao lado (GameGuide).
// Cada regra fica sozinha na tela o tempo de lê-la (mais para as longas), antes de a próxima entrar. Com a voz ligada,
// cada parte dura o maior entre o tempo de ler e o tempo de o Lumi falar (a duração real do áudio gravado, quando há;
// senão uma estimativa), para a fala não ficar para trás.
const CHEGADA_MS = 3500;
const LEITURA_BASE_MS = 2000;
const LEITURA_POR_LETRA_MS = 45;
const LEITURA_MIN_MS = 3000;
const LEITURA_MAX_MS = 7000;
// Fala: estimativa de ~70 ms por letra quando não há áudio gravado, mais uma pausa entre as frases
const FALA_POR_LETRA_MS = 72;
const FALA_PAUSA_MS = 700;

// O que vem entre parênteses no nome (ex.: "(exemplo)") não é falado
export const falaDeAbertura = (nomeJogo: string) =>
  `Oi, pessoal! Vou explicar o próximo jogo: ${nomeJogo.replace(/\s*\([^)]*\)/g, '').trim()}.`;
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

// `duracaoDaFala`: duração (ms) do áudio gravado de um texto, se houver (vozDoLumi.ts)
export function linhaDoTempo(
  regras: string[],
  { voz = false, nomeJogo = '', duracaoDaFala }: { voz?: boolean; nomeJogo?: string; duracaoDaFala?: (texto: string) => number | undefined } = {},
): LinhaDoTempo {
  const tempoDeFala = (texto: string) => FALA_PAUSA_MS + (duracaoDaFala?.(texto) ?? texto.length * FALA_POR_LETRA_MS);
  const chegada = voz ? Math.max(CHEGADA_MS, tempoDeFala(falaDeAbertura(nomeJogo))) : CHEGADA_MS;
  // com voz, o "Prestem atenção nas regras!" vem antes da primeira regra
  let t = chegada + (voz && regras.length > 0 ? tempoDeFala(FALA_LENDO) : 0);
  const entradas = regras.map((regra) => {
    const entrada = t;
    t += voz ? Math.max(tempoDeLeitura(regra), tempoDeFala(regra)) : tempoDeLeitura(regra);
    return entrada;
  });
  const fim = regras.length > 0 ? t : chegada + (voz ? tempoDeFala(FALA_SEM_REGRAS) : 1500);
  return { chegada, entradas, fim };
}
