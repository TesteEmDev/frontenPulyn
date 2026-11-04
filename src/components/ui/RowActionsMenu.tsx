import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { MoreHorizontal } from 'lucide-react';
import Button from './Button';

interface RowActionsMenuProps {
  /** Nome do botão para leitores de tela, ex.: "Ações de Buffet Feliz" */
  label: string;
  /** Itens do menu; recebe `fechar` para fechar o menu depois da ação. */
  children: (fechar: () => void) => ReactNode;
  /** Largura do menu em px (padrão 192). */
  largura?: number;
}

/**
 * Menu "⋯" de ações de uma linha de tabela. O menu é desenhado no <body> (a tabela tem rolagem e cortaria o menu), com a
 * borda direita colada na do botão. Abre para baixo e, se não houver espaço embaixo, abre para cima. Fecha ao clicar fora,
 * com Esc, ao rolar a página ou ao redimensionar a janela.
 */
export default function RowActionsMenu({ label, children, largura = 192 }: RowActionsMenuProps) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [top, setTop] = useState<number | null>(null);
  const menuEl = useRef<HTMLDivElement | null>(null);
  const botaoEl = useRef<HTMLDivElement | null>(null);
  const aberto = rect !== null;

  // Mede o menu já desenhado (invisível) e escolhe para baixo ou para cima antes de pintar
  useLayoutEffect(() => {
    if (!rect || !menuEl.current) return;
    const altura = menuEl.current.offsetHeight;
    const cabeEmbaixo = window.innerHeight - rect.bottom - 8 >= altura;
    setTop(cabeEmbaixo ? rect.bottom + 4 : Math.max(8, rect.top - altura - 4));
  }, [rect]);

  useEffect(() => {
    if (!aberto) return;
    const fecha = () => { setRect(null); setTop(null); };
    const fora = (e: MouseEvent) => {
      const alvo = e.target as Node;
      if (menuEl.current?.contains(alvo) || botaoEl.current?.contains(alvo)) return;
      fecha();
    };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') fecha(); };
    document.addEventListener('mousedown', fora);
    document.addEventListener('keydown', esc);
    window.addEventListener('scroll', fecha, true);
    window.addEventListener('resize', fecha);
    return () => {
      document.removeEventListener('mousedown', fora);
      document.removeEventListener('keydown', esc);
      window.removeEventListener('scroll', fecha, true);
      window.removeEventListener('resize', fecha);
    };
  }, [aberto]);

  const fechar = () => { setRect(null); setTop(null); };

  return (
    <div ref={botaoEl} className="inline-block">
      <Button
        variant="ghost"
        size="sm"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={aberto}
        onClick={(e) => {
          if (aberto) { fechar(); return; }
          setTop(null);
          setRect(e.currentTarget.getBoundingClientRect());
        }}
      >
        <MoreHorizontal size={16} />
      </Button>
      {rect && createPortal(
        <div
          ref={menuEl}
          role="menu"
          style={{ top: top ?? rect.bottom + 4, right: window.innerWidth - rect.right, width: largura, visibility: top === null ? 'hidden' : 'visible' }}
          className="fixed z-[60] rounded-lg border border-border bg-card py-1 shadow-xl"
        >
          {children(fechar)}
        </div>,
        document.body
      )}
    </div>
  );
}
