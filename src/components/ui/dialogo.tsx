// Janelas de aviso e de confirmação do sistema, no lugar do alert() e do confirm() do navegador.
//
//   avisar('Evento salvo')                      -> mostra o aviso e segue (devolve uma promessa que resolve quando a pessoa fecha)
//   if (await confirmar('Excluir?')) { ... }    -> pergunta e devolve true/false
//
// Funcionam de qualquer lugar (componentes ou funções soltas): <DialogoGlobal /> fica uma vez só, na raiz do App.
import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

type TipoDeAviso = 'sucesso' | 'erro' | 'atencao' | 'info';

interface OpcoesDeAviso {
  titulo?: string;
  tipo?: TipoDeAviso;
  botao?: string;
}

interface OpcoesDeConfirmacao {
  titulo?: string;
  confirmar?: string;
  cancelar?: string;
  // Ação que não dá para desfazer: o botão de confirmar fica vermelho
  perigo?: boolean;
}

type Pedido =
  | { id: number; modo: 'aviso'; mensagem: string; opcoes: OpcoesDeAviso; resolver: () => void }
  | { id: number; modo: 'confirmacao'; mensagem: string; opcoes: OpcoesDeConfirmacao; resolver: (resposta: boolean) => void };

// Fila de pedidos: se vários avisos chegam juntos, aparecem um depois do outro
let fila: Pedido[] = [];
let proximoId = 1;
const ouvintes = new Set<() => void>();
const avisarOuvintes = () => ouvintes.forEach((ouvinte) => ouvinte());

// O texto de antes dos alert() começava com um emoji (✅ ❌ ⚠️): ele vira o tipo e sai do texto
function interpretar(mensagem: string, tipo?: TipoDeAviso): { texto: string; tipo: TipoDeAviso } {
  const texto = String(mensagem ?? '').trim();
  const limpo = texto.replace(/^(?:(?:✅|✔️?|❌|⛔|⚠️?|ℹ️?|🚫)\s*)+/u, '');
  if (tipo) return { texto: limpo, tipo };
  if (/^(?:✅|✔)/u.test(texto)) return { texto: limpo, tipo: 'sucesso' };
  if (/^(?:❌|⛔|🚫)/u.test(texto) || /^erro\b/i.test(limpo) || /\bnão foi possível\b/i.test(limpo) || /^falha\b/i.test(limpo)) return { texto: limpo, tipo: 'erro' };
  if (/^⚠/u.test(texto)) return { texto: limpo, tipo: 'atencao' };
  return { texto: limpo, tipo: 'info' };
}

export function avisar(mensagem: unknown, opcoes: OpcoesDeAviso = {}): Promise<void> {
  const { texto, tipo } = interpretar(typeof mensagem === 'string' ? mensagem : String((mensagem as { message?: string })?.message ?? mensagem), opcoes.tipo);
  return new Promise<void>((resolve) => {
    fila.push({ id: proximoId++, modo: 'aviso', mensagem: texto, opcoes: { ...opcoes, tipo }, resolver: resolve });
    avisarOuvintes();
  });
}

export function confirmar(mensagem: string, opcoes: OpcoesDeConfirmacao = {}): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    fila.push({ id: proximoId++, modo: 'confirmacao', mensagem: String(mensagem ?? '').trim(), opcoes, resolver: resolve });
    avisarOuvintes();
  });
}

const VISUAL: Record<TipoDeAviso, { titulo: string; icone: JSX.Element; cor: string }> = {
  sucesso: { titulo: 'Tudo certo', icone: <CheckCircle2 size={28} />, cor: 'text-success' },
  erro: { titulo: 'Algo deu errado', icone: <XCircle size={28} />, cor: 'text-danger' },
  atencao: { titulo: 'Atenção', icone: <AlertTriangle size={28} />, cor: 'text-warning' },
  info: { titulo: 'Aviso', icone: <Info size={28} />, cor: 'text-primary-300' },
};

export function DialogoGlobal() {
  const [, forcar] = useState(0);
  useEffect(() => {
    const ouvinte = () => forcar((n) => n + 1);
    ouvintes.add(ouvinte);
    return () => { ouvintes.delete(ouvinte); };
  }, []);

  const atual = fila[0];
  if (!atual) return null;

  const encerrar = (resposta?: boolean) => {
    fila = fila.filter((pedido) => pedido.id !== atual.id);
    if (atual.modo === 'confirmacao') atual.resolver(Boolean(resposta));
    else atual.resolver();
    avisarOuvintes();
  };

  if (atual.modo === 'confirmacao') {
    const perigo = atual.opcoes.perigo ?? true;
    return (
      <Modal isOpen onClose={() => encerrar(false)} title={atual.opcoes.titulo ?? 'Confirmar'} size="sm">
        <div className="flex items-start gap-3">
          <span className={`mt-0.5 shrink-0 ${perigo ? 'text-warning' : 'text-primary-300'}`}><AlertTriangle size={28} /></span>
          <p className="whitespace-pre-line text-sm text-gray-200">{atual.mensagem}</p>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => encerrar(false)}>{atual.opcoes.cancelar ?? 'Cancelar'}</Button>
          <Button variant={perigo ? 'danger' : 'primary'} autoFocus onClick={() => encerrar(true)}>{atual.opcoes.confirmar ?? 'Confirmar'}</Button>
        </div>
      </Modal>
    );
  }

  const visual = VISUAL[atual.opcoes.tipo ?? 'info'];
  return (
    <Modal isOpen onClose={() => encerrar()} title={atual.opcoes.titulo ?? visual.titulo} size="sm">
      <div className="flex items-start gap-3" role="alert">
        <span className={`mt-0.5 shrink-0 ${visual.cor}`}>{visual.icone}</span>
        <p className="whitespace-pre-line text-sm text-gray-200">{atual.mensagem}</p>
      </div>
      <div className="mt-5 flex justify-end">
        <Button variant="primary" autoFocus onClick={() => encerrar()}>{atual.opcoes.botao ?? 'Entendi'}</Button>
      </div>
    </Modal>
  );
}
