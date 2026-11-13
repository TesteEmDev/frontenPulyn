// Cores que o participante escolhe para si no cadastro (mapa e ranking dos jogos individuais).
// ATENÇÃO: a mesma lista existe no back (BackEnd/utils/corParticipante.js); mantenha as duas iguais.
export interface CorParticipante {
  readonly hex: string;
  readonly nome: string;
}

export const CORES_PARTICIPANTE: readonly CorParticipante[] = [
  { hex: '#EF4444', nome: 'Vermelho' },
  { hex: '#F97316', nome: 'Laranja' },
  { hex: '#F59E0B', nome: 'Âmbar' },
  { hex: '#EAB308', nome: 'Amarelo' },
  { hex: '#84CC16', nome: 'Lima' },
  { hex: '#22C55E', nome: 'Verde' },
  { hex: '#14B8A6', nome: 'Turquesa' },
  { hex: '#06B6D4', nome: 'Ciano' },
  { hex: '#3B82F6', nome: 'Azul' },
  { hex: '#8B5CF6', nome: 'Violeta' },
  { hex: '#D946EF', nome: 'Magenta' },
  { hex: '#EC4899', nome: 'Rosa' },
];

// Primeira cor que nenhum outro participante do evento usa (todas em uso: a primeira, pois a repetição só vale então).
export function primeiraCorLivre(emUso: readonly string[]): string {
  const usadas = new Set(emUso.map((cor) => cor.toUpperCase()));
  return (CORES_PARTICIPANTE.find((cor) => !usadas.has(cor.hex)) ?? CORES_PARTICIPANTE[0]).hex;
}
