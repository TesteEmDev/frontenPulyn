// Quem trouxe a criança: os de família e também outras pessoas de confiança
export const PARENTESCOS = [
  'Pai', 'Mãe', 'Padrasto', 'Madrasta', 'Avô', 'Avó', 'Tio', 'Tia', 'Irmão', 'Irmã', 'Primo(a)',
  'Padrinho', 'Madrinha', 'Responsável legal', 'Professor(a)', 'Vizinho(a)', 'Amigo(a) da família',
  'Babá / cuidador(a)', 'Outro',
];
export const PARENTESCO_OPCOES = [{ value: '', label: 'Selecione…' }, ...PARENTESCOS.map(valor => ({ value: valor, label: valor }))];
