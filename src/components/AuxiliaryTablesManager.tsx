import React, { useState } from 'react';
import { 
  Building2, 
  Truck, 
  Layers, 
  Activity, 
  Users, 
  Plus, 
  Edit3, 
  Trash2, 
  Search, 
  Check, 
  X, 
  Save, 
  Phone, 
  Mail, 
  MapPin, 
  Tag, 
  Sparkles,
  ExternalLink,
  Shield,
  Briefcase,
  Laptop
} from 'lucide-react';
import { 
  SupplierItem, 
  EnvironmentRoomItem, 
  CustomCategoryItem, 
  CustomStatusItem, 
  Employee,
  Department,
  WorkModel
} from '../types';

interface AuxiliaryTablesManagerProps {
  suppliers: SupplierItem[];
  setSuppliers: React.Dispatch<React.SetStateAction<SupplierItem[]>>;
  rooms: EnvironmentRoomItem[];
  setRooms: React.Dispatch<React.SetStateAction<EnvironmentRoomItem[]>>;
  categories: CustomCategoryItem[];
  setCategories: React.Dispatch<React.SetStateAction<CustomCategoryItem[]>>;
  statuses: CustomStatusItem[];
  setStatuses: React.Dispatch<React.SetStateAction<CustomStatusItem[]>>;
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  onClose?: () => void;
  initialTab?: 'suppliers' | 'rooms' | 'categories' | 'statuses' | 'employees';
}

