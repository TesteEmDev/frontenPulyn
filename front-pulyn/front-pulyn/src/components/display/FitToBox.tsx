import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

// Faz o conteúdo caber na caixa onde está (sem rolagem): se ele for mais alto que a caixa, é reduzido
// na proporção necessária. O conteúdo é medido numa largura já compensada (largura ÷ escala), então
// o que muda de altura ao ficar mais largo (textos que quebram linha) também é levado em conta.
// `minScale` evita reduzir até ficar ilegível: abaixo disso o excesso é cortado.
export default function FitToBox({
  children,
  align = 'top',
  minScale = 0.45,
  maxScale = 1,
  className = '',
}: {
  children: ReactNode;
  align?: 'top' | 'center';
  minScale?: number;
  maxScale?: number;
  className?: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState({ scale: 1, width: 0, offsetY: 0, offsetX: 0 });

  const measure = useCallback(() => {
    const box = boxRef.current;
    const inner = innerRef.current;
    if (!box || !inner) return;
    const boxWidth = box.clientWidth;
    const boxHeight = box.clientHeight;
    if (!boxWidth || !boxHeight) return;

    let scale = maxScale;
    let naturalHeight = 0;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      inner.style.width = `${boxWidth / scale}px`;
      naturalHeight = inner.offsetHeight;
      if (!naturalHeight) return;
      const target = Math.min(maxScale, Math.max(minScale, boxHeight / naturalHeight));
      if (Math.abs(target - scale) < 0.004) break;
      scale = target;
    }

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
  }, [align, maxScale, minScale]);

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
  );
}
