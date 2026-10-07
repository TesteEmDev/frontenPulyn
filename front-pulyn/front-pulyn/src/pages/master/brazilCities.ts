// Busca da posição de uma cidade no mapa do Brasil (coordenadas do SVG de brazilMapData.ts).
// Os dados ficam em brazilCityData.ts, carregado sob demanda; aqui só a lógica de encontrar a cidade.

export type CityData = Record<string, string>;

export const normalizeCityName = (value: string) =>
  value.normalize('NFD').replace(/\p{M}/gu, '').trim().toLowerCase().replace(/\s+/g, ' ');

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

const hyphensToSpaces = (value: string) => value.replace(/-/g, ' ');

// O cadastro guarda a cidade como o usuário digitou: aceita maiúscula/acento diferentes,
// sufixo de estado ("Taboão da Serra - SP"), hífen ou espaço ("Embu Guaçu") e nome incompleto.
// Nome incompleto casa quando só uma cidade do estado começa com o que foi digitado, dando
// preferência a palavras inteiras: "Embu" vira "Embu das Artes" (e não é barrado por "Embu-Guaçu").
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

  const typedSpaced = hyphensToSpaces(typed);
  const exact = list.find((c) => c.name === typed || hyphensToSpaces(c.name) === typedSpaced);
  if (exact) return { x: exact.x, y: exact.y };

  if (typed.length >= 4) {
    // 1º: o digitado é o começo do nome em palavras inteiras ("embu" -> "embu das artes")
    const byWord = list.filter((c) => c.name.startsWith(`${typed} `));
    if (byWord.length === 1) return { x: byWord[0].x, y: byWord[0].y };
    // 2º: qualquer começo de nome, se for único ("taboa" -> "taboão da serra")
    if (byWord.length === 0) {
      const byPrefix = list.filter((c) => c.name.startsWith(typed));
      if (byPrefix.length === 1) return { x: byPrefix[0].x, y: byPrefix[0].y };
    }
  }
  return null;
}
