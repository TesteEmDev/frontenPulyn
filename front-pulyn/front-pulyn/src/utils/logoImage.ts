// Prepara a logo/foto da unidade para envio: lê o arquivo, reduz para no máximo 512 px
// e devolve um data URL leve. PNG/WEBP/GIF mantêm a transparência; JPG continua JPG;
// SVG é enviado como está (já é vetorial e leve).
const MAX_DIMENSION = 512;
const MAX_LENGTH = 1.2 * 1024 * 1024; // abaixo do limite do servidor (1,5 MB)
const MAX_SVG_LENGTH = 400 * 1024;
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'];

export const LOGO_ACCEPT = ACCEPTED_TYPES.join(',');

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem selecionada.'));
    reader.readAsDataURL(file);
  });

const loadImage = (source: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Não foi possível processar a imagem. Tente outro arquivo.'));
    image.src = source;
  });

export async function optimizeLogo(file: File): Promise<{ dataUrl: string; type: string }> {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new Error('Use uma imagem PNG, JPG, WEBP, GIF ou SVG.');
  }

  const source = await readAsDataUrl(file);
  if (file.type === 'image/svg+xml') {
    if (source.length > MAX_SVG_LENGTH) throw new Error('O SVG é muito grande. Use um arquivo de até 300 KB.');
    return { dataUrl: source, type: file.type };
  }

  const image = await loadImage(source);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Seu navegador não conseguiu preparar a imagem.');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  // JPG não tem transparência; os demais formatos preservam o fundo transparente.
  const attempts = file.type === 'image/jpeg'
    ? [['image/jpeg', 0.9], ['image/jpeg', 0.75]]
    : [['image/png', undefined], ['image/webp', 0.9], ['image/webp', 0.7]];

  for (const [type, quality] of attempts as Array<[string, number | undefined]>) {
    const dataUrl = canvas.toDataURL(type, quality);
    // O navegador cai para PNG quando não suporta o formato pedido; confere o que veio.
    if (dataUrl.startsWith(`data:${type}`) && dataUrl.length <= MAX_LENGTH) {
      return { dataUrl, type };
    }
  }
  throw new Error('A imagem ainda ficou muito grande. Use uma imagem menor.');
}
