// Número do checkpoint, o que o buffet vê e digita. A chave interna (checkpointId, ex.: "cp-4") só serve para o
// sistema ligar jogos, leituras e histórico ao checkpoint e não deve aparecer nas telas.
// A API manda o número em numCheck e, nas rotas mais antigas, em codigo (mesmo valor); sem nenhum dos dois (checkpoint
// antigo sem número), cai na própria chave, que nesses casos é o número que o recreacionista digitou.
interface ComNumero {
  numCheck?: string | null;
  codigo?: string | null;
  checkpointId?: string | null;
  id?: string | number | null;
}

export function numeroDoCheckpoint(checkpoint: ComNumero | null | undefined): string {
  if (!checkpoint) return '';
  return String(checkpoint.numCheck ?? checkpoint.codigo ?? checkpoint.checkpointId ?? checkpoint.id ?? '');
}
