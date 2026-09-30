import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

export interface PagedItem {
  key: string;
  node: ReactNode;
  // Tamanho do texto do item, usado para dar mais tempo de leitura às páginas mais cheias
  chars: number;
}

// Mostra os itens numa área de tamanho fixo, sem cortar nada: os itens que não cabem juntos viram
// outras páginas, que passam sozinhas (mais texto = mais tempo). Ao fim da última página volta à
// primeira ou, se `onCycle` for informado, avisa que o ciclo terminou (ex.: passar para o próximo jogo).
export default function PagedItems({
  items,
  resetKey,
  onCycle,
  gap = 10,
  baseMs = 5000,
  perCharMs = 45,
  minMs = 7000,
  maxMs = 20000,
  className = '',
}: {
  items: PagedItem[];
  // Quando muda (ex.: outro jogo), volta para a primeira página
  resetKey?: string | number;
  onCycle?: () => void;
  gap?: number;
  baseMs?: number;
  perCharMs?: number;
  minMs?: number;
  maxMs?: number;
  className?: string;
}) {
  const areaRef = useRef<HTMLDivElement>(null);
  const measurerRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<number[][]>([items.map((_, index) => index)]);
  const [page, setPage] = useState(0);
  const onCycleRef = useRef(onCycle);
  onCycleRef.current = onCycle;

  // Mede cada item (num espaço invisível com a mesma largura da área) e distribui em páginas que caibam
  const paginate = useCallback(() => {
    const area = areaRef.current;
    const measurer = measurerRef.current;
    if (!area || !measurer) return;
    const available = area.clientHeight;
    const width = area.clientWidth;
    if (!available || !width) return;
    measurer.style.width = `${width}px`;
    const heights = Array.from(measurer.children).map((child) => (child as HTMLElement).offsetHeight);
    const next: number[][] = [];
    let current: number[] = [];
    let used = 0;
    heights.forEach((height, index) => {
      const needed = height + (current.length ? gap : 0);
      if (current.length && used + needed > available) {
        next.push(current);
        current = [];
        used = 0;
      }
      used += height + (current.length ? gap : 0);
      current.push(index);
    });
    if (current.length) next.push(current);
    const result = next.length ? next : [[]];
    setPages((previous) => (JSON.stringify(previous) === JSON.stringify(result) ? previous : result));
  }, [gap]);

  useLayoutEffect(() => {
    paginate();
  });

  useEffect(() => {
    const area = areaRef.current;
    if (!area || typeof ResizeObserver === 'undefined') return undefined;
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(paginate);
    });
    observer.observe(area);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [paginate]);

  useEffect(() => {
    setPage(0);
  }, [resetKey]);

  const safePage = Math.min(page, pages.length - 1);
  const pageChars = pages[safePage].reduce((sum, index) => sum + (items[index]?.chars || 0), 0);
  const pageMs = Math.min(Math.max(baseMs + pageChars * perCharMs, minMs), maxMs);

  useEffect(() => {
    if (pages.length < 2 && !onCycleRef.current) return undefined;
    const timer = window.setTimeout(() => {
      if (safePage + 1 < pages.length) {
        setPage(safePage + 1);
      } else {
        setPage(0);
        onCycleRef.current?.();
      }
    }, pageMs);
    return () => window.clearTimeout(timer);
  }, [safePage, pages.length, pageMs, resetKey]);

  return (
    <div className={`flex h-full min-h-0 flex-col ${className}`}>
      <div ref={areaRef} className="relative min-h-0 flex-1 overflow-hidden">
        <div key={`${resetKey}-${safePage}`} className="flex flex-col animate-in fade-in duration-500" style={{ gap }}>
          {pages[safePage].map((index) => (
            <div key={items[index]?.key}>{items[index]?.node}</div>
          ))}
        </div>
        {/* Espaço invisível só para medir a altura de cada item */}
        <div ref={measurerRef} aria-hidden="true" className="pointer-events-none invisible absolute left-0 top-0 flex flex-col" style={{ gap }}>
          {items.map((item) => (
            <div key={item.key}>{item.node}</div>
          ))}
        </div>
      </div>
      {/* Indicador de páginas (espaço sempre reservado, para a medida não mudar quando ele aparece) */}
      <div className="flex h-4 shrink-0 items-center justify-end gap-1.5 pt-1" aria-hidden="true">
        {pages.length > 1 && pages.map((_, index) => (
          <span key={index} className={`h-1.5 rounded-full transition-all duration-300 ${index === safePage ? 'w-5 bg-primary-400' : 'w-1.5 bg-white/20'}`} />
        ))}
      </div>
    </div>
  );
}
