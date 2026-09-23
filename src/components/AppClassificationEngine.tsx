import React, { useState, useEffect, useMemo } from 'react';
import { 
  AppClassificationRule, 
  AppCategory, 
  Department 
} from '../types';
import { 
  SlidersHorizontal, 
  Sparkles, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  Trash2, 
  Building2,
  Cpu,
  Layers,
  Search,
  Filter,
  Edit2,
  Download,
  RefreshCw,
  ExternalLink,
  X,
  FileSpreadsheet,
  AlertCircle,
  Check,
  Globe,
  Terminal,
  ShieldAlert,
  Info
} from 'lucide-react';

interface AppClassificationEngineProps {
  rules: AppClassificationRule[];
  onAddRule: (rule: AppClassificationRule) => void;
  onDeleteRule: (id: string) => void;
  onUpdateRuleCategory: (id: string, category: AppCategory) => void;
  onUpdateRule?: (rule: AppClassificationRule) => void;
  onResetRules?: () => void;
  openModalTrigger?: number;
}

const COMMON_GROUPS = [
  'Desenvolvimento',
  'ERP Corporate',
  'Vendas/CRM',
  'Design & Criação',
  'Comunicação',
  'RH & Ponto',
  'Gestão & Projetos',
  'Redes Sociais',
  'Streaming/Vídeo',
  'Jogos & Entretenimento'
];

const DEPARTMENTS_LIST: Department[] = [
  'Todas as Áreas',
  'Engenharia',
  'Vendas',
  'RH & Pessoas',
  'Atendimento & Suporte',
  'Marketing',
  'Financeiro & Jurídico'
];

