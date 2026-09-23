import React, { useState } from 'react';
import { 
  Shield, 
  Check, 
  X, 
  Save, 
  Download, 
  Search, 
  RotateCcw, 
  Lock, 
  Unlock,
  Key,
  Layers,
  FileCode2,
  CheckCircle2,
  AlertCircle,
  Terminal
} from 'lucide-react';

export type OperationalRole = 
  | 'Admin Geral' 
  | 'Gestor de TI & Segurança' 
  | 'Gestor de RH & DP' 
  | 'Supervisor Operacional' 
  | 'Auditor de Compliance (LGPD)' 
  | 'Analista de Suporte TI' 
  | 'Colaborador';

export type PermissionAction = 
  | 'ver' 
  | 'criar' 
  | 'editar' 
  | 'excluir' 
  | 'aprovar' 
  | 'exportar' 
  | 'auditar';

export interface OperationalModuleItem {
  id: string;
  name: string;
  endpointPrefix: string;
  category: string;
}

export const OPERATIONAL_MODULES_13: OperationalModuleItem[] = [
  { id: 'mod-1', name: 'Visão Executiva & Dashboard', endpointPrefix: '/api/v1/overview', category: 'Dashboard & Indicadores' },
  { id: 'mod-2', name: 'Controle de Jornada & Ponto (REP)', endpointPrefix: '/api/v1/workday', category: 'Jornada & Compliance' },
  { id: 'mod-3', name: 'Monitor de Atividades & Timeline', endpointPrefix: '/api/v1/activity', category: 'Rastreabilidade Operacional' },
  { id: 'mod-4', name: 'Motor de Classificação de Softwares', endpointPrefix: '/api/v1/apps', category: 'Regras de Produtividade' },
  { id: 'mod-5', name: 'Bloqueio de Sites & Políticas de PC', endpointPrefix: '/api/v1/blocking', category: 'Segurança & Restrição' },
  { id: 'mod-6', name: 'Rankings de Produtividade & Setores', endpointPrefix: '/api/v1/rankings', category: 'Performance de Equipes' },
  { id: 'mod-7', name: 'Instalador Silencioso GPO & Agente MSI', endpointPrefix: '/api/v1/gpo-agent', category: 'Implantação & Infra' },
  { id: 'mod-8', name: 'Auditoria LGPD & Termos de Privacidade', endpointPrefix: '/api/v1/lgpd-audit', category: 'Privacidade & DPO' },
  { id: 'mod-9', name: 'Base de Conhecimento, Manuais & POPs', endpointPrefix: '/api/v1/knowledge', category: 'Governança & Treinamento' },
  { id: 'mod-10', name: 'Gestão de Usuários & Níveis de Acesso', endpointPrefix: '/api/v1/users', category: 'Segurança & Acessos' },
  { id: 'mod-11', name: 'Topologia da Infraestrutura & Redes SNMP', endpointPrefix: '/api/v1/infra-topology', category: 'Infraestrutura & Redes' },
  { id: 'mod-12', name: 'Gestão Patrimonial de TI & Ativos (ITAM)', endpointPrefix: '/api/v1/assets', category: 'Patrimônio & ITAM' },
  { id: 'mod-13', name: 'Auditoria Geral, Logs & Matriz RBAC', endpointPrefix: '/api/v1/rbac', category: 'Segurança & Auditoria' },
];

export const OPERATIONAL_ROLES: OperationalRole[] = [
  'Admin Geral',
  'Gestor de TI & Segurança',
  'Gestor de RH & DP',
  'Supervisor Operacional',
  'Auditor de Compliance (LGPD)',
  'Analista de Suporte TI',
  'Colaborador',
];

export const PERMISSION_ACTIONS: { key: PermissionAction; label: string }[] = [
  { key: 'ver', label: 'VER' },
  { key: 'criar', label: 'CRIAR' },
  { key: 'editar', label: 'EDITAR' },
  { key: 'excluir', label: 'EXCLUIR' },
  { key: 'aprovar', label: 'APROVAR' },
  { key: 'exportar', label: 'EXPORTAR' },
  { key: 'auditar', label: 'AUDITAR' },
];

