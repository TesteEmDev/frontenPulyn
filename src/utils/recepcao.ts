// Leitores de recepção: o R1 é do balcão (check-in e participantes); R2, R3... são das telas de autoatendimento
// (/reception/kiosk/2 ouve o R2, /reception/kiosk/3 ouve o R3...).
export const LEITOR_DO_BALCAO = 'R1';

const numCheckDe = (leitura: { numCheck?: string | null } | null | undefined) => String(leitura?.numCheck || '').trim().toUpperCase();

export const ehLeituraDoBalcao = (leitura: { numCheck?: string | null } | null | undefined) => numCheckDe(leitura) === LEITOR_DO_BALCAO;

// Qualquer leitor de recepção que não seja o do balcão
export const ehLeituraDeAutoatendimento = (leitura: { numCheck?: string | null } | null | undefined) => {
  const numCheck = numCheckDe(leitura);
  return /^R\d{1,3}$/.test(numCheck) && numCheck !== LEITOR_DO_BALCAO;
};
