// Som dos monstros. Um módulo só para a tela inteira: com várias equipes, golpes ao mesmo tempo não viram barulho.
// O navegador só toca áudio depois de um clique na página, então o telão tem o botão "Ativar som" (BotaoSomDosMonstros).
import { useSyncExternalStore } from 'react';
import { urlDoSom, type TipoDeMonstro } from './catalogo';

const CHAVE = 'pulyn.som-monstros';
const MAXIMO_AO_MESMO_TEMPO = 3;
const INTERVALO_ENTRE_GOLPES_MS = 150;

const lerPreferencia = () => {
  try { return localStorage.getItem(CHAVE) !== 'off'; } catch { return true; }
};

let desejado = lerPreferencia(); // a pessoa quer som (lembrado entre recargas)
let liberado = false; // já houve um clique nesta página: o navegador deixa tocar
const ouvintes = new Set<() => void>();
const avisar = () => ouvintes.forEach((ouvinte) => ouvinte());
const tocando: HTMLAudioElement[] = [];
let ultimoGolpe = 0;

export const somLigado = () => desejado && liberado;

export function ligarSom() {
  desejado = true;
  liberado = true;
  try { localStorage.setItem(CHAVE, 'on'); } catch { /* sem storage: vale só até recarregar */ }
  avisar();
}

export function desligarSom() {
  desejado = false;
  try { localStorage.setItem(CHAVE, 'off'); } catch { /* idem */ }
  tocando.splice(0).forEach((audio) => audio.pause());
  avisar();
}

// Qualquer clique já libera o áudio (se a pessoa deixou o som ligado antes, volta a tocar sem precisar do botão)
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', () => { if (!liberado) { liberado = true; avisar(); } }, { once: true });
}

export function tocarSom(tipo: TipoDeMonstro, qual: 'hit' | 'crit' | 'faint', volume = 0.8) {
  if (!somLigado()) return;
  if (qual !== 'faint') {
    const agora = performance.now();
    if (agora - ultimoGolpe < INTERVALO_ENTRE_GOLPES_MS) return;
    ultimoGolpe = agora;
  }
  // O desmaio tem prioridade: se está cheio, corta o som mais antigo
  while (tocando.length >= MAXIMO_AO_MESMO_TEMPO) tocando.shift()?.pause();
  const audio = new Audio(urlDoSom(tipo, qual));
  audio.volume = volume;
  tocando.push(audio);
  audio.onended = () => {
    const posicao = tocando.indexOf(audio);
    if (posicao >= 0) tocando.splice(posicao, 1);
  };
  audio.play().catch(() => { /* o navegador ainda bloqueia o som */ });
}

const assinar = (ouvinte: () => void) => { ouvintes.add(ouvinte); return () => { ouvintes.delete(ouvinte); }; };

// 'ativo' = tocando; 'bloqueado' = a pessoa quer som mas o navegador ainda não deixou (falta o clique); 'mudo'
export function useEstadoDoSom(): 'ativo' | 'bloqueado' | 'mudo' {
  return useSyncExternalStore(assinar, () => (!desejado ? 'mudo' : liberado ? 'ativo' : 'bloqueado'));
}
