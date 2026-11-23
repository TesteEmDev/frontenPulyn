// Voz do Lumi com a síntese de voz do próprio navegador (Web Speech API): lê qualquer texto, sem internet quando o
// Windows tem uma voz em português instalada (ex.: "Microsoft Maria"). Tom mais agudo para soar como personagem.
// O Chrome só deixa falar depois de alguém interagir com a página (um clique); antes disso a fala é ignorada.
const TOM = 1.5;
const VELOCIDADE = 1.05;

const temVoz = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

// Voz em português do Brasil, preferindo as femininas/infantis que combinam com o Lumi
function escolherVoz(): SpeechSynthesisVoice | null {
  if (!temVoz()) return null;
  const vozes = window.speechSynthesis.getVoices();
  const pt = vozes.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith('pt'));
  const br = pt.filter((v) => v.lang.toLowerCase().replace('_', '-') === 'pt-br');
  const candidatas = br.length ? br : pt;
  return candidatas.find((v) => /francisca|thalita|maria|luciana|vit[oó]ria/i.test(v.name))
    ?? candidatas.find((v) => /google/i.test(v.name))
    ?? candidatas[0]
    ?? null;
}

// A lista de vozes chega depois de a página abrir: pede logo, para já estar pronta na primeira fala
if (temVoz()) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener?.('voiceschanged', () => window.speechSynthesis.getVoices());
}

// Fala o texto (entra na fila se o Lumi ainda estiver falando a frase anterior)
export function falar(texto: string) {
  if (!temVoz() || !texto.trim()) return;
  const fala = new SpeechSynthesisUtterance(texto);
  fala.lang = 'pt-BR';
  const voz = escolherVoz();
  if (voz) fala.voice = voz;
  fala.pitch = TOM;
  fala.rate = VELOCIDADE;
  window.speechSynthesis.speak(fala);
}

// Para de falar e esvazia a fila (ao trocar de jogo ou sair da tela)
export function calar() {
  if (temVoz()) window.speechSynthesis.cancel();
}
