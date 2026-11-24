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
