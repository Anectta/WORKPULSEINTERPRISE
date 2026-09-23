import React, { useState } from 'react';
import { 
  FileText, 
  ShieldCheck, 
  AlertCircle, 
  Lock, 
  CheckCircle2, 
  Calendar, 
  UserCheck, 
  ExternalLink,
  Server,
  Plus
} from 'lucide-react';
import { SecurityScope, SecurityTarget } from '../../types/security';

interface SecurityScopesViewProps {
  scopes: SecurityScope[];
  targets: SecurityTarget[];
  loading: boolean;
  onRefresh: () => void;
  onOpenNewScopeModal: () => void;
}

export const SecurityScopesView: React.FC<SecurityScopesViewProps> = ({
  scopes,
  targets,
  loading,
  onRefresh,
  onOpenNewScopeModal
}) => {
  const [selectedScopeId, setSelectedScopeId] = useState<string>(scopes[0]?.id || '');

  const activeScope = scopes.find(s => s.id === selectedScopeId) || scopes[0];
  const scopeTargets = targets.filter(t => t.scopeId === activeScope?.id);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Escopos & Termos de Autorização Formal</h2>
          <p className="text-xs text-slate-400">Governança, conformidade jurídica e autorização expressa para avaliações de segurança cibernética</p>
        </div>

        <button
          onClick={onOpenNewScopeModal}
          className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-sm transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Termo de Autorização
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Lista de Escopos */}
        <div className="lg:col-span-4 bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 space-y-3">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Escopos Cadastrados ({scopes.length})
          </span>

          <div className="space-y-2.5">
            {scopes.map(scope => {
              const isSelected = (activeScope?.id === scope.id);
              const isExpired = new Date(scope.validUntil).getTime() < Date.now();

              return (
                <div
                  key={scope.id}
                  onClick={() => setSelectedScopeId(scope.id)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    isSelected 
                      ? 'bg-rose-950/20 border-rose-500/50 shadow-sm' 
                      : 'bg-slate-800/40 hover:bg-slate-800/70 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white truncate">{scope.name}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                      isExpired ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                      scope.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                      'bg-slate-700 text-slate-400 border-slate-600'
                    }`}>
                      {isExpired ? 'EXPIRADO' : scope.status}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-2 mb-2">
                    {scope.description}
                  </p>

                  <div className="text-[10px] text-slate-500 flex justify-between">
                    <span>Termo {scope.authorizationTermsVersion}</span>
                    <span>Válido até {new Date(scope.validUntil).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detalhes do Escopo Selecionado & Alvos */}
        <div className="lg:col-span-8 bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 space-y-6">
          {!activeScope ? (
            <div className="text-center py-16 text-slate-500 text-xs">
              Nenhum escopo selecionado.
            </div>
          ) : (
            <>
              {/* Header do Escopo */}
              <div className="border-b border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-base font-bold text-white">{activeScope.name}</h3>
                  </div>
                  <p className="text-xs text-slate-400 max-w-xl">{activeScope.description}</p>
                </div>

                <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  Status: {activeScope.status}
                </span>
              </div>

              {/* Assinatura Criptográfica & Autorização */}
              <div className="bg-slate-800/40 border border-slate-800 rounded-lg p-4 space-y-3 text-xs">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Validação da Autorização Formal
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <span className="text-slate-500 block">Autorizado por:</span>
                    <span className="font-bold text-slate-200">{activeScope.authorizedByName}</span>
                    <span className="text-[11px] text-slate-400 block">{activeScope.authorizedByEmail}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Vigência:</span>
                    <span className="text-slate-200">
                      {new Date(activeScope.validFrom).toLocaleDateString('pt-BR')} até {new Date(activeScope.validUntil).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <div className="md:col-span-2">
                    <span className="text-slate-500 block">Hash de Integridade do Termo (SHA-256):</span>
                    <span className="font-mono text-[11px] text-slate-300 break-all bg-slate-900 p-1.5 rounded border border-slate-800 block mt-1">
                      {activeScope.authorizationDocumentHash}
                    </span>
                  </div>
                </div>
              </div>

              {/* Alvos Contemplados neste Escopo */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Alvos Contemplados ({scopeTargets.length})
                  </h4>
                </div>

                <div className="space-y-2">
                  {scopeTargets.length === 0 ? (
                    <div className="p-4 bg-slate-800/30 rounded border border-slate-800 text-xs text-slate-500 text-center">
                      Nenhum alvo cadastrado explicitamente para este escopo.
                    </div>
                  ) : (
                    scopeTargets.map(tgt => (
                      <div
                        key={tgt.id}
                        className="bg-slate-800/40 border border-slate-800 rounded-lg p-3 flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-white">{tgt.targetValue}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 font-mono">
                              {tgt.targetType}
                            </span>
                            {tgt.linkedCiId && (
                              <span className="text-[10px] text-blue-400 bg-blue-950/40 border border-blue-800/40 px-1.5 py-0.5 rounded font-mono">
                                CI: {tgt.linkedCiId}
                              </span>
                            )}
                          </div>
                          {tgt.notes && <p className="text-[11px] text-slate-400">{tgt.notes}</p>}
                        </div>

                        <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/30 border border-emerald-800/30 px-2 py-0.5 rounded">
                          AUTORIZADO
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
