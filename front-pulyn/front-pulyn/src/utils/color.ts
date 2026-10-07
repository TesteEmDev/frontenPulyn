// Aceita "#abc", "abc", "#aabbcc" e "aabbcc"; devolve "#AABBCC" ou null.
export function normalizeHex(input: string): string | null {
  const raw = input.trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(raw)) {
    return `#${raw.split('').map(c => c + c).join('')}`.toUpperCase();
  }
  if (/^[0-9a-f]{6}$/i.test(raw)) return `#${raw}`.toUpperCase();
  return null;
}

// Cor do texto legível sobre a cor escolhida (escuro em cores claras, claro nas escuras).
export function readableTextOn(hex: string): string {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
  return luminance > 0.4 ? '#0B1220' : '#FFFFFF';
}

