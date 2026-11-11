// Peças e cores do montador de avatares.
//
// ATENÇÃO: a POSIÇÃO de cada item nestas listas faz parte do código salvo no banco (ver code.ts).
// Nunca reordene nem apague itens: para criar uma peça nova, acrescente no FIM da lista.

export interface Option { readonly value: string; readonly label: string }

export const FACES: readonly Option[] = [
  { value: 'round', label: 'Redondo' },
  { value: 'oval', label: 'Oval' },
  { value: 'square', label: 'Quadrado' },
  { value: 'heart', label: 'Queixo fino' },
  { value: 'wide', label: 'Bochechudo' },
  { value: 'pear', label: 'Pêra' },
];

export const HAIR_STYLES: readonly Option[] = [
  { value: 'spiky', label: 'Espetado' },
  { value: 'short', label: 'Curto' },
  { value: 'curly', label: 'Cacheado' },
  { value: 'bob', label: 'Chanel' },
  { value: 'long', label: 'Longo' },
  { value: 'bun', label: 'Coque' },
  { value: 'twin', label: 'Maria-chiquinha' },
  { value: 'mohawk', label: 'Moicano' },
  { value: 'puffs', label: 'Puffs' },
  { value: 'afro', label: 'Afro' },
  { value: 'low', label: 'Chiquinha baixa' },
  { value: 'bunbow', label: 'Coque com laço' },
  { value: 'messy', label: 'Bagunçado' },
  { value: 'pony', label: 'Rabo de cavalo' },
  { value: 'braids', label: 'Trancinhas' },
  { value: 'side', label: 'Franja de lado' },
  { value: 'bald', label: 'Careca' },
  { value: 'wavy', label: 'Ondulado' },
  { value: 'tuft', label: 'Topetinho' },
  { value: 'ponytop', label: 'Rabo no alto' },
  { value: 'curlybob', label: 'Cacheado longo' },
  { value: 'pixie', label: 'Repicado' },
];

export const EYES: readonly Option[] = [
  { value: 'iris', label: 'Colorido' },
  { value: 'dots', label: 'Pontinhos' },
  { value: 'angry', label: 'Bravo' },
  { value: 'normal', label: 'Normal' },
  { value: 'happy', label: 'Feliz' },
  { value: 'sleepy', label: 'Sonolento' },
  { value: 'cute', label: 'Fofo' },
  { value: 'wink', label: 'Piscadinha' },
  { value: 'big', label: 'Olhão' },
];

export const MOUTHS: readonly Option[] = [
  { value: 'open', label: 'Aberta' },
  { value: 'tiny', label: 'Pequena' },
  { value: 'smile', label: 'Sorriso' },
  { value: 'grin', label: 'Sorrisão' },
  { value: 'tongue', label: 'Língua' },
  { value: 'flat', label: 'Reta' },
  { value: 'o', label: 'Surpresa' },
  { value: 'smirk', label: 'De lado' },
  { value: 'cat', label: 'Gatinho' },
  { value: 'sad', label: 'Tristinho' },
];

export const NOSES: readonly Option[] = [
  { value: 'none', label: 'Sem nariz' },
  { value: 'dot', label: 'Narizinho' },
  { value: 'button', label: 'Bolinha' },
];

export const CLOTHES: readonly Option[] = [
  { value: 'none', label: 'Sem roupa' },
  { value: 'tshirt', label: 'Camiseta' },
  { value: 'stripes', label: 'Listrada' },
  { value: 'hoodie', label: 'Moletom' },
  { value: 'suit', label: 'Terno' },
  { value: 'overall', label: 'Jardineira' },
  { value: 'star', label: 'Estrela' },
  { value: 'dress', label: 'Vestido' },
  { value: 'hero', label: 'Herói' },
  { value: 'polo', label: 'Polo' },
  { value: 'bowtie', label: 'Gravata-borboleta' },
  { value: 'astro', label: 'Astronauta' },
  { value: 'jacket', label: 'Jaqueta' },
  { value: 'turtle', label: 'Gola alta' },
  { value: 'tank', label: 'Regata' },
  { value: 'chef', label: 'Cozinheiro' },
  { value: 'pajama', label: 'Pijama' },
];

export const ACCESSORIES: readonly Option[] = [
  { value: 'none', label: 'Nenhum' },
  { value: 'bow', label: 'Laço' },
  { value: 'party', label: 'Chapéu de festa' },
  { value: 'crown', label: 'Coroa' },
  { value: 'cat', label: 'Orelhas de gato' },
  { value: 'cap', label: 'Boné' },
  { value: 'mask', label: 'Máscara' },
  { value: 'phones', label: 'Fones' },
  { value: 'headband', label: 'Tiara' },
  { value: 'bucket', label: 'Chapéu de balde' },
  { value: 'pirate', label: 'Pirata' },
  { value: 'helmet', label: 'Astronauta' },
  { value: 'nose', label: 'Nariz de palhaço' },
  { value: 'beret', label: 'Boina' },
  { value: 'flowers', label: 'Flores' },
  { value: 'chefhat', label: 'Chapéu de chef' },
  { value: 'wizard', label: 'Chapéu de mago' },
];

export const SKIN_COLORS: readonly string[] = ['#fbe0c8', '#f1c9a5', '#e8ac80', '#c98a5b', '#a0653b', '#6f4326'];
export const HAIR_COLORS: readonly string[] = ['#3aaa35', '#111111', '#2b1b12', '#7a4a21', '#e0b341', '#d9d9d9', '#e04a8a', '#3b82f6', '#e8541c', '#7c3aed'];
export const EYE_COLORS: readonly string[] = ['#6b3e26', '#2e8b57', '#3b82f6', '#7a7a7a', '#8e44ad', '#111111'];
export const CLOTH_COLORS: readonly string[] = ['#e63946', '#2f6fed', '#2a9d8f', '#f4b400', '#8e44ad', '#ffffff', '#222222', '#ff7f50'];
export const BG_COLORS: readonly string[] = ['#ffb300', '#6ec6ff', '#ff8fa3', '#8be28b', '#c3a6ff', '#ffe082', '#cfd8dc', '#ff7043', '#ffffff', '#1e9be8', '#2ca02c'];

export type FlagKey = 'glasses' | 'lashes' | 'blush' | 'freckles' | 'earring' | 'chibi';
// A ordem também faz parte do código salvo (cada flag é um bit).
export const FLAGS: readonly { readonly key: FlagKey; readonly label: string }[] = [
  { key: 'glasses', label: 'Óculos' },
  { key: 'lashes', label: 'Cílios' },
  { key: 'blush', label: 'Bochechas' },
  { key: 'freckles', label: 'Sardas' },
  { key: 'earring', label: 'Brinco' },
  { key: 'chibi', label: 'Cabeça grande' },
];
