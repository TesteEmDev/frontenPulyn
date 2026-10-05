// Máscara e validação de telefone brasileiro (fixo com 10 dígitos, celular com 11).
// Mesma regra do backend: utils/settingsRules.js

export const PHONE_MAX_DIGITS = 11;

const onlyDigits = (value: string) => value.replace(/\D/g, '');

// Formata enquanto digita: (11) 91234-5678 ou (11) 1234-5678
export function maskPhone(value: string): string {
  const d = onlyDigits(value).slice(0, PHONE_MAX_DIGITS);
  if (d.length === 0) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  // 10 dígitos: 4+4; 11 dígitos: 5+4
  const split = d.length === 11 ? 7 : 6;
  return `(${d.slice(0, 2)}) ${d.slice(2, split)}-${d.slice(split)}`;
}

export function countPhoneDigits(value: string): number {
  return onlyDigits(value).length;
}

// Retorna a mensagem de erro, ou '' quando está válido. Vazio é permitido (campo opcional).
export function validatePhone(value: string): string {
  const d = onlyDigits(value);
  if (d.length === 0) return '';
  if (d.length < 10) return `Faltam ${10 - d.length} dígito${10 - d.length !== 1 ? 's' : ''}. Informe DDD + número, com 10 ou 11 dígitos.`;
  if (/^(\d)\1+$/.test(d)) return 'Número inválido.';
  if (d[0] === '0' || d[1] === '0') return 'DDD inválido.';
  if (d.length === 11 && d[2] !== '9') return 'Celular com 11 dígitos precisa começar com 9 depois do DDD.';
  return '';
}
