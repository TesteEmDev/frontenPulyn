import { useEffect, useState } from 'react';

interface TypewriterOptions {
  typeMs?: number;
  eraseMs?: number;
  // Quanto tempo o título fica completo na tela antes de ser apagado
  holdMs?: number;
  // Pausa com o título apagado, antes de escrever o próximo
  pauseMs?: number;
  // Falso = o título não está na tela: nada roda, e ao voltar a ser verdadeiro a escrita recomeça do zero
  active?: boolean;
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Escreve o título letra por letra, segura um tempo, apaga letra por letra e passa ao próximo.
// `index` só muda quando o título anterior já foi totalmente apagado; é nesse momento que o
// conteúdo ligado a ele deve trocar. `available` marca quais títulos podem aparecer (um título
// sem conteúdo é pulado; com só um disponível, ele fica parado, sem apagar).
export function useTypewriterCycle(
  titles: string[],
  available: boolean[] = titles.map(() => true),
  { typeMs = 70, eraseMs = 35, holdMs = 9000, pauseMs = 350, active = true }: TypewriterOptions = {},
) {
  const [index, setIndex] = useState(0);
  const [length, setLength] = useState(0);
  const [erasing, setErasing] = useState(false);

  const availableKey = available.join(',');
  const nextIndex = (from: number) => {
    for (let step = 1; step <= titles.length; step += 1) {
      const candidate = (from + step) % titles.length;
      if (available[candidate]) return candidate;
    }
    return from;
  };
  const canCycle = available.filter(Boolean).length > 1;

  // Ao (re)aparecer na tela, começa de novo pelo primeiro título disponível
  useEffect(() => {
    if (!active) return;
    const first = available.findIndex(Boolean);
    setIndex(first >= 0 ? first : 0);
    setLength(0);
    setErasing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  // Se o título atual ficou indisponível (ex.: sem times), vai para um que tenha conteúdo
  useEffect(() => {
    if (!available[index]) {
      const fallback = available.findIndex(Boolean);
      if (fallback >= 0) {
        setIndex(fallback);
        setLength(0);
        setErasing(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableKey]);

  useEffect(() => {
    if (!active) return undefined;
    const title = titles[index] || '';
    let timer = 0;

    if (prefersReducedMotion()) {
      // Sem animação de digitação: mostra o título inteiro e só alterna o conteúdo
      setLength(title.length);
      setErasing(false);
      if (canCycle) timer = window.setTimeout(() => setIndex(nextIndex(index)), holdMs);
      return () => window.clearTimeout(timer);
    }

    if (!erasing) {
      if (length < title.length) {
        timer = window.setTimeout(() => setLength(length + 1), typeMs);
      } else if (canCycle) {
        timer = window.setTimeout(() => setErasing(true), holdMs);
      }
    } else if (length > 0) {
      timer = window.setTimeout(() => setLength(length - 1), eraseMs);
    } else {
      timer = window.setTimeout(() => {
        setIndex(nextIndex(index));
        setErasing(false);
      }, pauseMs);
    }
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, index, length, erasing, canCycle, availableKey, typeMs, eraseMs, holdMs, pauseMs]);

  return { index, text: (titles[index] || '').slice(0, length) };
}
