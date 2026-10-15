import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

// Faz o conteúdo caber na caixa onde está (sem rolagem): se ele for mais alto que a caixa, é reduzido
// na proporção necessária. O conteúdo é medido numa largura já compensada (largura ÷ escala), então
// o que muda de altura ao ficar mais largo (textos que quebram linha) também é levado em conta.
// `minScale` evita reduzir até ficar ilegível: abaixo disso o excesso é cortado, a não ser que
// `scrollOverflow` esteja ligado: aí o excesso rola devagar (com pausa no começo e no fim) para ser lido inteiro.
const SCROLL_PAUSE_MS = 3500;
const SCROLL_SPEED_PX_S = 35;

export default function FitToBox({
  children,
  align = 'top',
  minScale = 0.45,
  maxScale = 1,
  className = '',
  scrollOverflow = false,
  onOverflowChange,
}: {
  children: ReactNode;
  align?: 'top' | 'center';
  minScale?: number;
  maxScale?: number;
  className?: string;
  scrollOverflow?: boolean;
  /** Avisa quando o conteúdo passa a não caber na caixa nem na escala mínima (ou volta a caber). */
  onOverflowChange?: (overflowing: boolean) => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const moverRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ scale: 1, width: 0, offsetY: 0, offsetX: 0 });
  const [overflow, setOverflow] = useState(0);

  const measure = useCallback(() => {
    const box = boxRef.current;
    const inner = innerRef.current;
    if (!box || !inner) return;
    const boxWidth = box.clientWidth;
    const boxHeight = box.clientHeight;
    if (!boxWidth || !boxHeight) return;

    // Maior escala em que o conteúdo, medido na largura já compensada (largura ÷ escala), cabe na altura da caixa.
    // Quanto menor a escala, mais larga fica a medição e menos linhas o texto tem, então "cabe" só passa de falso a
    // verdadeiro ao reduzir: a busca binária é estável (o ajuste iterativo antigo oscilava com textos que quebram linha
    // e deixava a largura de uma tentativa antiga, cortando as letras na lateral).
    let emptyContent = false;
    const fits = (candidate: number) => {
      inner.style.width = `${boxWidth / candidate}px`;
      const height = inner.offsetHeight;
      if (!height) emptyContent = true;
      return height * candidate <= boxHeight + 0.5;
    };
    let scale: number;
    if (fits(maxScale)) {
      scale = maxScale;
    } else if (!fits(minScale)) {
      scale = minScale;
    } else {
      let low = minScale;
      let high = maxScale;
      for (let step = 0; step < 10; step += 1) {
        const middle = (low + high) / 2;
        if (fits(middle)) low = middle;
        else high = middle;
      }
      scale = low;
    }
    if (emptyContent) return;
    // Deixa o elemento exatamente na largura da escala escolhida (a última tentativa pode ter sido outra).
    inner.style.width = `${boxWidth / scale}px`;
    const naturalHeight = inner.offsetHeight;

    const shownHeight = naturalHeight * scale;
    const offsetY = align === 'center' ? Math.max(0, (boxHeight - shownHeight) / 2) : 0;
    const next = { scale, width: boxWidth / scale, offsetY, offsetX: 0 };
    setFit((previous) => (
      Math.abs(previous.scale - next.scale) < 0.002
      && Math.abs(previous.width - next.width) < 0.5
      && Math.abs(previous.offsetY - next.offsetY) < 0.5
        ? previous
        : next
    ));
    const excess = Math.max(0, shownHeight - boxHeight);
    setOverflow((previous) => (Math.abs(previous - excess) < 1 ? previous : excess));
  }, [align, maxScale, minScale]);

  const overflowCallback = useRef(onOverflowChange);
  overflowCallback.current = onOverflowChange;
  useEffect(() => {
    overflowCallback.current?.(overflow >= 2);
  }, [overflow]);

  // Conteúdo maior que a caixa mesmo na escala mínima: sobe devagar até o fim, espera e recomeça.
  useEffect(() => {
    const mover = moverRef.current;
    if (!mover) return undefined;
    mover.style.transform = 'translateY(0px)';
    if (!scrollOverflow || overflow < 2) return undefined;

    const travelMs = (overflow / SCROLL_SPEED_PX_S) * 1000;
    const cycleMs = SCROLL_PAUSE_MS * 2 + travelMs;
    const startedAt = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = (now - startedAt) % cycleMs;
      const offset = t < SCROLL_PAUSE_MS
        ? 0
        : t < SCROLL_PAUSE_MS + travelMs
          ? ((t - SCROLL_PAUSE_MS) / travelMs) * overflow
          : overflow;
      mover.style.transform = `translateY(${-offset}px)`;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      mover.style.transform = 'translateY(0px)';
    };
  }, [overflow, scrollOverflow]);

  useLayoutEffect(() => {
    measure();
  });

  useEffect(() => {
    const box = boxRef.current;
    const inner = innerRef.current;
    if (!box || !inner || typeof ResizeObserver === 'undefined') return undefined;
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    const observer = new ResizeObserver(schedule);
    observer.observe(box);
    observer.observe(inner);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [measure]);

  return (
    <div ref={boxRef} className={`relative h-full w-full overflow-hidden ${className}`}>
      <div ref={moverRef} className="absolute inset-0 will-change-transform">
        <div
          ref={innerRef}
          style={{
            position: 'absolute',
            left: 0,
            top: fit.offsetY,
            width: fit.width || undefined,
            transform: `scale(${fit.scale})`,
            transformOrigin: 'top left',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
