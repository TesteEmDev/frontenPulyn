import { useCallback, useMemo, useState } from 'react';
import Monster3D from '../../components/display/Monster3D';
import BotaoSomDosMonstros from '../../components/display/monstros/BotaoSomDosMonstros';
import { MONSTROS, TIPOS_DE_MONSTRO, type TipoDeMonstro } from '../../components/display/monstros/catalogo';

// Página de demonstração: mostra os monstros do Caça ao Monstro com dano, ataque especial e derrota (nada do evento é lido nem gravado).
const MAXIMO = 500;
const EQUIPES = [
  { id: 'e1', nome: 'Equipe Azul', cor: '#1E9BD7' },
  { id: 'e2', nome: 'Equipe Laranja', cor: '#F59E0B' },
  { id: 'e3', nome: 'Equipe Verde', cor: '#22C55E' },
  { id: 'e4', nome: 'Equipe Roxa', cor: '#A78BFA' },
  { id: 'e5', nome: 'Equipe Vermelha', cor: '#EF4444' },
  { id: 'e6', nome: 'Equipe Rosa', cor: '#EC4899' },
];

// Sorteio só para a demonstração (o jogo de verdade sorteia no servidor): tipos embaralhados, nenhum repete
function sortear(): { tipo: TipoDeMonstro; cor: string }[] {
  // ?m=dragao,esqueleto fixa os primeiros monstros (para conferir um deles)
  const pedidos = (new URLSearchParams(window.location.search).get('m') || '').split(',').filter((x): x is TipoDeMonstro => (TIPOS_DE_MONSTRO as readonly string[]).includes(x));
  const tipos = [...pedidos, ...TIPOS_DE_MONSTRO.filter((x) => !pedidos.includes(x))];
  if (pedidos.length) return tipos.map((tipo) => ({ tipo, cor: MONSTROS[tipo].cores[0] }));
  for (let i = tipos.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [tipos[i], tipos[j]] = [tipos[j], tipos[i]];
  }
  return tipos.map((tipo) => {
    const cores = MONSTROS[tipo].cores;
    return { tipo, cor: cores[Math.floor(Math.random() * cores.length)] };
  });
}

export default function DisplayDemoMonstros() {
  const [quantidade, setQuantidade] = useState(2);
  const [sorteio, setSorteio] = useState(sortear);
  const [vida, setVida] = useState<number[]>(() => EQUIPES.map(() => MAXIMO));

  const novoJogo = useCallback(() => {
    setSorteio(sortear());
    setVida(EQUIPES.map(() => MAXIMO));
  }, []);
  const dano = (indice: number, valor: number) => setVida((atual) => atual.map((hp, i) => (i === indice ? Math.max(0, hp - valor) : hp)));
  const reviver = (indice: number) => setVida((atual) => atual.map((hp, i) => (i === indice ? MAXIMO : hp)));
  const equipes = useMemo(() => EQUIPES.slice(0, quantidade), [quantidade]);

  const botao = 'rounded-lg border border-white/15 bg-white/[0.06] px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/[0.12]';
  return (
    <div className="min-h-screen bg-[#08111f] p-3 text-white">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-warning/20 px-3 py-1 text-xs font-bold uppercase tracking-wide text-warning">Prévia · dados de exemplo</span>
        {[1, 2, 3, 4, 6].map((n) => (
          <button key={n} className={`${botao} ${quantidade === n ? 'ring-2 ring-primary-400' : ''}`} onClick={() => setQuantidade(n)}>{n} equipe{n > 1 ? 's' : ''}</button>
        ))}
        <button className={botao} onClick={novoJogo}>Sortear de novo</button>
        <BotaoSomDosMonstros />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {equipes.map((equipe, indice) => {
          const hp = vida[indice];
          const derrotado = hp <= 0;
          const { tipo, cor } = sorteio[indice];
          return (
            <section key={equipe.id} className="overflow-hidden rounded-2xl border border-white/10 bg-black/25" style={{ borderColor: `${equipe.cor}66` }}>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-2">
                <h3 className="font-display text-xl font-bold" style={{ color: equipe.cor }}>{equipe.nome}</h3>
                <div className="flex flex-wrap gap-1.5">
                  <button className={botao} onClick={() => dano(indice, 10)} disabled={derrotado}>Dano 10</button>
                  <button className={botao} onClick={() => dano(indice, 30)} disabled={derrotado}>Especial 30</button>
                  <button className={botao} onClick={() => dano(indice, 50)} disabled={derrotado}>Especial 50</button>
                  <button className={botao} onClick={() => dano(indice, MAXIMO)} disabled={derrotado}>Derrotar</button>
                  <button className={botao} onClick={() => reviver(indice)}>Reiniciar</button>
                </div>
              </div>
              <Monster3D
                hp={hp}
                maxHp={MAXIMO}
                defeated={derrotado}
                teamName={equipe.nome}
                teamColor={equipe.cor}
                winnerTeamName={equipe.nome}
                winnerTeamColor={equipe.cor}
                tipo={tipo}
                cor={cor}
                leve={quantidade > 2}
                key={`${equipe.id}-${tipo}-${cor}`}
              />
            </section>
          );
        })}
      </div>
    </div>
  );
}
