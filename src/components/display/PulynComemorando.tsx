// O mascote do Pulyn comemorando: pula, achata e estica, balança e pisca, com confete caindo ao redor.
// O movimento é o da animação "feliz" do pacote do mascote (mascote/Lumi2D/animacoes.json); as imagens ficam em
// public/mascote (feliz.png e feliz_olhos.png, o piscar).
import { useEffect, useMemo, useState } from 'react';

const IMAGEM = '/mascote/feliz.png';
const IMAGEM_PISCANDO = '/mascote/feliz_olhos.png';
const PISCAR_MIN_MS = 2400;
const PISCAR_MAX_MS = 5000;
const PISCAR_DURACAO_MS = 140;

const CORES_CONFETE = ['#FACC15', '#1E9BD7', '#F472B6', '#22C55E', '#A78BFA', '#FB923C'];

export default function PulynComemorando({ confete = true }: { confete?: boolean }) {
  const [piscando, setPiscando] = useState(false);

  // Pisca sozinho, de tempos em tempos
  useEffect(() => {
    let vivo = true;
    let timer = 0;
    const agendar = () => {
      const espera = PISCAR_MIN_MS + Math.random() * (PISCAR_MAX_MS - PISCAR_MIN_MS);
      timer = window.setTimeout(() => {
        if (!vivo) return;
        setPiscando(true);
        timer = window.setTimeout(() => {
          if (!vivo) return;
          setPiscando(false);
          agendar();
        }, PISCAR_DURACAO_MS);
      }, espera);
    };
    agendar();
    return () => {
      vivo = false;
      window.clearTimeout(timer);
    };
  }, []);

  // Pedaços de confete: posição, cor e tempo sorteados uma vez (não mudam a cada piscada)
  const pedacos = useMemo(() => Array.from({ length: 28 }, (_, i) => ({
    id: i,
    esquerda: Math.random() * 100,
    atraso: -Math.random() * 4,
    duracao: 3 + Math.random() * 3,
    tamanho: 8 + Math.random() * 10,
    cor: CORES_CONFETE[i % CORES_CONFETE.length],
    redondo: i % 3 === 0,
  })), []);

  return (
    <div className="relative flex h-full w-full items-end justify-center" aria-hidden="true">
      {confete && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {pedacos.map((p) => (
            <span
              key={p.id}
              className="absolute top-0 animate-confeti-cai motion-reduce:hidden"
              style={{
                left: `${p.esquerda}%`,
                width: p.tamanho,
                height: p.redondo ? p.tamanho : p.tamanho * 0.5,
                backgroundColor: p.cor,
                borderRadius: p.redondo ? '9999px' : '2px',
                animationDelay: `${p.atraso}s`,
                animationDuration: `${p.duracao}s`,
              }}
            />
          ))}
        </div>
      )}

      {/* O pivô é a base do corpo, como na animação original */}
      <div className="relative h-full max-h-full animate-pulyn-feliz motion-reduce:animate-none" style={{ transformOrigin: '50% 90%' }}>
        <img src={IMAGEM} alt="" className="h-full w-auto max-w-full object-contain drop-shadow-[0_10px_30px_rgba(250,204,21,0.35)]" draggable={false} />
        {/* A imagem de olhos fechados já fica carregada por baixo e aparece só na piscada (sem atraso para baixar) */}
        <img
          src={IMAGEM_PISCANDO}
          alt=""
          className={`absolute inset-0 h-full w-full object-contain ${piscando ? 'opacity-100' : 'opacity-0'}`}
          draggable={false}
        />
      </div>
    </div>
  );
}
