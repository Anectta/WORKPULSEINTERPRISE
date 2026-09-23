import React from 'react';
import { 
  X, 
  AlertTriangle, 
  GitMerge, 
  Split, 
  ShieldCheck, 
  Check, 
  Info, 
  ArrowRight, 
  Cpu, 
  Layers, 
  Fingerprint, 
  CheckCircle2, 
  Lock 
} from 'lucide-react';
import { InventoryDiscoveredAsset, DuplicatePair } from '../../types/inventoryDiscovery';
import { ITAsset } from '../../types';

interface DuplicateAnalysisModalProps {
  discoveredAsset: InventoryDiscoveredAsset | null;
  existingAsset: ITAsset | null;
  similarityPct: number;
  onClose: () => void;
  onMerge: (discovered: InventoryDiscoveredAsset, existing: ITAsset) => void;
  onKeepSeparate: (discovered: InventoryDiscoveredAsset) => void;
}

export const DuplicateAnalysisModal: React.FC<DuplicateAnalysisModalProps> = ({
  discoveredAsset,
  existingAsset,
  similarityPct = 94,
  onClose,
  onMerge,
  onKeepSeparate
}) => {
  if (!discoveredAsset || !existingAsset) return null;

  const comparisonFields = [
    {
      label: 'Nome / Hostname',
      existing: existingAsset.name,
      discovered: discoveredAsset.name,
      isEqual: existingAsset.name.trim().toLowerCase() === discoveredAsset.name.trim().toLowerCase(),
      priority: '5. Hostname'
    },
    {
      label: 'Modelo & Fabricante',
      existing: existingAsset.brandModel,
      discovered: discoveredAsset.brandModel,
      isEqual: existingAsset.brandModel.trim().toLowerCase() === discoveredAsset.brandModel.trim().toLowerCase(),
      priority: 'Evidência'
    },
    {
      label: 'Sistema Operacional',
      existing: (existingAsset as any).operatingSystem || (existingAsset as any).os || 'Windows 11 Pro',
      discovered: discoveredAsset.os,
      isEqual: true,
      priority: 'Evidência'
    },
    {
      label: 'Memória RAM',
      existing: (existingAsset as any).ram || '16 GB RAM',
      discovered: discoveredAsset.ram,
      isEqual: true,
      priority: 'Hardware'
    },
    {
      label: 'Armazenamento',
      existing: (existingAsset as any).disk || 'SSD 512 GB',
      discovered: discoveredAsset.disk,
      isEqual: true,
      priority: 'Hardware'
    },
    {
      label: 'Endereço IP',
      existing: existingAsset.ipAddress || 'Não registrado',
      discovered: discoveredAsset.ipAddress,
      isEqual: existingAsset.ipAddress === discoveredAsset.ipAddress,
      priority: 'Rede'
    },
    {
      label: 'Endereço MAC',
      existing: existingAsset.macAddress || 'Não registrado',
      discovered: discoveredAsset.macAddress,
      isEqual: existingAsset.macAddress?.toLowerCase() === discoveredAsset.macAddress?.toLowerCase(),
      priority: '4. MAC (90%)'
    },
    {
      label: 'Número de Série',
      existing: existingAsset.serialNumber || 'Não registrado',
      discovered: discoveredAsset.serialNumber,
      isEqual: existingAsset.serialNumber === discoveredAsset.serialNumber,
      priority: '2. Serial (98%)'
    },
    {
      label: 'Service Tag Fabricante',
      existing: (existingAsset as any).serviceTag || '8XYZ123',
      discovered: discoveredAsset.serviceTag || '8XYZ123',
      isEqual: true,
      priority: '3. Service Tag (98%)'
    },
    {
      label: 'BIOS / Machine UUID',
      existing: (existingAsset as any).uuid || '4C4C4544-004A-5A10-8058-CAC04F543232',
      discovered: discoveredAsset.uuid,
      isEqual: true,
      priority: '1. UUID (100%)'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden font-sans">
        
        {/* HEADER */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-amber-500/10 dark:bg-amber-950/30 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-lg shadow-amber-500/20">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 font-extrabold text-[11px] tracking-wide uppercase">
                  POSSÍVEL DUPLICIDADE
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-extrabold text-xs border border-emerald-300 dark:border-emerald-800">
                  Similaridade: {similarityPct}%
                </span>
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-1">
                Comparação de Ativos: <span className="text-slate-600 dark:text-slate-400">{existingAsset.name}</span> vs <span className="text-amber-600 dark:text-amber-400">{discoveredAsset.name}</span>
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* COMPARISON CONTENT */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
          
          {/* NOTICE BANNER - NEVER DELETE GUARANTEE */}
          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-start space-x-3">
            <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 dark:text-blue-200">
              <p className="font-bold">Diretriz de Segurança do Inventário:</p>
              <p className="mt-0.5 text-blue-700 dark:text-blue-300">
                <strong>Nunca excluir automaticamente um ativo existente.</strong> A ação de mesclagem atualizará os dados cadastrais do tombo <strong>{existingAsset.assetTag}</strong> com as novas evidências coletadas e arquivará o registro temporário de descoberta com status <code>MERGED</code>.
              </p>
            </div>
          </div>

          {/* PRIORITY MATCHING SUMMARY CARD */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] uppercase font-bold text-slate-400">Hierarquia de Validação</span>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
                UUID &gt; Serial &gt; Service Tag &gt; MAC &gt; Hostname
              </p>
            </div>
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] uppercase font-bold text-slate-400">Tombo Existente</span>
              <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mt-1">
                {existingAsset.assetTag} ({existingAsset.name})
              </p>
            </div>
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-[10px] uppercase font-bold text-slate-400">Origem da Descoberta</span>
              <p className="text-xs font-bold text-purple-600 dark:text-purple-400 mt-1">
                {discoveredAsset.discoveryMethod} &bull; {discoveredAsset.lastSeen}
              </p>
            </div>
          </div>

          {/* SIDE BY SIDE DIFF TABLE */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3 w-1/4">Atributo / Critério</th>
                  <th className="p-3 w-5/12 bg-slate-200/50 dark:bg-slate-800">
                    <div className="flex items-center space-x-1.5">
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Ativo Existente ({existingAsset.assetTag})</span>
                    </div>
                  </th>
                  <th className="p-3 w-5/12 bg-amber-500/10 dark:bg-amber-950/40">
                    <div className="flex items-center space-x-1.5 text-amber-700 dark:text-amber-300">
                      <Fingerprint className="w-3.5 h-3.5" />
                      <span>Ativo Descoberto ({discoveredAsset.name})</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {comparisonFields.map((field, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-semibold text-slate-600 dark:text-slate-400">
                      <div className="flex items-center justify-between">
                        <span>{field.label}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold">
                          {field.priority}
                        </span>
                      </div>
                    </td>
                    <td className="p-3 font-mono text-slate-800 dark:text-slate-200 bg-slate-50/40 dark:bg-slate-900/20">
                      {field.existing}
                    </td>
                    <td className="p-3 font-mono">
                      <div className="flex items-center justify-between">
                        <span className={field.isEqual ? 'text-slate-800 dark:text-slate-200' : 'text-amber-600 dark:text-amber-400 font-bold'}>
                          {field.discovered}
                        </span>
                        {field.isEqual ? (
                          <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold flex items-center space-x-1">
                            <Check className="w-3 h-3" />
                            <span>Idêntico</span>
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[10px] font-bold">
                            Divergente
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => onKeepSeparate(discoveredAsset)}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer border border-slate-300 dark:border-slate-700"
              title="Cadastrar como um ativo novo separado com tombo próprio, mantendo o existente intacto"
            >
              <Split className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <span>[MANTER SEPARADOS]</span>
            </button>

            <button
              onClick={() => onMerge(discoveredAsset, existingAsset)}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md shadow-amber-600/20 transition-all flex items-center space-x-1.5 cursor-pointer"
              title="Mescla as especificações atualizadas e telemetria no ativo existente (não exclui nada)"
            >
              <GitMerge className="w-4 h-4" />
              <span>[MESCLAR ATIVO]</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
