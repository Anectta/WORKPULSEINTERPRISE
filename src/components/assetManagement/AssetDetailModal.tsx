import React, { useState } from 'react';
import { 
  X, 
  Tag, 
  QrCode, 
  Calendar, 
  User, 
  Building2, 
  DollarSign, 
  ShieldCheck, 
  Wrench, 
  FileText, 
  History, 
  Network, 
  Cpu, 
  Edit3, 
  ArrowRight, 
  Printer, 
  Plus, 
  Clock, 
  FileCheck, 
  CheckCircle2, 
  AlertTriangle,
  ExternalLink
} from 'lucide-react';
import { ITAsset, AssetHistoryEvent } from '../../types';
import { getLifecycleStageConfig } from './lifecycleConfig';
import { SingleAssetLifecycleProgress } from './AssetLifecycleStepper';

interface AssetDetailModalProps {
  asset: ITAsset;
  onClose: () => void;
  onEdit: (asset: ITAsset) => void;
  onOpenTagPrint: (asset: ITAsset) => void;
  onOpenTransition: (asset: ITAsset) => void;
  onOpenCustodyTerm: (asset: ITAsset) => void;
  onOpenNewMaintenance: (asset: ITAsset) => void;
  onAddHistoryEvent: (assetId: string, event: Omit<AssetHistoryEvent, 'id'>) => void;
}

