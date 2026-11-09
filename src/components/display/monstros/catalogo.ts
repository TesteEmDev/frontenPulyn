// Os monstros do Caça ao Monstro: 6 tipos, cada um em 3 cores (arquivos em public/models/monstros e public/sounds/monstros).
// O monstro de cada equipe é sorteado pelo servidor ao começar o jogo (BackEnd/utils/sorteioMonstros.js).

export const TIPOS_DE_MONSTRO = ['dragao', 'orc', 'slime', 'cogumelo', 'esqueleto', 'morcego'] as const;
export type TipoDeMonstro = (typeof TIPOS_DE_MONSTRO)[number];

interface Paleta {
  // Fundo do cartão: degradê de cima para baixo, névoa, chão e luzes (cores do cenário do monstro)
  fundo: [number, string][];
  nevoa: [string, number, number];
  chao: string;
  hemi: [string, string, number];
  luz: [string, number];
  rim: [string, string, number];
}

export interface DadosDoMonstro {
  nome: string;
  cores: readonly string[];
  // Câmera: o modelo não é escalado, ela é que se afasta (valores calculados para cada tamanho)
  camera: { x: number; y: number; z: number; alvoY: number };
  paleta: Paleta;
}

export const MONSTROS: Record<TipoDeMonstro, DadosDoMonstro> = {
  dragao: {
    nome: 'Dragão',
    cores: ['verde', 'fogo', 'gelo'],
    camera: { x: 1.62, y: 1.65, z: 9.01, alvoY: 0.85 },
    paleta: { // montanhas e vulcão
      fundo: [[0, '#2a0b16'], [0.5, '#8a2a1f'], [1, '#f39a46']], nevoa: ['#5e2519', 10, 42], chao: '#3a2a2a',
      hemi: ['#ffb894', '#3a1a14', 1.7], luz: ['#ffd6b0', 3.2], rim: ['#ff5a1f', '#ffa23a', 3.0],
    },
  },
  orc: {
    nome: 'Orc',
    cores: ['verde', 'cinza', 'vermelho'],
    camera: { x: 1.31, y: 1.82, z: 7.27, alvoY: 0.96 },
    paleta: { // floresta sombria
      fundo: [[0, '#08131f'], [0.55, '#17343a'], [1, '#30584a']], nevoa: ['#17342c', 9, 34], chao: '#27381f',
      hemi: ['#a8e8c8', '#16251c', 1.7], luz: ['#d4e6ff', 2.8], rim: ['#ff9a4a', '#7fd6ff', 1.2],
    },
  },
  slime: {
    nome: 'Slime',
    cores: ['verde', 'azul', 'roxo'],
    camera: { x: 1.04, y: 1.33, z: 5.77, alvoY: 0.63 },
    paleta: { // planície
      fundo: [[0, '#5aa9f0'], [0.55, '#a8d8ff'], [1, '#eaf7ff']], nevoa: ['#cfe9ff', 16, 48], chao: '#5fae4a',
      hemi: ['#ffffff', '#8fcf6a', 2.0], luz: ['#fff3d6', 3.6], rim: ['#ffd9a8', '#a8d4ff', 2.5],
    },
  },
  cogumelo: {
    nome: 'Cogumelo',
    cores: ['vermelho', 'azul', 'marrom'],
    camera: { x: 1.23, y: 1.66, z: 6.83, alvoY: 0.86 },
    paleta: { // campo de cogumelos à noite
      fundo: [[0, '#060924'], [0.55, '#1a1448'], [1, '#33307a']], nevoa: ['#1a1648', 10, 38], chao: '#1d3a52',
      hemi: ['#a8b8ff', '#1d1b40', 1.5], luz: ['#d4dcff', 2.5], rim: ['#ff7ad9', '#5ef2ff', 2.6],
    },
  },
  esqueleto: {
    nome: 'Esqueleto',
    cores: ['marfim', 'carvao', 'ametista'],
    camera: { x: 1.11, y: 1.52, z: 6.14, alvoY: 0.76 },
    paleta: { // cemitério
      fundo: [[0, '#0e0f1c'], [0.5, '#27243f'], [1, '#4f4e70']], nevoa: ['#2a2a40', 8, 32], chao: '#2b2b38',
      hemi: ['#a6b0e0', '#14141f', 1.3], luz: ['#cdd8ff', 2.6], rim: ['#8fa8ff', '#6cf0c2', 1.8],
    },
  },
  morcego: {
    nome: 'Morcego',
    cores: ['roxo', 'vermelho', 'azul'],
    camera: { x: 1.89, y: 1.55, z: 10.51, alvoY: 0.78 },
    paleta: { // caverna
      fundo: [[0, '#0b0a12'], [0.5, '#161224'], [1, '#2a2040']], nevoa: ['#1c1428', 8, 46], chao: '#2d2433',
      hemi: ['#b8a4ff', '#1a1226', 1.5], luz: ['#ddd2ff', 2.8], rim: ['#5ef2ff', '#ff7ad9', 2.2],
    },
  },
};

export const urlDoModelo = (tipo: TipoDeMonstro, cor: string) => `/models/monstros/${tipo}_${cor}.glb`;
export const urlDoSom = (tipo: TipoDeMonstro, som: 'hit' | 'crit' | 'faint') => `/sounds/monstros/${tipo}_${som}.wav`;

export const ehTipoDeMonstro = (valor: unknown): valor is TipoDeMonstro =>
  typeof valor === 'string' && (TIPOS_DE_MONSTRO as readonly string[]).includes(valor);

// Tipo e cor válidos a partir do que o servidor mandou. Partidas antigas (sem sorteio) ou valores estranhos recebem um
// monstro estável pela posição da equipe: assim cada equipe continua com um diferente e nada quebra.
export function monstroDaEquipe(tipo: unknown, cor: unknown, posicao = 0): { tipo: TipoDeMonstro; cor: string } {
  const tipoValido = ehTipoDeMonstro(tipo) ? tipo : TIPOS_DE_MONSTRO[Math.abs(posicao) % TIPOS_DE_MONSTRO.length];
  const cores = MONSTROS[tipoValido].cores;
  const corValida = typeof cor === 'string' && cores.includes(cor) ? cor : cores[Math.abs(posicao) % cores.length];
  return { tipo: tipoValido, cor: corValida };
}
