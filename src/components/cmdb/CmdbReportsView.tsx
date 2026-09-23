import React from 'react';
import { 
  FileText, 
  Printer, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  ShieldCheck, 
  Server, 
  Clock 
} from 'lucide-react';
import { ConfigurationItem, CIRelationship, ITBusinessService, CMDBHealthScore } from '../../types/cmdb';

interface CmdbReportsViewProps {
  items: ConfigurationItem[];
  relationships: CIRelationship[];
  services: ITBusinessService[];
  health: CMDBHealthScore;
}

export const CmdbReportsView: React.FC<CmdbReportsViewProps> = ({
  items,
  relationships,
  services,
  health
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <span>Relatórios Executivos de Governança & Infraestrutura CMDB</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Documentação gerencial consolidada para auditorias ISO/IEC 20000, SOC2 e relatórios de diretoria.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer"
        >
          <Printer className="w-4 h-4 text-blue-400" />
          <span>Imprimir / Gerar PDF</span>
        </button>
      </div>

      {/* Printable Report Document Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6 text-slate-300">
        
        {/* Document Header */}
        <div className="border-b border-slate-800 pb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="text-xl font-black text-white">WorkPulse ITSM Enterprise • Relatório CMDB</div>
            <div className="text-xs text-slate-400 mt-1">Tenant: Empresa ABC (Matriz) • Emissão: {new Date().toLocaleDateString('pt-BR')}</div>
          </div>
          <div className="text-right">
            <span className="px-3 py-1 bg-blue-950 border border-blue-800 text-blue-300 rounded-full text-xs font-bold">
              Grau de Conformidade: {health.grade} ({health.overallScore}%)
            </span>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="space-y-2">
          <h3 className="font-bold text-white text-sm uppercase tracking-wider">1. Sumário Executivo de Ativos e Configurações</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            A infraestrutura monitorada possui um total de <strong>{items.length} Itens de Configuração (CIs)</strong> formalmente registrados, interconectados por <strong>{relationships.length} relacionamentos</strong> lógicos e físicos de rede, sustentando <strong>{services.length} serviços críticos</strong> de negócio com SLA garantido.
          </p>
        </div>

        {/* Breakdown by Type */}
        <div className="space-y-3">
          <h3 className="font-bold text-white text-sm uppercase tracking-wider">2. Distribuição Quantitativa do Parque Tecnológico</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="text-slate-400">Servidores & DB</div>
              <div className="text-lg font-bold text-white mt-1">
                {items.filter(i => i.typeId === 'servidor' || i.typeId === 'banco_de_dados').length}
              </div>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="text-slate-400">Rede & Conectividade</div>
              <div className="text-lg font-bold text-white mt-1">
                {items.filter(i => i.typeId === 'switch' || i.typeId === 'firewall' || i.typeId === 'access_point' || i.typeId === 'link_internet').length}
              </div>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="text-slate-400">Estações de Trabalho</div>
              <div className="text-lg font-bold text-white mt-1">
                {items.filter(i => i.typeId === 'computador' || i.typeId === 'notebook').length}
              </div>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
              <div className="text-slate-400">Serviços de Negócio</div>
              <div className="text-lg font-bold text-white mt-1">{services.length}</div>
            </div>
          </div>
        </div>

        {/* SLA & Criticality Review */}
        <div className="space-y-3">
          <h3 className="font-bold text-white text-sm uppercase tracking-wider">3. Conformidade de SLAs de Serviços de TI</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-800 rounded-xl overflow-hidden">
              <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3">Serviço de Negócio</th>
                  <th className="p-3">Categoria</th>
                  <th className="p-3">SLA Reparo</th>
                  <th className="p-3">Meta Uptime</th>
                  <th className="p-3">Responsável</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-950/40">
                {services.map(svc => (
                  <tr key={svc.id}>
                    <td className="p-3 font-bold text-white">{svc.name}</td>
                    <td className="p-3">{svc.category}</td>
                    <td className="p-3 font-bold text-blue-400">{svc.slaHours}h</td>
                    <td className="p-3 font-bold text-emerald-400">{svc.slaTargetPct}%</td>
                    <td className="p-3 text-slate-400">{svc.owner}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
};
