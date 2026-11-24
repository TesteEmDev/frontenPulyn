// Colocação com empate: quem tem os mesmos pontos fica na mesma colocação, e a próxima não pula número
// (ex.: 30, 30, 20, 10 pontos -> 1º, 1º, 2º, 3º). Ordena pelos pontos, do maior para o menor.
export function comColocacao<T extends { pontos: number }>(linhas: T[]): (T & { colocacao: number })[] {
  const ordenadas = [...linhas].sort((a, b) => b.pontos - a.pontos);
  let colocacao = 0;
  let pontosAnteriores: number | null = null;
  return ordenadas.map((linha) => {
    if (linha.pontos !== pontosAnteriores) {
      colocacao += 1;
      pontosAnteriores = linha.pontos;
    }
    return { ...linha, colocacao };
  });
}

// Só até a colocação `ate` (todos os empatados nela entram), com um teto de linhas para caber na tela
export function ateAColocacao<T extends { pontos: number }>(linhas: T[], ate: number, maxLinhas = 8) {
  return comColocacao(linhas).filter((linha) => linha.colocacao <= ate).slice(0, maxLinhas);
}

// Para os rankings do telão durante o jogo: quem pontuou, até a colocação `ate` (com empates), e depois os zerados
// (colocacao null, sem número), em ordem alfabética, até o teto de linhas. Assim todo mundo aparece desde o início.
export function rankingComZerados<T extends { pontos: number; nome: string }>(linhas: T[], ate: number, maxLinhas = 8) {
  const pontuados: (T & { colocacao: number | null })[] = ateAColocacao(linhas.filter((l) => l.pontos > 0), ate, maxLinhas);
  const zerados = linhas
    .filter((l) => !(l.pontos > 0))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    .map((l) => ({ ...l, colocacao: null }));
  return [...pontuados, ...zerados].slice(0, maxLinhas);
}
