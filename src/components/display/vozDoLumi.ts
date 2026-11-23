// Voz do Lumi: falas gravadas com a voz "Pulyn-Lumi" (ElevenLabs) em public/mascote/voz, uma por arquivo mp3.
// public/mascote/voz/indice.json liga cada texto ao arquivo e à duração (ms), que a linha do tempo usa para esperar
// o Lumi terminar de falar. Texto sem áudio no índice fica em silêncio. Os áudios tocam em fila, um depois do outro.
// O Chrome só deixa tocar som depois de alguém interagir com a página (um clique).
type Indice = Record<string, { arquivo: string; ms: number }>;

const PASTA = '/mascote/voz/';
let indice: Indice | null = null;
let carregando: Promise<Indice> | null = null;

// Carrega o índice das falas (uma vez só)
export function carregarVoz(): Promise<Indice> {
  if (indice) return Promise.resolve(indice);
  if (!carregando) {
    carregando = fetch(`${PASTA}indice.json`, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}))
      .then((dados: Indice) => {
        indice = dados;
        // Já deixa os áudios baixando, para não haver atraso na hora de falar
        Object.values(dados).forEach(({ arquivo }) => { const a = new Audio(PASTA + arquivo); a.preload = 'auto'; });
        return dados;
      });
  }
  return carregando;
}

// Duração (ms) da fala gravada para o texto, ou undefined se não houver
export const duracaoDaFala = (texto: string): number | undefined => indice?.[texto]?.ms;

let fila: string[] = [];
let tocando: HTMLAudioElement | null = null;

function tocarProxima() {
  const texto = fila.shift();
  if (texto === undefined) { tocando = null; return; }
  const item = indice?.[texto];
  if (!item) { tocarProxima(); return; }
  const audio = new Audio(PASTA + item.arquivo);
  tocando = audio;
  audio.onended = () => { if (tocando === audio) tocarProxima(); };
  audio.onerror = () => { if (tocando === audio) tocarProxima(); };
  audio.play().catch(() => { if (tocando === audio) tocarProxima(); });
}

// Fala o texto (entra na fila se o Lumi ainda estiver falando a frase anterior)
export function falar(texto: string) {
  if (!indice?.[texto]) return;
  fila.push(texto);
  if (!tocando) tocarProxima();
}

// Para de falar e esvazia a fila (ao trocar de jogo ou sair da tela)
export function calar() {
  fila = [];
  if (tocando) {
    const audio = tocando;
    tocando = null;
    audio.pause();
  }
}
