import React from 'react';
import { ShieldCheck, Lock, Terminal, RefreshCw, Key } from 'lucide-react';
import { SecurityAuditLog } from '../../types/security';

interface SecurityAuditViewProps {
  logs: SecurityAuditLog[];
  loading: boolean;
  onRefresh: () => void;
}

export const SecurityAuditView: React.FC<SecurityAuditViewProps> = ({
  logs,
  loading,
  onRefresh
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Trilha de Auditoria & Não-Repúdio (HMAC-SHA256)</h2>
          <p className="text-xs text-slate-400">Registro imutável de todas as ações de segurança, execuções de scans e aprovações de escopo</p>
        </div>

        <button
          onClick={onRefresh}
          className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/60 text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4 font-semibold">Data / Hora</th>
                <th className="py-3 px-4 font-semibold">Ação Registrada</th>
                <th className="py-3 px-4 font-semibold">Operador / Papel</th>
                <th className="py-3 px-4 font-semibold">Entidade / ID</th>
                <th className="py-3 px-4 font-semibold">IP Origem</th>
                <th className="py-3 px-4 font-semibold font-mono">Assinatura HMAC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    Nenhum registro de auditoria gravado.
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-3 px-4 font-bold text-white whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] border ${
                        log.action.includes('REJECTED') ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                        log.action.includes('AUTHORIZED') ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                        'bg-blue-500/20 text-blue-300 border-blue-500/40'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-200">{log.actorName}</div>
                      <div className="text-[10px] text-slate-500">{log.actorRole} ({log.actorEmail})</div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-mono text-slate-400">{log.entityType}: {log.entityId.substring(0, 14)}...</span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 whitespace-nowrap">
                      {log.ipOrigin}
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                      {log.auditHmacSha256.substring(0, 16)}...
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