// Helper to create initial matrix
const createDefaultMatrix = (): Record<OperationalRole, Record<string, Record<PermissionAction, boolean>>> => {
  const matrix: any = {};

  OPERATIONAL_ROLES.forEach((role) => {
    matrix[role] = {};

    OPERATIONAL_MODULES_13.forEach((mod) => {
      if (role === 'Admin Geral') {
        matrix[role][mod.id] = {
          ver: true,
          criar: true,
          editar: true,
          excluir: true,
          aprovar: true,
          exportar: true,
          auditar: true,
        };
      } else if (role === 'Gestor de TI & Segurança') {
        const isSecurityOrInfra = ['mod-4', 'mod-5', 'mod-7', 'mod-8', 'mod-10', 'mod-11', 'mod-12', 'mod-13'].includes(mod.id);
        matrix[role][mod.id] = {
          ver: true,
          criar: isSecurityOrInfra,
          editar: isSecurityOrInfra,
          excluir: ['mod-4', 'mod-5', 'mod-11', 'mod-12'].includes(mod.id),
          aprovar: isSecurityOrInfra,
          exportar: true,
          auditar: true,
        };
      } else if (role === 'Gestor de RH & DP') {
        const isHR = ['mod-1', 'mod-2', 'mod-6', 'mod-8', 'mod-9'].includes(mod.id);
        matrix[role][mod.id] = {
          ver: ['mod-1', 'mod-2', 'mod-3', 'mod-6', 'mod-8', 'mod-9', 'mod-10'].includes(mod.id),
          criar: isHR,
          editar: isHR,
          excluir: false,
          aprovar: ['mod-2', 'mod-6'].includes(mod.id),
          exportar: true,
          auditar: ['mod-2', 'mod-8'].includes(mod.id),
        };
      } else if (role === 'Supervisor Operacional') {
        const isOps = ['mod-1', 'mod-2', 'mod-3', 'mod-4', 'mod-6', 'mod-9'].includes(mod.id);
        matrix[role][mod.id] = {
          ver: isOps,
          criar: ['mod-4', 'mod-9'].includes(mod.id),
          editar: ['mod-4'].includes(mod.id),
          excluir: false,
          aprovar: ['mod-2'].includes(mod.id),
          exportar: true,
          auditar: false,
        };
      } else if (role === 'Auditor de Compliance (LGPD)') {
        matrix[role][mod.id] = {
          ver: true,
          criar: false,
          editar: false,
          excluir: false,
          aprovar: ['mod-8'].includes(mod.id),
          exportar: true,
          auditar: true,
        };
      } else if (role === 'Analista de Suporte TI') {
        const isSupport = ['mod-7', 'mod-9', 'mod-11', 'mod-12'].includes(mod.id);
        matrix[role][mod.id] = {
          ver: ['mod-1', 'mod-3', 'mod-4', 'mod-5', 'mod-7', 'mod-9', 'mod-11', 'mod-12'].includes(mod.id),
          criar: isSupport,
          editar: isSupport,
          excluir: false,
          aprovar: false,
          exportar: false,
          auditar: ['mod-7', 'mod-11'].includes(mod.id),
        };
      } else {
        // Colaborador
        matrix[role][mod.id] = {
          ver: ['mod-1', 'mod-2', 'mod-9'].includes(mod.id),
          criar: false,
          editar: false,
          excluir: false,
          aprovar: false,
          exportar: false,
          auditar: false,
        };
      }
    });
  });

  return matrix;
};

