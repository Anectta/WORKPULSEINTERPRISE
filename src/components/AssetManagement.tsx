import React, { useState, useMemo, useEffect } from 'react';
import { 
  Box, 
  Plus, 
  Search, 
  Filter, 
  Edit3, 
  Trash2, 
  Download, 
  Upload, 
  QrCode, 
  Network, 
  Building2, 
  User, 
  Calendar, 
  DollarSign, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Wrench, 
  Printer, 
  HardDrive, 
  Server, 
  Monitor, 
  Wifi, 
  Cpu, 
  FileText, 
  Copy, 
  X, 
  Save, 
  ExternalLink,
  Tag,
  BarChart2,
  RefreshCw,
  Sliders,
  Layers,
  ArrowUpRight,
  Eye,
  FileCheck,
  ArrowRight,
  Compass,
  LayoutDashboard
} from 'lucide-react';
import { 
  ITAsset, 
  AssetCategory, 
  AssetStatus, 
  AssetLifecycleStage,
  AssetContractType,
  AssetHistoryEvent,
  AssetMaintenanceRecord,
  Employee, 
  SupplierItem, 
  EnvironmentRoomItem, 
  CustomCategoryItem, 
  CustomStatusItem 
} from '../types';
import { AuxiliaryTablesManager } from './AuxiliaryTablesManager';
import { AssetLifecycleStepper } from './assetManagement/AssetLifecycleStepper';
import { AssetLifecycleKanban } from './assetManagement/AssetLifecycleKanban';
import { AssetDetailModal } from './assetManagement/AssetDetailModal';
import { AssetTransitionModal } from './assetManagement/AssetTransitionModal';
import { AssetCustodyTermModal } from './assetManagement/AssetCustodyTermModal';
import { AssetMaintenanceModal } from './assetManagement/AssetMaintenanceModal';
import { AssetMaintenanceView } from './assetManagement/AssetMaintenanceView';
import { AssetContractsView } from './assetManagement/AssetContractsView';
import { AssetEditModal } from './assetManagement/AssetEditModal';
import { CentralDiscoveryHub } from './assetManagement/CentralDiscoveryHub';
import { AssetDashboardView } from './assetManagement/AssetDashboardView';
import { INITIAL_DISCOVERED_ASSETS, INITIAL_DISCOVERY_ALERTS } from '../data/initialDiscoveryAssets';
import { InventoryDiscoveredAsset, DiscoveryAlert } from '../types/inventoryDiscovery';
import { LIFECYCLE_STAGES } from './assetManagement/lifecycleConfig';

interface AssetManagementProps {
  assets: ITAsset[];
  setAssets: React.Dispatch<React.SetStateAction<ITAsset[]>>;
  employees: Employee[];
  setEmployees?: React.Dispatch<React.SetStateAction<Employee[]>>;
  suppliers?: SupplierItem[];
  setSuppliers?: React.Dispatch<React.SetStateAction<SupplierItem[]>>;
  rooms?: EnvironmentRoomItem[];
  setRooms?: React.Dispatch<React.SetStateAction<EnvironmentRoomItem[]>>;
  categories?: CustomCategoryItem[];
  setCategories?: React.Dispatch<React.SetStateAction<CustomCategoryItem[]>>;
  statuses?: CustomStatusItem[];
  setStatuses?: React.Dispatch<React.SetStateAction<CustomStatusItem[]>>;
  onNavigateToTopology?: (nodeId?: string) => void;
  openAddModalTrigger?: number;
}

