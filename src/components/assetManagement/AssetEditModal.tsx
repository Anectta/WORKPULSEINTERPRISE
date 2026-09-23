import React, { useState } from 'react';
import { 
  X, 
  Save, 
  Box, 
  DollarSign, 
  ShieldCheck, 
  FileText, 
  User, 
  Building2, 
  Layers,
  Wrench,
  Tag,
  RefreshCw
} from 'lucide-react';
import { 
  ITAsset, 
  AssetCategory, 
  AssetStatus, 
  AssetLifecycleStage, 
  AssetContractType,
  Employee,
  SupplierItem,
  EnvironmentRoomItem,
  CustomCategoryItem,
  CustomStatusItem 
} from '../../types';
import { LIFECYCLE_STAGES } from './lifecycleConfig';

interface AssetEditModalProps {
  asset: Partial<ITAsset>;
  onClose: () => void;
  onSave: (assetData: Partial<ITAsset>) => void;
  employees: Employee[];
  suppliers: SupplierItem[];
  rooms: EnvironmentRoomItem[];
  categories: CustomCategoryItem[];
  statuses: CustomStatusItem[];
  onOpenAuxiliaryManager?: (tab: 'suppliers' | 'rooms' | 'categories' | 'statuses' | 'employees') => void;
  generateNextTag: () => string;
}