export const AssetDetailModal: React.FC<AssetDetailModalProps> = ({
  asset,
  onClose,
  onEdit,
  onOpenTagPrint,
  onOpenTransition,
  onOpenCustodyTerm,
  onOpenNewMaintenance,
  onAddHistoryEvent
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'administrative' | 'financial' | 'history' | 'maintenance'>('overview');
  const [isAddingHistory, setIsAddingHistory] = useState<boolean>(false);
  const [newHistTitle, setNewHistTitle] = useState<string>('');
  const [newHistDesc, setNewHistDesc] = useState<string>('');
  const [newHistDate, setNewHistDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [newHistUser, setNewHistUser] = useState<string>('Analista de TI');
  const [newHistCost, setNewHistCost] = useState<number>(0);

  const stageConfig = getLifecycleStageConfig(asset.lifecycleStage);

  // Warranty status calculation
  const warrantyDays = React.useMemo(() => {
    if (!asset.warrantyExpiry) return null;
    const diff = new Date(asset.warrantyExpiry).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [asset.warrantyExpiry]);

  const handleCreateHistoryEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHistTitle.trim() || !newHistDesc.trim()) return;

    onAddHistoryEvent(asset.id, {
      date: newHistDate,
      stage: asset.lifecycleStage,
      type: 'auditoria',
      title: newHistTitle,
      description: newHistDesc,
      user: newHistUser,
      cost: newHistCost > 0 ? newHistCost : undefined
    });

    setIsAddingHistory(false);
    setNewHistTitle('');
    setNewHistDesc('');
    setNewHistCost(0);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200 font-sans">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* MODAL HEADER */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="px-3 py-1 bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-mono font-black text-sm rounded-xl flex items-center space-x-1.5 shrink-0">
              <Tag className="w-4 h-4 text-amber-500" />
              <span>{asset.assetTag}</span>
            </span>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center space-x-2">
                <span>{asset.name}</span>
              </h2>
              <p className="text-xs text-slate-500">
                {asset.brandModel} • S/N: <span className="font-mono">{asset.serialNumber}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onOpenTagPrint(asset)}
              className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              title="Imprimir Plaqueta QR"
            >
              <QrCode className="w-4 h-4" />
            </button>
            <button
              onClick={() => onOpenCustodyTerm(asset)}
              className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl transition-colors cursor-pointer"
              title="Termo de Cautela e Responsabilidade"
            >
              <FileCheck className="w-4 h-4" />
            </button>
            <button
              onClick={() => onEdit(asset)}
              className="p-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-xl transition-colors cursor-pointer"
              title="Editar Ativo"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* LIFECYCLE PROGRESS STRIP */}
        <div className="px-6 py-3 bg-amber-500/5 dark:bg-amber-500/10 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1 max-w-xl">
            <SingleAssetLifecycleProgress currentStage={asset.lifecycleStage} />
          </div>
          <button
            onClick={() => onOpenTransition(asset)}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer shrink-0"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>Mudar Etapa do Ciclo de Vida</span>
          </button>
        </div>

        {/* SUB-TABS NAVIGATION */}
        <div className="px-6 pt-3 border-b border-slate-200 dark:border-slate-800 flex items-center space-x-2 overflow-x-auto text-xs font-bold">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'overview'
                ? 'border-amber-600 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Visão Geral & Técnico</span>
          </button>

          <button
            onClick={() => setActiveTab('administrative')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'administrative'
                ? 'border-amber-600 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Administrativo, Fornecedor & Contrato</span>
          </button>

          <button
            onClick={() => setActiveTab('financial')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'financial'
                ? 'border-amber-600 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Valores & Depreciação</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'history'
                ? 'border-amber-600 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Histórico & Trilha de Auditoria ({asset.history?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('maintenance')}
            className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === 'maintenance'
                ? 'border-amber-600 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Manutenções ({asset.maintenances?.length || 0})</span>
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 overflow-y-auto flex-1 text-xs space-y-4">
          
          {/* TAB 1: VISÃO GERAL & TÉCNICO */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Status Operacional</span>
                  <p className="font-bold text-slate-900 dark:text-slate-100 text-sm mt-0.5 capitalize">
                    {asset.status.replace('_', ' ')}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Ciclo de Vida: <strong className="text-amber-600 dark:text-amber-400">{stageConfig.label}</strong>
                  </p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Responsável Atual</span>
                  <p className="font-bold text-slate-900 dark:text-slate-100 text-sm mt-0.5">
                    {asset.assignedEmployeeName || 'Sem colaborador atribuído'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Departamento: {asset.assignedDepartment || 'TI & Infra'}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Localização Física</span>
                  <p className="font-bold text-slate-900 dark:text-slate-100 text-sm mt-0.5">
                    {asset.roomName || 'Estoque Central TI'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    {asset.building || 'Sede'} {asset.floor ? `• ${asset.floor}` : ''} {asset.locationDetails ? `(${asset.locationDetails})` : ''}
                  </p>
                </div>
              </div>

              {/* Technical Specifications & Network */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="font-black text-slate-800 dark:text-slate-200 flex items-center space-x-1.5 text-xs">
                  <Network className="w-4 h-4 text-amber-500" />
                  <span>Conectividade de Rede & Agente de Monitoramento</span>
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 font-mono">
                  <div>
                    <span className="text-[10px] text-slate-400 font-sans block">Endereço IP:</span>
                    <strong className="text-slate-800 dark:text-slate-200">{asset.ipAddress || 'Não configurado'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-sans block">Endereço MAC:</span>
                    <strong className="text-slate-800 dark:text-slate-200">{asset.macAddress || 'Não configurado'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-sans block">Status do Agente WorkPulse:</span>
                    <span className={`inline-flex items-center space-x-1 font-sans font-bold text-[10px] px-2 py-0.5 rounded-full ${asset.agentStatus === 'online' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-slate-200 text-slate-600'}`}>
                      <span>{asset.agentStatus === 'online' ? 'Online' : 'Offline'}</span>
                      {asset.agentLastPing && <span className="font-normal font-mono">({asset.agentLastPing})</span>}
                    </span>
                  </div>
                </div>

                {asset.notes && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 block font-bold">Observações Técnicas:</span>
                    <p className="text-slate-700 dark:text-slate-300 mt-0.5">{asset.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: ADMINISTRATIVO, FORNECEDOR & CONTRATO */}
          {activeTab === 'administrative' && (
            <div className="space-y-4">
              
              {/* Fornecedor Card */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <h4 className="font-black text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                    <Building2 className="w-4 h-4 text-amber-500" />
                    <span>Dados do Fornecedor & Nota Fiscal</span>
                  </h4>
                  {asset.invoiceNumber && (
                    <span className="px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-mono font-bold rounded">
                      NF: {asset.invoiceNumber}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Razão Social / Fornecedor:</span>
                    <strong className="text-slate-800 dark:text-slate-200">{asset.supplier || 'Não informado'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">CNPJ:</span>
                    <strong className="font-mono text-slate-800 dark:text-slate-200">{asset.supplierCnpj || 'Não informado'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Contato / Suporte:</span>
                    <strong className="text-slate-800 dark:text-slate-200">
                      {asset.supplierContact || asset.supplierEmail || 'Canal Direto'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Contrato Card */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <h4 className="font-black text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                    <FileText className="w-4 h-4 text-indigo-500" />
                    <span>Contrato Administrativo & Modalidade</span>
                  </h4>
                  <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-mono font-bold rounded">
                    {asset.contractNumber || 'Sem contrato formal'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Modalidade:</span>
                    <strong className="text-slate-800 dark:text-slate-200">
                      {(asset.contractType || 'Aquisicao_Direta').replace('_', ' ')}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Início da Vigência:</span>
                    <strong className="text-slate-800 dark:text-slate-200">{asset.contractStartDate || asset.acquisitionDate}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Término da Vigência:</span>
                    <strong className="text-slate-800 dark:text-slate-200">{asset.contractEndDate || asset.warrantyExpiry}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Custo Mensal (Leasing/SLA):</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 font-mono">
                      R$ {(asset.contractMonthlyCost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
                    </strong>
                  </div>
                </div>
              </div>

              {/* Garantia Card */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                  <h4 className="font-black text-slate-800 dark:text-slate-200 flex items-center space-x-1.5">
                    <ShieldCheck className="w-4 h-4 text-rose-500" />
                    <span>Cobertura de Garantia & SLA</span>
                  </h4>
                  {warrantyDays !== null && (
                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${warrantyDays > 90 ? 'bg-emerald-100 text-emerald-700' : warrantyDays > 0 ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>
                      {warrantyDays > 0 ? `${warrantyDays} dias restantes` : 'Garantia Expirada'}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Data de Vencimento:</span>
                    <strong className="text-slate-800 dark:text-slate-200">{asset.warrantyExpiry}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Tipo de Garantia:</span>
                    <strong className="text-slate-800 dark:text-slate-200">{asset.warrantyType || 'Padrão Fabricante'}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Acordo de Nível de Serviço (SLA):</span>
                    <strong className="text-slate-800 dark:text-slate-200">{asset.warrantySla || 'NBD (Next Business Day)'}</strong>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: VALORES & DEPRECIAÇÃO */}
          {activeTab === 'financial' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Valor de Compra (Original)</span>
                  <p className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1 font-mono">
                    R$ {(asset.purchaseValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Adquirido em: <strong>{asset.acquisitionDate}</strong>
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Valor Residual Atual (Contábil)</span>
                  <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 font-mono">
                    R$ {(asset.currentValue ?? asset.purchaseValue ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Depreciação acumulada: R$ {((asset.purchaseValue || 0) - (asset.currentValue ?? asset.purchaseValue ?? 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Custo Total de Manutenções</span>
                  <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1 font-mono">
                    R$ {(asset.totalMaintenanceCost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Valor Residual Sucata: R$ {(asset.salvageValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs block">
                  Regra de Depreciação Linear Aplicada
                </span>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-xs">
                  Vida útil parametrizada em <strong>{asset.lifespanMonths || 36} meses</strong>. 
                  A depreciação mensal é de <strong>R$ {((asset.purchaseValue || 0) / (asset.lifespanMonths || 36)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / mês</strong>.
                  Em caso de descarte ou baixa por obsolescência, o valor residual projetado para reciclagem/sucata é de R$ {(asset.salvageValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: HISTÓRICO & TRILHA DE AUDITORIA */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-black text-slate-900 dark:text-slate-100 text-xs">
                    Linha do Tempo de Ciclo de Vida e Auditoria
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    Registro formal de compras, entradas, instalações, alocações, transferências e manutenções.
                  </p>
                </div>

                <button
                  onClick={() => setIsAddingHistory(!isAddingHistory)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Novo Registro no Histórico</span>
                </button>
              </div>

              {/* Form to add history record */}
              {isAddingHistory && (
                <form onSubmit={handleCreateHistoryEvent} className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-3">
                  <span className="font-bold text-amber-900 dark:text-amber-200 text-xs block">
                    Adicionar Novo Registro na Trilha de Auditoria:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">Título do Evento:</label>
                      <input
                        type="text"
                        value={newHistTitle}
                        onChange={(e) => setNewHistTitle(e.target.value)}
                        placeholder="Ex: Troca de SSD, Remanejamento..."
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">Data:</label>
                      <input
                        type="date"
                        value={newHistDate}
                        onChange={(e) => setNewHistDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">Responsável:</label>
                      <input
                        type="text"
                        value={newHistUser}
                        onChange={(e) => setNewHistUser(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-bold"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-1">Descrição Detalhada:</label>
                    <textarea
                      value={newHistDesc}
                      onChange={(e) => setNewHistDesc(e.target.value)}
                      rows={2}
                      placeholder="Descreva o que ocorreu com o equipamento..."
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium"
                      required
                    />
                  </div>

                  <div className="flex items-center justify-end space-x-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddingHistory(false)}
                      className="px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 bg-amber-600 text-white rounded-lg text-xs font-bold shadow-xs hover:bg-amber-700"
                    >
                      Salvar Registro
                    </button>
                  </div>
                </form>
              )}

              {/* History Timeline */}
              {(!asset.history || asset.history.length === 0) ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                  <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="font-bold">Nenhum evento registrado ainda.</p>
                  <p className="text-[10px]">Use o botão acima para adicionar a primeira ocorrência neste ativo.</p>
                </div>
              ) : (
                <div className="relative pl-6 border-l-2 border-amber-500/30 space-y-4">
                  {asset.history.map(item => (
                    <div key={item.id} className="relative group">
                      {/* Timeline Dot */}
                      <span className="w-3 h-3 rounded-full bg-amber-500 border-2 border-white dark:border-slate-900 absolute -left-[31px] top-1" />
                      
                      <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold text-[10px] uppercase">
                              {item.stage ? getLifecycleStageConfig(item.stage).shortLabel : item.type}
                            </span>
                            <strong className="text-slate-900 dark:text-slate-100 font-bold">{item.title}</strong>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">{item.date}</span>
                        </div>

                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px]">
                          {item.description}
                        </p>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-700/60">
                          <span>Registrado por: <strong className="text-slate-600 dark:text-slate-300">{item.user}</strong></span>
                          {item.cost && item.cost > 0 && (
                            <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                              Custo: R$ {item.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

          {/* TAB 5: MANUTENÇÕES */}
          {activeTab === 'maintenance' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-black text-slate-900 dark:text-slate-100 text-xs">
                    Ordens de Manutenção Preventiva e Corretiva
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    Histórico de intervenções de hardware, troca de peças, garantia e upgrades.
                  </p>
                </div>

                <button
                  onClick={() => onOpenNewMaintenance(asset)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center space-x-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Abrir Ordem de Manutenção</span>
                </button>
              </div>

              {(!asset.maintenances || asset.maintenances.length === 0) ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                  <p className="font-bold">Nenhuma manutenção aberta ou pendente.</p>
                  <p className="text-[10px]">O ativo está operando dentro das especificações normais.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {asset.maintenances.map(m => (
                    <div key={m.id} className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${m.status === 'concluida' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                            {m.status.replace('_', ' ').toUpperCase()}
                          </span>
                          <strong className="text-slate-900 dark:text-slate-100">{m.title}</strong>
                        </div>
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          R$ {m.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600 dark:text-slate-300">{m.description}</p>

                      <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-700">
                        <span>Técnico: <strong className="text-slate-600 dark:text-slate-300">{m.technician}</strong></span>
                        {m.partsReplaced && <span>Peças: <strong>{m.partsReplaced}</strong></span>}
                        <span>Abertura: <strong>{m.openDate}</strong> {m.closeDate ? `• Conclusão: ${m.closeDate}` : ''}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* MODAL FOOTER ACTIONS */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onOpenCustodyTerm(asset)}
              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl font-bold text-xs flex items-center space-x-1.5 cursor-pointer"
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Gerar Termo de Cautela</span>
            </button>
            <button
              onClick={() => onOpenTagPrint(asset)}
              className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl font-bold text-xs flex items-center space-x-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir Plaqueta</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onEdit(asset)}
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs flex items-center space-x-1.5 cursor-pointer shadow-xs"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editar Cadastro</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
