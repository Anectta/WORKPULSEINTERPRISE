import React from 'react';
import { 
  X, 
  Cpu, 
  HardDrive, 
  Network, 
  Shield, 
  Clock, 
  User, 
  Building2, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Activity, 
  FileText, 
  Layers, 
  Hash, 
  Laptop, 
  Server, 
  Printer, 
  Wifi, 
  Fingerprint, 
  ExternalLink 
} from 'lucide-react';
import { InventoryDiscoveredAsset } from '../../types/inventoryDiscovery';

interface DiscoveredAssetDetailModalProps {
  asset: InventoryDiscoveredAsset | null;
  onClose: () => void;
  onApprove: (asset: InventoryDiscoveredAsset) => void;
  onReject: (asset: InventoryDiscoveredAsset) => void;
  onAnalyzeDuplicate?: (asset: InventoryDiscoveredAsset) => void;
}

export const DiscoveredAssetDetailModal: React.FC<DiscoveredAssetDetailModalProps> = ({
  asset,
  onClose,
  onApprove,
  onReject,
  onAnalyzeDuplicate
}) => {
  if (!asset) return null;

  const statusBadges: Record<string, { bg: string; label: string }> = {
    DISCOVERED: { bg: 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800', label: 'DISCOVERED (Descoberto)' },
    PENDING: { bg: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800', label: 'PENDING (Pendente de Aprovação)' },
    APPROVED: { bg: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800', label: 'APPROVED (Aprovado no Inventário)' },
    REJECTED: { bg: 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800', label: 'REJECTED (Rejeitado)' },
    MERGED: { bg: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800', label: 'MERGED (Mesclado no Ativo)' }
  };

  const badge = statusBadges[asset.status] || statusBadges.DISCOVERED;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        
        {/* HEADER */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <Laptop className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  {asset.name}
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full font-bold text-xs border ${badge.bg}`}>
                  {badge.label}
                </span>
                {asset.hasAgent ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold text-[10px] flex items-center space-x-1 border border-emerald-200 dark:border-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Agente {asset.agentVersion || 'v4.2'} Ativo</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-[10px] border border-slate-200 dark:border-slate-700">
                    Sem Agente (Varredura de Rede)
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {asset.brandModel} &bull; Descoberto em {new Date(asset.discoveredAt).toLocaleString('pt-BR')} &bull; Método: <strong className="text-slate-700 dark:text-slate-300">{asset.discoveryMethod}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CONTENT (SCROLLABLE) */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          
          {/* SUSPECT DUPLICATE BANNER (IF APPLICABLE) */}
          {asset.isDuplicateSuspect && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-start justify-between gap-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-900 dark:text-amber-200 text-xs">
                    Possível Duplicidade Detectada ({asset.duplicateSimilarityPct || 94}% de similaridade)
                  </h4>
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
                    O algoritmo de matching identificou que este equipamento pode corresponder ao ativo já cadastrado <strong>{asset.duplicateTargetName || 'PC-023'}</strong>.
                  </p>
                </div>
              </div>
              {onAnalyzeDuplicate && (
                <button
                  onClick={() => onAnalyzeDuplicate(asset)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg shadow-xs transition-colors shrink-0 flex items-center space-x-1.5"
                >
                  <Fingerprint className="w-3.5 h-3.5" />
                  <span>Analisar Comparação</span>
                </button>
              )}
            </div>
          )}

          {/* HARDWARE SPECIFICATIONS CARD */}
          <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wider mb-3 flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              <span>Especificações Técnicas de Hardware & Sistema</span>
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Processador (CPU)</span>
                <p className="font-bold text-slate-800 dark:text-slate-200 text-xs mt-0.5 truncate" title={asset.cpu || 'Intel Core i5'}>
                  {asset.cpu || 'Intel Core i5 / AMD Ryzen'}
                </p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Memória RAM</span>
                <p className="font-bold text-slate-800 dark:text-slate-200 text-xs mt-0.5">
                  {asset.ram}
                </p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Armazenamento</span>
                <p className="font-bold text-slate-800 dark:text-slate-200 text-xs mt-0.5">
                  {asset.disk}
                </p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Sistema Operacional</span>
                <p className="font-bold text-slate-800 dark:text-slate-200 text-xs mt-0.5 truncate" title={asset.os}>
                  {asset.os}
                </p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Endereço IP Primário</span>
                <p className="font-bold text-slate-800 dark:text-slate-200 text-xs mt-0.5 font-mono">
                  {asset.ipAddress}
                </p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] text-slate-400 uppercase font-bold">Endereço MAC Físico</span>
                <p className="font-bold text-slate-800 dark:text-slate-200 text-xs mt-0.5 font-mono">
                  {asset.macAddress}
                </p>
              </div>
            </div>
          </div>

          {/* HIERARQUIA DE IDENTIFICADORES & MATCHING */}
          <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
            <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wider mb-3 flex items-center space-x-2">
              <Fingerprint className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>Chaves de Identificação do Algoritmo de Matching</span>
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">1. BIOS / Machine UUID</span>
                  <span className="text-[9px] font-bold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-950 px-1.5 py-0.5 rounded">Prioridade 1</span>
                </div>
                <p className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 truncate" title={asset.uuid}>
                  {asset.uuid || 'N/A'}
                </p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">2. Número de Série</span>
                  <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-950 px-1.5 py-0.5 rounded">Prioridade 2</span>
                </div>
                <p className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 truncate" title={asset.serialNumber}>
                  {asset.serialNumber || 'N/A'}
                </p>
              </div>

              <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">3. Service Tag Fabricante</span>
                  <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.5 rounded">Prioridade 3</span>
                </div>
                <p className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 mt-1 truncate" title={asset.serviceTag}>
                  {asset.serviceTag || '8XYZ123'}
                </p>
              </div>
            </div>
          </div>

          {/* REALTIME TELEMETRY & NETWORK ADAPTERS */}
          {asset.telemetry && (
            <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wider mb-3 flex items-center space-x-2">
                <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Telemetria em Tempo Real (RMM Agent)</span>
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Uso de CPU</span>
                  <p className="text-base font-black text-slate-800 dark:text-slate-100 mt-0.5">
                    {asset.telemetry.cpuUsagePct}%
                  </p>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mt-1.5 overflow-hidden">
                    <div className="bg-purple-500 h-full rounded-full" style={{ width: `${asset.telemetry.cpuUsagePct}%` }} />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Uso de Memória</span>
                  <p className="text-base font-black text-slate-800 dark:text-slate-100 mt-0.5">
                    {asset.telemetry.ramUsagePct}%
                  </p>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mt-1.5 overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full" style={{ width: `${asset.telemetry.ramUsagePct}%` }} />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Ocupação de Disco</span>
                  <p className="text-base font-black text-slate-800 dark:text-slate-100 mt-0.5">
                    {asset.telemetry.diskUsagePct}%
                  </p>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mt-1.5 overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${asset.telemetry.diskUsagePct}%` }} />
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-center">
                  <span className="text-[10px] text-slate-400 uppercase font-bold">Tempo Ligado (Uptime)</span>
                  <p className="text-base font-black text-slate-800 dark:text-slate-100 mt-0.5">
                    {asset.telemetry.uptimeHours}h
                  </p>
                  <span className="text-[10px] text-slate-400">Latência: {asset.telemetry.latencyMs || 2}ms</span>
                </div>
              </div>
            </div>
          )}

          {/* NETWORK INTERFACES TABLE */}
          {asset.networkInterfaces && asset.networkInterfaces.length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-4 border border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs uppercase tracking-wider mb-2 flex items-center space-x-2">
                <Network className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>Interfaces de Rede Físicas e Sem Fio ({asset.networkInterfaces.length})</span>
              </h4>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase font-bold">
                    <tr>
                      <th className="p-2">Interface</th>
                      <th className="p-2">Tipo</th>
                      <th className="p-2">Endereço IP</th>
                      <th className="p-2">Endereço MAC</th>
                      <th className="p-2">Velocidade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono">
                    {asset.networkInterfaces.map((nic, idx) => (
                      <tr key={idx} className="hover:bg-slate-100/50 dark:hover:bg-slate-800/50">
                        <td className="p-2 font-bold font-sans text-slate-800 dark:text-slate-200">{nic.name}</td>
                        <td className="p-2 font-sans">{nic.type}</td>
                        <td className="p-2 text-blue-600 dark:text-blue-400">{nic.ip}</td>
                        <td className="p-2 text-slate-600 dark:text-slate-300">{nic.mac}</td>
                        <td className="p-2 font-sans text-slate-500">{nic.speedMbps ? `${nic.speedMbps} Mbps` : 'Auto'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* USER & LOCATION ASSIGNMENT */}
          <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl p-4 border border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center space-x-1">
                <User className="w-3.5 h-3.5" />
                <span>Usuário Logado / Vinculado</span>
              </span>
              <p className="font-bold text-slate-800 dark:text-slate-200 text-xs mt-1">
                {asset.assignedUser || 'Nenhum colaborador associado'}
              </p>
              <p className="text-[11px] text-slate-500">
                Departamento: {asset.assignedDepartment || 'Geral'}
              </p>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 uppercase font-bold flex items-center space-x-1">
                <Building2 className="w-3.5 h-3.5" />
                <span>Localização Física Estimada</span>
              </span>
              <p className="font-bold text-slate-800 dark:text-slate-200 text-xs mt-1">
                {asset.location || 'Torre A - Sede Corporativa'}
              </p>
              <p className="text-[11px] text-slate-500">
                Última comunicação: {asset.lastSeen}
              </p>
            </div>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Fechar
          </button>

          <div className="flex items-center space-x-2">
            {asset.status !== 'REJECTED' && (
              <button
                onClick={() => onReject(asset)}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-bold text-xs rounded-xl transition-colors border border-rose-200 dark:border-rose-800 flex items-center space-x-1.5 cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                <span>[REJEITAR]</span>
              </button>
            )}

            {asset.status !== 'APPROVED' && asset.status !== 'MERGED' && (
              <button
                onClick={() => onApprove(asset)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center space-x-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>[APROVAR ATIVO]</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
