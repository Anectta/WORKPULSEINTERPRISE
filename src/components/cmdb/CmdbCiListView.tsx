import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  Download, 
  Server, 
  Shield, 
  Network, 
  Monitor, 
  Laptop, 
  Printer, 
  Database, 
  Box, 
  Wifi, 
  Lock, 
  Globe, 
  Activity, 
  Zap, 
  Eye, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  X,
  FileSpreadsheet
} from 'lucide-react';
import { ConfigurationItem, CITypeMetadata } from '../../types/cmdb';
import { INITIAL_CI_TYPES } from '../../data/cmdbInitialData';

interface CmdbCiListViewProps {
  items: ConfigurationItem[];
  onSelectCi: (ci: ConfigurationItem) => void;
  onOpenImpact: (ci: ConfigurationItem) => void;
  onCreateCi: (newItem: Partial<ConfigurationItem>) => void;
  onUpdateCi: (id: string, updates: Partial<ConfigurationItem>) => void;
  onDeleteCi: (id: string) => void;
}

export const CmdbCiListView: React.FC<CmdbCiListViewProps> = ({
  items,
  onSelectCi,
  onOpenImpact,
  onCreateCi,
  onUpdateCi,
  onDeleteCi
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('todos');
  const [selectedStatus, setSelectedStatus] = useState('todos');
  const [selectedLayer, setSelectedLayer] = useState('todas');
  const [selectedCriticality, setSelectedCriticality] = useState('todas');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingCi, setEditingCi] = useState<ConfigurationItem | null>(null);

  // New CI Form State
  const [formData, setFormData] = useState<Partial<ConfigurationItem>>({
    name: '',
    typeId: 'computador',
    typeGroup: 'hardware',
    typeName: 'Computador Desktop',
    status: 'operacional',
    criticality: 'media',
    layer: 'acesso',
    manufacturer: '',
    model: '',
    serialNumber: '',
    assetTag: '',
    hostname: '',
    ipAddress: '',
    macAddress: '',
    operatingSystem: '',
    location: 'Matriz - Escritório',
    responsible: 'Carlos Amoroso',
    department: 'TI',
    clientName: 'Empresa ABC',
    unit: 'Matriz',
    dynamicAttributes: {}
  });

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Text search
      const q = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || (
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        (item.hostname && item.hostname.toLowerCase().includes(q)) ||
        (item.ipAddress && item.ipAddress.toLowerCase().includes(q)) ||
        (item.serialNumber && item.serialNumber.toLowerCase().includes(q)) ||
        (item.assetTag && item.assetTag.toLowerCase().includes(q)) ||
        (item.responsible && item.responsible.toLowerCase().includes(q))
      );

      // Filters
      const matchesType = selectedType === 'todos' || item.typeId === selectedType;
      const matchesStatus = selectedStatus === 'todos' || item.status === selectedStatus;
      const matchesLayer = selectedLayer === 'todas' || item.layer === selectedLayer;
      const matchesCriticality = selectedCriticality === 'todas' || item.criticality === selectedCriticality;

      return matchesSearch && matchesType && matchesStatus && matchesLayer && matchesCriticality;
    });
  }, [items, searchTerm, selectedType, selectedStatus, selectedLayer, selectedCriticality]);

  const handleExportCsv = () => {
    const headers = ['Código', 'Nome', 'Tipo', 'IP', 'Hostname', 'Patrimônio', 'Série', 'Status', 'Criticidade', 'Responsável', 'Localização'];
    const rows = filteredItems.map(i => [
      i.code,
      i.name,
      i.typeName,
      i.ipAddress || '',
      i.hostname || '',
      i.assetTag || '',
      i.serialNumber || '',
      i.status,
      i.criticality,
      i.responsible || '',
      i.location || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + 
      [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `cmdb_itens_configuracao_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveCi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    const matchedType = INITIAL_CI_TYPES.find(t => t.id === formData.typeId);

    if (editingCi) {
      onUpdateCi(editingCi.id, {
        ...formData,
        typeName: matchedType ? matchedType.name : formData.typeName
      });
      setEditingCi(null);
    } else {
      onCreateCi({
        ...formData,
        typeName: matchedType ? matchedType.name : 'Item Genérico',
        typeGroup: matchedType ? matchedType.group : 'hardware'
      });
    }

    setIsCreateModalOpen(false);
  };

  const openEditModal = (ci: ConfigurationItem) => {
    setEditingCi(ci);
    setFormData({ ...ci });
    setIsCreateModalOpen(true);
  };

  const activeTypeMetadata = INITIAL_CI_TYPES.find(t => t.id === formData.typeId);

  return (
    <div className="space-y-4">
      
      {/* Search & Action Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nome, IP, hostname, patrimônio..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="todos">Todos os Tipos</option>
            {INITIAL_CI_TYPES.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={e => setSelectedStatus(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="todos">Todos os Status</option>
            <option value="operacional">Operacional</option>
            <option value="atencao">Atenção</option>
            <option value="indisponivel">Indisponível</option>
            <option value="manutencao">Manutenção</option>
          </select>

          {/* Layer Filter */}
          <select
            value={selectedLayer}
            onChange={e => setSelectedLayer(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="todas">Todas as Camadas</option>
            <option value="borda">Borda / WAN</option>
            <option value="core">Core / Distribuição</option>
            <option value="datacenter">Datacenter / Servidores</option>
            <option value="acesso">Acesso / Estações</option>
            <option value="aplicacao">Aplicações</option>
          </select>

          {/* Export CSV */}
          <button
            onClick={handleExportCsv}
            className="p-2 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-800 transition-colors cursor-pointer"
            title="Exportar base filtrada em CSV"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Novo CI Button */}
          <button
            onClick={() => {
              setEditingCi(null);
              setFormData({
                name: '',
                typeId: 'computador',
                typeGroup: 'hardware',
                typeName: 'Computador Desktop',
                status: 'operacional',
                criticality: 'media',
                layer: 'acesso',
                manufacturer: 'Dell',
                model: '',
                location: 'Matriz - Escritório',
                responsible: 'Carlos Amoroso',
                department: 'TI',
                clientName: 'Empresa ABC',
                unit: 'Matriz',
                dynamicAttributes: {}
              });
              setIsCreateModalOpen(true);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Item de Configuração</span>
          </button>
        </div>

      </div>

      {/* CI Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px] font-bold">
              <tr>
                <th className="py-3.5 px-4">Item de Configuração</th>
                <th className="py-3.5 px-3">Tipo & Camada</th>
                <th className="py-3.5 px-3">Endereço IP / Hostname</th>
                <th className="py-3.5 px-3">Localização & Responsável</th>
                <th className="py-3.5 px-3">Status</th>
                <th className="py-3.5 px-3">Criticidade</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-slate-900/50">
              {filteredItems.length > 0 ? (
                filteredItems.map(item => (
                  <tr key={item.id} className="hover:bg-slate-800/50 transition-colors group">
                    
                    {/* Name & Code */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                          {item.typeId === 'servidor' ? <Server className="w-4 h-4 text-indigo-400" /> :
                           item.typeId === 'firewall' ? <Shield className="w-4 h-4 text-rose-400" /> :
                           item.typeId === 'switch' ? <Network className="w-4 h-4 text-emerald-400" /> :
                           item.typeId === 'banco_de_dados' ? <Database className="w-4 h-4 text-blue-400" /> :
                           item.typeId === 'impressora' ? <Printer className="w-4 h-4 text-teal-400" /> :
                           item.typeId === 'access_point' ? <Wifi className="w-4 h-4 text-amber-400" /> :
                           <Monitor className="w-4 h-4 text-blue-400" />}
                        </div>
                        <div>
                          <div className="font-bold text-white group-hover:text-blue-400 transition-colors">
                            {item.name}
                          </div>
                          <div className="font-mono text-[10px] text-slate-500">
                            {item.code} {item.assetTag ? `• ${item.assetTag}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Type & Layer */}
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-200">{item.typeName}</div>
                      <span className="text-[10px] text-slate-500 uppercase tracking-wide">
                        Camada: {item.layer}
                      </span>
                    </td>

                    {/* IP & Hostname */}
                    <td className="py-3 px-3 font-mono">
                      <div className="text-blue-400 font-bold">{item.ipAddress || 'DHCP'}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[150px]">{item.hostname || '—'}</div>
                    </td>

                    {/* Location & Resp */}
                    <td className="py-3 px-3">
                      <div className="text-slate-200">{item.location || '—'}</div>
                      <div className="text-[10px] text-slate-400">{item.responsible || 'Sem responsável'}</div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-3">
                      {item.status === 'operacional' && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Operacional
                        </span>
                      )}
                      {item.status === 'atencao' && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-950 text-amber-400 border border-amber-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Atenção
                        </span>
                      )}
                      {item.status === 'indisponivel' && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-950 text-red-400 border border-red-800">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> Indisponível
                        </span>
                      )}
                      {item.status === 'manutencao' && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-950 text-blue-400 border border-blue-800">
                          Manutenção
                        </span>
                      )}
                    </td>

                    {/* Criticality */}
                    <td className="py-3 px-3">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                        item.criticality === 'critica' ? 'bg-red-950 text-red-400 border-red-800' :
                        item.criticality === 'alta' ? 'bg-orange-950 text-orange-400 border-orange-800' :
                        item.criticality === 'media' ? 'bg-amber-950 text-amber-400 border-amber-800' :
                        'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {item.criticality}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onOpenImpact(item)}
                          className="p-1.5 hover:bg-red-950/60 text-slate-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                          title="Analisar Impacto"
                        >
                          <Zap className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onSelectCi(item)}
                          className="p-1.5 hover:bg-blue-950/60 text-slate-400 hover:text-blue-400 rounded-lg transition-colors cursor-pointer"
                          title="Abrir Raio-X"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditModal(item)}
                          className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                          title="Editar CI"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Remover definitivamente o CI ${item.name} (${item.code})?`)) {
                              onDeleteCi(item.id);
                            }
                          }}
                          className="p-1.5 hover:bg-red-950/60 text-slate-400 hover:text-red-400 rounded-lg transition-colors cursor-pointer"
                          title="Excluir CI"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Nenhum Item de Configuração encontrado com os filtros selecionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-slate-200">
            
            <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                {editingCi ? `Editar CI: ${editingCi.name}` : 'Cadastrar Novo Item de Configuração (CI)'}
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCi} className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
              
              {/* Basic Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-slate-400 mb-1">Nome do Item *</label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Switch Core Andar 2"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Tipo de CI *</label>
                  <select
                    value={formData.typeId || 'computador'}
                    onChange={e => {
                      const t = INITIAL_CI_TYPES.find(it => it.id === e.target.value);
                      setFormData({
                        ...formData,
                        typeId: e.target.value,
                        typeName: t ? t.name : 'Outro',
                        typeGroup: t ? t.group : 'hardware',
                        layer: t ? t.defaultLayer : formData.layer
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  >
                    {INITIAL_CI_TYPES.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Status Operacional</label>
                  <select
                    value={formData.status || 'operacional'}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="operacional">Operacional</option>
                    <option value="atencao">Atenção</option>
                    <option value="indisponivel">Indisponível</option>
                    <option value="manutencao">Manutenção</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Criticidade</label>
                  <select
                    value={formData.criticality || 'media'}
                    onChange={e => setFormData({ ...formData, criticality: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="media">Média</option>
                    <option value="alta">Alta</option>
                    <option value="critica">Crítica</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Camada na Rede</label>
                  <select
                    value={formData.layer || 'acesso'}
                    onChange={e => setFormData({ ...formData, layer: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="borda">Borda / WAN</option>
                    <option value="core">Core</option>
                    <option value="distribuicao">Distribuição</option>
                    <option value="datacenter">Datacenter / Servidores</option>
                    <option value="acesso">Acesso</option>
                    <option value="aplicacao">Aplicação</option>
                  </select>
                </div>
              </div>

              {/* Hardware / Network specs */}
              <div className="pt-2 border-t border-slate-800">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                  Rede & Hardware
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-slate-400 mb-1">Endereço IP</label>
                    <input
                      type="text"
                      value={formData.ipAddress || ''}
                      onChange={e => setFormData({ ...formData, ipAddress: e.target.value })}
                      placeholder="192.168.1.50"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Hostname</label>
                    <input
                      type="text"
                      value={formData.hostname || ''}
                      onChange={e => setFormData({ ...formData, hostname: e.target.value })}
                      placeholder="sw-core.empresa.local"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">MAC Address</label>
                    <input
                      type="text"
                      value={formData.macAddress || ''}
                      onChange={e => setFormData({ ...formData, macAddress: e.target.value })}
                      placeholder="AA:BB:CC:DD:EE:FF"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Fabricante</label>
                    <input
                      type="text"
                      value={formData.manufacturer || ''}
                      onChange={e => setFormData({ ...formData, manufacturer: e.target.value })}
                      placeholder="Dell / Cisco / HP"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Modelo</label>
                    <input
                      type="text"
                      value={formData.model || ''}
                      onChange={e => setFormData({ ...formData, model: e.target.value })}
                      placeholder="PowerEdge R750"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Nº de Patrimônio</label>
                    <input
                      type="text"
                      value={formData.assetTag || ''}
                      onChange={e => setFormData({ ...formData, assetTag: e.target.value })}
                      placeholder="PAT-2026-0042"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Responsible & Location */}
              <div className="pt-2 border-t border-slate-800">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                  Responsabilidade & Localização
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-slate-400 mb-1">Responsável / Cautela</label>
                    <input
                      type="text"
                      value={formData.responsible || ''}
                      onChange={e => setFormData({ ...formData, responsible: e.target.value })}
                      placeholder="Nome do colaborador ou gestor"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Localização Física</label>
                    <input
                      type="text"
                      value={formData.location || ''}
                      onChange={e => setFormData({ ...formData, location: e.target.value })}
                      placeholder="Data Center / Rack R01"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Attributes for this type */}
              {activeTypeMetadata && activeTypeMetadata.attributeDefinitions.length > 0 && (
                <div className="pt-2 border-t border-slate-800">
                  <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-2.5">
                    Atributos Específicos de {activeTypeMetadata.name}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {activeTypeMetadata.attributeDefinitions.map(def => (
                      <div key={def.key}>
                        <label className="block text-slate-400 mb-1">
                          {def.label} {def.unit ? `(${def.unit})` : ''}
                        </label>
                        <input
                          type={def.type === 'number' ? 'number' : 'text'}
                          defaultValue={formData.dynamicAttributes?.[def.key] ?? def.defaultValue ?? ''}
                          onChange={e => {
                            setFormData({
                              ...formData,
                              dynamicAttributes: {
                                ...formData.dynamicAttributes,
                                [def.key]: def.type === 'number' ? Number(e.target.value) : e.target.value
                              }
                            });
                          }}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-4 bg-slate-950 border-t border-slate-800 -mx-6 -mb-6 mt-6 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold cursor-pointer"
                >
                  Salvar Item de Configuração
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
