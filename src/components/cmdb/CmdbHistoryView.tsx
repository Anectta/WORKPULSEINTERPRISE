import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  User, 
  Calendar, 
  Activity, 
  FileText, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';
import { CIHistoryEvent } from '../../types/cmdb';

interface CmdbHistoryViewProps {
  history: CIHistoryEvent[];
}

export const CmdbHistoryView: React.FC<CmdbHistoryViewProps> = ({ history }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState('todos');

  const filteredHistory = history.filter(ev => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || (
      ev.ciName.toLowerCase().includes(q) ||
      ev.ciCode.toLowerCase().includes(q) ||
      ev.description.toLowerCase().includes(q) ||
      ev.user.toLowerCase().includes(q)
    );
    const matchesAction = selectedAction === 'todos' || ev.action === selectedAction;
    return matchesSearch && matchesAction;
  });

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por CI, usuário ou ação..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <select
            value={selectedAction}
            onChange={e => setSelectedAction(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="todos">Todas as Ações</option>
            <option value="CRIACAO">Criação</option>
            <option value="ALTERACAO">Alteração</option>
            <option value="STATUS_CHANGE">Mudança de Status</option>
            <option value="RELACIONAMENTO">Relacionamento</option>
            <option value="CHAMADO">Chamado</option>
            <option value="EVENTO_AGENTE">Evento do Agente RMM</option>
            <option value="AUDITORIA">Auditoria</option>
          </select>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-blue-400" />
            <h3 className="font-bold text-white text-sm">Trilha de Auditoria e Governança CMDB</h3>
          </div>
          <span className="text-xs text-slate-400">{filteredHistory.length} registros auditados</span>
        </div>

        <div className="divide-y divide-slate-800/80">
          {filteredHistory.map(ev => (
            <div key={ev.id} className="p-4 hover:bg-slate-800/40 transition-colors flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                    ev.action === 'STATUS_CHANGE' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                    ev.action === 'CHAMADO' ? 'bg-blue-950 text-blue-300 border border-blue-800' :
                    ev.action === 'RELACIONAMENTO' ? 'bg-purple-950 text-purple-300 border border-purple-800' :
                    ev.action === 'CRIACAO' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                    'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}>
                    {ev.action}
                  </span>
                  <span className="font-bold text-white text-xs">{ev.ciName}</span>
                  <span className="font-mono text-[10px] text-blue-400">({ev.ciCode})</span>
                </div>
                <p className="text-xs text-slate-300 font-medium">{ev.description}</p>
                <div className="text-[11px] text-slate-500 flex items-center gap-3 pt-0.5">
                  <span>Origem: <strong>{ev.source}</strong></span>
                  <span>•</span>
                  <span>Usuário: <strong>{ev.user}</strong></span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="font-mono text-[11px] text-slate-400">
                  {new Date(ev.date).toLocaleString('pt-BR')}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
