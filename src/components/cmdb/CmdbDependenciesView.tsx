import React, { useState } from 'react';
import { 
  Layers, 
  ChevronRight, 
  ChevronDown, 
  Server, 
  Shield, 
  Network, 
  Database, 
  Monitor, 
  Box, 
  Globe, 
  Share2,
  Lock,
  Wifi,
  Printer
} from 'lucide-react';
import { ConfigurationItem, CIRelationship, ITBusinessService } from '../../types/cmdb';

interface CmdbDependenciesViewProps {
  items: ConfigurationItem[];
  relationships: CIRelationship[];
  services: ITBusinessService[];
  onSelectCi: (ci: ConfigurationItem) => void;
}

export const CmdbDependenciesView: React.FC<CmdbDependenciesViewProps> = ({
  items,
  relationships,
  services,
  onSelectCi
}) => {
  const [expandedServices, setExpandedServices] = useState<Record<string, boolean>>({
    'srv-01': true,
    'srv-02': true,
    'srv-03': false
  });

  const toggleExpand = (id: string) => {
    setExpandedServices(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const getCiIcon = (typeId: string) => {
    switch (typeId) {
      case 'servidor': return <Server className="w-4 h-4 text-indigo-400" />;
      case 'banco_de_dados': return <Database className="w-4 h-4 text-blue-400" />;
      case 'firewall': return <Shield className="w-4 h-4 text-rose-400" />;
      case 'switch': return <Network className="w-4 h-4 text-emerald-400" />;
      case 'computador': return <Monitor className="w-4 h-4 text-blue-400" />;
      case 'access_point': return <Wifi className="w-4 h-4 text-amber-400" />;
      case 'impressora': return <Printer className="w-4 h-4 text-teal-400" />;
      case 'vpn': return <Lock className="w-4 h-4 text-purple-400" />;
      default: return <Globe className="w-4 h-4 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2.5 mb-1">
          <Layers className="w-5 h-5 text-blue-400" />
          <h2 className="text-base font-bold text-white">Mapa Hierárquico de Dependências de Serviços</h2>
        </div>
        <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
          Visão em árvore da camada de negócio até a camada física: <strong>Serviço de Negócio → Aplicações & Bancos → Servidores → Switches & Roteamento → Conectividade de Borda</strong>.
        </p>
      </div>

      <div className="space-y-3">
        {services.map(svc => {
          const isExpanded = !!expandedServices[svc.id];
          const underlyingItems = items.filter(i => svc.underlyingCiIds.includes(i.id));

          return (
            <div key={svc.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              {/* Service Header Row */}
              <div 
                onClick={() => toggleExpand(svc.id)}
                className="p-4 bg-slate-950/60 hover:bg-slate-950 flex items-center justify-between cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? <ChevronDown className="w-4 h-4 text-blue-400" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                  <div className="w-8 h-8 rounded-lg bg-purple-950/70 border border-purple-800 flex items-center justify-center text-purple-400 shrink-0">
                    <Box className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{svc.name}</span>
                      <span className="font-mono text-[10px] text-blue-300 px-1.5 py-0.5 rounded bg-blue-950 border border-blue-800">{svc.code}</span>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                        {svc.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">{svc.description}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-right shrink-0">
                  <div className="hidden sm:block">
                    <div className="text-slate-400">Responsável: <strong className="text-slate-200">{svc.owner}</strong></div>
                    <div className="text-[11px] text-slate-500">{svc.affectedUsersCount} usuários dependentes</div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-bold">
                    {underlyingItems.length} CIs
                  </span>
                </div>
              </div>

              {/* Sub-tree Elements */}
              {isExpanded && (
                <div className="p-4 bg-slate-900/40 border-t border-slate-800/80 pl-10 space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Itens de Configuração que sustentam este serviço:
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    {underlyingItems.map(item => (
                      <div
                        key={item.id}
                        onClick={() => onSelectCi(item)}
                        className="bg-slate-950 hover:bg-slate-800 p-3 rounded-xl border border-slate-800 hover:border-blue-500 transition-all cursor-pointer flex items-center gap-2.5 group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0">
                          {getCiIcon(item.typeId)}
                        </div>
                        <div className="overflow-hidden">
                          <div className="font-bold text-white text-xs truncate group-hover:text-blue-400">{item.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono truncate">{item.ipAddress || item.code}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
