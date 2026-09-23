import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  Tag, 
  User, 
  Building2, 
  DollarSign, 
  Calendar, 
  ShieldCheck, 
  Layers 
} from 'lucide-react';
import { InventoryDiscoveredAsset } from '../../types/inventoryDiscovery';
import { Employee, EnvironmentRoomItem, CustomCategoryItem } from '../../types';

interface ApproveAssetModalProps {
  asset: InventoryDiscoveredAsset | null;
  suggestedTag: string;
  employees: Employee[];
  rooms: EnvironmentRoomItem[];
  categories: CustomCategoryItem[];
  onClose: () => void;
  onConfirmApprove: (approvedData: {
    assetTag: string;
    name: string;
    category: string;
    assignedEmployeeId?: string;
    assignedEmployeeName?: string;
    assignedDepartment?: string;
    roomId?: string;
    roomName?: string;
    purchaseValue: number;
    acquisitionDate: string;
    warrantyExpiry: string;
  }) => void;
}

export const ApproveAssetModal: React.FC<ApproveAssetModalProps> = ({
  asset,
  suggestedTag,
  employees = [],
  rooms = [],
  categories = [],
  onClose,
  onConfirmApprove
}) => {
  if (!asset) return null;

  const todayStr = new Date().toISOString().split('T')[0];
  const in3YearsStr = new Date(Date.now() + 365 * 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const [assetTag, setAssetTag] = useState(suggestedTag || 'PAT-2026-0025');
  const [name, setName] = useState(asset.name || 'Novo Ativo TI');
  const [category, setCategory] = useState(asset.category || 'hardware_workstation');
  const [selectedEmpId, setSelectedEmpId] = useState(
    employees.find(e => e.name.toLowerCase().includes((asset.assignedUser || '').toLowerCase()))?.id || ''
  );
  const [selectedRoomId, setSelectedRoomId] = useState(rooms[0]?.id || '');
  const [purchaseValue, setPurchaseValue] = useState(6500);
  const [acquisitionDate, setAcquisitionDate] = useState(todayStr);
  const [warrantyExpiry, setWarrantyExpiry] = useState(in3YearsStr);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find(e => e.id === selectedEmpId);
    const rm = rooms.find(r => r.id === selectedRoomId);

    onConfirmApprove({
      assetTag,
      name,
      category,
      assignedEmployeeId: emp?.id,
      assignedEmployeeName: emp?.name,
      assignedDepartment: emp?.department,
      roomId: rm?.id,
      roomName: rm?.name,
      purchaseValue: Number(purchaseValue) || 0,
      acquisitionDate,
      warrantyExpiry
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg flex flex-col shadow-2xl overflow-hidden font-sans">
        
        {/* HEADER */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-emerald-500/10 dark:bg-emerald-950/30">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md shadow-emerald-600/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                Aprovar & Efetivar no Inventário
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Geração de tombo patrimonial e vinculação oficial
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FORM */}
        <form onSubmit={handleSave} className="p-5 space-y-4 text-xs overflow-y-auto max-h-[75vh]">
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                Tombo / Plaqueta (Auto)
              </label>
              <div className="relative">
                <Tag className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  required
                  value={assetTag}
                  onChange={e => setAssetTag(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-emerald-600 dark:text-emerald-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                Nome do Ativo
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Hardware Coletado</span>
            <p className="font-semibold text-slate-800 dark:text-slate-200">
              {asset.brandModel} &bull; {asset.os} &bull; {asset.ram} &bull; {asset.disk}
            </p>
            <p className="font-mono text-[11px] text-slate-500">
              IP: {asset.ipAddress} | MAC: {asset.macAddress}
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
              Categoria do Patrimônio
            </label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-medium text-slate-800 dark:text-slate-200"
            >
              <option value="hardware_workstation">Estação de Trabalho / Notebook</option>
              <option value="hardware_server">Servidor de Infraestrutura</option>
              <option value="hardware_network">Equipamento de Rede & Switch</option>
              <option value="hardware_printer">Impressora / Periférico</option>
              <option value="mobile_tablet">Mobile / Tablet</option>
              <option value="other">Outros Ativos</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                Colaborador Designado
              </label>
              <select
                value={selectedEmpId}
                onChange={e => setSelectedEmpId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
              >
                <option value="">Sem colaborador</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.department})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                Ambiente / Sala
              </label>
              <select
                value={selectedRoomId}
                onChange={e => setSelectedRoomId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
              >
                <option value="">Selecione a sala</option>
                {rooms.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.quadrantCode})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                Valor de Aquisição (R$)
              </label>
              <input
                type="number"
                value={purchaseValue}
                onChange={e => setPurchaseValue(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1">
                Expiração da Garantia
              </label>
              <input
                type="date"
                value={warrantyExpiry}
                onChange={e => setWarrantyExpiry(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>

          {/* ACTIONS */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center space-x-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirmar & Inserir no Inventário</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
