// O Lumi comemorando: vídeo com fundo transparente (public/mascote/lumi-comemorando.webm, VP9 com canal alfa), em loop.
// Por enquanto só aparece na prévia /demo/pontuacao-final. Se o navegador não tocar o vídeo (ex.: Safari no iPhone/iPad,
// que não lê WebM com transparência), mostra o Pulyn comemorando no lugar.
import { useState } from 'react';
import PulynComemorando from './PulynComemorando';

const VIDEO = '/mascote/lumi-comemorando.webm';

const semMovimento = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export default function LumiComemorando() {
  const [falhou, setFalhou] = useState(false);
  const [parado] = useState(semMovimento);

  if (falhou) return <PulynComemorando />;

  return (
    <div className="relative flex h-full w-full items-end justify-center" aria-hidden="true">
      <video
        src={VIDEO}
        autoPlay={!parado}
        loop
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        onError={() => setFalhou(true)}
        className="h-full w-auto max-w-full object-contain object-bottom drop-shadow-[0_10px_30px_rgba(250,204,21,0.35)]"
      />
    </div>
  );
}