export const AuxiliaryTablesManager: React.FC<AuxiliaryTablesManagerProps> = ({
  suppliers,
  setSuppliers,
  rooms,
  setRooms,
  categories,
  setCategories,
  statuses,
  setStatuses,
  employees,
  setEmployees,
  onClose,
  initialTab = 'suppliers'
}) => {
  const [activeTab, setActiveTab] = useState<'suppliers' | 'rooms' | 'categories' | 'statuses' | 'employees'>(initialTab);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal/Form edit states
  const [editingSupplier, setEditingSupplier] = useState<Partial<SupplierItem> | null>(null);
  const [editingRoom, setEditingRoom] = useState<Partial<EnvironmentRoomItem> | null>(null);
  const [editingCategory, setEditingCategory] = useState<Partial<CustomCategoryItem> | null>(null);
  const [editingStatus, setEditingStatus] = useState<Partial<CustomStatusItem> | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Partial<Employee> | null>(null);

  // ----------------------------------------------------
  // SUPPLIERS CRUD
  // ----------------------------------------------------
  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier?.name) return;

    if (editingSupplier.id) {
      setSuppliers(prev => prev.map(s => s.id === editingSupplier.id ? { ...s, ...editingSupplier } as SupplierItem : s));
    } else {
      const newSup: SupplierItem = {
        id: `sup-${Date.now()}`,
        name: editingSupplier.name || '',
        cnpj: editingSupplier.cnpj || '',
        contactName: editingSupplier.contactName || '',
        email: editingSupplier.email || '',
        phone: editingSupplier.phone || '',
        category: editingSupplier.category || 'Hardware & TI',
        rating: editingSupplier.rating || 5
      };
      setSuppliers(prev => [newSup, ...prev]);
    }
    setEditingSupplier(null);
  };

  const handleDeleteSupplier = (id: string) => {
    if (confirm('Deseja excluir este Fornecedor da base cadastral?')) {
      setSuppliers(prev => prev.filter(s => s.id !== id));
    }
  };

  // ----------------------------------------------------
  // ROOMS CRUD
  // ----------------------------------------------------
  const handleSaveRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom?.name) return;

    if (editingRoom.id) {
      setRooms(prev => prev.map(r => r.id === editingRoom.id ? { ...r, ...editingRoom } as EnvironmentRoomItem : r));
    } else {
      const newRoom: EnvironmentRoomItem = {
        id: `room-${Date.now()}`,
        name: editingRoom.name || '',
        quadrantCode: editingRoom.quadrantCode || `Q${rooms.length + 1}`,
        floor: editingRoom.floor || '1º Andar',
        building: editingRoom.building || 'Matriz',
        category: (editingRoom.category as any) || 'office',
        notes: editingRoom.notes || ''
      };
      setRooms(prev => [...prev, newRoom]);
    }
    setEditingRoom(null);
  };

  const handleDeleteRoom = (id: string) => {
    if (confirm('Deseja excluir este Ambiente/Sala do cadastro de locais?')) {
      setRooms(prev => prev.filter(r => r.id !== id));
    }
  };

  // ----------------------------------------------------
  // CATEGORIES CRUD
  // ----------------------------------------------------
  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory?.name) return;

    const code = editingCategory.code || editingCategory.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

    if (editingCategory.id) {
      setCategories(prev => prev.map(c => c.id === editingCategory.id ? { ...c, ...editingCategory, code } as CustomCategoryItem : c));
    } else {
      const newCat: CustomCategoryItem = {
        id: `cat-${Date.now()}`,
        code,
        name: editingCategory.name || '',
        iconName: editingCategory.iconName || 'Box',
        color: editingCategory.color || 'blue',
        lifespanMonthsDefault: editingCategory.lifespanMonthsDefault || 36
      };
      setCategories(prev => [...prev, newCat]);
    }
    setEditingCategory(null);
  };

  const handleDeleteCategory = (id: string) => {
    if (confirm('Deseja excluir esta Categoria de Ativo?')) {
      setCategories(prev => prev.filter(c => c.id !== id));
    }
  };

  // ----------------------------------------------------
  // STATUSES CRUD
  // ----------------------------------------------------
  const handleSaveStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStatus?.label) return;

    const code = editingStatus.code || editingStatus.label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

    if (editingStatus.id) {
      setStatuses(prev => prev.map(s => s.id === editingStatus.id ? { ...s, ...editingStatus, code } as CustomStatusItem : s));
    } else {
      const newSt: CustomStatusItem = {
        id: `st-${Date.now()}`,
        code,
        label: editingStatus.label || '',
        colorBg: editingStatus.colorBg || 'bg-slate-100 dark:bg-slate-800',
        colorText: editingStatus.colorText || 'text-slate-700 dark:text-slate-200',
        description: editingStatus.description || ''
      };
      setStatuses(prev => [...prev, newSt]);
    }
    setEditingStatus(null);
  };

  const handleDeleteStatus = (id: string) => {
    if (confirm('Deseja excluir este Status de Ativo?')) {
      setStatuses(prev => prev.filter(s => s.id !== id));
    }
  };

  // ----------------------------------------------------
  // EMPLOYEES CRUD
  // ----------------------------------------------------
  const handleSaveEmployee = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee?.name) return;

    if (editingEmployee.id) {
      setEmployees(prev => prev.map(emp => emp.id === editingEmployee.id ? { ...emp, ...editingEmployee } as Employee : emp));
    } else {
      const newEmp: Employee = {
        id: `emp-${Date.now()}`,
        name: editingEmployee.name || '',
        email: editingEmployee.email || `${editingEmployee.name.toLowerCase().replace(/\s+/g, '.')}@empresa.com.br`,
        avatar: editingEmployee.avatar || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150`,
        role: editingEmployee.role || 'Colaborador',
        department: (editingEmployee.department as Department) || 'Engenharia',
        workModel: (editingEmployee.workModel as WorkModel) || 'Presencial',
        status: 'Ativo',
        computerHost: editingEmployee.computerHost || `PC-${editingEmployee.name.split(' ')[0].toUpperCase()}`,
        ipAddress: editingEmployee.ipAddress || '192.168.1.100',
        currentApp: 'Sistema ERP',
        productivityScore: 85,
        workedHoursToday: 8.0,
        productiveHoursToday: 7.2,
        unproductiveHoursToday: 0.3,
        neutralHoursToday: 0.5,
        idleHoursToday: 0.1,
        scheduleStart: '08:00',
        scheduleEnd: '17:00',
        overtimeMinutes: 0,
        pcLockEnabled: true,
        pcLockStatus: 'Desbloqueado',
        agentVersion: '4.2.1-lts'
      };
      setEmployees(prev => [newEmp, ...prev]);
    }
    setEditingEmployee(null);
  };

  const handleDeleteEmployee = (id: string) => {
    if (confirm('Deseja excluir este Colaborador da base?')) {
      setEmployees(prev => prev.filter(emp => emp.id !== id));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200 font-sans">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-5xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                Tabelas Auxiliares de Cadastro (CRUD)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Cadastre e personalize Colaboradores, Ambientes, Fornecedores, Categorias e Status para seleção no Inventário e Topologia.
              </p>
            </div>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-2 px-5 pt-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 overflow-x-auto">
          <button
            onClick={() => { setActiveTab('suppliers'); setSearchTerm(''); }}
            className={`flex items-center space-x-2 py-2.5 px-3.5 border-b-2 text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'suppliers'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Fornecedores ({suppliers.length})</span>
          </button>

          <button
            onClick={() => { setActiveTab('rooms'); setSearchTerm(''); }}
            className={`flex items-center space-x-2 py-2.5 px-3.5 border-b-2 text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'rooms'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Ambientes / Salas ({rooms.length})</span>
          </button>

          <button
            onClick={() => { setActiveTab('employees'); setSearchTerm(''); }}
            className={`flex items-center space-x-2 py-2.5 px-3.5 border-b-2 text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'employees'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Colaboradores ({employees.length})</span>
          </button>

          <button
            onClick={() => { setActiveTab('categories'); setSearchTerm(''); }}
            className={`flex items-center space-x-2 py-2.5 px-3.5 border-b-2 text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'categories'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Categorias ({categories.length})</span>
          </button>

          <button
            onClick={() => { setActiveTab('statuses'); setSearchTerm(''); }}
            className={`flex items-center space-x-2 py-2.5 px-3.5 border-b-2 text-xs font-bold transition-all shrink-0 cursor-pointer ${
              activeTab === 'statuses'
                ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Status do Ativo ({statuses.length})</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          
          {/* Top Search & Add Bar */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={`Buscar em ${activeTab}...`}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
              />
            </div>

            {activeTab === 'suppliers' && (
              <button
                onClick={() => setEditingSupplier({ name: '', category: 'Hardware & TI', rating: 5 })}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Fornecedor</span>
              </button>
            )}

            {activeTab === 'rooms' && (
              <button
                onClick={() => setEditingRoom({ name: '', floor: '1º Andar', building: 'Bloco A (Matriz)', category: 'office' })}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Ambiente / Sala</span>
              </button>
            )}

            {activeTab === 'employees' && (
              <button
                onClick={() => setEditingEmployee({ name: '', department: 'Engenharia', workModel: 'Presencial', role: 'Analista' })}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Colaborador</span>
              </button>
            )}

            {activeTab === 'categories' && (
              <button
                onClick={() => setEditingCategory({ name: '', lifespanMonthsDefault: 36, color: 'blue' })}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Categoria</span>
              </button>
            )}

            {activeTab === 'statuses' && (
              <button
                onClick={() => setEditingStatus({ label: '', colorBg: 'bg-slate-100 dark:bg-slate-800', colorText: 'text-slate-700 dark:text-slate-200' })}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold shadow-sm cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Status</span>
              </button>
            )}
          </div>

          {/* TAB 1: SUPPLIERS LIST */}
          {activeTab === 'suppliers' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {suppliers
                .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || (s.cnpj && s.cnpj.includes(searchTerm)))
                .map(sup => (
                  <div key={sup.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between hover:border-amber-300 transition-all">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Truck className="w-4 h-4 text-amber-500" />
                          {sup.name}
                        </h4>
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 rounded-md">
                          {sup.category || 'Fornecedor TI'}
                        </span>
                      </div>

                      <div className="text-xs space-y-1 text-slate-500 dark:text-slate-400">
                        {sup.cnpj && <div className="font-mono text-[11px]">CNPJ: {sup.cnpj}</div>}
                        {sup.contactName && <div>Contato: <span className="font-bold text-slate-700 dark:text-slate-200">{sup.contactName}</span></div>}
                        <div className="flex items-center gap-3 pt-1">
                          {sup.email && (
                            <span className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400">
                              <Mail className="w-3 h-3" /> {sup.email}
                            </span>
                          )}
                          {sup.phone && (
                            <span className="flex items-center gap-1 text-[11px]">
                              <Phone className="w-3 h-3" /> {sup.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end space-x-2 pt-3 mt-3 border-t border-slate-200 dark:border-slate-800">
                      <button
                        onClick={() => setEditingSupplier(sup)}
                        className="px-2.5 py-1 text-[11px] font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg flex items-center space-x-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() => handleDeleteSupplier(sup.id)}
                        className="px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg flex items-center space-x-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Excluir</span>
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* TAB 2: ROOMS LIST */}
          {activeTab === 'rooms' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {rooms
                .filter(r => r.name.toLowerCase().includes(searchTerm.toLowerCase()) || r.quadrantCode.toLowerCase().includes(searchTerm.toLowerCase()))
                .map(room => (
                  <div key={room.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between hover:border-amber-300 transition-all">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Building2 className="w-4 h-4 text-blue-500" />
                          {room.name}
                        </h4>
                        <span className="text-[10px] font-black font-mono px-2 py-0.5 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-md">
                          {room.quadrantCode}
                        </span>
                      </div>

                      <div className="text-xs space-y-1 text-slate-500 dark:text-slate-400">
                        <div>Localização: <span className="font-bold text-slate-700 dark:text-slate-200">{room.floor || '1º Andar'} • {room.building || 'Matriz'}</span></div>
                        {room.notes && <p className="text-[11px] italic text-slate-500">{room.notes}</p>}
                      </div>
                    </div>

                    <div className="flex items-center justify-end space-x-2 pt-3 mt-3 border-t border-slate-200 dark:border-slate-800">
                      <button
                        onClick={() => setEditingRoom(room)}
                        className="px-2.5 py-1 text-[11px] font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg flex items-center space-x-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() => handleDeleteRoom(room.id)}
                        className="px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg flex items-center space-x-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Excluir</span>
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* TAB 3: EMPLOYEES LIST */}
          {activeTab === 'employees' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {employees
                .filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()) || e.department.toLowerCase().includes(searchTerm.toLowerCase()))
                .map(emp => (
                  <div key={emp.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between hover:border-amber-300 transition-all">
                    <div className="flex items-center space-x-3">
                      <img src={emp.avatar} alt={emp.name} className="w-10 h-10 rounded-xl object-cover ring-2 ring-slate-200 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">{emp.name}</h4>
                        <p className="text-[11px] text-slate-500 font-medium truncate">{emp.role} • {emp.department}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded font-mono">
                            {emp.computerHost}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                            {emp.workModel}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-end space-x-2 pt-3 mt-3 border-t border-slate-200 dark:border-slate-800">
                      <button
                        onClick={() => setEditingEmployee(emp)}
                        className="px-2.5 py-1 text-[11px] font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg flex items-center space-x-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Editar</span>
                      </button>
                      <button
                        onClick={() => handleDeleteEmployee(emp.id)}
                        className="px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg flex items-center space-x-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Excluir</span>
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* TAB 4: CATEGORIES LIST */}
          {activeTab === 'categories' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {categories
                .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.code.toLowerCase().includes(searchTerm.toLowerCase()))
                .map(cat => (
                  <div key={cat.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between hover:border-amber-300 transition-all">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-amber-500" />
                          {cat.name}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">Código: {cat.code}</div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-400">Vida Útil: <span className="font-bold">{cat.lifespanMonthsDefault || 36} meses</span></div>
                    </div>

                    <div className="flex items-center justify-end space-x-2 pt-2 mt-2 border-t border-slate-200 dark:border-slate-800">
                      <button
                        onClick={() => setEditingCategory(cat)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="Editar"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}

          {/* TAB 5: STATUSES LIST */}
          {activeTab === 'statuses' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {statuses
                .filter(s => s.label.toLowerCase().includes(searchTerm.toLowerCase()) || s.code.toLowerCase().includes(searchTerm.toLowerCase()))
                .map(st => (
                  <div key={st.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col justify-between hover:border-amber-300 transition-all">
                    <div className="space-y-2">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 ${st.colorBg || 'bg-slate-100'} ${st.colorText || 'text-slate-800'}`}>
                        <Activity className="w-3 h-3" />
                        {st.label}
                      </span>
                      <div className="text-[11px] font-mono text-slate-500">Chave: {st.code}</div>
                      {st.description && <p className="text-[11px] text-slate-500">{st.description}</p>}
                    </div>

                    <div className="flex items-center justify-end space-x-2 pt-2 mt-2 border-t border-slate-200 dark:border-slate-800">
                      <button
                        onClick={() => setEditingStatus(st)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="Editar"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteStatus(st.id)}
                        className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex items-center justify-between shrink-0">
          <span className="text-xs font-medium text-slate-500">
            Todos os itens cadastrados aqui ficam disponíveis instantaneamente nos selects do formulário de Ativos.
          </span>

          {onClose && (
            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              Concluir & Voltar
            </button>
          )}
        </div>

      </div>

      {/* ========================================================
          SUB-MODAL: EDIT / CREATE SUPPLIER
         ======================================================== */}
      {editingSupplier && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Truck className="w-4 h-4 text-amber-500" />
                {editingSupplier.id ? 'Editar Fornecedor' : 'Cadastrar Novo Fornecedor'}
              </h4>
              <button onClick={() => setEditingSupplier(null)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Razão Social / Nome Fantasia *</label>
                <input
                  type="text"
                  required
                  value={editingSupplier.name || ''}
                  onChange={(e) => setEditingSupplier(prev => ({ ...prev!, name: e.target.value }))}
                  placeholder="Ex: Dell Computers Brasil Ltda"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">CNPJ</label>
                  <input
                    type="text"
                    value={editingSupplier.cnpj || ''}
                    onChange={(e) => setEditingSupplier(prev => ({ ...prev!, cnpj: e.target.value }))}
                    placeholder="00.000.000/0001-00"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Categoria Principal</label>
                  <input
                    type="text"
                    value={editingSupplier.category || ''}
                    onChange={(e) => setEditingSupplier(prev => ({ ...prev!, category: e.target.value }))}
                    placeholder="Hardware, Redes, etc."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nome do Contato / Gerente de Conta</label>
                <input
                  type="text"
                  value={editingSupplier.contactName || ''}
                  onChange={(e) => setEditingSupplier(prev => ({ ...prev!, contactName: e.target.value }))}
                  placeholder="Ex: João Silva"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">E-mail Corporativo</label>
                  <input
                    type="email"
                    value={editingSupplier.email || ''}
                    onChange={(e) => setEditingSupplier(prev => ({ ...prev!, email: e.target.value }))}
                    placeholder="contato@fornecedor.com"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={editingSupplier.phone || ''}
                    onChange={(e) => setEditingSupplier(prev => ({ ...prev!, phone: e.target.value }))}
                    placeholder="(11) 99999-9999"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingSupplier(null)}
                  className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold shadow-sm"
                >
                  Salvar Fornecedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          SUB-MODAL: EDIT / CREATE ROOM
         ======================================================== */}
      {editingRoom && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-500" />
                {editingRoom.id ? 'Editar Ambiente / Sala' : 'Cadastrar Novo Ambiente'}
              </h4>
              <button onClick={() => setEditingRoom(null)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRoom} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nome do Ambiente / Sala *</label>
                <input
                  type="text"
                  required
                  value={editingRoom.name || ''}
                  onChange={(e) => setEditingRoom(prev => ({ ...prev!, name: e.target.value }))}
                  placeholder="Ex: Laboratório de Testes, Sala de Reunião 02..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Código / Quadrante</label>
                  <input
                    type="text"
                    value={editingRoom.quadrantCode || ''}
                    onChange={(e) => setEditingRoom(prev => ({ ...prev!, quadrantCode: e.target.value }))}
                    placeholder="Q1, Q2, LAB1..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Andar / Pavimento</label>
                  <input
                    type="text"
                    value={editingRoom.floor || ''}
                    onChange={(e) => setEditingRoom(prev => ({ ...prev!, floor: e.target.value }))}
                    placeholder="1º Andar, Térreo, etc."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Prédio / Bloco / Unidade</label>
                <input
                  type="text"
                  value={editingRoom.building || ''}
                  onChange={(e) => setEditingRoom(prev => ({ ...prev!, building: e.target.value }))}
                  placeholder="Ex: Bloco A (Matriz), Filial SP"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Observações do Local</label>
                <textarea
                  value={editingRoom.notes || ''}
                  onChange={(e) => setEditingRoom(prev => ({ ...prev!, notes: e.target.value }))}
                  rows={2}
                  placeholder="Controle de acesso, ar condicionado, tomadas..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingRoom(null)}
                  className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold shadow-sm"
                >
                  Salvar Ambiente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          SUB-MODAL: EDIT / CREATE EMPLOYEE
         ======================================================== */}
      {editingEmployee && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-500" />
                {editingEmployee.id ? 'Editar Colaborador' : 'Cadastrar Novo Colaborador'}
              </h4>
              <button onClick={() => setEditingEmployee(null)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEmployee} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  value={editingEmployee.name || ''}
                  onChange={(e) => setEditingEmployee(prev => ({ ...prev!, name: e.target.value }))}
                  placeholder="Ex: Carlos Eduardo Pereira"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Cargo / Função</label>
                  <input
                    type="text"
                    value={editingEmployee.role || ''}
                    onChange={(e) => setEditingEmployee(prev => ({ ...prev!, role: e.target.value }))}
                    placeholder="Ex: Desenvolvedor, Analista"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Departamento</label>
                  <select
                    value={editingEmployee.department || 'Engenharia'}
                    onChange={(e) => setEditingEmployee(prev => ({ ...prev!, department: e.target.value as Department }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  >
                    <option value="Engenharia">Engenharia</option>
                    <option value="Vendas">Vendas</option>
                    <option value="RH & Pessoas">RH & Pessoas</option>
                    <option value="Atendimento & Suporte">Atendimento & Suporte</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Financeiro & Jurídico">Financeiro & Jurídico</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Modelo de Trabalho</label>
                  <select
                    value={editingEmployee.workModel || 'Presencial'}
                    onChange={(e) => setEditingEmployee(prev => ({ ...prev!, workModel: e.target.value as WorkModel }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  >
                    <option value="Presencial">Presencial</option>
                    <option value="Home Office">Home Office</option>
                    <option value="Híbrido">Híbrido</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Hostname PC Padrão</label>
                  <input
                    type="text"
                    value={editingEmployee.computerHost || ''}
                    onChange={(e) => setEditingEmployee(prev => ({ ...prev!, computerHost: e.target.value }))}
                    placeholder="Ex: DEV-WIN11-08"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">E-mail Corporativo</label>
                <input
                  type="email"
                  value={editingEmployee.email || ''}
                  onChange={(e) => setEditingEmployee(prev => ({ ...prev!, email: e.target.value }))}
                  placeholder="carlos.pereira@empresa.com.br"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold shadow-sm"
                >
                  Salvar Colaborador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          SUB-MODAL: EDIT / CREATE CATEGORY
         ======================================================== */}
      {editingCategory && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-amber-500" />
                {editingCategory.id ? 'Editar Categoria' : 'Cadastrar Nova Categoria'}
              </h4>
              <button onClick={() => setEditingCategory(null)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCategory} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nome da Categoria *</label>
                <input
                  type="text"
                  required
                  value={editingCategory.name || ''}
                  onChange={(e) => setEditingCategory(prev => ({ ...prev!, name: e.target.value }))}
                  placeholder="Ex: Câmeras CFTV, Projetores, etc."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Código / Slug</label>
                  <input
                    type="text"
                    value={editingCategory.code || ''}
                    onChange={(e) => setEditingCategory(prev => ({ ...prev!, code: e.target.value }))}
                    placeholder="hardware_cftv"
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Vida Útil Padrão (Meses)</label>
                  <input
                    type="number"
                    value={editingCategory.lifespanMonthsDefault ?? 36}
                    onChange={(e) => setEditingCategory(prev => ({ ...prev!, lifespanMonthsDefault: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold shadow-sm"
                >
                  Salvar Categoria
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          SUB-MODAL: EDIT / CREATE STATUS
         ======================================================== */}
      {editingStatus && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-500" />
                {editingStatus.id ? 'Editar Status' : 'Cadastrar Novo Status'}
              </h4>
              <button onClick={() => setEditingStatus(null)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStatus} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Rótulo / Nome do Status *</label>
                <input
                  type="text"
                  required
                  value={editingStatus.label || ''}
                  onChange={(e) => setEditingStatus(prev => ({ ...prev!, label: e.target.value }))}
                  placeholder="Ex: Em Empréstimo, Aguardando Laudo..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Chave / Código do Status</label>
                <input
                  type="text"
                  value={editingStatus.code || ''}
                  onChange={(e) => setEditingStatus(prev => ({ ...prev!, code: e.target.value }))}
                  placeholder="em_emprestimo"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Descrição</label>
                <input
                  type="text"
                  value={editingStatus.description || ''}
                  onChange={(e) => setEditingStatus(prev => ({ ...prev!, description: e.target.value }))}
                  placeholder="Explicação do estado do equipamento"
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingStatus(null)}
                  className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold shadow-sm"
                >
                  Salvar Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
