import { Link, useLocation } from 'react-router-dom';
import { Map, Radio, Flame } from 'lucide-react';

// Tudo o que mexe no mapa do admin fica atrás de um item só do menu ("Mapa").
// Este seletor troca entre as telas dessa área.
export const ROTAS_DO_MAPA = ['/admin/map', '/admin/uhf', '/admin/mapa-calor'];

const ABAS = [
  { path: '/admin/map', label: 'Zonas e checkpoints', icon: <Map size={16} /> },
  { path: '/admin/uhf', label: 'Antenas UHF', icon: <Radio size={16} /> },
  { path: '/admin/mapa-calor', label: 'Mapa de calor', icon: <Flame size={16} /> },
];

export default function MapaAbas() {
  const { pathname } = useLocation();
  return (
    <nav aria-label="Áreas do mapa" className="flex flex-wrap gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] p-1">
      {ABAS.map((aba) => {
        const ativa = pathname === aba.path;
        return (
          <Link
            key={aba.path}
            to={aba.path}
            aria-current={ativa ? 'page' : undefined}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              ativa ? 'bg-primary-500/20 text-white' : 'text-gray-400 hover:bg-white/[0.06] hover:text-white'
            }`}
          >
            {aba.icon}
            {aba.label}
          </Link>
        );
      })}
    </nav>
  );
}
