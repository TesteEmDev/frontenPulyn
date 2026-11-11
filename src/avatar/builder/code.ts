// Código curto do avatar montado: é o valor salvo em criancas.avatar (coluna varchar de 64).
//
//   pulyn1-<13 letras/dígitos: posição de cada peça e cor><2: flags>   → 22 caracteres
//
// O desenho é refeito a partir do código, então nada de imagem no banco e dá para editar depois.
// Decodificar valida cada posição: um código adulterado ou desconhecido vira null (o app usa o avatar padrão).
import type { AvatarConfig } from './config';
import {
  ACCESSORIES, BG_COLORS, CLOTHES, CLOTH_COLORS, EYES, EYE_COLORS, FACES, FLAGS, HAIR_COLORS, HAIR_STYLES,
  MOUTHS, NOSES, SKIN_COLORS,
} from './parts';
import { renderAvatarSvg } from './render';

export const AVATAR_CODE_PREFIX = 'pulyn1-';
const LIST_LENGTH = 13;
const FLAGS_LENGTH = 2;
export const AVATAR_CODE_LENGTH = AVATAR_CODE_PREFIX.length + LIST_LENGTH + FLAGS_LENGTH;

type ListField = Exclude<keyof AvatarConfig, 'look' | 'shape' | 'glasses' | 'lashes' | 'chibi' | 'blush' | 'freckles' | 'earring'>;
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

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  face: 'round', skin: '#e8ac80', hairStyle: 'short', hair: '#7a4a21', eyes: 'iris', eyeColor: '#6b3e26',
  look: 'flat', shape: 'square', mouth: 'smile', nose: 'dot', cloth: 'tshirt', clothColor: '#2f6fed',
  bg: '#6ec6ff', acc: 'none', accColor: '#e63946', glasses: false, lashes: false, chibi: true,
  blush: true, freckles: false, earring: false,
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
  const mask = FLAGS.reduce((bits, flag, bit) => (config[flag.key] ? bits | (1 << bit) : bits), 0);
  return code + mask.toString(36).padStart(FLAGS_LENGTH, '0');
}

export function decodeAvatar(code: unknown): AvatarConfig | null {
  if (!isAvatarCode(code) || code.length !== AVATAR_CODE_LENGTH) return null;
  const body = code.slice(AVATAR_CODE_PREFIX.length);
  const config: AvatarConfig = { ...DEFAULT_AVATAR_CONFIG };
  for (let i = 0; i < FIELDS.length; i += 1) {
    const [key, list] = FIELDS[i];
    const index = parseInt(body[i], 36);
    if (!Number.isInteger(index) || index >= list.length) return null;
    config[key] = list[index];
  }
  const mask = parseInt(body.slice(LIST_LENGTH), 36);
  if (!Number.isInteger(mask) || mask >= 1 << FLAGS.length) return null;
  FLAGS.forEach((flag, bit) => { config[flag.key] = Boolean(mask & (1 << bit)); });
  return config;
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
    glasses: Math.random() < 0.15,
    lashes: Math.random() < 0.3,
    blush: Math.random() < 0.7,
    freckles: Math.random() < 0.2,
    earring: Math.random() < 0.2,
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
