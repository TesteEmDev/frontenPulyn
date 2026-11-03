import { useEffect, useState } from 'react';
import RouletteOverlay, { RouletteResultBanner, type RouletteData } from '../../components/game-master/RouletteOverlay';

// Página de demonstração da roleta da brincadeira paralela (dados de exemplo), como ela aparece no telão: gira, para no
// objeto, a roleta some 1,5 s depois e o objeto sorteado vai para o cabeçalho.
const DADOS: RouletteData = {
  segments: ['Chinelo', 'Garrafa', 'Livro', 'Chave', 'Boné', 'Relógio', 'Mochila', 'Caderno'],
  winnerIndex: 4,
  objectName: 'Boné',
  checkpointName: 'Torre Encantada',
};

export default function DemoRoleta() {
  const [rodada, setRodada] = useState<number | null>(null);
  const [objeto, setObjeto] = useState<RouletteData | null>(null);
  // Como o telão: a página se redesenha a cada segundo (o relógio interno), passando funções novas ao overlay
  const [, setTique] = useState(0);
  useEffect(() => {
    const intervalo = setInterval(() => setTique((n) => n + 1), 1000);
    return () => clearInterval(intervalo);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[#08111f] p-6 text-white">
      <header className="mb-4 flex h-16 items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4">
        <h1 className="font-display text-2xl font-bold">Pulyn Arena</h1>
        <p className="text-sm text-gray-300">Evento de exemplo</p>
      </header>
      <span className="self-start rounded-full bg-warning/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-warning">Prévia · dados de exemplo</span>
      <p className="mt-3 text-gray-400">A roleta gira, para no objeto e some 1,5 s depois; o objeto sorteado vai para o rodapé, à esquerda dos participantes.</p>
      <button className="mt-4 self-start rounded-xl bg-primary px-5 py-2 font-semibold" onClick={() => { setObjeto(null); setRodada(Date.now()); }}>Girar a roleta</button>
      {/* Rodapé do telão: o objeto fica à esquerda do número de participantes */}
      <footer className="mt-auto flex items-center justify-end gap-4">
        {objeto && <div className="flex min-w-0 flex-1 justify-end"><RouletteResultBanner data={objeto} /></div>}
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-1.5 leading-tight">
          <p className="font-display text-xl font-bold">12<span className="text-sm text-gray-400">/20</span></p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">participantes</p>
        </div>
      </footer>
      {rodada !== null && (
        <RouletteOverlay
          key={rodada}
          data={DADOS}
          onClose={() => setRodada(null)}
          onWheelGone={() => { setObjeto(DADOS); setRodada(null); }}
        />
      )}
    </div>
  );
}
