// Código curto do avatar montado: é o valor salvo em criancas.avatar (coluna varchar de 64).
//
//   pulyn1-<13 letras/dígitos: posição de cada peça e cor><2: detalhes liga/desliga><4: acessórios>   → 26 caracteres
//   Com cor de fundo personalizada (fora da paleta) leva mais 6 dígitos hexadecimais no fim (a cor)   → 32 caracteres
//   Os códigos antigos, sem os 4 caracteres de acessórios (22 e 28 caracteres), continuam valendo.
//
// O desenho é refeito a partir do código, então nada de imagem no banco e dá para editar depois.
// Decodificar valida cada posição: um código adulterado ou desconhecido vira null (o app usa o avatar padrão).
import type { AvatarConfig } from './config';
import {
  ACCESSORIES, BG_COLORS, CLOTHES, CLOTH_COLORS, EARRINGS, EYES, EYE_COLORS, FACES, GLASSES, HAIR_COLORS, HAIR_STYLES,
  MOUTHS, NECKLACES, NOSES, SKIN_COLORS, type FlagKey,
} from './parts';
import { renderAvatarSvg } from './render';

export const AVATAR_CODE_PREFIX = 'pulyn1-';
const LIST_LENGTH = 13;
const FLAGS_LENGTH = 2;
const GEAR_LENGTH = 4;
const BASE_LENGTH = AVATAR_CODE_PREFIX.length + LIST_LENGTH + FLAGS_LENGTH;      // 22 (formato antigo)
export const AVATAR_CODE_LENGTH = BASE_LENGTH + GEAR_LENGTH;                      // 26
const CUSTOM_BG_LENGTH = 6;

type ListField = 'face' | 'skin' | 'hairStyle' | 'hair' | 'eyes' | 'eyeColor' | 'mouth' | 'nose' | 'cloth' | 'clothColor' | 'acc' | 'accColor' | 'bg';
type GearField = 'glassesStyle' | 'neck' | 'earringStyle' | 'gearColor';
const values = (list: readonly { value: string }[]) => list.map(item => item.value);

// A ordem dos campos também faz parte do código: só acrescente no fim (e mude a versão do prefixo).
const FIELDS: ReadonlyArray<readonly [ListField, readonly string[]]> = [
  ['face', values(FACES)],
  ['skin', SKIN_COLORS],
  ['hairStyle', values(HAIR_STYLES)],
  ['hair', HAIR_COLORS],
  ['eyes', values(EYES)],
  ['eyeColor', EYE_COLORS],
  ['mouth', values(MOUTHS)],
  ['nose', values(NOSES)],
  ['cloth', values(CLOTHES)],
  ['clothColor', CLOTH_COLORS],
  ['acc', values(ACCESSORIES)],
  ['accColor', CLOTH_COLORS],
  ['bg', BG_COLORS],
];

// Acessórios (4 caracteres depois dos detalhes). Códigos antigos não os têm: valem os padrões abaixo.
const GEAR_FIELDS: ReadonlyArray<readonly [GearField, readonly string[]]> = [
  ['glassesStyle', values(GLASSES)],
  ['neck', values(NECKLACES)],
  ['earringStyle', values(EARRINGS)],
  ['gearColor', CLOTH_COLORS],
];

// Detalhes liga/desliga: cada um é um bit do número de 2 caracteres. A posição NÃO pode mudar (só acrescentar no fim).
// As posições 0 e 4 eram "óculos" e "brinco" antes dos acessórios ganharem lista própria: só os códigos antigos as usam.
const FLAG_BITS: ReadonlyArray<FlagKey | 'legacyGlasses' | 'legacyEarring'> = [
  'legacyGlasses', 'lashes', 'blush', 'freckles', 'legacyEarring', 'chibi', 'mole', 'bandaid',
];

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  face: 'round', skin: '#e8ac80', hairStyle: 'short', hair: '#7a4a21', eyes: 'iris', eyeColor: '#6b3e26',
  look: 'flat', shape: 'square', mouth: 'smile', nose: 'dot', cloth: 'tshirt', clothColor: '#2f6fed',
  bg: '#6ec6ff', acc: 'none', accColor: '#e63946', glassesStyle: 'none', neck: 'none', earringStyle: 'none',
  gearColor: '#222222', lashes: false, chibi: true, blush: true, freckles: false, mole: false, bandaid: false,
};

export function isAvatarCode(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(AVATAR_CODE_PREFIX);
}

