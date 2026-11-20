import React from 'react';
import { FlaskConical } from 'lucide-react';

interface DemoNoticeProps {
  /** O que é simulado nesta tela. */
  children: React.ReactNode;
  className?: string;
}

/**
 * Aviso padronizado para funcionalidades que exibem dados simulados.
 * Garante que o usuário não confunda demonstração com dado real da operação.
 */
export function DemoNotice({ children, className = '' }: DemoNoticeProps) {
  return (
    <div
      role="note"
      className={`flex items-start gap-2 p-3 rounded-xl border border-violet-500/40 bg-violet-500/10 text-xs text-violet-800 dark:text-violet-200 ${className}`}
    >
      <FlaskConical className="w-4 h-4 shrink-0 mt-0.5" />
      <div>
        <strong className="font-bold">Modo demonstração:</strong> {children}
      </div>
    </div>
  );
}
