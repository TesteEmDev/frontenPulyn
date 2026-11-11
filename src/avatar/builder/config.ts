// Configuração de um avatar montado: cada campo guarda um valor de uma lista fechada (ver parts.ts).
export interface AvatarConfig {
  face: string;
  skin: string;
  hairStyle: string;
  hair: string;
  eyes: string;
  eyeColor: string;
  look: 'flat' | 'outline';
  shape: 'square' | 'circle' | 'pop';
  mouth: string;
  nose: string;
  cloth: string;
  clothColor: string;
  bg: string;
  acc: string;
  accColor: string;
  glasses: boolean;
  lashes: boolean;
  chibi: boolean;
  blush: boolean;
  freckles: boolean;
  earring: boolean;
}
