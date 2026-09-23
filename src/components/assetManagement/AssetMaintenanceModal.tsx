import React, { useState } from 'react';
import { X, Wrench, Calendar, User, DollarSign, Save, Tag, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ITAsset, AssetMaintenanceRecord } from '../../types';

interface AssetMaintenanceModalProps {
  assets: ITAsset[];
  initialAsset?: ITAsset;
  maintenanceToEdit?: AssetMaintenanceRecord;
  onClose: () => void;
  onSaveMaintenance: (record: AssetMaintenanceRecord) => void;
}

export const AssetMaintenanceModal: React.FC<AssetMaintenanceModalProps> = ({
  assets,
  initialAsset,
  maintenanceToEdit,
  onClose,
  onSaveMaintenance
}) => {
  const [selectedAssetId, setSelectedAssetId] = useState<string>(
    maintenanceToEdit?.assetId || initialAsset?.id || (assets.length > 0 ? assets[0].id : '')
  );

  const selectedAsset = assets.find(a => a.id === selectedAssetId) || initialAsset || assets[0];

  const [type, setType] = useState<'preventiva' | 'corretiva' | 'upgrade' | 'garantia_fabricante'>(
    maintenanceToEdit?.type || 'preventiva'
  );
  const [title, setTitle] = useState<string>(maintenanceToEdit?.title || '');
  const [description, setDescription] = useState<string>(maintenanceToEdit?.description || '');
  const [openDate, setOpenDate] = useState<string>(
    maintenanceToEdit?.openDate || new Date().toISOString().split('T')[0]
  );
  const [closeDate, setCloseDate] = useState<string>(maintenanceToEdit?.closeDate || '');
  const [status, setStatus] = useState<'aberta' | 'em_andamento' | 'aguardando_pecas' | 'concluida' | 'cancelada'>(
    maintenanceToEdit?.status || 'em_andamento'
  );
  const [technician, setTechnician] = useState<string>(maintenanceToEdit?.technician || 'Suporte TI Interno');
  const [cost, setCost] = useState<number>(maintenanceToEdit?.cost || 0);
  const [partsReplaced, setPartsReplaced] = useState<string>(maintenanceToEdit?.partsReplaced || '');
  const [invoiceNumber, setInvoiceNumber] = useState<string>(maintenanceToEdit?.invoiceNumber || '');
  const [notes, setNotes] = useState<string>(maintenanceToEdit?.notes || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      alert('Por favor, preencha o título e a descrição da manutenção.');
      return;
    }

    const record: AssetMaintenanceRecord = {
      id: maintenanceToEdit?.id || `maint-${Date.now()}`,
      assetId: selectedAsset?.id || selectedAssetId,
      assetTag: selectedAsset?.assetTag || 'PAT-TEMP',
      assetName: selectedAsset?.name || 'Ativo',
      type,
      title,
      description,
      openDate,
      closeDate: closeDate || (status === 'concluida' ? new Date().toISOString().split('T')[0] : undefined),
      status,
      technician,
      cost: Number(cost) || 0,
      partsReplaced: partsReplaced.trim() || undefined,
      invoiceNumber: invoiceNumber.trim() || undefined,
      notes: notes.trim() || undefined
    };

    onSaveMaintenance(record);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200 font-sans">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                {maintenanceToEdit ? 'Editar Ordem de Manutenção' : 'Nova Ordem de Manutenção de Ativo'}
              </h3>
              <p className="text-[11px] text-slate-500">
                Controle de intervenções preventivas, corretivas, garantia e substituição de peças
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          
          {/* Asset selection */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Ativo Vinculado (Tombo / Patrimônio):
            </label>
            <select
              value={selectedAssetId}
              onChange={(e) => setSelectedAssetId(e.target.value)}
              disabled={!!maintenanceToEdit || !!initialAsset}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold font-mono"
            >
              {assets.map(a => (
                <option key={a.id} value={a.id}>
                  {a.assetTag} - {a.name} ({a.brandModel})
                </option>
              ))}
            </select>
          </div>

          {/* Maintenance Type & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tipo de Manutenção:
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
              >
                <option value="preventiva">Preventiva (Revisão / Limpeza / Troca periódica)</option>
                <option value="corretiva">Corretiva (Falha / Dano / Troca de peças)</option>
                <option value="upgrade">Upgrade de Hardware (Memória, SSD, GPU)</option>
                <option value="garantia_fabricante">Garantia do Fabricante (RMA / Chamado Oficial)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Status da Ordem de Serviço:
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
              >
                <option value="aberta">Aberta / Triagem</option>
                <option value="em_andamento">Em Andamento na Bancada</option>
                <option value="aguardando_pecas">Aguardando Peças / Envio</option>
                <option value="concluida">Concluída & Testada</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Título da Manutenção / Problema:
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Troca de pasta térmica e expansão de RAM para 64GB"
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
              Relato Técnico & Descrição do Procedimento:
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Descreva o sintoma relatado, diagnóstico, ações realizadas e resultados dos testes..."
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium"
              required
            />
          </div>

          {/* Dates & Cost */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Data de Abertura:
              </label>
              <input
                type="date"
                value={openDate}
                onChange={(e) => setOpenDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Data de Conclusão:
              </label>
              <input
                type="date"
                value={closeDate}
                onChange={(e) => setCloseDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Custo Total (R$):
              </label>
              <input
                type="number"
                value={cost}
                onChange={(e) => setCost(Number(e.target.value))}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold font-mono"
              />
            </div>
          </div>

          {/* Technician, Parts & Invoice */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Técnico / Fornecedor:
              </label>
              <input
                type="text"
                value={technician}
                onChange={(e) => setTechnician(e.target.value)}
                placeholder="Nome do técnico ou assistência"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                required
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                Peças Substituídas:
              </label>
              <input
                type="text"
                value={partsReplaced}
                onChange={(e) => setPartsReplaced(e.target.value)}
                placeholder="Ex: 2x 32GB DDR5 ECC"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                NF / Recibo do Serviço:
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Ex: NFS-e 10928"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold font-mono"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-bold text-xs shadow-md shadow-orange-600/20 cursor-pointer flex items-center space-x-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Ordem de Manutenção</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
