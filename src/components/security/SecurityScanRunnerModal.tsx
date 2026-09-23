import React, { useState } from 'react';
import { 
  X, 
  Zap, 
  ShieldAlert, 
  AlertCircle, 
  Server, 
  Globe, 
  Lock, 
  Radio, 
  Info,
  CheckCircle2
} from 'lucide-react';
import { SecurityScope, ScanType, TargetType } from '../../types/security';

interface SecurityScanRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  scopes: SecurityScope[];
  onScanLaunched: (scanId: string) => void;
}

export const SecurityScanRunnerModal: React.FC<SecurityScanRunnerModalProps> = ({
  isOpen,
  onClose,
  scopes,
  onScanLaunched
}) => {
  const [title, setTitle] = useState('');
  const [scanType, setScanType] = useState<ScanType>('ASSET_BASELINE');
  const [selectedScopeId, setSelectedScopeId] = useState<string>(scopes[0]?.id || '');
  const [targetType, setTargetType] = useState<TargetType>('WEB_URL');
  const [targetValue, setTargetValue] = useState('https://ais-dev-j5xfxvq46npqvw5wbs7pnc-660100840056.us-west2.run.app');
  const [linkedCiId, setLinkedCiId] = useState<string>('ci-srv-erp');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const activeScopes = scopes.filter(s => s.status === 'ACTIVE');

  // Predefinições rápidas para CIs do CMDB
  const handleSelectQuickCI = (ciId: string, name: string, ipOrUrl: string, type: TargetType) => {
    setLinkedCiId(ciId);
    setTargetValue(ipOrUrl);
    setTargetType(type);
    setTitle(`Varredura de Segurança em ${name}`);
  };

  const handleLaunch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/v1/security/scans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': 'tenant-demo',
          'x-user-id': 'usr-tech-01',
          'x-user-name': 'Carlos Amorim (Analista SecOps)',
          'x-user-role': 'TECHNICIAN'
        },
        body: JSON.stringify({
          title: title.trim() || `Scan ${scanType} - ${targetValue}`,
          scanType,
          scopeId: selectedScopeId,
          targetValue: targetValue.trim(),
          targetType,
          linkedCiId: linkedCiId || undefined
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Falha ao iniciar security scan.');
      }

      onScanLaunched(data.data.id);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Executar Security Scan</h2>
              <p className="text-xs text-slate-400">Varredura controlada e segura com validação rigorosa de escopo e proteção anti-SSRF</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleLaunch} className="flex-1 overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/60 text-red-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block mb-0.5">Execução Bloqueada</span>
                {error}
              </div>
            </div>
          )}

          {/* Seleção de Escopo */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Escopo Autorizado Obrigatório *
            </label>
            {activeScopes.length === 0 ? (
              <div className="p-3 bg-amber-950/20 border border-amber-800/40 rounded-xl text-xs text-amber-300">
                Nenhum escopo ativo encontrado com termo assinado. Crie ou ative um escopo antes de executar scans.
              </div>
            ) : (
              <select
                id="select-scan-scope"
                value={selectedScopeId}
                onChange={(e) => setSelectedScopeId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3.5 py-2.5 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 focus:outline-none"
                required
              >
                {activeScopes.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} (Autorizado por {s.authorizedByName})
                  </option>
                ))}
              </select>
            )}
            <p className="text-[11px] text-slate-500 mt-1">
              Varreduras só podem ser executadas contra alvos contemplados no termo de autorização formal vigente.
            </p>
          </div>

          {/* Seleção Rápida de CIs do CMDB */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Vincular Ativo / CI do CMDB
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleSelectQuickCI('ci-srv-erp', 'Servidor ERP Totvs', '192.168.1.10', 'IP_ADDRESS')}
                className={`p-2.5 rounded-lg border text-left transition-colors flex flex-col justify-between ${
                  linkedCiId === 'ci-srv-erp' 
                    ? 'bg-rose-950/30 border-rose-500/50 text-white' 
                    : 'bg-slate-800/50 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <Server className="w-3.5 h-3.5 text-rose-400" />
                  <span className="text-[10px] font-mono text-slate-400">192.168.1.10</span>
                </div>
                <div className="text-xs font-bold truncate">Servidor ERP Totvs</div>
                <div className="text-[10px] text-slate-400">Datacenter / Linux</div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectQuickCI('ci-router', 'Roteador de Borda BGP', 'https://ais-dev-j5xfxvq46npqvw5wbs7pnc-660100840056.us-west2.run.app', 'WEB_URL')}
                className={`p-2.5 rounded-lg border text-left transition-colors flex flex-col justify-between ${
                  linkedCiId === 'ci-router' 
                    ? 'bg-rose-950/30 border-rose-500/50 text-white' 
                    : 'bg-slate-800/50 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-[10px] font-mono text-slate-400">Perímetro Web</span>
                </div>
                <div className="text-xs font-bold truncate">Portal Web WorkPulse</div>
                <div className="text-[10px] text-slate-400">Borda / HTTPS</div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectQuickCI('ci-db-sql', 'Banco SQL Server', '192.168.1.20', 'IP_ADDRESS')}
                className={`p-2.5 rounded-lg border text-left transition-colors flex flex-col justify-between ${
                  linkedCiId === 'ci-db-sql' 
                    ? 'bg-rose-950/30 border-rose-500/50 text-white' 
                    : 'bg-slate-800/50 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[10px] font-mono text-slate-400">192.168.1.20</span>
                </div>
                <div className="text-xs font-bold truncate">Banco de Dados SQL</div>
                <div className="text-[10px] text-slate-400">Datacenter / SQL 2022</div>
              </button>
            </div>
          </div>

          {/* Tipo de Avaliação */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Tipo de Avaliação de Segurança *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className={`p-3 rounded-lg border cursor-pointer transition-colors flex items-start gap-2.5 ${
                scanType === 'ASSET_BASELINE' ? 'bg-rose-950/20 border-rose-500 text-white' : 'bg-slate-800/40 border-slate-700 text-slate-400'
              }`}>
                <input
                  type="radio"
                  name="scanType"
                  value="ASSET_BASELINE"
                  checked={scanType === 'ASSET_BASELINE'}
                  onChange={() => setScanType('ASSET_BASELINE')}
                  className="mt-1"
                />
                <div>
                  <span className="text-xs font-bold block text-slate-200">Linha de Base Completa</span>
                  <span className="text-[11px] text-slate-400">Auditoria integrada de portas, cabeçalhos HTTP, TLS e CVEs</span>
                </div>
              </label>

              <label className={`p-3 rounded-lg border cursor-pointer transition-colors flex items-start gap-2.5 ${
                scanType === 'WEB_SECURITY' ? 'bg-rose-950/20 border-rose-500 text-white' : 'bg-slate-800/40 border-slate-700 text-slate-400'
              }`}>
                <input
                  type="radio"
                  name="scanType"
                  value="WEB_SECURITY"
                  checked={scanType === 'WEB_SECURITY'}
                  onChange={() => setScanType('WEB_SECURITY')}
                  className="mt-1"
                />
                <div>
                  <span className="text-xs font-bold block text-slate-200">Segurança Web & Headers</span>
                  <span className="text-[11px] text-slate-400">Audita CSP, HSTS, X-Frame-Options, Clickjacking e cookies</span>
                </div>
              </label>

              <label className={`p-3 rounded-lg border cursor-pointer transition-colors flex items-start gap-2.5 ${
                scanType === 'SSL_TLS' ? 'bg-rose-950/20 border-rose-500 text-white' : 'bg-slate-800/40 border-slate-700 text-slate-400'
              }`}>
                <input
                  type="radio"
                  name="scanType"
                  value="SSL_TLS"
                  checked={scanType === 'SSL_TLS'}
                  onChange={() => setScanType('SSL_TLS')}
                  className="mt-1"
                />
                <div>
                  <span className="text-xs font-bold block text-slate-200">Auditoria SSL / TLS</span>
                  <span className="text-[11px] text-slate-400">Inspeção de certificados digitais, validade e cifras criptográficas</span>
                </div>
              </label>

              <label className={`p-3 rounded-lg border cursor-pointer transition-colors flex items-start gap-2.5 ${
                scanType === 'NETWORK_PORTS' ? 'bg-rose-950/20 border-rose-500 text-white' : 'bg-slate-800/40 border-slate-700 text-slate-400'
              }`}>
                <input
                  type="radio"
                  name="scanType"
                  value="NETWORK_PORTS"
                  checked={scanType === 'NETWORK_PORTS'}
                  onChange={() => setScanType('NETWORK_PORTS')}
                  className="mt-1"
                />
                <div>
                  <span className="text-xs font-bold block text-slate-200">Portas & Serviços (Safe)</span>
                  <span className="text-[11px] text-slate-400">Varredura não-destrutiva de portas conhecidas (22, 80, 443, 3389)</span>
                </div>
              </label>
            </div>
          </div>

          {/* Alvo Técnico */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Alvo da Varredura (URL ou IP) *
              </label>
              <div className="flex gap-2">
                <select
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value as TargetType)}
                  className="bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-2 text-xs focus:ring-1 focus:ring-rose-500 focus:outline-none"
                >
                  <option value="WEB_URL">URL Web (http/https)</option>
                  <option value="IP_ADDRESS">Endereço IP (RFC 1918)</option>
                  <option value="DOMAIN_FQDN">Domínio FQDN</option>
                </select>

                <input
                  type="text"
                  id="input-scan-target-value"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  placeholder={targetType === 'WEB_URL' ? 'https://exemplo.empresa.com.br' : '192.168.1.10'}
                  className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 text-xs font-mono focus:ring-1 focus:ring-rose-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-lg flex items-start gap-2 text-[11px] text-slate-400">
              <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <span>
                <strong>Proteção Anti-SSRF Ativa:</strong> Endereços de loopback (127.0.0.0/8) e metadados de nuvem (169.254.169.254) são terminantemente bloqueados pelo TargetValidator. IPs privados são validados contra as sub-redes autorizadas deste tenant.
              </span>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-800 bg-slate-900/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleLaunch}
            disabled={loading || activeScopes.length === 0}
            id="btn-confirm-launch-scan"
            className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Validando Alvo...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Disparar Avaliação de Segurança
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
