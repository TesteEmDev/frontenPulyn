// Um jogo sem status gravado (cadastros antigos) vale como ativo: só "inactive" (ou outro valor) o desativa.
// O servidor faz o mesmo (COALESCE(status, 'active')), então todas as telas precisam usar esta regra.
export const isGameActive = (game: { status?: string | null } | null | undefined): boolean =>
  String(game?.status || 'active').toLowerCase() === 'active';
