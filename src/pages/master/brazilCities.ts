// Busca da posição de uma cidade no mapa do Brasil (coordenadas do SVG de brazilMapData.ts).
// Os dados ficam em brazilCityData.ts, carregado sob demanda; aqui só a lógica de encontrar a cidade.

export type CityData = Record<string, string>;

export const normalizeCityName = (value: string) =>
  value.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/\s+/g, ' ');

interface CityPoint {
  name: string;
  x: number;
  y: number;
}

const indexCache = new WeakMap<CityData, Map<string, CityPoint[]>>();

const cityIndex = (data: CityData, uf: string): CityPoint[] => {
  let byUf = indexCache.get(data);
  if (!byUf) {
    byUf = new Map();
    indexCache.set(data, byUf);
  }
  let list = byUf.get(uf);
  if (!list) {
    list = (data[uf] || '')
      .split(';')
      .filter(Boolean)
      .map((entry) => {
        const [name, x, y] = entry.split('|');
        return { name, x: Number(x), y: Number(y) };
      });
    byUf.set(uf, list);
  }
  return list;
};

// O cadastro guarda a cidade como o usuário digitou: aceita maiúscula/acento diferentes,
// sufixo de estado ("Taboão da Serra - SP") e nome incompleto, desde que só uma cidade
// do estado comece com o que foi digitado ("Taboão" -> "Taboão da Serra").
export function findCityPosition(
  data: CityData,
  uf: string,
  city: string | null | undefined,
): { x: number; y: number } | null {
  if (!city) return null;
  const list = cityIndex(data, uf.toUpperCase());
  if (!list.length) return null;

  const typed = normalizeCityName(city).replace(/\s*[-/,]\s*[a-z]{2}$/, '');
  if (!typed) return null;

  const exact = list.find((c) => c.name === typed);
  if (exact) return { x: exact.x, y: exact.y };

  if (typed.length >= 4) {
    const starting = list.filter((c) => c.name.startsWith(typed));
    if (starting.length === 1) return { x: starting[0].x, y: starting[0].y };
  }
  return null;
}
