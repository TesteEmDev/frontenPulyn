// Número do checkpoint, o que o buffet vê e digita (e só o admin do buffet define). O ID (checkpointId, gerado pelo
// banco, só números) serve para o sistema ligar jogos, leituras e histórico ao checkpoint e não deve aparecer nas telas.
// A API manda o número em numCheck e, nas rotas mais antigas, em codigo (mesmo valor); sem nenhum dos dois (checkpoint
// ainda sem número), cai no próprio ID.
interface ComNumero {
  numCheck?: string | null;
  codigo?: string | null;
  checkpointId?: string | null;
  id?: string | number | null;
}

// Nome do checkpoint para o rótulo do mapa: o texto fica menor e nomes longos são cortados com reticências
// (o nome inteiro continua na lista e no painel do checkpoint).
export const NOME_NO_MAPA_MAX = 14;

export function nomeNoMapa(nome: string | null | undefined, max = NOME_NO_MAPA_MAX): string {
  const limpo = String(nome ?? '').trim();
  return limpo.length > max ? `${limpo.slice(0, max - 1).trimEnd()}…` : limpo;
}

export function numeroDoCheckpoint(checkpoint: ComNumero | null | undefined): string {
  if (!checkpoint) return '';
  return String(checkpoint.numCheck ?? checkpoint.codigo ?? checkpoint.checkpointId ?? checkpoint.id ?? '');
}
