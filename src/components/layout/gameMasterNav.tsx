import { Zap, ListChecks } from 'lucide-react';

// Item do menu do recreacionista para a brincadeira paralela (compartilhado pelas telas dele).
export const PARALLEL_NAV_ITEM = {
  icon: <Zap size={20} />,
  label: 'Brincadeira paralela',
  path: '/game-master/parallel',
};

// Tela para trocar os checkpoints de cada jogo (inclusive com a partida em andamento).
export const GAMES_NAV_ITEM = {
  icon: <ListChecks size={20} />,
  label: 'Checkpoints dos jogos',
  path: '/game-master/games',
};
