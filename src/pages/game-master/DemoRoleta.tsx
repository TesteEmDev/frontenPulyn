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
    <div className="min-h-screen bg-[#08111f] p-6 text-white">
      <header className="mb-4 flex h-16 items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-4">
        <h1 className="font-display text-2xl font-bold">Pulyn Arena</h1>
        <div className="flex min-w-0 flex-1 justify-center">{objeto && <RouletteResultBanner data={objeto} />}</div>
        <p className="text-sm text-gray-300">Evento de exemplo</p>
      </header>
      <span className="rounded-full bg-warning/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-warning">Prévia · dados de exemplo</span>
      <p className="mt-3 text-gray-400">A roleta gira, para no objeto e some 1,5 s depois; o objeto sorteado vai para o cabeçalho.</p>
      <button className="mt-4 rounded-xl bg-primary px-5 py-2 font-semibold" onClick={() => { setObjeto(null); setRodada(Date.now()); }}>Girar a roleta</button>
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
