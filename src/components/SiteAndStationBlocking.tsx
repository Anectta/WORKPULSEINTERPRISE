import React, { useState } from 'react';
import { 
  SiteBlockRule, 
  Department, 
  WorkModel 
} from '../types';
import { 
  Ban, 
  Lock, 
  ShieldAlert, 
  Plus, 
  CheckCircle2, 
  AlertOctagon, 
  Laptop, 
  Eye, 
  Settings,
  XCircle
} from 'lucide-react';

interface SiteAndStationBlockingProps {
  siteBlocks: SiteBlockRule[];
  onToggleBlock: (id: string) => void;
  onAddBlockRule: (rule: SiteBlockRule) => void;
  showPreviewModal?: boolean;
  setShowPreviewModal?: (val: boolean) => void;
}

export const SiteAndStationBlocking: React.FC<SiteAndStationBlockingProps> = ({
  siteBlocks,
  onToggleBlock,
  onAddBlockRule,
  showPreviewModal,
  setShowPreviewModal
}) => {
  const [localShowPreviewModal, setLocalShowPreviewModal] = useState(false);
  const isPreviewOpen = showPreviewModal !== undefined ? showPreviewModal : localShowPreviewModal;
  const setPreviewOpen = setShowPreviewModal || setLocalShowPreviewModal;

  const [newTitle, setNewTitle] = useState('');
  const [newDomains, setNewDomains] = useState('');
  const [newGroup, setNewGroup] = useState('Redes Sociais');
  const [newAction, setNewAction] = useState<'Bloqueio Total' | 'Aviso com Justificativa' | 'Alerta ao Gestor'>('Bloqueio Total');

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDomains.trim()) return;

    const rule: SiteBlockRule = {
      id: `block-${Date.now()}`,
      title: newTitle,
      categoryGroup: newGroup,
      domainPattern: newDomains,
      blockedDepartments: ['Todas as Áreas'],
      workModels: ['Presencial', 'Home Office', 'Híbrido'],
      action: newAction,
      active: true
    };

    onAddBlockRule(rule);
    setNewTitle('');
    setNewDomains('');
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Top Quick Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Filtro Web & Políticas Corporativas de Segurança
            </h3>
            <span className="bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center">
              <Ban className="w-3 h-3 mr-1 text-rose-600 dark:text-rose-400" />
              Filtro Ativo
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            Impeça acessos a redes sociais, jogos, streaming e sites não autorizados por departamento e modelo de trabalho.
          </p>
        </div>
      </div>

      {/* Add New Block Form */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center space-x-2">
          <Plus className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          <span>Adicionar Regra de Bloqueio de Domínio / Categoria</span>
        </h3>

        <form onSubmit={handleCreateRule} className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1 font-mono uppercase">Título da Regra</label>
            <input
              type="text"
              placeholder="Ex: Bloqueio de Apostas & Cassinos"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-medium placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1 font-mono uppercase">Domínios (Separados por vírgula)</label>
            <input
              type="text"
              placeholder="Ex: bet365.com, blaze.com"
              value={newDomains}
              onChange={(e) => setNewDomains(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-medium placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1 font-mono uppercase">Categoria / Grupo</label>
            <select
              value={newGroup}
              onChange={(e) => setNewGroup(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="Redes Sociais">Redes Sociais</option>
              <option value="Apostas & Jogos">Apostas & Jogos</option>
              <option value="Streaming & Vídeo">Streaming & Vídeo</option>
              <option value="Downloads P2P">Downloads P2P</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1 font-mono uppercase">Ação ao Acessar</label>
            <select
              value={newAction}
              onChange={(e) => setNewAction(e.target.value as any)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white font-bold focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="Bloqueio Total">🚫 Bloqueio Total</option>
              <option value="Aviso com Justificativa">⚠️ Aviso com Justificativa</option>
              <option value="Alerta ao Gestor">🔔 Alerta ao Gestor</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-rose-600 to-red-600 hover:opacity-95 text-white font-bold text-xs py-2 rounded-xl shadow-sm transition-all cursor-pointer"
            >
              Criar Bloqueio
            </button>
          </div>
        </form>
      </div>

      {/* Rules Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">Políticas e Regras de Bloqueio em Vigor</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Ativas no agente local em todas as estações corporativas</p>
          </div>
          <span className="text-xs font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 px-2.5 py-1 rounded-lg">
            {siteBlocks.filter(b => b.active).length} Bloqueios Ativos
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/80 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="p-3 rounded-l-xl">Política / Regra</th>
                <th className="p-3">Categoria</th>
                <th className="p-3">Padrão de Domínio</th>
                <th className="p-3">Ação</th>
                <th className="p-3">Status</th>
                <th className="p-3 rounded-r-xl text-right">Alternar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {siteBlocks.map((block) => (
                <tr key={block.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                  <td className="p-3 font-bold text-slate-900 dark:text-white">{block.title}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300">
                      {block.categoryGroup}
                    </span>
                  </td>
                  <td className="p-3 font-mono text-[11px] text-slate-500 dark:text-slate-400">{block.domainPattern}</td>
                  <td className="p-3 font-bold text-slate-800 dark:text-slate-200">{block.action}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                      block.active 
                        ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700'
                    }`}>
                      {block.active ? '● BLOQUEADO' : 'PAUSADO'}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => onToggleBlock(block.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                        block.active
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/60'
                          : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900/60'
                      }`}
                    >
                      {block.active ? 'Desativar' : 'Ativar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview Modal for Blocked Screen */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 text-slate-900 dark:text-white space-y-4 shadow-2xl relative">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 flex items-center justify-center mx-auto shadow-sm">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-xl font-black text-slate-900 dark:text-white">Acesso Restrito pela Empresa</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                O site <span className="font-mono font-bold text-rose-600 dark:text-rose-400">facebook.com</span> foi bloqueado conforme as políticas de TI & LGPD da WorkPulse ERP.
              </p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-1.5 font-medium">
              <div className="flex justify-between">
                <span>Motivo:</span>
                <span className="font-bold text-slate-900 dark:text-white">Redes Sociais Não Autorizadas</span>
              </div>
              <div className="flex justify-between">
                <span>Estação:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">PC-ENG-001</span>
              </div>
              <div className="flex justify-between">
                <span>Protocolo:</span>
                <span className="font-mono text-slate-500 dark:text-slate-400">WP-BLK-882910</span>
              </div>
            </div>

            <button
              onClick={() => setPreviewOpen(false)}
              className="w-full py-2.5 bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer"
            >
              Fechar Prévia
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
