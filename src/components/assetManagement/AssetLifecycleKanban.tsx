import React, { useState } from 'react';
import { 
  ArrowRight, 
  Tag, 
  User, 
  Building2, 
  Clock, 
  DollarSign, 
  ChevronRight,
  Eye,
  RefreshCw,
  Plus
} from 'lucide-react';
import { ITAsset, AssetLifecycleStage } from '../../types';
import { LIFECYCLE_STAGES } from './lifecycleConfig';

interface AssetLifecycleKanbanProps {
  assets: ITAsset[];
  onOpenDetail: (asset: ITAsset) => void;
  onOpenTransition: (asset: ITAsset) => void;
}

export const AssetLifecycleKanban: React.FC<AssetLifecycleKanbanProps> = ({
  assets,
  onOpenDetail,
  onOpenTransition
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAssets = assets.filter(a => {
    return (
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.assetTag.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.brandModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.assignedEmployeeName && a.assignedEmployeeName.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  return (
    <div className="space-y-4 font-sans">
      {/* Search and count header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center space-x-2">
            <span>Pipeline do Ciclo de Vida do Ativo de TI</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
              8 Etapas Automatizadas
            </span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Acompanhe visualmente o fluxo: Compra → Entrada → Instalação → Utilização → Manutenção → Transferência → Substituição → Descarte
          </p>
        </div>

        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filtrar ativos no pipeline..."
          className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 w-64"
        />
      </div>

      {/* Horizontal Pipeline Columns */}
      <div className="flex gap-3 overflow-x-auto pb-4 pt-1 snap-x">
        {LIFECYCLE_STAGES.map((stage) => {
          const stageAssets = filteredAssets.filter(a => (a.lifecycleStage || 'utilizacao') === stage.key);
          const stageTotalValue = stageAssets.reduce((sum, a) => sum + (a.purchaseValue || 0), 0);

          return (
            <div
              key={stage.key}
              className="w-72 shrink-0 bg-slate-50/80 dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[75vh]"
            >
              {/* Column Header */}
              <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-base">{stage.icon}</span>
                    <span className="font-black text-xs text-slate-900 dark:text-slate-100">
                      {stage.label}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full font-black text-[10px] ${stage.color}`}>
                    {stageAssets.length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                  <span>Etapa {stage.order} de 8</span>
                  <span className="font-mono font-bold text-slate-600 dark:text-slate-300">
                    R$ {stageTotalValue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                  </span>
                </div>
              </div>

              {/* Asset Cards List */}
              <div className="p-2.5 overflow-y-auto space-y-2.5 flex-1">
                {stageAssets.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs">
                    Nenhum ativo nesta etapa
                  </div>
                ) : (
                  stageAssets.map(asset => (
                    <div
                      key={asset.id}
                      className="p-3 bg-white dark:bg-slate-800/90 rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-xs hover:shadow-md transition-all space-y-2 group"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="px-2 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-mono font-black text-[10px] rounded">
                          {asset.assetTag}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-slate-500">
                          R$ {(asset.purchaseValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                        </span>
                      </div>

                      <div>
                        <h4 className="font-black text-xs text-slate-900 dark:text-slate-100 line-clamp-1">
                          {asset.name}
                        </h4>
                        <p className="text-[10px] text-slate-500">
                          {asset.brandModel}
                        </p>
                      </div>

                      <div className="text-[10px] text-slate-500 space-y-0.5 pt-1 border-t border-slate-100 dark:border-slate-700/50">
                        {asset.assignedEmployeeName && (
                          <div className="flex items-center space-x-1 truncate">
                            <User className="w-3 h-3 text-indigo-500 shrink-0" />
                            <span className="font-medium text-slate-700 dark:text-slate-300 truncate">{asset.assignedEmployeeName}</span>
                          </div>
                        )}
                        <div className="flex items-center space-x-1 truncate">
                          <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{asset.roomName || 'Estoque Central'}</span>
                        </div>
                      </div>

                      {/* Quick Action Footer */}
                      <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-700/50">
                        <button
                          onClick={() => onOpenDetail(asset)}
                          className="text-[10px] font-bold text-slate-500 hover:text-amber-600 flex items-center space-x-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Raio-X</span>
                        </button>

                        <button
                          onClick={() => onOpenTransition(asset)}
                          className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold text-[10px] rounded-lg flex items-center space-x-1 transition-colors cursor-pointer"
                          title="Avançar para a próxima etapa do ciclo"
                        >
                          <span>Avançar</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