export const AppClassificationEngine: React.FC<AppClassificationEngineProps> = ({
  rules,
  onAddRule,
  onDeleteRule,
  onUpdateRuleCategory,
  onUpdateRule,
  onResetRules,
  openModalTrigger
}) => {
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);

  // Form Fields
  const [formAppName, setFormAppName] = useState('');
  const [formProcessName, setFormProcessName] = useState('');
  const [formDomain, setFormDomain] = useState('');
  const [formCategory, setFormCategory] = useState<AppCategory>('Produtivo');
  const [formGroupName, setFormGroupName] = useState('Desenvolvimento');
  const [formDept, setFormDept] = useState<Department>('Todas as Áreas');
  const [formDescription, setFormDescription] = useState('');
  const [isAiSuggested, setIsAiSuggested] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | AppCategory>('all');
  const [departmentFilter, setDepartmentFilter] = useState<'all' | Department>('all');

  // Confirmation for Delete
  const [ruleToDelete, setRuleToDelete] = useState<AppClassificationRule | null>(null);

  // Listen for openModalTrigger (from top header button "Cadastrar Novo Software")
  useEffect(() => {
    if (openModalTrigger && openModalTrigger > 0) {
      openCreateModal();
    }
  }, [openModalTrigger]);

  const resetForm = () => {
    setFormAppName('');
    setFormProcessName('');
    setFormDomain('');
    setFormCategory('Produtivo');
    setFormGroupName('Desenvolvimento');
    setFormDept('Todas as Áreas');
    setFormDescription('');
    setIsAiSuggested(false);
    setEditingRuleId(null);
  };

  const openCreateModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (rule: AppClassificationRule) => {
    setEditingRuleId(rule.id);
    setFormAppName(rule.appName);
    setFormProcessName(rule.processName || '');
    setFormDomain(rule.domainPattern || '');
    setFormCategory(rule.category);
    setFormGroupName(rule.groupName);
    setFormDept(rule.targetDepartment);
    setFormDescription(rule.description || '');
    setIsAiSuggested(!!rule.isAiSuggested);
    setIsModalOpen(true);
  };

  const handleSaveRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAppName.trim()) return;

    if (editingRuleId) {
      // Update existing rule
      const updatedRule: AppClassificationRule = {
        id: editingRuleId,
        appName: formAppName.trim(),
        processName: formProcessName.trim() || undefined,
        domainPattern: formDomain.trim() || undefined,
        category: formCategory,
        groupName: formGroupName.trim() || 'Geral',
        targetDepartment: formDept,
        description: formDescription.trim() || undefined,
        isAiSuggested: isAiSuggested,
        createdAt: new Date().toLocaleDateString('pt-BR')
      };

      if (onUpdateRule) {
        onUpdateRule(updatedRule);
      } else {
        onDeleteRule(editingRuleId);
        onAddRule(updatedRule);
      }
    } else {
      // Create new rule
      const newRule: AppClassificationRule = {
        id: `rule-${Date.now()}`,
        appName: formAppName.trim(),
        processName: formProcessName.trim() || undefined,
        domainPattern: formDomain.trim() || undefined,
        category: formCategory,
        groupName: formGroupName.trim() || 'Geral',
        targetDepartment: formDept,
        description: formDescription.trim() || undefined,
        isAiSuggested: isAiSuggested,
        createdAt: new Date().toLocaleDateString('pt-BR')
      };

      onAddRule(newRule);
    }

    setIsModalOpen(false);
    resetForm();
  };

  // Export Rules to CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Software', 'Executável (Processo)', 'Domínio URL', 'Categoria', 'Grupo', 'Departamento Alvo', 'Origem IA', 'Descrição'];
    const rows = rules.map(r => [
      r.id,
      `"${r.appName.replace(/"/g, '""')}"`,
      `"${(r.processName || '').replace(/"/g, '""')}"`,
      `"${(r.domainPattern || 'Qualquer').replace(/"/g, '""')}"`,
      r.category,
      `"${r.groupName.replace(/"/g, '""')}"`,
      `"${r.targetDepartment}"`,
      r.isAiSuggested ? 'Sim' : 'Não',
      `"${(r.description || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `catalogo_softwares_workpulse_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Rules
  const filteredRules = useMemo(() => {
    return rules.filter(r => {
      // Category filter
      if (categoryFilter !== 'all' && r.category !== categoryFilter) return false;

      // Department filter
      if (departmentFilter !== 'all' && r.targetDepartment !== departmentFilter) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = r.appName.toLowerCase().includes(q);
        const matchesProcess = (r.processName || '').toLowerCase().includes(q);
        const matchesDomain = (r.domainPattern || '').toLowerCase().includes(q);
        const matchesGroup = r.groupName.toLowerCase().includes(q);
        const matchesDept = r.targetDepartment.toLowerCase().includes(q);
        const matchesDesc = (r.description || '').toLowerCase().includes(q);
        if (!matchesName && !matchesProcess && !matchesDomain && !matchesGroup && !matchesDept && !matchesDesc) {
          return false;
        }
      }

      return true;
    });
  }, [rules, categoryFilter, departmentFilter, searchQuery]);

  // Metrics summary
  const totalCount = rules.length;
  const productiveCount = rules.filter(r => r.category === 'Produtivo').length;
  const unproductiveCount = rules.filter(r => r.category === 'Improdutivo').length;
  const neutralCount = rules.filter(r => r.category === 'Neutro').length;
  const aiCount = rules.filter(r => r.isAiSuggested).length;

  return (
    <div className="space-y-6 font-sans">
      {/* MASTER REGISTRATION TABLE & CONTROLS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        {/* Table Header with Title and Primary Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-1 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center space-x-2">
              <SlidersHorizontal className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Tabela de Cadastro de Softwares & Regras de Produtividade
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Gerencie a classificação de executáveis (.exe), janelas e URLs capturadas pelo agente em tempo real.
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {onResetRules && (
              <button
                type="button"
                onClick={onResetRules}
                className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold px-3 py-2 rounded-xl transition-all cursor-pointer"
                title="Restaurar lista padrão de softwares corporativos"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                <span>Restaurar Padrões</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold px-3 py-2 rounded-xl transition-all cursor-pointer"
              title="Exportar tabela de softwares cadastrados em formato CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Exportar CSV</span>
            </button>

            <button
              type="button"
              onClick={openCreateModal}
              className="flex items-center space-x-1.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-95 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Cadastrar Novo Software</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por software, executável (.exe), domínio ou grupo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter Pills & Department Select */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Category Pills */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-bold">
              <button
                onClick={() => setCategoryFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  categoryFilter === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Todos ({rules.length})
              </button>
              <button
                onClick={() => setCategoryFilter('Produtivo')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center space-x-1 cursor-pointer ${
                  categoryFilter === 'Produtivo'
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                }`}
              >
                <span>Produtivo</span>
                <span className="text-[10px] opacity-80">({productiveCount})</span>
              </button>
              <button
                onClick={() => setCategoryFilter('Improdutivo')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center space-x-1 cursor-pointer ${
                  categoryFilter === 'Improdutivo'
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'text-rose-700 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                }`}
              >
                <span>Improdutivo</span>
                <span className="text-[10px] opacity-80">({unproductiveCount})</span>
              </button>
              <button
                onClick={() => setCategoryFilter('Neutro')}
                className={`px-2.5 py-1 rounded-lg transition-all flex items-center space-x-1 cursor-pointer ${
                  categoryFilter === 'Neutro'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                }`}
              >
                <span>Neutro</span>
                <span className="text-[10px] opacity-80">({neutralCount})</span>
              </button>
            </div>

            {/* Department Filter */}
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value as any)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 font-bold focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">Todos os Departamentos</option>
              {DEPARTMENTS_LIST.map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto border border-slate-200/80 dark:border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th className="p-3">Software & Executável</th>
                <th className="p-3">Domínio / URL</th>
                <th className="p-3">Grupo / Categoria</th>
                <th className="p-3">Departamento Alvo</th>
                <th className="p-3">Classificação de Produtividade</th>
                <th className="p-3">Origem</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
              {filteredRules.length > 0 ? (
                filteredRules.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="p-3">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center shrink-0">
                          <Cpu className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                            <span>{r.appName}</span>
                          </div>
                          <div className="flex items-center space-x-1.5 mt-0.5">
                            {r.processName ? (
                              <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                {r.processName}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400">Processo padrão</span>
                            )}
                            {r.description && (
                              <span className="text-[10px] text-slate-400 truncate max-w-xs" title={r.description}>
                                • {r.description}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="p-3">
                      {r.domainPattern ? (
                        <div className="flex items-center space-x-1.5 font-mono text-[11px] text-blue-600 dark:text-blue-400">
                          <Globe className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                          <span className="truncate max-w-[150px]">{r.domainPattern}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Qualquer / Global</span>
                      )}
                    </td>

                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-md text-[11px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-300">
                        {r.groupName}
                      </span>
                    </td>

                    <td className="p-3">
                      <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400">
                        {r.targetDepartment}
                      </span>
                    </td>

                    <td className="p-3">
                      <select
                        value={r.category}
                        onChange={(e) => onUpdateRuleCategory(r.id, e.target.value as AppCategory)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold border cursor-pointer focus:outline-none transition-all ${
                          r.category === 'Produtivo'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                            : r.category === 'Improdutivo'
                            ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                        }`}
                      >
                        <option value="Produtivo">✅ Produtivo</option>
                        <option value="Improdutivo">❌ Improdutivo</option>
                        <option value="Neutro">⚠️ Neutro</option>
                      </select>
                    </td>

                    <td className="p-3">
                      {r.isAiSuggested ? (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          <Sparkles className="w-3 h-3 text-purple-500" />
                          <span>IA Gemini</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium">Manual</span>
                      )}
                    </td>

                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => openEditModal(r)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Editar regra de software"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setRuleToDelete(r)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Excluir regra"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500 dark:text-slate-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <SlidersHorizontal className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                      <div className="font-bold text-slate-700 dark:text-slate-300">Nenhum software encontrado</div>
                      <p className="text-xs">Não encontramos regras com os filtros atuais selecionados.</p>
                      <button
                        onClick={() => { setSearchQuery(''); setCategoryFilter('all'); setDepartmentFilter('all'); }}
                        className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
                      >
                        Limpar todos os filtros
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer info */}
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-1">
          <span>Mostrando {filteredRules.length} de {rules.length} softwares cadastrados</span>
          <span className="text-[11px] font-mono">Regras sincronizadas instantaneamente com o agente local</span>
        </div>
      </div>

      {/* MODAL: CADASTRAR / EDITAR NOVO SOFTWARE */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-xl w-full rounded-3xl p-6 text-slate-900 dark:text-slate-100 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3.5">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center space-x-2">
                  <div className="p-1.5 rounded-lg bg-gradient-to-tr from-indigo-600 to-pink-600 text-white">
                    <SlidersHorizontal className="w-4 h-4" />
                  </div>
                  <span>{editingRuleId ? 'Editar Regra de Software' : 'Cadastrar Novo Software / Aplicação'}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Preencha os dados do programa ou site para calibrar a produtividade corporativa.
                </p>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveRule} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* App Name */}
                <div className="space-y-1">
                  <label className="block text-slate-700 dark:text-slate-300 font-bold font-mono uppercase text-[10px]">
                    Nome do Software / Aplicação *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Visual Studio Code, Figma, SAP"
                    value={formAppName}
                    onChange={(e) => setFormAppName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-medium focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500"
                  />
                </div>

                {/* Process / Executable Name */}
                <div className="space-y-1">
                  <label className="block text-slate-700 dark:text-slate-300 font-bold font-mono uppercase text-[10px]">
                    Nome do Executável (.exe)
                  </label>
                  <div className="relative">
                    <Terminal className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Ex: Code.exe, figma.exe, saplogon.exe"
                      value={formProcessName}
                      onChange={(e) => setFormProcessName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-2 text-slate-900 dark:text-white font-mono text-[11px] focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              {/* Domain Pattern */}
              <div className="space-y-1">
                <label className="block text-slate-700 dark:text-slate-300 font-bold font-mono uppercase text-[10px]">
                  Domínio ou Padrão de URL (Opcional)
                </label>
                <div className="relative">
                  <Globe className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Ex: figma.com, *.atlassian.net, web.whatsapp.com"
                    value={formDomain}
                    onChange={(e) => setFormDomain(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-2 text-slate-900 dark:text-white font-mono text-[11px] focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Classification Category Pills */}
              <div className="space-y-1.5">
                <label className="block text-slate-700 dark:text-slate-300 font-bold font-mono uppercase text-[10px]">
                  Classificação de Produtividade *
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setFormCategory('Produtivo')}
                    className={`p-3 rounded-xl border text-left flex flex-col items-start transition-all cursor-pointer ${
                      formCategory === 'Produtivo'
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 font-black text-xs text-emerald-700 dark:text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Produtivo</span>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Soma como tempo ativo focado</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormCategory('Improdutivo')}
                    className={`p-3 rounded-xl border text-left flex flex-col items-start transition-all cursor-pointer ${
                      formCategory === 'Improdutivo'
                        ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-500 text-rose-900 dark:text-rose-200 ring-2 ring-rose-500/20'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 font-black text-xs text-rose-700 dark:text-rose-400">
                      <XCircle className="w-4 h-4" />
                      <span>Improdutivo</span>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Gera alertas de distração</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormCategory('Neutro')}
                    className={`p-3 rounded-xl border text-left flex flex-col items-start transition-all cursor-pointer ${
                      formCategory === 'Neutro'
                        ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/20'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 font-black text-xs text-amber-700 dark:text-amber-400">
                      <HelpCircle className="w-4 h-4" />
                      <span>Neutro</span>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Não penaliza o score</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {/* Thematic Group */}
                <div className="space-y-1">
                  <label className="block text-slate-700 dark:text-slate-300 font-bold font-mono uppercase text-[10px]">
                    Grupo / Categoria Temática *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Desenvolvimento, CRM, ERP"
                    value={formGroupName}
                    onChange={(e) => setFormGroupName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-medium focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500"
                  />
                  {/* Quick Group chips */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {COMMON_GROUPS.slice(0, 5).map((grp) => (
                      <button
                        key={grp}
                        type="button"
                        onClick={() => setFormGroupName(grp)}
                        className={`text-[10px] px-1.5 py-0.5 rounded cursor-pointer ${
                          formGroupName === grp
                            ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 font-bold'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                        }`}
                      >
                        {grp}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Target Department */}
                <div className="space-y-1">
                  <label className="block text-slate-700 dark:text-slate-300 font-bold font-mono uppercase text-[10px]">
                    Departamento Aplicado *
                  </label>
                  <select
                    value={formDept}
                    onChange={(e) => setFormDept(e.target.value as Department)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {DEPARTMENTS_LIST.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400">
                    Selecione &quot;Todas as Áreas&quot; para aplicar a política para a empresa toda.
                  </p>
                </div>
              </div>

              {/* Description / Notes */}
              <div className="space-y-1">
                <label className="block text-slate-700 dark:text-slate-300 font-bold font-mono uppercase text-[10px]">
                  Observações ou Justificativa de Uso
                </label>
                <textarea
                  rows={2}
                  placeholder="Justificativa de negócio para esta classificação..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-white font-medium focus:outline-none focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-95 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center space-x-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingRuleId ? 'Salvar Alterações' : 'Cadastrar Software no Motor'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {ruleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-sm w-full rounded-2xl p-5 text-slate-900 dark:text-slate-100 space-y-4 shadow-xl">
            <div className="flex items-center space-x-3 text-rose-600 dark:text-rose-400">
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h4 className="font-black text-sm">Remover Regra de Software?</h4>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400">
              Tem certeza que deseja excluir a regra de classificação para <strong className="text-slate-900 dark:text-white">&quot;{ruleToDelete.appName}&quot;</strong>?
              O software passará a ser computado com regra padrão ou neutra.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setRuleToDelete(null)}
                className="px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onDeleteRule(ruleToDelete.id);
                  setRuleToDelete(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
              >
                Excluir Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
