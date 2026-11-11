import { Volume2, VolumeX } from 'lucide-react';
import { desligarSom, ligarSom, useEstadoDoSom } from './som';

// Liga e desliga o som dos monstros. O clique também libera o áudio no navegador (ele não toca antes de um toque na página).
export default function BotaoSomDosMonstros() {
  const estado = useEstadoDoSom();
  const ligado = estado === 'ativo';
  return (
    <button
      type="button"
      onClick={ligado ? desligarSom : ligarSom}
      aria-pressed={ligado}
      title={ligado ? 'Desligar o som dos monstros' : 'Ativar o som dos monstros'}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/60 ${
        ligado
          ? 'border-success/40 bg-success/10 text-success hover:bg-success/20'
          : estado === 'bloqueado'
            ? 'animate-pulse border-warning/50 bg-warning/10 text-warning hover:bg-warning/20'
            : 'border-white/10 bg-black/20 text-gray-300 hover:text-white'
      }`}
    >
      {ligado ? <Volume2 size={14} /> : <VolumeX size={14} />}
      {ligado ? 'Som ligado' : estado === 'bloqueado' ? 'Ativar som' : 'Som desligado'}
    </button>
  );
}
