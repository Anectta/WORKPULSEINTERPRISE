import React from 'react';

interface ErrorBoundaryProps {
  /** Nome do módulo exibido na mensagem de erro. */
  moduleName?: string;
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

/**
 * Isola falhas de renderização: um erro num módulo exibe um aviso local
 * em vez de desmontar a aplicação inteira (tela em branco).
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[ErrorBoundary] Falha no módulo ${this.props.moduleName ?? 'desconhecido'}:`, error, info.componentStack);
  }

  private handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div role="alert" className="m-4 p-6 rounded-xl border border-red-500/30 bg-red-500/10 text-sm">
        <h2 className="font-bold text-red-700 dark:text-red-300 mb-2">
          Ocorreu um erro ao exibir {this.props.moduleName ? `o módulo "${this.props.moduleName}"` : 'este módulo'}.
        </h2>
        <p className="text-slate-700 dark:text-slate-300 mb-4">
          Os demais módulos continuam disponíveis. Detalhe técnico: {this.state.error.message}
        </p>
        <button
          type="button"
          onClick={this.handleRetry}
          className="px-3 py-1.5 rounded-lg bg-red-600 text-white font-bold hover:bg-red-700"
        >
          Tentar novamente
        </button>
      </div>
    );
  }
}