export const AssetManagement: React.FC<AssetManagementProps> = ({
  assets,
  setAssets,
  employees,
  setEmployees,
  suppliers = [],
  setSuppliers,
  rooms = [],
  setRooms,
  categories = [],
  setCategories,
  statuses = [],
  setStatuses,
  onNavigateToTopology,
  openAddModalTrigger
}) => {
  // Filters & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [lifecycleFilter, setLifecycleFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'assetTag' | 'name' | 'purchaseValue' | 'acquisitionDate'>('assetTag');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Active View Tab inside Asset Management
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'table' | 'discovery_hub' | 'lifecycle' | 'maintenances' | 'contracts' | 'financial' | 'warranty_alerts'>('dashboard');

  // Discovered Assets & Alerts state (Central de Descoberta)
  const [discoveredAssets, setDiscoveredAssets] = useState<InventoryDiscoveredAsset[]>(() => {
    const saved = localStorage.getItem('workpulse_discovered_inventory_assets');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return INITIAL_DISCOVERED_ASSETS;
  });

  useEffect(() => {
    localStorage.setItem('workpulse_discovered_inventory_assets', JSON.stringify(discoveredAssets));
  }, [discoveredAssets]);

  const [discoveryAlerts, setDiscoveryAlerts] = useState<DiscoveryAlert[]>(() => {
    const saved = localStorage.getItem('workpulse_discovery_alerts');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return INITIAL_DISCOVERY_ALERTS;
  });

  useEffect(() => {
    localStorage.setItem('workpulse_discovery_alerts', JSON.stringify(discoveryAlerts));
  }, [discoveryAlerts]);

  // Modal States
  const [editingAsset, setEditingAsset] = useState<Partial<ITAsset> | null>(null);
  const [selectedTagAsset, setSelectedTagAsset] = useState<ITAsset | null>(null);
  const [selectedDetailAsset, setSelectedDetailAsset] = useState<ITAsset | null>(null);
  const [selectedTransitionAsset, setSelectedTransitionAsset] = useState<ITAsset | null>(null);
  const [selectedCustodyAsset, setSelectedCustodyAsset] = useState<ITAsset | null>(null);
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState<boolean>(false);
  const [maintenanceToEdit, setMaintenanceToEdit] = useState<AssetMaintenanceRecord | undefined>(undefined);
  const [maintenanceInitialAsset, setMaintenanceInitialAsset] = useState<ITAsset | undefined>(undefined);
  const [isAuxiliaryManagerOpen, setIsAuxiliaryManagerOpen] = useState<boolean>(false);
  const [auxiliaryInitialTab, setAuxiliaryInitialTab] = useState<'suppliers' | 'rooms' | 'categories' | 'statuses' | 'employees'>('suppliers');

  // Category Icon & Label Map
  const categoryConfig: Record<AssetCategory, { label: string; icon: React.ReactNode; color: string }> = {
    hardware_server: { label: 'Servidor', icon: <Server className="w-3.5 h-3.5" />, color: 'bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300' },
    hardware_network: { label: 'Rede & Switch', icon: <Network className="w-3.5 h-3.5" />, color: 'bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-blue-300' },
    hardware_workstation: { label: 'Estação / PC', icon: <Cpu className="w-3.5 h-3.5" />, color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300' },
    hardware_monitor: { label: 'Monitor', icon: <Monitor className="w-3.5 h-3.5" />, color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/80 dark:text-cyan-300' },
    hardware_peripheral: { label: 'Periférico', icon: <Box className="w-3.5 h-3.5" />, color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
    hardware_printer: { label: 'Impressora', icon: <Printer className="w-3.5 h-3.5" />, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300' },
    software_license: { label: 'Licença Software', icon: <FileText className="w-3.5 h-3.5" />, color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300' },
    mobile_tablet: { label: 'Mobile / Tablet', icon: <Wifi className="w-3.5 h-3.5" />, color: 'bg-teal-100 text-teal-700 dark:bg-teal-950/80 dark:text-teal-300' },
    rack_ups: { label: 'Nobreak & Rack', icon: <HardDrive className="w-3.5 h-3.5" />, color: 'bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300' },
    other: { label: 'Outros', icon: <Box className="w-3.5 h-3.5" />, color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  };

  // Agent Status Badge Config
  const agentStatusConfig = {
    online: { label: 'Agente Online', bg: 'bg-emerald-100 dark:bg-emerald-950/80', text: 'text-emerald-700 dark:text-emerald-300', dotBg: 'bg-emerald-500' },
    offline: { label: 'Agente Offline', bg: 'bg-rose-100 dark:bg-rose-950/80', text: 'text-rose-700 dark:text-rose-300', dotBg: 'bg-rose-500' },
  };

  // Status Badge Config
  const statusConfig: Record<AssetStatus, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
    em_uso: { label: 'Em Uso', bg: 'bg-emerald-100 dark:bg-emerald-950/80', text: 'text-emerald-700 dark:text-emerald-300', icon: <CheckCircle2 className="w-3 h-3" /> },
    em_estoque: { label: 'Em Estoque', bg: 'bg-blue-100 dark:bg-blue-950/80', text: 'text-blue-700 dark:text-blue-300', icon: <Box className="w-3 h-3" /> },
    em_manutencao: { label: 'Em Manutenção', bg: 'bg-amber-100 dark:bg-amber-950/80', text: 'text-amber-700 dark:text-amber-300', icon: <Wrench className="w-3 h-3" /> },
    descartado: { label: 'Descartado / Baixado', bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-500 dark:text-slate-400', icon: <X className="w-3 h-3" /> },
    reservado: { label: 'Reservado', bg: 'bg-purple-100 dark:bg-purple-950/80', text: 'text-purple-700 dark:text-purple-300', icon: <Clock className="w-3 h-3" /> },
  };

  // Auto-generate unique Tombo / Asset Tag
  const handleGenerateNextTag = () => {
    const year = new Date().getFullYear();
    const existingNumbers = assets
      .map(a => {
        const match = a.assetTag.match(/PAT-\d+-(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      })
      .filter(n => !isNaN(n));
    const nextNum = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
    return `PAT-${year}-${String(nextNum).padStart(4, '0')}`;
  };

  // Handle Save Asset (Create or Edit)
  const handleSaveAsset = (assetData: Partial<ITAsset>) => {
    if (!assetData.name || !assetData.category) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const assetTag = assetData.assetTag || handleGenerateNextTag();

    // Calculate Residual Value based on straight-line depreciation
    const purchaseVal = Number(assetData.purchaseValue || 0);
    const lifespan = Number(assetData.lifespanMonths || 36);
    let residualVal = purchaseVal;

    if (assetData.acquisitionDate && purchaseVal > 0) {
      const acqDate = new Date(assetData.acquisitionDate);
      const now = new Date();
      const diffMonths = (now.getFullYear() - acqDate.getFullYear()) * 12 + (now.getMonth() - acqDate.getMonth());
      const monthlyDep = purchaseVal / lifespan;
      residualVal = Math.max(0, purchaseVal - (monthlyDep * Math.max(0, diffMonths)));
    }

    if (assetData.id) {
      // Update existing
      setAssets(prev => prev.map(a => {
        if (a.id === assetData.id) {
          const updated: ITAsset = {
            ...a,
            ...assetData,
            assetTag,
            purchaseValue: purchaseVal,
            currentValue: Number(residualVal.toFixed(2)),
          } as ITAsset;
          if (selectedDetailAsset && selectedDetailAsset.id === a.id) {
            setSelectedDetailAsset(updated);
          }
          return updated;
        }
        return a;
      }));
    } else {
      // Create new
      const newAsset: ITAsset = {
        id: `ast-${Date.now()}`,
        assetTag,
        name: assetData.name || 'Novo Ativo TI',
        category: (assetData.category as AssetCategory) || 'hardware_workstation',
        brandModel: assetData.brandModel || 'Genérico',
        serialNumber: assetData.serialNumber || `SN-${Math.floor(Math.random() * 900000 + 100000)}`,
        status: (assetData.status as AssetStatus) || 'em_estoque',
        lifecycleStage: (assetData.lifecycleStage as AssetLifecycleStage) || 'compra',
        acquisitionDate: assetData.acquisitionDate || todayStr,
        purchaseValue: purchaseVal,
        currentValue: Number(residualVal.toFixed(2)),
        warrantyExpiry: assetData.warrantyExpiry || todayStr,
        warrantyType: assetData.warrantyType || 'On-Site Fabricante',
        warrantySlaHours: assetData.warrantySlaHours || 24,
        invoiceNumber: assetData.invoiceNumber || '',
        supplier: assetData.supplier || '',
        supplierCnpj: assetData.supplierCnpj || '',
        supplierContact: assetData.supplierContact || '',
        contractNumber: assetData.contractNumber || '',
        contractType: assetData.contractType || 'Aquisicao_Direta',
        contractStartDate: assetData.contractStartDate || todayStr,
        contractEndDate: assetData.contractEndDate || assetData.warrantyExpiry || todayStr,
        contractMonthlyCost: assetData.contractMonthlyCost || 0,
        assignedEmployeeId: assetData.assignedEmployeeId || '',
        assignedEmployeeName: assetData.assignedEmployeeName || '',
        custodyTermSigned: assetData.custodyTermSigned || false,
        roomId: assetData.roomId || '',
        roomName: assetData.roomName || '',
        building: assetData.building || '',
        floor: assetData.floor || '',
        quadrantCode: assetData.quadrantCode || '',
        linkedTopologyNodeId: assetData.linkedTopologyNodeId || '',
        macAddress: assetData.macAddress || '',
        ipAddress: assetData.ipAddress || '',
        locationDetails: assetData.locationDetails || '',
        lifespanMonths: lifespan,
        salvageValue: assetData.salvageValue || 0,
        insurancePolicy: assetData.insurancePolicy || '',
        notes: assetData.notes || '',
        history: [
          {
            id: `hist-${Date.now()}`,
            date: todayStr,
            type: 'aquisicao',
            toStage: assetData.lifecycleStage || 'compra',
            title: 'Cadastro no Patrimônio & Ciclo Inicial',
            description: `Ativo tombado com plaqueta ${assetTag} e adicionado ao inventário na etapa ${assetData.lifecycleStage || 'compra'}.`,
            performedBy: 'Administrador de TI'
          }
        ],
        maintenances: [],
        createdAt: new Date().toISOString()
      };
      setAssets(prev => [newAsset, ...prev]);
    }

    setEditingAsset(null);
  };

  // Lifecycle Stage Transition Handler
  const handleSaveTransition = (
    assetId: string,
    toStage: AssetLifecycleStage,
    notes?: string,
    reason?: string,
    technician?: string
  ) => {
    const todayStr = new Date().toISOString().split('T')[0];

    setAssets(prev => prev.map(a => {
      if (a.id === assetId) {
        const oldStage = a.lifecycleStage || 'utilizacao';
        const newHistoryEvent: AssetHistoryEvent = {
          id: `hist-${Date.now()}`,
          date: todayStr,
          type: 'transicao_ciclo',
          fromStage: oldStage,
          toStage,
          title: `Transição de Ciclo: ${oldStage.toUpperCase()} → ${toStage.toUpperCase()}`,
          description: notes || `Ativo avançou no ciclo de vida (${reason || 'Rotina operacional'}).`,
          performedBy: technician || 'Suporte de TI WorkPulse'
        };

        let newStatus: AssetStatus = a.status;
        if (toStage === 'descarte') newStatus = 'descartado';
        else if (toStage === 'manutencao') newStatus = 'em_manutencao';
        else if (toStage === 'utilizacao') newStatus = 'em_uso';
        else if (toStage === 'entrada') newStatus = 'em_estoque';

        const updated: ITAsset = {
          ...a,
          lifecycleStage: toStage,
          status: newStatus,
          history: [newHistoryEvent, ...(a.history || [])]
        };

        if (selectedDetailAsset && selectedDetailAsset.id === assetId) {
          setSelectedDetailAsset(updated);
        }

        return updated;
      }
      return a;
    }));

    setSelectedTransitionAsset(null);
  };

  // Add Manual History Event
  const handleAddHistoryEvent = (assetId: string, event: Omit<AssetHistoryEvent, 'id'>) => {
    const newEvent: AssetHistoryEvent = {
      ...event,
      id: `hist-${Date.now()}`
    };

    setAssets(prev => prev.map(a => {
      if (a.id === assetId) {
        const updated: ITAsset = {
          ...a,
          history: [newEvent, ...(a.history || [])]
        };
        if (selectedDetailAsset && selectedDetailAsset.id === assetId) {
          setSelectedDetailAsset(updated);
        }
        return updated;
      }
      return a;
    }));
  };

  // Save / Update Maintenance Order
  const handleSaveMaintenance = (record: AssetMaintenanceRecord) => {
    setAssets(prev => prev.map(a => {
      if (a.id === record.assetId) {
        const existingMaintIndex = (a.maintenances || []).findIndex(m => m.id === record.id);
        let updatedMaintenances = [...(a.maintenances || [])];

        if (existingMaintIndex >= 0) {
          updatedMaintenances[existingMaintIndex] = record;
        } else {
          updatedMaintenances = [record, ...updatedMaintenances];
        }

        const historyItem: AssetHistoryEvent = {
          id: `hist-${Date.now()}`,
          date: record.openDate,
          type: 'manutencao',
          title: `O.S. Manutenção: ${record.title} (${record.type.toUpperCase()})`,
          description: `${record.description} | Status: ${record.status.toUpperCase()} | Técnico: ${record.technician}`,
          performedBy: record.technician,
          cost: record.cost
        };

        const updated: ITAsset = {
          ...a,
          maintenances: updatedMaintenances,
          history: [historyItem, ...(a.history || [])]
        };

        if (selectedDetailAsset && selectedDetailAsset.id === a.id) {
          setSelectedDetailAsset(updated);
        }

        return updated;
      }
      return a;
    }));
  };

  // Mark Maintenance as Completed
  const handleCompleteMaintenance = (record: AssetMaintenanceRecord) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const completedRecord: AssetMaintenanceRecord = {
      ...record,
      status: 'concluida',
      closeDate: todayStr
    };
    handleSaveMaintenance(completedRecord);
  };

  // Confirm Custody Term Signed
  const handleConfirmCustodyTerm = (assetId: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    setAssets(prev => prev.map(a => {
      if (a.id === assetId) {
        const historyItem: AssetHistoryEvent = {
          id: `hist-${Date.now()}`,
          date: todayStr,
          type: 'termo',
          title: 'Termo de Responsabilidade e Cautela Assinado',
          description: `Termo assinado e vinculado ao colaborador ${a.assignedEmployeeName || 'Designado'}.`,
          performedBy: 'Administrador ITAM'
        };
        const updated: ITAsset = {
          ...a,
          custodyTermSigned: true,
          custodyTermDate: todayStr,
          history: [historyItem, ...(a.history || [])]
        };
        if (selectedDetailAsset && selectedDetailAsset.id === a.id) {
          setSelectedDetailAsset(updated);
        }
        return updated;
      }
      return a;
    }));
  };

  React.useEffect(() => {
    if (openAddModalTrigger && openAddModalTrigger > 0) {
      setEditingAsset({
        assetTag: handleGenerateNextTag(),
        category: categories[0]?.code || 'hardware_workstation',
        status: statuses[0]?.code || 'em_estoque',
        acquisitionDate: new Date().toISOString().split('T')[0],
        purchaseValue: 5000,
        lifespanMonths: 36,
        warrantyExpiry: new Date(Date.now() + 365*3*24*60*60*1000).toISOString().split('T')[0]
      });
    }
  }, [openAddModalTrigger]);

  // Delete Asset
  const handleDeleteAsset = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este Ativo de TI do Patrimônio?')) {
      setAssets(prev => prev.filter(a => a.id !== id));
    }
  };

  // Filtered & Sorted Assets
  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const matchSearch = 
        asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.assetTag.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.brandModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (asset.assignedEmployeeName && asset.assignedEmployeeName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (asset.invoiceNumber && asset.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchCategory = categoryFilter === 'all' || asset.category === categoryFilter;
      const matchStatus = statusFilter === 'all' || asset.status === statusFilter;
      const matchLifecycle = lifecycleFilter === 'all' || (asset.lifecycleStage || 'utilizacao') === lifecycleFilter;

      return matchSearch && matchCategory && matchStatus && matchLifecycle;
    }).sort((a, b) => {
      let valA: any = a[sortBy];
      let valB: any = b[sortBy];

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [assets, searchTerm, categoryFilter, statusFilter, sortBy, sortOrder]);

  // Metrics Calculations
  const totalPurchaseValue = useMemo(() => assets.reduce((sum, a) => sum + (a.purchaseValue || 0), 0), [assets]);
  const totalCurrentValue = useMemo(() => assets.reduce((sum, a) => sum + (a.currentValue ?? a.purchaseValue ?? 0), 0), [assets]);
  const totalDepreciation = totalPurchaseValue - totalCurrentValue;

  const countInUse = useMemo(() => assets.filter(a => a.status === 'em_uso').length, [assets]);
  const countInStock = useMemo(() => assets.filter(a => a.status === 'em_estoque').length, [assets]);
  const countInMaintenance = useMemo(() => assets.filter(a => a.status === 'em_manutencao').length, [assets]);

  // Warranty Alerts (< 90 days)
  const expiringWarranties = useMemo(() => {
    const today = new Date();
    const in90Days = new Date();
    in90Days.setDate(today.getDate() + 90);

    return assets.filter(a => {
      if (!a.warrantyExpiry) return false;
      const expDate = new Date(a.warrantyExpiry);
      return expDate >= today && expDate <= in90Days;
    });
  }, [assets]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Tombo / Tag', 'Nome do Ativo', 'Categoria', 'Marca/Modelo', 'Série', 'Status', 'Data Aquisição', 'Valor Compra (R$)', 'Valor Residual (R$)', 'Garantia', 'Nota Fiscal', 'Colaborador', 'Ambiente'];
    const rows = filteredAssets.map(a => [
      a.assetTag,
      `"${a.name}"`,
      a.category,
      `"${a.brandModel}"`,
      a.serialNumber,
      a.status,
      a.acquisitionDate,
      a.purchaseValue,
      a.currentValue ?? a.purchaseValue,
      a.warrantyExpiry,
      a.invoiceNumber || '',
      `"${a.assignedEmployeeName || ''}"`,
      `"${a.roomName || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `inventario_patrimonial_ti_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* MODULE SUB-HEADER & QUICK ACTIONS */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center font-bold shadow-lg shadow-amber-500/20 shrink-0">
            <Box className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-black text-slate-900 dark:text-slate-100">
                Gestão Patrimonial de TI & Inventário (ITAM)
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 font-bold text-[10px] border border-amber-300 dark:border-amber-800">
                {assets.length} Ativos
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Controle unificado de tombos (`PAT-2026-XXXX`), depreciação financeira, garantias e sincronização direta com a Topologia de Infraestrutura.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setAuxiliaryInitialTab('suppliers');
              setIsAuxiliaryManagerOpen(true);
            }}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 dark:text-amber-300 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center space-x-1.5 cursor-pointer border border-slate-700 dark:border-slate-700"
            title="Tabela de cadastros do Agente de TI: Colaboradores, Ambientes, Fornecedores, Categorias e Status"
          >
            <Layers className="w-4 h-4 text-amber-400" />
            <span>Tabela do Agente de TI / Cadastros Auxiliares</span>
          </button>

          <button
            onClick={() => setEditingAsset({
              assetTag: handleGenerateNextTag(),
              category: categories[0]?.code || 'hardware_workstation',
              status: statuses[0]?.code || 'em_estoque',
              acquisitionDate: new Date().toISOString().split('T')[0],
              purchaseValue: 5000,
              lifespanMonths: 36,
              warrantyExpiry: new Date(Date.now() + 365*3*24*60*60*1000).toISOString().split('T')[0]
            })}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md shadow-amber-600/20 transition-all flex items-center space-x-2 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Novo Ativo</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-xl transition-all flex items-center space-x-2 cursor-pointer border border-slate-200 dark:border-slate-700"
            title="Exportar inventário completo para CSV/Excel"
          >
            <Download className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* METRICS & FINANCIAL KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Investido em TI</p>
            <p className="text-xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
              R$ {totalPurchaseValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
              Valor Contábil Líquido: <span className="text-emerald-600 dark:text-emerald-400 font-bold">R$ {totalCurrentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0">
            <Box className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Alocação de Equipamentos</p>
            <p className="text-xl font-black text-slate-900 dark:text-slate-100 mt-0.5">
              {countInUse} <span className="text-xs font-normal text-slate-500">Em Uso</span> / {countInStock} <span className="text-xs font-normal text-slate-500">Estoque</span>
            </p>
            <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 font-bold">
              {countInMaintenance} em manutenção técnica
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0">
            <BarChart2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Depreciação Acumulada</p>
            <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
              R$ {totalDepreciation.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {((totalDepreciation / (totalPurchaseValue || 1)) * 100).toFixed(1)}% do valor inicial amortizado
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Garantias Vencendo (&lt; 90 dias)</p>
            <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
              {expiringWarranties.length} Ativos
            </p>
            <button
              onClick={() => setActiveSubTab('warranty_alerts')}
              className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline mt-0.5 font-bold flex items-center space-x-1"
            >
              <span>Ver lista de renovação</span>
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* NAVIGATION SUB-TABS (Dashboard / Tabela / Central de Descoberta / Ciclo de Vida / Manutenções / Contratos / Depreciação / Garantias) */}
      <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('dashboard')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer shrink-0 ${
            activeSubTab === 'dashboard'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Dashboard de Ativos & Agentes</span>
        </button>

        <button
          onClick={() => setActiveSubTab('table')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer shrink-0 ${
            activeSubTab === 'table'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Box className="w-4 h-4" />
          <span>Inventário & Tombos ({filteredAssets.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('discovery_hub')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer shrink-0 relative ${
            activeSubTab === 'discovery_hub'
              ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Compass className="w-4 h-4 text-purple-400" />
          <span>Central de Descoberta ({discoveredAssets.length})</span>
          {discoveryAlerts.filter(a => a.status === 'OPEN').length > 0 && (
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping absolute top-1 right-1" />
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('lifecycle')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer shrink-0 ${
            activeSubTab === 'lifecycle'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Ciclo de Vida (8 Etapas)</span>
        </button>

        <button
          onClick={() => setActiveSubTab('maintenances')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer shrink-0 ${
            activeSubTab === 'maintenances'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>Manutenções & O.S. ({assets.reduce((acc, a) => acc + (a.maintenances?.filter(m => m.status !== 'concluida').length || 0), 0)})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('contracts')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer shrink-0 ${
            activeSubTab === 'contracts'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Contratos & Fornecedores</span>
        </button>

        <button
          onClick={() => setActiveSubTab('financial')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer shrink-0 ${
            activeSubTab === 'financial'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>Depreciação Contábil</span>
        </button>

        <button
          onClick={() => setActiveSubTab('warranty_alerts')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer shrink-0 relative ${
            activeSubTab === 'warranty_alerts'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Alertas de Garantia ({expiringWarranties.length})</span>
          {expiringWarranties.length > 0 && (
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping absolute top-1 right-1" />
          )}
        </button>
      </div>

      {/* SUB-VIEW 0: DASHBOARD EXECUTIVO DE ATIVOS & AGENTES */}
      {activeSubTab === 'dashboard' && (
        <AssetDashboardView
          assets={assets}
          discoveredAssets={discoveredAssets}
          discoveryAlerts={discoveryAlerts}
          employees={employees}
          rooms={rooms}
          categories={categories}
          statuses={statuses}
          onNavigateToTable={() => setActiveSubTab('table')}
          onNavigateToDiscovery={(tabKey) => {
            setActiveSubTab('discovery_hub');
          }}
          onNavigateToWarranties={() => setActiveSubTab('warranty_alerts')}
          onNavigateToMaintenances={() => setActiveSubTab('maintenances')}
          onNavigateToTopology={onNavigateToTopology}
          onSelectAsset={(asset) => setSelectedDetailAsset(asset)}
        />
      )}

      {/* SUB-VIEW 0.5: CENTRAL DE DESCOBERTA (NOVOS, ALTERADOS, OFFLINE, SEM AGENTE, DUPLICIDADES, ALERTAS) */}
      {activeSubTab === 'discovery_hub' && (
        <CentralDiscoveryHub
          existingAssets={assets}
          setExistingAssets={setAssets}
          discoveredAssets={discoveredAssets}
          setDiscoveredAssets={setDiscoveredAssets}
          alerts={discoveryAlerts}
          setAlerts={setDiscoveryAlerts}
          employees={employees}
          rooms={rooms}
          categories={categories}
          onNavigateToTopology={onNavigateToTopology}
        />
      )}

      {/* SUB-VIEW 1: TABELA DE INVENTÁRIO E TOMBOS */}
      {activeSubTab === 'table' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          
          {/* CICLO DE VIDA INTERATIVO (8 ETAPAS) */}
          <AssetLifecycleStepper
            assets={assets}
            selectedStage={lifecycleFilter}
            onSelectStage={setLifecycleFilter}
          />

          {/* SEARCH & MULTI-FILTER BAR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            {/* Search Box */}
            <div className="relative lg:col-span-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por Tombo, Nome, Fornecedor, Contrato ou Colaborador..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>

            {/* Lifecycle Stage Filter */}
            <select
              value={lifecycleFilter}
              onChange={(e) => setLifecycleFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option key="all" value="all">Todas as 8 Etapas</option>
              {LIFECYCLE_STAGES.map(stage => (
                <option key={stage.id} value={stage.id}>
                  {stage.step}. {stage.label}
                </option>
              ))}
            </select>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="all">Todas as Categorias</option>
              <option value="hardware_server">Servidores</option>
              <option value="hardware_network">Rede, Switch & Router</option>
              <option value="hardware_workstation">Estações & Notebooks</option>
              <option value="hardware_monitor">Monitores</option>
              <option value="hardware_printer">Impressoras</option>
              <option value="rack_ups">Nobreaks & Racks</option>
              <option value="software_license">Licenças de Software</option>
              <option value="mobile_tablet">Mobile & Tablets</option>
              <option value="other">Outros</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="all">Todos os Status</option>
              <option value="em_uso">Em Uso</option>
              <option value="em_estoque">Em Estoque</option>
              <option value="em_manutencao">Em Manutenção</option>
              <option value="reservado">Reservado</option>
              <option value="descartado">Descartado / Baixado</option>
            </select>

            {/* Sort Filter */}
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split('-');
                setSortBy(sb as any);
                setSortOrder(so as any);
              }}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              <option value="assetTag-desc">Tombo (Decrescente)</option>
              <option value="assetTag-asc">Tombo (Crescente)</option>
              <option value="name-asc">Nome (A-Z)</option>
              <option value="purchaseValue-desc">Maior Valor</option>
              <option value="purchaseValue-asc">Menor Valor</option>
              <option value="acquisitionDate-desc">Mais Recentes</option>
            </select>
          </div>

          {/* ASSET DATA TABLE */}
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-200">
              <thead className="bg-slate-100 dark:bg-slate-800/80 uppercase text-[10px] font-black tracking-wider text-slate-500">
                <tr>
                  <th className="p-3">Plaqueta / Tombo</th>
                  <th className="p-3">Ativo de TI & Marca/Modelo</th>
                  <th className="p-3">Categoria</th>
                  <th className="p-3">Ciclo de Vida (8 Etapas)</th>
                  <th className="p-3">Status & Agente</th>
                  <th className="p-3">Responsável & Local</th>
                  <th className="p-3">Fornecedor / Contrato</th>
                  <th className="p-3 text-right">Valor Compra / Residual</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredAssets.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      Nenhum ativo de TI encontrado com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredAssets.map(asset => {
                    const catInfo = categoryConfig[asset.category] || categoryConfig.other;
                    const statInfo = statusConfig[asset.status] || statusConfig.em_estoque;
                    const stage = LIFECYCLE_STAGES.find(s => s.id === (asset.lifecycleStage || 'utilizacao')) || LIFECYCLE_STAGES[3];

                    return (
                      <tr key={asset.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        
                        {/* Tombo / Tag */}
                        <td className="p-3">
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-1 bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-mono font-black text-[11px] rounded-lg flex items-center space-x-1 shrink-0">
                              <Tag className="w-3 h-3 text-amber-500" />
                              <span>{asset.assetTag}</span>
                            </span>
                            <button
                              onClick={() => setSelectedTagAsset(asset)}
                              className="p-1 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 rounded transition-colors cursor-pointer"
                              title="Visualizar e Imprimir Plaqueta com QR Code"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-1">S/N: {asset.serialNumber}</div>
                        </td>

                        {/* Nome & Modelo */}
                        <td className="p-3">
                          <button
                            onClick={() => setSelectedDetailAsset(asset)}
                            className="font-bold text-left text-slate-900 dark:text-slate-100 hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer block"
                            title="Clique para abrir o Raio-X com histórico completo"
                          >
                            {asset.name}
                          </button>
                          <div className="text-[10px] text-slate-500 mt-0.5">{asset.brandModel}</div>
                          {asset.notes && (
                            <div className="text-[10px] text-slate-400 truncate max-w-[180px] mt-0.5">{asset.notes}</div>
                          )}
                        </td>

                        {/* Categoria */}
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-lg font-bold text-[10px] inline-flex items-center space-x-1 ${catInfo.color}`}>
                            {catInfo.icon}
                            <span>{catInfo.label}</span>
                          </span>
                        </td>

                        {/* Ciclo de Vida (8 Etapas) */}
                        <td className="p-3">
                          <div className="inline-flex items-center space-x-1.5">
                            <span className={`px-2 py-1 rounded-lg text-[10px] font-black border flex items-center space-x-1 ${stage.badgeColor}`}>
                              <span>{stage.step}.</span>
                              <span>{stage.label}</span>
                            </span>
                            <button
                              onClick={() => setSelectedTransitionAsset(asset)}
                              className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
                              title="Avançar ou Transicionar Etapa do Ciclo de Vida"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* Status & Agente */}
                        <td className="p-3 space-y-1">
                          <div>
                            <span className={`px-2 py-0.5 rounded-lg font-bold text-[10px] inline-flex items-center space-x-1 ${statInfo.bg} ${statInfo.text}`}>
                              {statInfo.icon}
                              <span>{statInfo.label}</span>
                            </span>
                          </div>
                          
                          {/* Agente de TI Connection Status */}
                          {asset.agentStatus ? (
                            <div className="flex items-center space-x-1.5" title={`Agente v${asset.agentVersion || '1.0'} | Último Ping: ${asset.agentLastPing || 'Desconhecido'}`}>
                              <span className="relative flex h-2 w-2">
                                {asset.agentStatus === 'online' && (
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                )}
                                <span className={`relative inline-flex rounded-full h-2 w-2 ${agentStatusConfig[asset.agentStatus].dotBg}`}></span>
                              </span>
                              <span className={`text-[10px] font-extrabold ${agentStatusConfig[asset.agentStatus].text}`}>
                                Agente {asset.agentStatus === 'online' ? 'Online' : 'Offline'}
                              </span>
                            </div>
                          ) : (
                            <div className="text-[10px] text-slate-400 italic">
                              Sem Agente
                            </div>
                          )}
                        </td>

                        {/* Alocação / Colaborador & Local */}
                        <td className="p-3">
                          {asset.assignedEmployeeName ? (
                            <div className="flex items-center space-x-1.5 text-slate-800 dark:text-slate-200 font-bold">
                              <User className="w-3 h-3 text-indigo-500 shrink-0" />
                              <span>{asset.assignedEmployeeName}</span>
                              {asset.custodyTermSigned && (
                                <span className="text-[9px] px-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 rounded font-semibold" title="Termo de responsabilidade assinado">
                                  Termo OK
                                </span>
                              )}
                            </div>
                          ) : (
                            <div className="text-slate-400 italic">Sem colaborador direto</div>
                          )}
                          <div className="text-[10px] text-slate-500 flex items-center space-x-1 mt-0.5">
                            <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{asset.roomName || 'Estoque Central TI'}</span>
                          </div>
                        </td>

                        {/* Fornecedor / Contrato */}
                        <td className="p-3">
                          <div className="font-semibold text-slate-800 dark:text-slate-200">
                            {asset.supplier || 'Aquisição Direta'}
                          </div>
                          {asset.contractNumber && (
                            <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">
                              Contrato: {asset.contractNumber}
                            </div>
                          )}
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Garantia: {asset.warrantyExpiry || 'N/A'}
                          </div>
                        </td>

                        {/* Valor Compra / Residual */}
                        <td className="p-3 text-right font-mono">
                          <div className="font-bold text-slate-900 dark:text-slate-100">
                            R$ {(asset.purchaseValue || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                            Residual: R$ {(asset.currentValue ?? asset.purchaseValue ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                        </td>

                        {/* Ações */}
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={() => setSelectedDetailAsset(asset)}
                              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors cursor-pointer"
                              title="Raio-X / Detalhes & Histórico"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setSelectedTransitionAsset(asset)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors cursor-pointer"
                              title="Avançar Ciclo de Vida"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setSelectedCustodyAsset(asset)}
                              className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors cursor-pointer"
                              title="Gerar Termo de Responsabilidade e Cautela"
                            >
                              <FileCheck className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingAsset(asset)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors cursor-pointer"
                              title="Editar Ativo"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteAsset(asset.id)}
                              className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                              title="Excluir Ativo"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
      )}

      {/* SUB-VIEW 2: CICLO DE VIDA (KANBAN PIPELINE 8 ETAPAS) */}
      {activeSubTab === 'lifecycle' && (
        <AssetLifecycleKanban
          assets={assets}
          onOpenDetail={(asset) => setSelectedDetailAsset(asset)}
          onOpenTransition={(asset) => setSelectedTransitionAsset(asset)}
          onOpenCustodyTerm={(asset) => setSelectedCustodyAsset(asset)}
          onOpenEdit={(asset) => setEditingAsset(asset)}
        />
      )}

      {/* SUB-VIEW 3: GESTÃO DE MANUTENÇÕES E ORDENS DE SERVIÇO */}
      {activeSubTab === 'maintenances' && (
        <AssetMaintenanceView
          assets={assets}
          onOpenNewMaintenance={(asset) => {
            setMaintenanceInitialAsset(asset);
            setMaintenanceToEdit(undefined);
            setIsMaintenanceModalOpen(true);
          }}
          onEditMaintenance={(record) => {
            const targetAsset = assets.find(a => a.id === record.assetId);
            setMaintenanceInitialAsset(targetAsset);
            setMaintenanceToEdit(record);
            setIsMaintenanceModalOpen(true);
          }}
          onCompleteMaintenance={handleCompleteMaintenance}
          onOpenAssetDetail={(asset) => setSelectedDetailAsset(asset)}
        />
      )}

      {/* SUB-VIEW 4: CONTRATOS, FORNECEDORES E GESTÃO FINANCEIRA/ADMINISTRATIVA */}
      {activeSubTab === 'contracts' && (
        <AssetContractsView
          assets={assets}
          onOpenAssetDetail={(asset) => setSelectedDetailAsset(asset)}
          onOpenCustodyTerm={(asset) => setSelectedCustodyAsset(asset)}
        />
      )}

      {/* SUB-VIEW 2: RELATÓRIO DE DEPRECIAÇÃO FINANCEIRA */}
      {activeSubTab === 'financial' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Análise Financeira de Depreciação de Ativos de TI
              </h3>
              <p className="text-xs text-slate-500">
                Método de depreciação linear direta baseada na vida útil estimada (3 a 5 anos conforme IFRS / Receita Federal).
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-xs text-slate-500 font-semibold">Valor Bruto de Aquisição</span>
              <p className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                R$ {totalPurchaseValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-xs text-slate-500 font-semibold">Valor Residual Atual (Contábil)</span>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                R$ {totalCurrentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-xs text-slate-500 font-semibold">Amortização Total Acumulada</span>
              <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                R$ {totalDepreciation.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-200">
              <thead className="bg-slate-100 dark:bg-slate-800/80 uppercase text-[10px] font-black tracking-wider text-slate-500">
                <tr>
                  <th className="p-3">Tombo</th>
                  <th className="p-3">Equipamento</th>
                  <th className="p-3">Data Aquisição</th>
                  <th className="p-3">Vida Útil (Meses)</th>
                  <th className="p-3 text-right">Valor Compra</th>
                  <th className="p-3 text-right">Depreciação/Mês</th>
                  <th className="p-3 text-right">Valor Residual Atual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                {assets.map(asset => {
                  const pVal = asset.purchaseValue || 0;
                  const life = asset.lifespanMonths || 36;
                  const monthlyDep = pVal / life;
                  const resVal = asset.currentValue ?? pVal;

                  return (
                    <tr key={asset.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="p-3 font-bold text-amber-600 dark:text-amber-400">{asset.assetTag}</td>
                      <td className="p-3 font-sans font-bold text-slate-900 dark:text-slate-100">{asset.name}</td>
                      <td className="p-3">{asset.acquisitionDate}</td>
                      <td className="p-3">{life} meses</td>
                      <td className="p-3 text-right">R$ {pVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      <td className="p-3 text-right text-rose-500">R$ {monthlyDep.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês</td>
                      <td className="p-3 text-right font-black text-emerald-600 dark:text-emerald-400">
                        R$ {resVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-VIEW 3: ALERTAS DE GARANTIA & MANUTENÇÃO */}
      {activeSubTab === 'warranty_alerts' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
          <div className="flex items-center space-x-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Garantias de Hardware Próximas do Vencimento
              </h3>
              <p className="text-xs text-slate-500">
                Ativos com renovação de suporte/garantia recomendada nos próximos 90 dias.
              </p>
            </div>
          </div>

          {expiringWarranties.length === 0 ? (
            <div className="p-8 text-center text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-xl">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="font-bold text-slate-700 dark:text-slate-200">Todas as garantias estão em dia!</p>
              <p className="text-xs text-slate-400">Nenhum ativo com vencimento nos próximos 90 dias.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {expiringWarranties.map(asset => (
                <div key={asset.id} className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start justify-between space-x-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 bg-amber-600 text-white font-mono font-bold text-[10px] rounded">
                        {asset.assetTag}
                      </span>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">{asset.name}</h4>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      S/N: {asset.serialNumber} • {asset.brandModel}
                    </p>
                    <p className="text-xs text-amber-800 dark:text-amber-200 font-semibold flex items-center space-x-1 pt-1">
                      <Calendar className="w-3.5 h-3.5 text-amber-600" />
                      <span>Vencimento da Garantia: <strong>{asset.warrantyExpiry}</strong></span>
                    </p>
                    {asset.supplier && (
                      <p className="text-[11px] text-slate-500">Fornecedor: {asset.supplier}</p>
                    )}
                  </div>

                  <button
                    onClick={() => setEditingAsset(asset)}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg cursor-pointer shrink-0"
                  >
                    Renovar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==========================================
          MODAL 1: CADASTRAR OU EDITAR ATIVO TI (MODULAR)
         ========================================== */}
      {editingAsset && (
        <AssetEditModal
          asset={editingAsset}
          onClose={() => setEditingAsset(null)}
          onSave={handleSaveAsset}
          employees={employees}
          suppliers={suppliers}
          rooms={rooms}
          categories={categories}
          statuses={statuses}
          onOpenAuxiliaryManager={(tab) => {
            setAuxiliaryInitialTab(tab);
            setIsAuxiliaryManagerOpen(true);
          }}
          generateNextTag={handleGenerateNextTag}
        />
      )}

      {/* ==========================================
          MODAL: RAIO-X COMPLETO DO ATIVO & HISTÓRICO
         ========================================== */}
      {selectedDetailAsset && (
        <AssetDetailModal
          asset={selectedDetailAsset}
          onClose={() => setSelectedDetailAsset(null)}
          onOpenTransition={(asset) => setSelectedTransitionAsset(asset)}
          onOpenCustodyTerm={(asset) => setSelectedCustodyAsset(asset)}
          onOpenMaintenance={(asset) => {
            setMaintenanceInitialAsset(asset);
            setMaintenanceToEdit(undefined);
            setIsMaintenanceModalOpen(true);
          }}
          onOpenEdit={(asset) => setEditingAsset(asset)}
          onAddHistoryEvent={handleAddHistoryEvent}
          onNavigateToTopology={onNavigateToTopology}
        />
      )}

      {/* ==========================================
          MODAL: TRANSIÇÃO DO CICLO DE VIDA (8 ETAPAS)
         ========================================== */}
      {selectedTransitionAsset && (
        <AssetTransitionModal
          asset={selectedTransitionAsset}
          onClose={() => setSelectedTransitionAsset(null)}
          onSaveTransition={handleSaveTransition}
        />
      )}

      {/* ==========================================
          MODAL: TERMO DE RESPONSABILIDADE & CAUTELA
         ========================================== */}
      {selectedCustodyAsset && (
        <AssetCustodyTermModal
          asset={selectedCustodyAsset}
          onClose={() => setSelectedCustodyAsset(null)}
          onConfirmTerm={handleConfirmCustodyTerm}
        />
      )}

      {/* ==========================================
          MODAL: ORDEM DE SERVIÇO / MANUTENÇÃO TÉCNICA
         ========================================== */}
      {isMaintenanceModalOpen && (
        <AssetMaintenanceModal
          assets={assets}
          initialAsset={maintenanceInitialAsset}
          recordToEdit={maintenanceToEdit}
          onClose={() => {
            setIsMaintenanceModalOpen(false);
            setMaintenanceToEdit(undefined);
            setMaintenanceInitialAsset(undefined);
          }}
          onSave={handleSaveMaintenance}
        />
      )}

      {/* ==========================================
          MODAL 2: VISUALIZAR & IMPRIMIR PLAQUETA DE PATRIMÔNIO (QR CODE)
         ========================================== */}
      {selectedTagAsset && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200 font-sans">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-6">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <QrCode className="w-5 h-5 text-amber-500" />
                <h3 className="font-black text-sm text-slate-900 dark:text-slate-100">
                  Plaqueta Física de Patrimônio
                </h3>
              </div>
              <button
                onClick={() => setSelectedTagAsset(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* PLAQUETA TIPO ADESIVO METÁLICO */}
            <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl border-2 border-amber-500 shadow-xl text-white space-y-3 relative overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/20 pb-2">
                <div className="flex items-center space-x-1.5">
                  <div className="w-6 h-6 rounded bg-amber-500 flex items-center justify-center font-black text-xs text-slate-950">
                    WP
                  </div>
                  <span className="font-black tracking-wider text-xs uppercase text-amber-400">WorkPulse IT Asset</span>
                </div>
                <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">PATRIMÔNIO TI</span>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <div className="space-y-1">
                  <p className="text-xl font-mono font-black text-amber-400 tracking-wider">
                    {selectedTagAsset.assetTag}
                  </p>
                  <p className="font-bold text-xs text-slate-200 truncate max-w-[200px]">
                    {selectedTagAsset.name}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    S/N: {selectedTagAsset.serialNumber}
                  </p>
                </div>

                {/* SVG SIMULATED BARCODE & QR */}
                <div className="p-2 bg-white rounded-xl text-slate-900 flex flex-col items-center justify-center shrink-0">
                  <QrCode className="w-12 h-12 text-slate-950" />
                  <span className="text-[8px] font-mono font-black tracking-tighter mt-0.5">{selectedTagAsset.assetTag}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[8px] text-slate-400 uppercase tracking-widest font-mono">
                <span>PROPRIEDADE INALIENÁVEL DE TI</span>
                <span>{selectedTagAsset.acquisitionDate}</span>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2">
              <button
                onClick={() => window.print()}
                className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-600/20 cursor-pointer flex items-center justify-center space-x-2"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Plaqueta (Etiqueta Térmica)</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ==========================================
          MODAL 3: GERENCIAMENTO DE TABELAS AUXILIARES (CRUD)
         ========================================== */}
      {isAuxiliaryManagerOpen && (
        <AuxiliaryTablesManager
          suppliers={suppliers}
          setSuppliers={setSuppliers || (() => {})}
          rooms={rooms}
          setRooms={setRooms || (() => {})}
          categories={categories}
          setCategories={setCategories || (() => {})}
          statuses={statuses}
          setStatuses={setStatuses || (() => {})}
          employees={employees}
          setEmployees={setEmployees || (() => {})}
          initialTab={auxiliaryInitialTab}
          onClose={() => setIsAuxiliaryManagerOpen(false)}
        />
      )}

    </div>
  );
};
