import { lerToken } from '../utils/sessao';
import { API_URL } from './api';
import { createAuthenticatedWebSocket, getWebSocketServerUrl } from './websocket';

// Canal de dados em tempo real: o servidor avisa "o assunto X mudou" (checkpoints, clientes, eventos...) assim que alguém
// altera algo, e cada tela interessada recarrega os próprios dados em silêncio. Uma única conexão serve a todas as telas
// abertas nesta aba; ela fecha quando a última tela sai e reconecta sozinha se cair.

type Ouvinte = (topicos: string[]) => void;
type OuvinteConexao = (conectado: boolean) => void;

const ouvintes = new Set<Ouvinte>();
const ouvintesConexao = new Set<OuvinteConexao>();
let socket: WebSocket | null = null;
let conectado = false;
let tentativas = 0;
let religar: ReturnType<typeof setTimeout> | null = null;
let ativo = false;

function definirConectado(valor: boolean) {
  if (conectado === valor) return;
  conectado = valor;
  ouvintesConexao.forEach((ouvir) => ouvir(valor));
}

function conectar() {
  if (!ativo || socket) return;
  const token = lerToken();
  if (!token) return; // sem login ainda; tenta de novo quando alguém assinar outra vez
  try {
    socket = createAuthenticatedWebSocket(`${getWebSocketServerUrl(API_URL)}?scope=dados`, token);
  } catch {
    socket = null;
    return;
  }
  socket.onopen = () => { tentativas = 0; };
  socket.onmessage = (evento) => {
    try {
      const mensagem = JSON.parse(evento.data);
      if (mensagem.type === 'DADOS_CONECTADO') definirConectado(true);
      if (mensagem.type === 'DADOS_ALTERADOS' && Array.isArray(mensagem.topicos)) {
        ouvintes.forEach((ouvir) => ouvir(mensagem.topicos));
      }
    } catch {
      // mensagem que não é do canal de dados
    }
  };
  socket.onclose = () => {
    socket = null;
    definirConectado(false);
    if (!ativo) return;
    // reconecta com espera crescente (1 s, 2 s, 4 s... até 30 s)
    const espera = Math.min(1000 * 2 ** tentativas, 30_000);
    tentativas += 1;
    religar = setTimeout(conectar, espera);
  };
  socket.onerror = () => { /* o onclose cuida da reconexão */ };
}

function desconectar() {
  ativo = false;
  if (religar) clearTimeout(religar);
  religar = null;
  const atual = socket;
  socket = null;
  definirConectado(false);
  atual?.close();
}

/** Assina os avisos de mudança. Devolve a função que cancela a assinatura. */
export function assinarDados(ouvir: Ouvinte): () => void {
  ouvintes.add(ouvir);
  if (!ativo) {
    ativo = true;
    conectar();
  }
  return () => {
    ouvintes.delete(ouvir);
    if (ouvintes.size === 0) desconectar();
  };
}

/** Avisa quando o canal conecta ou cai (a tela usa para escolher o intervalo de segurança). */
export function observarConexao(ouvir: OuvinteConexao): () => void {
  ouvintesConexao.add(ouvir);
  ouvir(conectado);
  return () => { ouvintesConexao.delete(ouvir); };
}
