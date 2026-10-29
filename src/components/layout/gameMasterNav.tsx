import { Gamepad2, Users, MessageSquare, Zap, ListChecks } from 'lucide-react';

// Menu do recreacionista (mesmos itens das telas dele; usado também quando a conta tem essa área extra).
export const GAME_MASTER_NAV_ITEMS = [
  { icon: <Gamepad2 size={20} />, label: 'Painel', path: '/game-master' },
  { icon: <Users size={20} />, label: 'Times', path: '/game-master/teams' },
  { icon: <MessageSquare size={20} />, label: 'Mensagens', path: '/game-master/messages' },
  { icon: <Zap size={20} />, label: 'Brincadeira paralela', path: '/game-master/parallel' },
  { icon: <ListChecks size={20} />, label: 'Checkpoints dos jogos', path: '/game-master/games' },
];

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
