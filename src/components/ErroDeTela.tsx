import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props { children: ReactNode }
interface Estado { erro: Error | null }

// Rede de segurança: se alguma tela quebrar ao desenhar, mostra um aviso com botão de recarregar
// em vez de deixar a página só com o fundo azul (que só voltava com F5).
export default class ErroDeTela extends Component<Props, Estado> {
  state: Estado = { erro: null };

  static getDerivedStateFromError(erro: Error): Estado {
    return { erro };
  }

  componentDidCatch(erro: Error, info: ErrorInfo) {
    console.error('❌ Erro ao desenhar a tela:', erro, info.componentStack);
  }

  render() {
    if (!this.state.erro) return this.props.children;
    return (
      <div role="alert" className="flex min-h-screen items-center justify-center bg-dark p-6 text-white">
        <div className="w-full max-w-md rounded-2xl border border-danger/30 bg-dark-card p-6 text-center shadow-xl">
          <h1 className="font-display text-xl">Algo deu errado nesta tela</h1>
          <p className="mt-2 text-sm text-gray-400">Seus dados estão salvos. Recarregue a página para continuar.</p>
          <div className="mt-5 flex justify-center gap-3">
            <button type="button" onClick={() => this.setState({ erro: null })} className="rounded-lg border border-white/15 px-4 py-2 text-sm text-gray-300 hover:text-white">
              Tentar de novo
            </button>
            <button type="button" onClick={() => window.location.reload()} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-600">
              Recarregar a página
            </button>
          </div>
        </div>
      </div>
    );
  }
}
