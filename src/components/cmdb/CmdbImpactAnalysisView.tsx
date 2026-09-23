import React, { useState } from 'react';
import { 
  Zap, 
  AlertTriangle, 
  Users, 
  Building2, 
  FileText, 
  ShieldAlert, 
  ArrowDownRight, 
  CheckCircle2, 
  Clock, 
  Activity, 
  Share2,
  Sliders,
  Server,
  Network,
  Shield,
  Monitor
} from 'lucide-react';
import { ConfigurationItem, CIRelationship, ITBusinessService, CMDBContractLink, ImpactAnalysisResult } from '../../types/cmdb';

interface CmdbImpactAnalysisViewProps {
  items: ConfigurationItem[];
  relationships: CIRelationship[];
  services: ITBusinessService[];
  contracts: CMDBContractLink[];
  initialSelectedCi?: ConfigurationItem | null;
  onSelectCi: (ci: ConfigurationItem) => void;
}

export const CmdbImpactAnalysisView: React.FC<CmdbImpactAnalysisViewProps> = ({
  items,
  relationships,
  services,
  contracts,
  initialSelectedCi,
  onSelectCi
}) => {
  const [selectedCiId, setSelectedCiId] = useState<string>(
    initialSelectedCi?.id || items.find(i => i.code === 'CI-FW-01')?.id || items[0]?.id || ''
  );
  const [simulationType, setSimulationType] = useState<'total_outage' | 'degradation' | 'maintenance'>('total_outage');

  const selectedCi = items.find(i => i.id === selectedCiId) || items[0];

  // Perform graph traversal for impact analysis
  const directDependents: ConfigurationItem[] = [];
  const indirectDependents: ConfigurationItem[] = [];
  const visited = new Set<string>();

  if (selectedCi) {
    // 1. Direct connections (outgoing relationships)
    const directRels = relationships.filter(r => r.sourceCiId === selectedCi.id);
    directRels.forEach(r => {
      const target = items.find(i => i.id === r.targetCiId);
      if (target && !visited.has(target.id)) {
        visited.add(target.id);
        directDependents.push(target);
      }
    });

    // 2. Cascade connections (level 2)
    directDependents.forEach(dep => {
      const secRels = relationships.filter(r => r.sourceCiId === dep.id);
      secRels.forEach(sr => {
        if (sr.targetCiId !== selectedCi.id && !visited.has(sr.targetCiId)) {
          const secTarget = items.find(i => i.id === sr.targetCiId);
          if (secTarget) {
            visited.add(secTarget.id);
            indirectDependents.push(secTarget);
          }
        }
      });
    });
  }

  // Identify affected business services
  const affectedServices = services.filter(svc => 
    selectedCi && (
      svc.underlyingCiIds.includes(selectedCi.id) ||
      directDependents.some(d => svc.underlyingCiIds.includes(d.id))
    )
  );

  // Identify affected contracts & SLA
  const affectedContracts = contracts.filter(c => 
    selectedCi && (
      c.linkedCiIds.includes(selectedCi.id) ||
      directDependents.some(d => c.linkedCiIds.includes(d.id))
    )
  );

  // Impact level calculation
  let impactLevel: ImpactAnalysisResult['impactLevel'] = 'BAIXO';
  if (selectedCi?.typeId === 'firewall' || selectedCi?.typeId === 'switch' || selectedCi?.code === 'CI-INET-01') {
    impactLevel = 'CRÍTICO';
  } else if (selectedCi?.typeId === 'servidor' || affectedServices.length >= 2) {
    impactLevel = 'ALTO';
  } else if (directDependents.length > 0) {
    impactLevel = 'MÉDIO';
  }

  const estimatedAffectedUsers = affectedServices.reduce((acc, s) => acc + s.affectedUsersCount, 0) || (impactLevel === 'CRÍTICO' ? 148 : directDependents.length * 4);

  return (
    <div className="space-y-6">
      
      {/* Control Banner: CI Selector & Simulation Mode */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        
        <div className="flex items-center gap-3.5 w-full md:w-auto">
          <div className="w-10 h-10 rounded-xl bg-red-950/80 border border-red-800 flex items-center justify-center text-red-400 shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Simulador de Análise de Impacto (ITSM & CMDB)</h2>
            <p className="text-xs text-slate-400">
              Simule a interrupção de qualquer elemento para mapear a propagação de falha e riscos de SLA
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          {/* Target CI Selector */}
          <div className="w-full sm:w-auto">
            <select
              value={selectedCiId}
              onChange={e => setSelectedCiId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-bold focus:outline-none focus:border-red-500"
            >
              {items.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.code}) • {item.typeName}
                </option>
              ))}
            </select>
          </div>

          {/* Scenario Mode */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setSimulationType('total_outage')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                simulationType === 'total_outage' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Queda Total
            </button>
            <button
              onClick={() => setSimulationType('degradation')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                simulationType === 'degradation' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Degradação
            </button>
            <button
              onClick={() => setSimulationType('maintenance')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                simulationType === 'maintenance' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Manutenção
            </button>
          </div>
        </div>

      </div>

      {/* Primary Impact Severity Scoreboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Severity Banner */}
        <div className={`p-4 rounded-2xl border flex items-center gap-3.5 ${
          impactLevel === 'CRÍTICO' ? 'bg-red-950/40 border-red-800 text-red-400' :
          impactLevel === 'ALTO' ? 'bg-orange-950/40 border-orange-800 text-orange-400' :
          impactLevel === 'MÉDIO' ? 'bg-amber-950/40 border-amber-800 text-amber-400' :
          'bg-slate-900 border-slate-800 text-blue-400'
        }`}>
          <ShieldAlert className="w-8 h-8 shrink-0" />
          <div>
            <div className="text-[11px] uppercase font-black tracking-wider text-slate-400">Nível de Severidade</div>
            <div className="text-xl font-black">{impactLevel}</div>
          </div>
        </div>

        {/* Affected Users */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3.5">
          <Users className="w-8 h-8 text-indigo-400 shrink-0" />
          <div>
            <div className="text-[11px] uppercase font-bold text-slate-400">Usuários Impactados</div>
            <div className="text-xl font-black text-white">~{estimatedAffectedUsers} colaboradores</div>
          </div>
        </div>

        {/* Impacted Services */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3.5">
          <Activity className="w-8 h-8 text-purple-400 shrink-0" />
          <div>
            <div className="text-[11px] uppercase font-bold text-slate-400">Serviços Afetados</div>
            <div className="text-xl font-black text-white">{affectedServices.length} serviço(s)</div>
          </div>
        </div>

        {/* Contracts with SLA Risk */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center gap-3.5">
          <Clock className="w-8 h-8 text-emerald-400 shrink-0" />
          <div>
            <div className="text-[11px] uppercase font-bold text-slate-400">Contratos com Risco SLA</div>
            <div className="text-xl font-black text-white">{affectedContracts.length} contrato(s)</div>
          </div>
        </div>

      </div>

      {/* Main Analysis Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Cascading Dependents Graph */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Share2 className="w-4 h-4 text-red-400" />
              <span>Cadeia de Propagação em Cascata (Downstream Cascade)</span>
            </h3>
            <span className="text-xs text-slate-400">
              {directDependents.length} direto(s) • {indirectDependents.length} indireto(s)
            </span>
          </div>

          {/* Target Element Box */}
          <div className="p-4 bg-red-950/20 border-2 border-dashed border-red-700/80 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-950 border border-red-800 flex items-center justify-center text-red-400">
                <ShieldAlert className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="font-bold text-white text-sm flex items-center gap-2">
                  <span>{selectedCi?.name}</span>
                  <span className="font-mono text-xs text-red-300">({selectedCi?.code})</span>
                  <span className="px-2 py-0.5 rounded bg-red-900 text-red-200 text-[10px] font-black uppercase">
                    ORIGEM DA FALHA
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  IP: {selectedCi?.ipAddress} • {selectedCi?.location} • Resp: {selectedCi?.responsible}
                </div>
              </div>
            </div>
            <button
              onClick={() => selectedCi && onSelectCi(selectedCi)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              Raio-X
            </button>
          </div>

          {/* Arrow */}
          <div className="flex items-center justify-center -my-2 text-slate-500">
            <ArrowDownRight className="w-5 h-5 text-red-400 animate-bounce" />
          </div>

          {/* Level 1 Direct Dependents */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              <span>Nível 1: Dispositivos com Interrupção Direta ({directDependents.length})</span>
            </div>

            {directDependents.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {directDependents.map(dep => (
                  <div 
                    key={dep.id} 
                    onClick={() => onSelectCi(dep)}
                    className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-blue-500 rounded-xl flex items-center justify-between cursor-pointer transition-all"
                  >
                    <div>
                      <div className="font-bold text-white text-xs">{dep.name}</div>
                      <div className="font-mono text-[10px] text-blue-400">{dep.code} • {dep.ipAddress}</div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800">
                      Paralisado
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-500 text-center">
                Nenhum dispositivo downstream depende diretamente deste equipamento.
              </div>
            )}
          </div>

          {/* Level 2 Indirect Dependents */}
          {indirectDependents.length > 0 && (
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Nível 2: Dispositivos Afetados Indiretamente ({indirectDependents.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {indirectDependents.map(dep => (
                  <div 
                    key={dep.id}
                    onClick={() => onSelectCi(dep)}
                    className="p-3 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-500 rounded-xl flex items-center justify-between cursor-pointer transition-all"
                  >
                    <div>
                      <div className="font-bold text-white text-xs">{dep.name}</div>
                      <div className="font-mono text-[10px] text-amber-400">{dep.code} • {dep.ipAddress}</div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800">
                      Sem Acesso
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Right Col: Business Services & Recommended Mitigation Plan */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5">
          
          {/* Services Section */}
          <div>
            <h3 className="font-bold text-white text-sm mb-3 flex items-center gap-2">
              <Activity className="w-4 h-4 text-purple-400" />
              <span>Serviços de Negócio Afetados</span>
            </h3>

            <div className="space-y-2">
              {affectedServices.length > 0 ? (
                affectedServices.map(svc => (
                  <div key={svc.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">{svc.name}</span>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800">
                        {svc.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">{svc.description}</p>
                    <div className="text-[10px] text-slate-500 pt-1 flex items-center justify-between">
                      <span>SLA Máximo: <strong>{svc.slaHours}h</strong></span>
                      <span>Usuários: <strong>{svc.affectedUsersCount}</strong></span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-500 text-center">
                  Nenhum serviço corporativo crítico é afetado pela falha deste item.
                </div>
              )}
            </div>
          </div>

          {/* Recommended Incident Response Actions */}
          <div className="pt-2 border-t border-slate-800">
            <h3 className="font-bold text-white text-sm mb-2.5 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Ações Preventivas e Mitigação</span>
            </h3>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-slate-300">
                1. Acionar imediatamente o responsável: <strong className="text-white">{selectedCi?.responsible}</strong>
              </div>
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-slate-300">
                2. Abrir chamado automático prioritário no Help Desk para início da contagem de SLA
              </div>
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-slate-300">
                3. Notificar os gestores dos setores impactados ({selectedCi?.clientName} - {selectedCi?.unit})
              </div>
              <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-slate-300">
                4. Contrato de suporte acionável: <strong className="text-emerald-400">{selectedCi?.linkedContractName || 'Suporte Fabrica TAC'}</strong>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
