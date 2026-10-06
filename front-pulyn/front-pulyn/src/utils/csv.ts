// Exportação CSV que abre direto no Excel: separador ";" (padrão do Excel em português),
// BOM UTF-8 para os acentos e aspas nos campos que precisam.
const BOM = String.fromCharCode(0xfeff);

const escapeCell = (value: unknown): string => {
  const text = value === null || value === undefined ? '' : String(value);
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export function toCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map(line => line.map(escapeCell).join(';')).join('\r\n');
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
