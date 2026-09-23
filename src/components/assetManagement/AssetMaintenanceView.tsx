import React, { useState, useMemo } from 'react';
import { 
  Wrench, 
  Plus, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  DollarSign, 
  Clock, 
  Tag, 
  User, 
  FileText,
  Edit3,
  Calendar
} from 'lucide-react';
import { ITAsset, AssetMaintenanceRecord } from '../../types';

interface AssetMaintenanceViewProps {
  assets: ITAsset[];
  onOpenNewMaintenance: (asset?: ITAsset) => void;
  onEditMaintenance: (record: AssetMaintenanceRecord) => void;
  onCompleteMaintenance: (record: AssetMaintenanceRecord) => void;
  onOpenAssetDetail: (asset: ITAsset) => void;
}

export const AssetMaintenanceView: React.FC<AssetMaintenanceViewProps> = ({
  assets,
  onOpenNewMaintenance,
  onEditMaintenance,
  onCompleteMaintenance,
  onOpenAssetDetail
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Aggregate all maintenances from all assets
  const allMaintenances = useMemo(() => {
    const list: AssetMaintenanceRecord[] = [];
    assets.forEach(a => {
      if (a.maintenances && a.maintenances.length > 0) {
        list.push(...a.maintenances);
      }
    });
    return list.sort((a, b) => new Date(b.openDate).getTime() - new Date(a.openDate).getTime());
  }, [assets]);

  const filteredMaintenances = useMemo(() => {
    return allMaintenances.filter(m => {
      const matchSearch = 
        m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.assetTag.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.assetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.technician.toLowerCase().includes(searchTerm.toLowerCase());

      const matchType = typeFilter === 'all' || m.type === typeFilter;
      const matchStatus = statusFilter === 'all' || m.status === statusFilter;

      return matchSearch && matchType && matchStatus;
    });
  }, [allMaintenances, searchTerm, typeFilter, statusFilter]);

  const totalCost = useMemo(() => {
    return allMaintenances.reduce((sum, m) => sum + (m.cost || 0), 0);
  }, [allMaintenances]);

  const openCount = useMemo(() => {
    return allMaintenances.filter(m => m.status === 'aberta' || m.status === 'em_andamento' || m.status === 'aguardando_pecas').length;
  }, [allMaintenances]);

  const warrantyCount = useMemo(() => {
    return allMaintenances.filter(m => m.type === 'garantia_fabricante').length;
  }, [allMaintenances]);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Gasto em Manutenção</p>
            <p className="text-xl font-black text-slate-900 dark:text-slate-100 font-mono">
              R$ {totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Ordens Abertas / Em Curso</p>
            <p className="text-xl font-black text-amber-600 dark:text-amber-400">
              {openCount} Chamados
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Ordens Concluídas</p>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
              {allMaintenances.filter(m => m.status === 'concluida').length}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Acionamentos de Garantia</p>
            <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">
              {warrantyCount} RMAs
            </p>
          </div>
        </div>
      </div>

      {/* Action Header & Search */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por Tombo, Problema, Técnico..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100"
              />
            </div>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200"
            >
              <option value="all">Todos os Tipos</option>
              <option value="preventiva">Preventiva</option>
              <option value="corretiva">Corretiva</option>
              <option value="upgrade">Upgrade</option>
              <option value="garantia_fabricante">Garantia Fabricante</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200"
            >
              <option value="all">Todos os Status</option>
              <option value="aberta">Aberta</option>
              <option value="em_andamento">Em Andamento</option>
              <option value="aguardando_pecas">Aguardando Peças</option>
              <option value="concluida">Concluída</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>

          <button
            onClick={() => onOpenNewMaintenance()}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-md shadow-orange-600/20 transition-all flex items-center space-x-1.5 cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Ordem de Manutenção</span>
          </button>
        </div>

        {/* Table of Maintenances */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-200">
            <thead className="bg-slate-100 dark:bg-slate-800/80 uppercase text-[10px] font-black tracking-wider text-slate-500">
              <tr>
                <th className="p-3">Ativo / Tombo</th>
                <th className="p-3">Título & Diagnóstico</th>
                <th className="p-3">Tipo</th>
                <th className="p-3">Status</th>
                <th className="p-3">Técnico & Peças</th>
                <th className="p-3">Abertura / Encerramento</th>
                <th className="p-3 text-right">Custo (R$)</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {filteredMaintenances.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Nenhuma ordem de manutenção encontrada.
                  </td>
                </tr>
              ) : (
                filteredMaintenances.map(m => {
                  const parentAsset = assets.find(a => a.id === m.assetId);

                  return (
                    <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="p-3">
                        <button
                          onClick={() => parentAsset && onOpenAssetDetail(parentAsset)}
                          className="font-mono font-bold text-amber-600 dark:text-amber-400 hover:underline flex items-center space-x-1 cursor-pointer"
                        >
                          <Tag className="w-3 h-3" />
                          <span>{m.assetTag}</span>
                        </button>
                        <div className="text-[10px] text-slate-500 truncate max-w-[150px]">{m.assetName}</div>
                      </td>

                      <td className="p-3 max-w-xs">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{m.title}</div>
                        <p className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">{m.description}</p>
                      </td>

                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                          {m.type.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>

                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${m.status === 'concluida' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {m.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>

                      <td className="p-3 text-[11px]">
                        <div>{m.technician}</div>
                        {m.partsReplaced && (
                          <div className="text-[10px] text-slate-400">Peças: {m.partsReplaced}</div>
                        )}
                      </td>

                      <td className="p-3 text-[11px]">
                        <div>Aberto: {m.openDate}</div>
                        {m.closeDate && (
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400">Concluído: {m.closeDate}</div>
                        )}
                      </td>

                      <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                        R$ {m.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>

                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {m.status !== 'concluida' && (
                            <button
                              onClick={() => onCompleteMaintenance(m)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors cursor-pointer"
                              title="Concluir Manutenção"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => onEditMaintenance(m)}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors cursor-pointer"
                            title="Editar Ordem"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
