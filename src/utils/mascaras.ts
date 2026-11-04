// Máscaras de digitação dos cadastros de checkpoint: só deixam digitar o que o campo aceita.
// As mesmas regras são conferidas no servidor (BackEnd/utils/checkpointTransferencia.js).

const soHex = (valor: string) => valor.replace(/[^0-9a-fA-F]/g, '').toUpperCase();

/** MAC: só 0-9 e A-F, no máximo 12 dígitos, com ':' a cada 2 (AA:BB:CC:DD:EE:FF). Aceita colar com ':' ou '-'. */
export function mascaraMac(valor: string): string {
  const digitos = soHex(valor).slice(0, 12);
  return (digitos.match(/.{1,2}/g) ?? []).join(':');
}

export const macCompleto = (valor: string): boolean => soHex(valor).length === 12;

/** EPC: só 0-9 e A-F, no máximo 6 dígitos. Digitando, valem os primeiros 6; ao colar o EPC inteiro, ficam os 6 últimos. */
export const EPC_DIGITOS = 6;
export const digitarEpc = (valor: string): string => soHex(valor).slice(0, EPC_DIGITOS);
export const mascaraEpc = (valor: string): string => soHex(valor).slice(-EPC_DIGITOS);
export const epcCompleto = (valor: string): boolean => soHex(valor).length === EPC_DIGITOS;

/** Número do checkpoint: maiúsculas, até 40 caracteres, sem espaços nem / \ ? # % (mesma regra do servidor). */
export const NUMERO_CHECKPOINT_MAX = 40;
export const mascaraNumeroCheckpoint = (valor: string): string =>
  valor.replace(/[\s/\\?#%]/g, '').toUpperCase().slice(0, NUMERO_CHECKPOINT_MAX);
