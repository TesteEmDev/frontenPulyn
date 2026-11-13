// Data de nascimento da criança (no cadastro, no lugar da idade). Mesma regra do back: utils/nascimento.js
export const IDADE_MAXIMA = 18;

// Digitando só números: 15062018 -> 15/06/2018 (aceita até 8 dígitos)
export function mascaraData(digitos: string): string {
  const d = digitos.replace(/\D/g, '').slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

// 8 dígitos DDMMAAAA -> 'AAAA-MM-DD'; null se faltam dígitos ou o dia não existe
export function dataDeDigitos(digitos: string): string | null {
  const d = digitos.replace(/\D/g, '');
  if (d.length !== 8) return null;
  const dia = Number(d.slice(0, 2));
  const mes = Number(d.slice(2, 4));
  const ano = Number(d.slice(4, 8));
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  if (data.getUTCFullYear() !== ano || data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== dia) return null;
  return `${String(ano).padStart(4, '0')}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

// Idade em anos completos de 'AAAA-MM-DD' em `hoje` (null se a data é inválida)
export function idadeDeNascimento(iso: string, hoje: Date = new Date()): number | null {
  const casou = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!casou) return null;
  const [ano, mes, dia] = [Number(casou[1]), Number(casou[2]), Number(casou[3])];
  let idade = hoje.getFullYear() - ano;
  if (hoje.getMonth() + 1 < mes || (hoje.getMonth() + 1 === mes && hoje.getDate() < dia)) idade -= 1;
  return idade;
}

// Mensagem de erro de uma data 'AAAA-MM-DD' (ou '' quando está boa): futuro ou idade acima de IDADE_MAXIMA.
export function erroNascimento(iso: string | null, hoje: Date = new Date()): string {
  if (!iso) return 'Informe uma data de nascimento válida.';
  const idade = idadeDeNascimento(iso, hoje);
  if (idade === null) return 'Informe uma data de nascimento válida.';
  const dois = (n: number) => String(n).padStart(2, '0');
  const hojeIso = `${hoje.getFullYear()}-${dois(hoje.getMonth() + 1)}-${dois(hoje.getDate())}`;
  if (iso > hojeIso) return 'A data de nascimento não pode ser no futuro.';
  if (idade > IDADE_MAXIMA) return `A data de nascimento indica mais de ${IDADE_MAXIMA} anos.`;
  return '';
}

// Igual a erroNascimento, mas sem o limite de idade (check-in da recepção e autoatendimento aceitam qualquer idade):
// só recusa data inválida ou no futuro.
export function erroNascimentoSemLimite(iso: string | null, hoje: Date = new Date()): string {
  if (!iso) return 'Informe uma data de nascimento válida.';
  if (idadeDeNascimento(iso, hoje) === null) return 'Informe uma data de nascimento válida.';
  return iso > hojeIso(hoje) ? 'A data de nascimento não pode ser no futuro.' : '';
}

// Hoje como 'AAAA-MM-DD' (para o atributo max de <input type="date">)
export function hojeIso(hoje: Date = new Date()): string {
  const dois = (n: number) => String(n).padStart(2, '0');
  return `${hoje.getFullYear()}-${dois(hoje.getMonth() + 1)}-${dois(hoje.getDate())}`;
}
