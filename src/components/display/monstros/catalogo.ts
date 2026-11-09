// Os monstros do Caça ao Monstro: 6 tipos, cada um em 3 cores (arquivos em public/models/monstros e public/sounds/monstros).
// O monstro de cada equipe é sorteado pelo servidor ao começar o jogo (BackEnd/utils/sorteioMonstros.js).

export const TIPOS_DE_MONSTRO = ['dragao', 'orc', 'slime', 'cogumelo', 'esqueleto', 'morcego'] as const;
export type TipoDeMonstro = (typeof TIPOS_DE_MONSTRO)[number];

export interface DadosDoMonstro {
  nome: string;
  cores: readonly string[];
  // Câmera: o modelo não é escalado, ela é que se afasta (valores calculados para cada tamanho)
  camera: { x: number; y: number; z: number; alvoY: number };
}

export const MONSTROS: Record<TipoDeMonstro, DadosDoMonstro> = {
  dragao: {
    nome: 'Dragão',
    cores: ['verde', 'fogo', 'gelo'],
    camera: { x: 1.62, y: 1.65, z: 9.01, alvoY: 0.85 },
  },
  orc: {
    nome: 'Orc',
    cores: ['verde', 'cinza', 'vermelho'],
    camera: { x: 1.31, y: 1.82, z: 7.27, alvoY: 0.96 },
  },
  slime: {
    nome: 'Slime',
    cores: ['verde', 'azul', 'roxo'],
    camera: { x: 1.04, y: 1.33, z: 5.77, alvoY: 0.63 },
  },
  cogumelo: {
    nome: 'Cogumelo',
    cores: ['vermelho', 'azul', 'marrom'],
    camera: { x: 1.23, y: 1.66, z: 6.83, alvoY: 0.86 },
  },
  esqueleto: {
    nome: 'Esqueleto',
    cores: ['marfim', 'carvao', 'ametista'],
    camera: { x: 1.11, y: 1.52, z: 6.14, alvoY: 0.76 },
  },
  morcego: {
    nome: 'Morcego',
    cores: ['roxo', 'vermelho', 'azul'],
    camera: { x: 1.89, y: 1.55, z: 10.51, alvoY: 0.78 },
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
