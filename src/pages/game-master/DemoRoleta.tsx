import { useState } from 'react';
import RouletteOverlay, { type RouletteData } from '../../components/game-master/RouletteOverlay';

// Página de demonstração da roleta da brincadeira paralela (dados de exemplo): gira, para no objeto e a roleta some
// 1,5 s depois, ficando só o objeto a ser achado.
const DADOS: RouletteData = {
  segments: ['Chinelo', 'Garrafa', 'Livro', 'Chave', 'Boné', 'Relógio', 'Mochila', 'Caderno'],
  winnerIndex: 4,
  objectName: 'Boné',
  checkpointName: 'Torre Encantada',
};

export default function DemoRoleta() {
  const [rodada, setRodada] = useState<number | null>(null);
  return (
    <div className="min-h-screen bg-[#08111f] p-6 text-white">
      <span className="rounded-full bg-warning/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-warning">Prévia · dados de exemplo</span>
      <p className="mt-3 text-gray-400">A roleta gira, para no objeto e some 1,5 s depois; o objeto sorteado continua na tela.</p>
      <button className="mt-4 rounded-xl bg-primary px-5 py-2 font-semibold" onClick={() => setRodada(Date.now())}>Girar a roleta</button>
      {rodada !== null && <RouletteOverlay key={rodada} data={DADOS} onClose={() => setRodada(null)} />}
    </div>
  );
}
