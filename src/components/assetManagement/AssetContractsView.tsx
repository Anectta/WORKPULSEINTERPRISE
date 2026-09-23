import React, { useState } from 'react';
import { 
  FileText, 
  Building2, 
  ShieldCheck, 
  DollarSign, 
  Calendar, 
  Search, 
  Tag, 
  FileCheck, 
  Eye, 
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { ITAsset } from '../../types';

interface AssetContractsViewProps {
  assets: ITAsset[];
  onOpenDetail: (asset: ITAsset) => void;
  onOpenCustodyTerm: (asset: ITAsset) => void;
}

export const AssetContractsView: React.FC<AssetContractsViewProps> = ({
  assets,
  onOpenDetail,
  onOpenCustodyTerm
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const assetsWithContracts = React.useMemo(() => {
    return assets.filter(a => {
      const matchesSearch = 
        (a.contractNumber && a.contractNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (a.supplier && a.supplier.toLowerCase().includes(searchTerm.toLowerCase())) ||
        a.assetTag.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.name.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType = typeFilter === 'all' || (a.contractType || 'Aquisicao_Direta') === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [assets, searchTerm, typeFilter]);

  const totalMonthlyCost = React.useMemo(() => {
    return assets.reduce((sum, a) => sum + (a.contractMonthlyCost || 0), 0);
  }, [assets]);

  return (
    <div className="space-y-6">
      {/* Top metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Contratos Ativos Registrados</p>
            <p className="text-xl font-black text-slate-900 dark:text-slate-100">
              {assets.filter(a => a.contractNumber).length} de {assets.length} Ativos
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Custo Mensal Recorrente (Leasing / SLA)</p>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              R$ {totalMonthlyCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Termos de Cautela Assinados</p>
            <p className="text-xl font-black text-amber-600 dark:text-amber-400">
              {assets.filter(a => a.custodyTermSigned).length} / {assets.filter(a => a.assignedEmployeeName).length} Alocados
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por Contrato, Fornecedor ou Tombo..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100"
            />
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200"
          >
            <option value="all">Todas as Modalidades</option>
            <option value="Aquisicao_Direta">Aquisição Direta</option>
            <option value="Locacao_Leasing">Locação / Leasing</option>
            <option value="Suporte_SLA">Suporte SLA</option>
            <option value="Garantia_Estendida">Garantia Estendida</option>
            <option value="Comodato">Comodato</option>
          </select>
        </div>

        {/* Table of Contracts */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-200">
            <thead className="bg-slate-100 dark:bg-slate-800/80 uppercase text-[10px] font-black tracking-wider text-slate-500">
              <tr>
                <th className="p-3">Contrato / Tombo</th>
                <th className="p-3">Ativo & Marca</th>
                <th className="p-3">Fornecedor & CNPJ</th>
                <th className="p-3">Modalidade</th>
                <th className="p-3">Vigência</th>
                <th className="p-3 text-right">Custo Mensal / Total</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {assetsWithContracts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    Nenhum contrato encontrado.
                  </td>
                </tr>
              ) : (
                assetsWithContracts.map(asset => (
                  <tr key={asset.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-3 font-mono">
                      <strong className="text-indigo-600 dark:text-indigo-400 block">{asset.contractNumber || 'Sem código'}</strong>
                      <span className="text-[10px] text-slate-400">{asset.assetTag}</span>
                    </td>

                    <td className="p-3">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{asset.name}</div>
                      <span className="text-[10px] text-slate-500">{asset.brandModel}</span>
                    </td>

                    <td className="p-3">
                      <div className="font-bold text-slate-800 dark:text-slate-200">{asset.supplier || 'Não informado'}</div>
                      <span className="text-[10px] text-slate-400 font-mono">{asset.supplierCnpj || 'CNPJ não cadastrado'}</span>
                    </td>

                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold text-[10px]">
                        {(asset.contractType || 'Aquisicao_Direta').replace('_', ' ')}
                      </span>
                    </td>

                    <td className="p-3 text-[11px]">
                      <div>{asset.contractStartDate || asset.acquisitionDate} até {asset.contractEndDate || asset.warrantyExpiry}</div>
                      <span className="text-[10px] text-slate-400">Garantia até: {asset.warrantyExpiry}</span>
                    </td>

                    <td className="p-3 text-right font-mono">
                      {asset.contractMonthlyCost && asset.contractMonthlyCost > 0 ? (
                        <div>
                          <strong className="text-emerald-600 dark:text-emerald-400 block">
                            R$ {asset.contractMonthlyCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
                          </strong>
                          <span className="text-[10px] text-slate-400">
                            Compra: R$ {(asset.purchaseValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ) : (
                        <div>
                          <strong className="text-slate-900 dark:text-slate-100 block">
                            R$ {(asset.purchaseValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </strong>
                          <span className="text-[10px] text-slate-400">Compra Direta</span>
                        </div>
                      )}
                    </td>

                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        <button
                          onClick={() => onOpenCustodyTerm(asset)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer"
                          title="Gerar Termo de Cautela"
                        >
                          <FileCheck className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onOpenDetail(asset)}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors cursor-pointer"
                          title="Ver Detalhes do Ativo"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
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