export const AssetEditModal: React.FC<AssetEditModalProps> = ({
  asset,
  onClose,
  onSave,
  employees,
  suppliers,
  rooms,
  categories,
  statuses,
  onOpenAuxiliaryManager,
  generateNextTag
}) => {
  const [formData, setFormData] = useState<Partial<ITAsset>>({
    assetTag: asset.assetTag || generateNextTag(),
    name: asset.name || '',
    category: asset.category || 'hardware_workstation',
    brandModel: asset.brandModel || '',
    serialNumber: asset.serialNumber || `SN-${Math.floor(Math.random() * 900000 + 100000)}`,
    status: asset.status || 'em_estoque',
    lifecycleStage: asset.lifecycleStage || 'compra',
    acquisitionDate: asset.acquisitionDate || new Date().toISOString().split('T')[0],
    purchaseValue: asset.purchaseValue ?? 3500,
    currentValue: asset.currentValue,
    lifespanMonths: asset.lifespanMonths ?? 36,
    salvageValue: asset.salvageValue ?? 300,
    insurancePolicy: asset.insurancePolicy || '',
    warrantyExpiry: asset.warrantyExpiry || new Date(Date.now() + 365*3*24*60*60*1000).toISOString().split('T')[0],
    warrantyType: asset.warrantyType || 'On-Site 3 Anos (Fabricante)',
    warrantySlaHours: asset.warrantySlaHours ?? 24,
    invoiceNumber: asset.invoiceNumber || '',
    supplier: asset.supplier || '',
    supplierCnpj: asset.supplierCnpj || '',
    supplierContact: asset.supplierContact || '',
    contractNumber: asset.contractNumber || '',
    contractType: asset.contractType || 'Aquisicao_Direta',
    contractStartDate: asset.contractStartDate || '',
    contractEndDate: asset.contractEndDate || '',
    contractMonthlyCost: asset.contractMonthlyCost ?? 0,
    assignedEmployeeId: asset.assignedEmployeeId || '',
    assignedEmployeeName: asset.assignedEmployeeName || '',
    custodyTermSigned: asset.custodyTermSigned ?? false,
    roomId: asset.roomId || '',
    roomName: asset.roomName || '',
    building: asset.building || '',
    floor: asset.floor || '',
    quadrantCode: asset.quadrantCode || '',
    locationDetails: asset.locationDetails || '',
    ipAddress: asset.ipAddress || '',
    macAddress: asset.macAddress || '',
    notes: asset.notes || '',
    id: asset.id
  });

  const [activeTab, setActiveTab] = useState<'geral' | 'financeiro' | 'contrato' | 'localizacao'>('geral');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      alert('Por favor, informe o nome/descrição do ativo.');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200 font-sans">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-3xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Box className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                {formData.id ? 'Editar Ativo de TI & Controles' : 'Novo Cadastro de Ativo de TI'}
              </h3>
              <p className="text-[11px] text-slate-500">
                Controle completo: Ciclo de vida, Fornecedor, Contrato, Garantia, Valores, Localização e Responsável
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Tabs */}
        <div className="px-6 pt-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex space-x-2">
          <button
            type="button"
            onClick={() => setActiveTab('geral')}
            className={`px-3 py-1.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer ${
              activeTab === 'geral'
                ? 'bg-white dark:bg-slate-900 text-amber-600 border-t-2 border-amber-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            1. Dados Gerais & Ciclo
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('financeiro')}
            className={`px-3 py-1.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer ${
              activeTab === 'financeiro'
                ? 'bg-white dark:bg-slate-900 text-amber-600 border-t-2 border-amber-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            2. Fornecedor & Financeiro
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('contrato')}
            className={`px-3 py-1.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer ${
              activeTab === 'contrato'
                ? 'bg-white dark:bg-slate-900 text-amber-600 border-t-2 border-amber-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            3. Contrato & Garantia
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('localizacao')}
            className={`px-3 py-1.5 text-xs font-bold rounded-t-xl transition-all cursor-pointer ${
              activeTab === 'localizacao'
                ? 'bg-white dark:bg-slate-900 text-amber-600 border-t-2 border-amber-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            4. Localização & Responsável
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
          
          {/* TAB 1: GERAL & CICLO DE VIDA */}
          {activeTab === 'geral' && (
            <div className="space-y-4">
              {/* Asset Tag & Name */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Número do Patrimônio / Tombo:
                  </label>
                  <div className="flex items-center space-x-1">
                    <input
                      type="text"
                      value={formData.assetTag || ''}
                      onChange={(e) => setFormData(p => ({ ...p, assetTag: e.target.value }))}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-black text-amber-600 dark:text-amber-400"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, assetTag: generateNextTag() }))}
                      className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 rounded-xl cursor-pointer"
                      title="Gerar Próximo Tombo"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nome do Ativo / Descrição Oficial:
                  </label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                    placeholder="Ex: Dell OptiPlex 7090 Micro Core i7"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                    required
                  />
                </div>
              </div>

              {/* Lifecycle Stage & Operational Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                <div>
                  <label className="block font-bold text-amber-950 dark:text-amber-200 mb-1">
                    Etapa no Ciclo de Vida:
                  </label>
                  <select
                    value={formData.lifecycleStage || 'compra'}
                    onChange={(e) => setFormData(p => ({ ...p, lifecycleStage: e.target.value as AssetLifecycleStage }))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-800 rounded-xl font-bold"
                  >
                    {LIFECYCLE_STAGES.map(stage => (
                      <option key={stage.key} value={stage.key}>
                        {stage.order}. {stage.label}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-amber-700 dark:text-amber-300 mt-1 block">
                    Compra → Entrada → Instalação → Utilização → Manutenção → Transferência → Substituição → Descarte
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-amber-950 dark:text-amber-200 mb-1">
                    Status Operacional:
                  </label>
                  <select
                    value={formData.status || 'em_estoque'}
                    onChange={(e) => setFormData(p => ({ ...p, status: e.target.value as AssetStatus }))}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-800 rounded-xl font-bold"
                  >
                    <option value="em_uso">Em Uso / Produção</option>
                    <option value="em_estoque">Em Estoque / Almoxarifado</option>
                    <option value="em_manutencao">Em Manutenção Técnica</option>
                    <option value="reservado">Reservado / Em Preparação</option>
                    <option value="descartado">Descartado / Baixado</option>
                  </select>
                </div>
              </div>

              {/* Category, Brand, Serial */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Categoria:</label>
                  <select
                    value={formData.category || 'hardware_workstation'}
                    onChange={(e) => setFormData(p => ({ ...p, category: e.target.value as AssetCategory }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  >
                    <option value="hardware_server">Servidor Hardware</option>
                    <option value="hardware_network">Rede & Switch/Router</option>
                    <option value="hardware_workstation">Estação de Trabalho / PC</option>
                    <option value="hardware_monitor">Monitor</option>
                    <option value="hardware_printer">Impressora</option>
                    <option value="rack_ups">Nobreak & Rack</option>
                    <option value="software_license">Licença de Software</option>
                    <option value="mobile_tablet">Mobile / Tablet</option>
                    <option value="other">Outros</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Marca & Modelo:</label>
                  <input
                    type="text"
                    value={formData.brandModel || ''}
                    onChange={(e) => setFormData(p => ({ ...p, brandModel: e.target.value }))}
                    placeholder="Ex: Cisco Catalyst 9300"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Número de Série (S/N):</label>
                  <input
                    type="text"
                    value={formData.serialNumber || ''}
                    onChange={(e) => setFormData(p => ({ ...p, serialNumber: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                  />
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Observações Técnicas:</label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  placeholder="Configurações, upgrades de memória, bios, etc..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
                />
              </div>
            </div>
          )}

          {/* TAB 2: FORNECEDOR & FINANCEIRO */}
          {activeTab === 'financeiro' && (
            <div className="space-y-4">
              {/* Fornecedor Controls */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
                  <Building2 className="w-4 h-4 text-amber-500" />
                  <span>Controle do Fornecedor</span>
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Razão Social / Nome:</label>
                    <input
                      type="text"
                      value={formData.supplier || ''}
                      onChange={(e) => setFormData(p => ({ ...p, supplier: e.target.value }))}
                      placeholder="Ex: Dell Computadores Ltda"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">CNPJ do Fornecedor:</label>
                    <input
                      type="text"
                      value={formData.supplierCnpj || ''}
                      onChange={(e) => setFormData(p => ({ ...p, supplierCnpj: e.target.value }))}
                      placeholder="00.000.000/0001-00"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Contato / Suporte Comercial:</label>
                    <input
                      type="text"
                      value={formData.supplierContact || ''}
                      onChange={(e) => setFormData(p => ({ ...p, supplierContact: e.target.value }))}
                      placeholder="vendas@fornecedor.com.br"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Valores & Depreciação */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                  <span>Controle de Valores & Amortização</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Valor de Compra (R$):</label>
                    <input
                      type="number"
                      value={formData.purchaseValue ?? 0}
                      onChange={(e) => setFormData(p => ({ ...p, purchaseValue: Number(e.target.value) }))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Data de Aquisição:</label>
                    <input
                      type="date"
                      value={formData.acquisitionDate || ''}
                      onChange={(e) => setFormData(p => ({ ...p, acquisitionDate: e.target.value }))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Vida Útil (Meses):</label>
                    <input
                      type="number"
                      value={formData.lifespanMonths ?? 36}
                      onChange={(e) => setFormData(p => ({ ...p, lifespanMonths: Number(e.target.value) }))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Valor Sucata Estimado (R$):</label>
                    <input
                      type="number"
                      value={formData.salvageValue ?? 0}
                      onChange={(e) => setFormData(p => ({ ...p, salvageValue: Number(e.target.value) }))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nota Fiscal de Compra (NF-e):</label>
                    <input
                      type="text"
                      value={formData.invoiceNumber || ''}
                      onChange={(e) => setFormData(p => ({ ...p, invoiceNumber: e.target.value }))}
                      placeholder="Ex: NF-0038910"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Apólice de Seguro de Ativo:</label>
                    <input
                      type="text"
                      value={formData.insurancePolicy || ''}
                      onChange={(e) => setFormData(p => ({ ...p, insurancePolicy: e.target.value }))}
                      placeholder="Ex: Porto Seguro TI-99482"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CONTRATO & GARANTIA */}
          {activeTab === 'contrato' && (
            <div className="space-y-4">
              {/* Contrato Controls */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
                  <FileText className="w-4 h-4 text-indigo-500" />
                  <span>Contrato Administrativo</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Número do Contrato:</label>
                    <input
                      type="text"
                      value={formData.contractNumber || ''}
                      onChange={(e) => setFormData(p => ({ ...p, contractNumber: e.target.value }))}
                      placeholder="Ex: CT-2026/049"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Modalidade do Contrato:</label>
                    <select
                      value={formData.contractType || 'Aquisicao_Direta'}
                      onChange={(e) => setFormData(p => ({ ...p, contractType: e.target.value as AssetContractType }))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                    >
                      <option value="Aquisicao_Direta">Aquisição Direta (CAPEX)</option>
                      <option value="Locacao_Leasing">Locação / Leasing Operacional (OPEX)</option>
                      <option value="Suporte_SLA">Suporte Técnico & SLA</option>
                      <option value="Garantia_Estendida">Garantia Estendida</option>
                      <option value="Comodato">Comodato</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Custo Mensal Recorrente (R$):</label>
                    <input
                      type="number"
                      value={formData.contractMonthlyCost ?? 0}
                      onChange={(e) => setFormData(p => ({ ...p, contractMonthlyCost: Number(e.target.value) }))}
                      placeholder="0.00"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Início da Vigência:</label>
                    <input
                      type="date"
                      value={formData.contractStartDate || ''}
                      onChange={(e) => setFormData(p => ({ ...p, contractStartDate: e.target.value }))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Término da Vigência:</label>
                    <input
                      type="date"
                      value={formData.contractEndDate || ''}
                      onChange={(e) => setFormData(p => ({ ...p, contractEndDate: e.target.value }))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Garantia Controls */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Controle de Garantia & SLA</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Vencimento da Garantia:</label>
                    <input
                      type="date"
                      value={formData.warrantyExpiry || ''}
                      onChange={(e) => setFormData(p => ({ ...p, warrantyExpiry: e.target.value }))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Tipo de Cobertura:</label>
                    <input
                      type="text"
                      value={formData.warrantyType || ''}
                      onChange={(e) => setFormData(p => ({ ...p, warrantyType: e.target.value }))}
                      placeholder="Ex: On-Site 24x7 ProSupport"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">SLA de Atendimento (Horas):</label>
                    <input
                      type="number"
                      value={formData.warrantySlaHours ?? 24}
                      onChange={(e) => setFormData(p => ({ ...p, warrantySlaHours: Number(e.target.value) }))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: LOCALIZAÇÃO & RESPONSÁVEL */}
          {activeTab === 'localizacao' && (
            <div className="space-y-4">
              {/* Responsável */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
                  <User className="w-4 h-4 text-indigo-500" />
                  <span>Responsável / Custódia</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Colaborador Titular:</label>
                    <select
                      value={formData.assignedEmployeeId || ''}
                      onChange={(e) => {
                        const empId = e.target.value;
                        const emp = employees.find(m => m.id === empId);
                        setFormData(p => ({
                          ...p,
                          assignedEmployeeId: empId,
                          assignedEmployeeName: emp ? `${emp.name} (${emp.department})` : ''
                        }));
                      }}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                    >
                      <option value="">Nenhum (Disponível em Estoque / Uso Compartilhado)</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name} - {emp.department} ({emp.role})</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center space-x-2 pt-6">
                    <input
                      type="checkbox"
                      id="custodyCheck"
                      checked={formData.custodyTermSigned || false}
                      onChange={(e) => setFormData(p => ({ ...p, custodyTermSigned: e.target.checked }))}
                      className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                    />
                    <label htmlFor="custodyCheck" className="font-bold text-slate-700 dark:text-slate-300 cursor-pointer">
                      Termo de Responsabilidade / Cautela Assinado e Arquivado
                    </label>
                  </div>
                </div>
              </div>

              {/* Localização Física */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center space-x-1.5">
                  <Building2 className="w-4 h-4 text-emerald-500" />
                  <span>Localização Física do Ativo</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Prédio / Unidade:</label>
                    <input
                      type="text"
                      value={formData.building || ''}
                      onChange={(e) => setFormData(p => ({ ...p, building: e.target.value }))}
                      placeholder="Ex: Sede Central"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Andar / Pavimento:</label>
                    <input
                      type="text"
                      value={formData.floor || ''}
                      onChange={(e) => setFormData(p => ({ ...p, floor: e.target.value }))}
                      placeholder="Ex: 3º Andar"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Sala / Ambiente:</label>
                    <input
                      type="text"
                      value={formData.roomName || ''}
                      onChange={(e) => setFormData(p => ({ ...p, roomName: e.target.value }))}
                      placeholder="Ex: Sala de Servidores / Data Center"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Posição / Rack:</label>
                    <input
                      type="text"
                      value={formData.locationDetails || ''}
                      onChange={(e) => setFormData(p => ({ ...p, locationDetails: e.target.value }))}
                      placeholder="Ex: Rack R01 - U42"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Endereço IP:</label>
                    <input
                      type="text"
                      value={formData.ipAddress || ''}
                      onChange={(e) => setFormData(p => ({ ...p, ipAddress: e.target.value }))}
                      placeholder="192.168.1.10"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Endereço MAC:</label>
                    <input
                      type="text"
                      value={formData.macAddress || ''}
                      onChange={(e) => setFormData(p => ({ ...p, macAddress: e.target.value }))}
                      placeholder="00:1A:2B:3C:4D:5E"
                      className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="text-[11px] text-slate-400">
              {activeTab === 'geral' && 'Página 1/4 - Dados Cadastrais'}
              {activeTab === 'financeiro' && 'Página 2/4 - Fornecedor e Valores'}
              {activeTab === 'contrato' && 'Página 3/4 - Contrato e Garantia'}
              {activeTab === 'localizacao' && 'Página 4/4 - Localização e Custódia'}
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-md shadow-amber-600/20 cursor-pointer flex items-center space-x-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Ativo no Patrimônio</span>
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