export function encodeAvatar(config: AvatarConfig): string {
  let code = AVATAR_CODE_PREFIX;
  for (const [key, list] of FIELDS) {
    const index = list.indexOf(config[key] as string);
    code += (index < 0 ? 0 : index).toString(36);
  }
  const mask = FLAG_BITS.reduce<number>((bits, flag, bit) => {
    const ligado = flag === 'legacyGlasses' ? config.glassesStyle !== 'none'
      : flag === 'legacyEarring' ? config.earringStyle !== 'none'
        : config[flag];
    return ligado ? bits | (1 << bit) : bits;
  }, 0);
  code += mask.toString(36).padStart(FLAGS_LENGTH, '0');
  for (const [key, list] of GEAR_FIELDS) {
    const index = list.indexOf(config[key] as string);
    code += (index < 0 ? 0 : index).toString(36);
  }
  // Fundo fora da paleta (cor personalizada): a cor vai no fim do código
  if (!BG_COLORS.includes(config.bg) && /^#[0-9a-f]{6}$/i.test(config.bg)) code += config.bg.slice(1).toLowerCase();
  return code;
}

export function decodeAvatar(code: unknown): AvatarConfig | null {
  if (!isAvatarCode(code)) return null;
  // Tamanhos válidos: antigo (22), antigo com cor própria (28), novo (26) e novo com cor própria (32)
  const comAcessorios = code.length === AVATAR_CODE_LENGTH || code.length === AVATAR_CODE_LENGTH + CUSTOM_BG_LENGTH;
  const antigo = code.length === BASE_LENGTH || code.length === BASE_LENGTH + CUSTOM_BG_LENGTH;
  if (!comAcessorios && !antigo) return null;
  const fimDoCorpo = comAcessorios ? AVATAR_CODE_LENGTH : BASE_LENGTH;
  const corPropria = code.length > fimDoCorpo ? code.slice(fimDoCorpo) : null;
  if (corPropria !== null && !/^[0-9a-f]{6}$/.test(corPropria)) return null;
  const body = code.slice(AVATAR_CODE_PREFIX.length, fimDoCorpo);
  const config: AvatarConfig = { ...DEFAULT_AVATAR_CONFIG };
  for (let i = 0; i < FIELDS.length; i += 1) {
    const [key, list] = FIELDS[i];
    const index = parseInt(body[i], 36);
    if (!Number.isInteger(index) || index >= list.length) return null;
    config[key] = list[index];
  }
  const mask = parseInt(body.slice(LIST_LENGTH, LIST_LENGTH + FLAGS_LENGTH), 36);
  if (!Number.isInteger(mask) || mask >= 1 << FLAG_BITS.length) return null;
  config.glassesStyle = 'none';
  config.earringStyle = 'none';
  FLAG_BITS.forEach((flag, bit) => {
    const ligado = Boolean(mask & (1 << bit));
    if (flag === 'legacyGlasses') { if (antigo && ligado) config.glassesStyle = 'round'; }
    else if (flag === 'legacyEarring') { if (antigo && ligado) config.earringStyle = 'ball'; }
    else config[flag] = ligado;
  });
  if (comAcessorios) {
    const extras = body.slice(LIST_LENGTH + FLAGS_LENGTH);
    for (let i = 0; i < GEAR_FIELDS.length; i += 1) {
      const [key, list] = GEAR_FIELDS[i];
      const index = parseInt(extras[i], 36);
      if (!Number.isInteger(index) || index >= list.length) return null;
      config[key] = list[index];
    }
  }
  if (corPropria) config.bg = `#${corPropria}`;
  return config;
}

// Cor de fundo do avatar montado (#RRGGBB em maiúsculas); null se não for um código válido.
// É também a cor do participante nos mapas e rankings.
export function corDoAvatar(code: unknown): string | null {
  const config = decodeAvatar(code);
  return config ? config.bg.toUpperCase() : null;
}

const pick = <T,>(list: readonly T[]): T => list[Math.floor(Math.random() * list.length)];

export function randomAvatarConfig(): AvatarConfig {
  return {
    ...DEFAULT_AVATAR_CONFIG,
    face: pick(values(FACES)),
    skin: pick(SKIN_COLORS),
    hairStyle: pick(values(HAIR_STYLES)),
    hair: pick(HAIR_COLORS),
    eyes: pick(values(EYES).filter(value => value !== 'angry')),
    eyeColor: pick(EYE_COLORS),
    mouth: pick(values(MOUTHS).filter(value => value !== 'flat')),
    nose: pick(values(NOSES)),
    cloth: pick(values(CLOTHES).filter(value => value !== 'none')),
    clothColor: pick(CLOTH_COLORS),
    acc: Math.random() < 0.4 ? pick(values(ACCESSORIES)) : 'none',
    accColor: pick(CLOTH_COLORS),
    bg: pick(BG_COLORS),
    glassesStyle: Math.random() < 0.2 ? pick(values(GLASSES).filter(value => value !== 'none')) : 'none',
    neck: Math.random() < 0.2 ? pick(values(NECKLACES).filter(value => value !== 'none')) : 'none',
    earringStyle: Math.random() < 0.2 ? pick(values(EARRINGS).filter(value => value !== 'none')) : 'none',
    gearColor: pick(CLOTH_COLORS),
    lashes: Math.random() < 0.3,
    blush: Math.random() < 0.7,
    freckles: Math.random() < 0.2,
    mole: Math.random() < 0.08,
    bandaid: Math.random() < 0.05,
  };
}

// Código de um personagem sorteado: é o avatar inicial de quem ainda não montou o seu.
export const newAvatarCode = (): string => encodeAvatar(randomAvatarConfig());

// Miniatura/imagem pronta (data URL) com cache: o mesmo código nunca é desenhado duas vezes.
const urlCache = new Map<string, string>();
const CACHE_LIMIT = 600;

export function avatarImageUrl(config: AvatarConfig): string {
  const key = encodeAvatar(config);
  const cached = urlCache.get(key);
  if (cached) return cached;
  const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderAvatarSvg(config))}`;
  if (urlCache.size >= CACHE_LIMIT) urlCache.delete(urlCache.keys().next().value as string);
  urlCache.set(key, url);
  return url;
}

// Imagem de um valor salvo no banco (null se não for um código válido).
export function avatarCodeImageUrl(code: unknown): string | null {
  const config = decodeAvatar(code);
  return config ? avatarImageUrl(config) : null;
}