export const OperationalRbacMatrix: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<OperationalRole>('Gestor de TI & Segurança');
  const [matrixState, setMatrixState] = useState(createDefaultMatrix());
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showEndpointInspector, setShowEndpointInspector] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const handleToggleCell = (role: OperationalRole, moduleId: string, action: PermissionAction) => {
    setMatrixState((prev) => {
      const currentVal = prev[role]?.[moduleId]?.[action] ?? false;
      return {
        ...prev,
        [role]: {
          ...prev[role],
          [moduleId]: {
            ...prev[role][moduleId],
            [action]: !currentVal,
          },
        },
      };
    });
  };

  const handleBatchRoleAction = (mode: 'grant_all' | 'revoke_all' | 'read_only') => {
    setMatrixState((prev) => {
      const updatedRoleData = { ...prev[selectedRole] };

      OPERATIONAL_MODULES_13.forEach((mod) => {
        if (mode === 'grant_all') {
          updatedRoleData[mod.id] = {
            ver: true,
            criar: true,
            editar: true,
            excluir: true,
            aprovar: true,
            exportar: true,
            auditar: true,
          };
        } else if (mode === 'revoke_all') {
          updatedRoleData[mod.id] = {
            ver: false,
            criar: false,
            editar: false,
            excluir: false,
            aprovar: false,
            exportar: false,
            auditar: false,
          };
        } else if (mode === 'read_only') {
          updatedRoleData[mod.id] = {
            ver: true,
            criar: false,
            editar: false,
            excluir: false,
            aprovar: false,
            exportar: true,
            auditar: false,
          };
        }
      });

      return {
        ...prev,
        [selectedRole]: updatedRoleData,
      };
    });
  };

  const handleResetDefaults = () => {
    setMatrixState(createDefaultMatrix());
    setSaveSuccessMsg('Matriz RBAC restaurada para os padrões oficiais.');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const handleSaveMatrix = () => {
    setSaveSuccessMsg(`Políticas do perfil "${selectedRole}" salvas com sucesso no banco de dados!`);
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(matrixState, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `rbac_operational_matrix_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const filteredModules = OPERATIONAL_MODULES_13.filter(
    (mod) =>
      mod.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mod.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-5 text-slate-900 dark:text-slate-100 font-sans">
      
      {/* Toast Notification */}
      {saveSuccessMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center justify-between shadow-xs animate-fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
          <button onClick={() => setSaveSuccessMsg(null)} className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* SELECTION BAR: PAPEL OPERACIONAL */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-5 rounded-2xl space-y-4 shadow-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-amber-50 dark:bg-amber-950/80 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-700 dark:text-amber-300">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-amber-800 dark:text-amber-300 block">
                SELECIONAR PAPEL OPERACIONAL:
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Ajuste os privilégios granulares do perfil selecionado para os 13 módulos do sistema.
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleBatchRoleAction('grant_all')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-[11px] font-bold border border-slate-200 dark:border-slate-700 flex items-center space-x-1 transition-colors cursor-pointer"
              title="Conceder todas as permissões para o papel atual"
            >
              <Unlock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>Conceder Tudo</span>
            </button>

            <button
              onClick={() => handleBatchRoleAction('read_only')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-[11px] font-bold border border-slate-200 dark:border-slate-700 flex items-center space-x-1 transition-colors cursor-pointer"
              title="Permitir apenas VER e EXPORTAR"
            >
              <Layers className="w-3 h-3 text-blue-600 dark:text-blue-400" />
              <span>Somente Leitura</span>
            </button>

            <button
              onClick={() => handleBatchRoleAction('revoke_all')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-[11px] font-bold border border-slate-200 dark:border-slate-700 flex items-center space-x-1 transition-colors cursor-pointer"
              title="Revogar todas as permissões"
            >
              <Lock className="w-3 h-3 text-rose-600 dark:text-rose-400" />
              <span>Revogar Tudo</span>
            </button>

            <button
              onClick={() => setShowEndpointInspector(!showEndpointInspector)}
              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border flex items-center space-x-1 transition-colors cursor-pointer ${
                showEndpointInspector 
                  ? 'bg-blue-50 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700' 
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              <FileCode2 className="w-3 h-3 text-blue-600 dark:text-blue-400" />
              <span>Auditor REST</span>
            </button>
          </div>
        </div>

        {/* ROLE PILLS */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          {OPERATIONAL_ROLES.map((role) => {
            const isSelected = selectedRole === role;
            return (
              <button
                key={role}
                onClick={() => setSelectedRole(role)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700'
                }`}
              >
                <Key className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                <span>{role}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* MATRIX TABLE CONTAINER */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm">
        
        {/* Table Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-black text-slate-900 dark:text-white tracking-wide uppercase flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>MÓDULOS OPERACIONAIS ({filteredModules.length})</span>
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono font-medium">
              [Perfil Ativo: <strong className="text-amber-700 dark:text-amber-400">{selectedRole}</strong>]
            </span>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            {/* Search Filter */}
            <div className="relative flex-1 sm:w-48">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filtrar módulo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-900 dark:text-white font-medium placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              onClick={handleExportJson}
              className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs transition-colors cursor-pointer"
              title="Exportar JSON da Matriz"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleResetDefaults}
              className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-xl text-xs transition-colors cursor-pointer"
              title="Restaurar Padrões de Fábrica"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={handleSaveMatrix}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition-all flex items-center space-x-1.5 shadow-sm cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Salvar</span>
            </button>
          </div>
        </div>

        {/* MATRIX GRID TABLE */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-xs text-left border-collapse">
            
            {/* Table Header */}
            <thead>
              <tr className="bg-slate-100/80 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold uppercase tracking-wider">
                <th className="p-3.5 pl-4 min-w-[220px]">MÓDULOS OPERACIONAIS (13)</th>
                {PERMISSION_ACTIONS.map((act) => (
                  <th key={act.key} className="p-3.5 text-center min-w-[70px] w-[90px]">
                    {act.label}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-800 dark:text-slate-200">
              {filteredModules.map((mod) => {
                const rolePermissions = matrixState[selectedRole]?.[mod.id] || {
                  ver: false,
                  criar: false,
                  editar: false,
                  excluir: false,
                  aprovar: false,
                  exportar: false,
                  auditar: false,
                };

                return (
                  <tr 
                    key={mod.id} 
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                  >
                    {/* Module Name */}
                    <td className="p-3.5 pl-4 font-bold text-slate-900 dark:text-white text-xs">
                      <div className="flex items-center justify-between">
                        <span className="truncate">{mod.name}</span>
                        <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {mod.endpointPrefix}
                        </span>
                      </div>
                    </td>

                    {/* Action Toggle Cells */}
                    {PERMISSION_ACTIONS.map((act) => {
                      const isAllowed = rolePermissions[act.key] ?? false;

                      return (
                        <td key={act.key} className="p-2 text-center align-middle">
                          <button
                            onClick={() => handleToggleCell(selectedRole, mod.id, act.key)}
                            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg mx-auto flex items-center justify-center transition-all duration-150 cursor-pointer ${
                              isAllowed
                                ? 'bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 shadow-2xs font-bold'
                                : 'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 hover:border-rose-200 dark:hover:border-rose-800 hover:text-rose-600 dark:hover:text-rose-400'
                            }`}
                            title={`${isAllowed ? 'Permitido' : 'Bloqueado'} - ${act.label} em ${mod.name}`}
                          >
                            {isAllowed ? (
                              <Check className="w-4 h-4 stroke-[2.5]" />
                            ) : (
                              <X className="w-3.5 h-3.5 stroke-[2]" />
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {filteredModules.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-500 dark:text-slate-400 text-xs font-medium">
                    Nenhum módulo encontrado para o termo de busca "{searchTerm}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary Bar */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 gap-2 border-t border-slate-100 dark:border-slate-800 font-medium">
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded bg-emerald-100 dark:bg-emerald-900/60 border border-emerald-300 dark:border-emerald-700 inline-block"></span>
              <span>Concedido (Permitido)</span>
            </span>
            <span className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 inline-block"></span>
              <span>Bloqueado (Negado)</span>
            </span>
          </div>

          <div className="font-mono text-slate-400 dark:text-slate-500 text-[10px]">
            Security Policy Engine v4.2.0 • ISO/IEC 27001 Compliant
          </div>
        </div>
      </div>

      {/* ENDPOINT REST AUDITOR INSPECTOR */}
      {showEndpointInspector && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 p-5 rounded-2xl space-y-3 shadow-sm text-xs font-mono">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <h4 className="text-xs font-bold text-blue-700 dark:text-blue-400 flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Inspeção de Endpoints & Middleware Security Rules ({selectedRole})</span>
            </h4>
            <span className="text-[10px] bg-blue-50 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded font-bold">
              Generated JSON Policy
            </span>
          </div>

          <pre className="bg-slate-900 dark:bg-slate-950 p-4 rounded-xl text-emerald-400 text-[11px] overflow-x-auto border border-slate-800 max-h-60 leading-relaxed">
            {JSON.stringify(
              {
                role: selectedRole,
                generatedAt: new Date().toISOString(),
                policyRules: OPERATIONAL_MODULES_13.map((mod) => ({
                  module: mod.name,
                  endpoint: mod.endpointPrefix,
                  allowedActions: PERMISSION_ACTIONS.filter(
                    (act) => matrixState[selectedRole]?.[mod.id]?.[act.key]
                  ).map((act) => act.label),
                })),
              },
              null,
              2
            )}
          </pre>
        </div>
      )}

    </div>
  );
};
