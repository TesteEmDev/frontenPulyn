// Máscara e validação de CNPJ (mesma regra do backend: utils/cnpj.js)

export const onlyDigits = (value: string) => value.replace(/\D/g, '');

// Formata enquanto digita: 00.000.000/0000-00
export function maskCnpj(value: string): string {
  const d = onlyDigits(value).slice(0, 14);
  let out = d.slice(0, 2);
  if (d.length > 2) out += `.${d.slice(2, 5)}`;
  if (d.length > 5) out += `.${d.slice(5, 8)}`;
  if (d.length > 8) out += `/${d.slice(8, 12)}`;
  if (d.length > 12) out += `-${d.slice(12, 14)}`;
  return out;
}

function checkDigit(digits: string, length: number): number {
  let sum = 0;
  let weight = length - 7;
  for (let i = length; i >= 1; i -= 1) {
    sum += Number(digits[length - i]) * weight;
    weight -= 1;
    if (weight < 2) weight = 9;
  }
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
}

export function isValidCnpj(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) return false;
  return checkDigit(digits, 12) === Number(digits[12]) && checkDigit(digits, 13) === Number(digits[13]);
}
