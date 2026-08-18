import avatar01 from './adventurer-1787066874693.svg';
import avatar02 from './adventurer-1787066893641.svg';
import avatar03 from './adventurer-1787066897643.svg';
import avatar04 from './adventurer-1787066901609.svg';
import avatar05 from './adventurer-1787066904754.svg';
import avatar06 from './adventurer-1787066907832.svg';
import avatar07 from './adventurer-1787066911577.svg';
import avatar08 from './adventurer-1787066914937.svg';
import avatar09 from './adventurer-1787066918306.svg';
import avatar10 from './adventurer-1787066922497.svg';
import avatar11 from './adventurer-1787066926169.svg';
import avatar12 from './adventurer-1787066929218.svg';
import avatar13 from './adventurer-1787066934106.svg';
import avatar14 from './adventurer-1787066937610.svg';
import avatar15 from './adventurer-1787066942696.svg';
import avatar16 from './adventurer-1787066946714.svg';
import avatar17 from './adventurer-1787066949874.svg';
import avatar18 from './adventurer-1787066955258.svg';
import avatar19 from './adventurer-1787066958801.svg';
import avatar20 from './adventurer-1787066964514.svg';

export interface AdventurerAvatar {
  readonly id: string;
  readonly label: string;
  readonly src: string;
}

export const DEFAULT_AVATAR_ID = 'adventurer-1787066874693';

export const ADVENTURER_AVATARS: readonly AdventurerAvatar[] = [
  { id: 'adventurer-1787066874693', label: 'Avatar Adventurer 01', src: avatar01 },
  { id: 'adventurer-1787066893641', label: 'Avatar Adventurer 02', src: avatar02 },
  { id: 'adventurer-1787066897643', label: 'Avatar Adventurer 03', src: avatar03 },
  { id: 'adventurer-1787066901609', label: 'Avatar Adventurer 04', src: avatar04 },
  { id: 'adventurer-1787066904754', label: 'Avatar Adventurer 05', src: avatar05 },
  { id: 'adventurer-1787066907832', label: 'Avatar Adventurer 06', src: avatar06 },
  { id: 'adventurer-1787066911577', label: 'Avatar Adventurer 07', src: avatar07 },
  { id: 'adventurer-1787066914937', label: 'Avatar Adventurer 08', src: avatar08 },
  { id: 'adventurer-1787066918306', label: 'Avatar Adventurer 09', src: avatar09 },
  { id: 'adventurer-1787066922497', label: 'Avatar Adventurer 10', src: avatar10 },
  { id: 'adventurer-1787066926169', label: 'Avatar Adventurer 11', src: avatar11 },
  { id: 'adventurer-1787066929218', label: 'Avatar Adventurer 12', src: avatar12 },
  { id: 'adventurer-1787066934106', label: 'Avatar Adventurer 13', src: avatar13 },
  { id: 'adventurer-1787066937610', label: 'Avatar Adventurer 14', src: avatar14 },
  { id: 'adventurer-1787066942696', label: 'Avatar Adventurer 15', src: avatar15 },
  { id: 'adventurer-1787066946714', label: 'Avatar Adventurer 16', src: avatar16 },
  { id: 'adventurer-1787066949874', label: 'Avatar Adventurer 17', src: avatar17 },
  { id: 'adventurer-1787066955258', label: 'Avatar Adventurer 18', src: avatar18 },
  { id: 'adventurer-1787066958801', label: 'Avatar Adventurer 19', src: avatar19 },
  { id: 'adventurer-1787066964514', label: 'Avatar Adventurer 20', src: avatar20 },
] as const;

const avatarById = new Map(ADVENTURER_AVATARS.map(avatar => [avatar.id, avatar]));

export function findAdventurerAvatar(value: unknown): AdventurerAvatar | undefined {
  return typeof value === 'string' ? avatarById.get(value) : undefined;
}

export function isAdventurerAvatarId(value: unknown): value is string {
  return Boolean(findAdventurerAvatar(value));
}

export function getAvatarLabel(value: unknown): string {
  return findAdventurerAvatar(value)?.label || 'Avatar da criança';
}

export function getDefaultAvatar(): AdventurerAvatar {
  return avatarById.get(DEFAULT_AVATAR_ID)!;
}
