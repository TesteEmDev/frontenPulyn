// Proteção de desenvolvimento: avisa no console quando a tela lê, de um dado vindo da API,
// uma propriedade que a resposta não trouxe (ex.: `evento.id` quando a API devolve `eventoId`).
// Serve para achar nomes de campo antigos que sobraram no frontend. Desligada por padrão.
//
// Para ligar, no console do navegador:   localStorage.API_GUARD = '1'   e recarregue a página.
// Para desligar:                          localStorage.removeItem('API_GUARD')
//
// Nunca roda em produção (só com `import.meta.env.DEV`).

const IGNORAR = new Set([
  'then', 'toJSON', 'constructor', 'length', 'toString', 'valueOf', 'inspect', 'asymmetricMatch',
  '$$typeof', 'nodeType', 'tagName', '@@__IMMUTABLE_ITERABLE__@@', '@@__IMMUTABLE_RECORD__@@',
  'prototype', 'message', 'error', 'success', 'data', 'ok',
]);

const proxies = new WeakMap<object, unknown>();
const avisados = new Set<string>();

function origemNoCodigo(): string {
  const pilha = new Error().stack?.split('\n') ?? [];
  const linha = pilha.find((l) => l.includes('/src/') && !l.includes('apiGuard')) ?? '';
  const m = linha.match(/\/src\/([^?:)]+)(?:\?[^:]*)?:(\d+)/);
  return m ? `${m[1]}:${m[2]}` : linha.trim();
}

function proteger<T>(valor: T, endpoint: string): T {
  if (valor === null || typeof valor !== 'object') return valor;
  const alvo = valor as unknown as object;
  const existente = proxies.get(alvo);
  if (existente) return existente as T;

  const proxy = new Proxy(alvo, {
    get(obj, prop, receptor) {
      const atual = Reflect.get(obj, prop, receptor);
      if (typeof prop !== 'string') return atual;
      if (atual === undefined && !(prop in obj) && !IGNORAR.has(prop) && !Array.isArray(obj)) {
        const onde = origemNoCodigo();
        const chave = `${endpoint}|${prop}|${onde}`;
        if (!avisados.has(chave)) {
          avisados.add(chave);
          const colunas = Object.keys(obj).slice(0, 14).join(', ');
          console.warn(`⚠️ [API_GUARD] '${prop}' não existe na resposta de ${endpoint} (campos: ${colunas}) em ${onde}`);
        }
      }
      return atual !== null && typeof atual === 'object' ? proteger(atual, endpoint) : atual;
    },
  });
  proxies.set(alvo, proxy);
  return proxy as T;
}

export function instalarApiGuard(): void {
  if (!import.meta.env.DEV) return;
  try {
    if (localStorage.getItem('API_GUARD') !== '1') return;
  } catch {
    return;
  }
  const jsonOriginal = Response.prototype.json;
  Response.prototype.json = async function (this: Response) {
    const dados = await jsonOriginal.call(this);
    let endpoint = this.url || 'API';
    try { endpoint = new URL(this.url).pathname; } catch { /* mantém */ }
    if (!endpoint.includes('/api/')) return dados;
    return proteger(dados, endpoint);
  };
  console.info('🛡️ [API_GUARD] ligado: avisos de campos inexistentes na resposta da API aparecerão aqui.');
}
