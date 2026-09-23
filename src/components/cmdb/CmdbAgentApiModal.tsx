import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Terminal, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  Code2, 
  ShieldCheck, 
  Copy, 
  Check, 
  X,
  Play,
  Key,
  Laptop,
  Lock,
  Unlock,
  ShieldAlert,
  RefreshCw,
  Plus,
  Clock,
  Fingerprint,
  RotateCcw,
  Ban,
  Activity,
  Calendar,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import { AgentDeviceIdentity, AgentEnrollmentToken, AgentAuditLog, AgentPlatform } from '../../types/cmdb';
import { getPlatformAdapter, IncrementalInventoryEngine } from '../../utils/agentCollectors';

interface CmdbAgentApiModalProps {
  onClose: () => void;
  onRefreshData: () => void;
  tenantId?: string;
}

export const CmdbAgentApiModal: React.FC<CmdbAgentApiModalProps> = ({ 
  onClose, 
  onRefreshData,
  tenantId = 'tenant-demo' 
}) => {
  const [activeModalTab, setActiveModalTab] = useState<'devices' | 'enrollment' | 'tester' | 'audit'>('devices');
  const [selectedEndpoint, setSelectedEndpoint] = useState<'enroll' | 'heartbeat' | 'rotate-token' | 'inventory'>('enroll');
  const [isSending, setIsSending] = useState(false);
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // Identity data from backend
  const [devices, setDevices] = useState<AgentDeviceIdentity[]>([]);
  const [enrollmentTokens, setEnrollmentTokens] = useState<AgentEnrollmentToken[]>([]);
  const [auditLogs, setAuditLogs] = useState<AgentAuditLog[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  // New Enrollment Token Form
  const [showNewTokenModal, setShowNewTokenModal] = useState(false);
  const [tokenName, setTokenName] = useState('');
  const [validityDays, setValidityDays] = useState(7);
  const [maxUses, setMaxUses] = useState(50);
  const [newlyGeneratedToken, setNewlyGeneratedToken] = useState<string | null>(null);

  // Custom tester inputs
  const [customToken, setCustomToken] = useState('dev_tok_demo_active_secret_key_88412');
  const [customAgentId, setCustomAgentId] = useState('AGT-PC-FIN-01');

  // Multiplatform and Incremental Inventory state
  const [inventoryPlatform, setInventoryPlatform] = useState<AgentPlatform>('windows');
  const [inventoryMode, setInventoryMode] = useState<'full' | 'incremental'>('full');
  const [showNativeScriptModal, setShowNativeScriptModal] = useState(false);

  // Fetch agent identities, enrollment tokens, and audit logs
  const loadModalData = useCallback(async () => {
    setLoadingData(true);
    try {
      const [devRes, tokRes, audRes] = await Promise.all([
        fetch(`/api/v1/agent/devices`, { headers: { 'x-tenant-id': tenantId } }),
        fetch(`/api/v1/agent/enrollment-tokens`, { headers: { 'x-tenant-id': tenantId } }),
        fetch(`/api/v1/agent/audit?limit=50`, { headers: { 'x-tenant-id': tenantId } })
      ]);

      if (devRes.ok) {
        const devs = await devRes.json();
        setDevices(devs);
        if (devs.length > 0 && !customAgentId) {
          setCustomAgentId(devs[0].agentId);
        }
      }
      if (tokRes.ok) {
        const toks = await tokRes.json();
        setEnrollmentTokens(toks);
      }
      if (audRes.ok) {
        const auds = await audRes.json();
        setAuditLogs(auds);
      }
    } catch (err) {
      console.warn('Erro ao carregar dados de identidade do agente:', err);
    } finally {
      setLoadingData(false);
    }
  }, [tenantId, customAgentId]);

  useEffect(() => {
    loadModalData();
  }, [loadModalData]);

  // Handle generating new enrollment token
  const handleCreateEnrollmentToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenName.trim()) return;

    try {
      const res = await fetch('/api/v1/agent/enrollment-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenantId
        },
        body: JSON.stringify({
          name: tokenName.trim(),
          validityDays,
          maxUses
        })
      });

      if (res.ok) {
        const data = await res.json();
        setNewlyGeneratedToken(data.rawToken);
        setTokenName('');
        loadModalData();
      } else {
        alert('Erro ao gerar Enrollment Token.');
      }
    } catch (err) {
      console.error(err);
      alert('Falha na comunicação com o servidor.');
    }
  };

  // Revoke an enrollment token
  const handleRevokeToken = async (id: string) => {
    if (!confirm('Deseja revogar este Enrollment Token imediatamente? Novos computadores não poderão mais usá-lo.')) return;
    try {
      const res = await fetch(`/api/v1/agent/enrollment-tokens/${id}/revoke`, {
        method: 'POST',
        headers: { 'x-tenant-id': tenantId }
      });
      if (res.ok) {
        loadModalData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Block / Unblock / Revoke agent device
  const handleDeviceAction = async (agentId: string, action: 'block' | 'unblock' | 'revoke') => {
    const actionLabel = action === 'block' ? 'bloquear' : action === 'unblock' ? 'desbloquear' : 'revogar permanentemente';
    if (!confirm(`Deseja ${actionLabel} a identidade do agente ${agentId}?`)) return;

    try {
      const res = await fetch(`/api/v1/agent/devices/${agentId}/${action}`, {
        method: 'POST',
        headers: { 'x-tenant-id': tenantId }
      });
      if (res.ok) {
        loadModalData();
        onRefreshData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Sample payloads for API tester
  const sampleEnroll = {
    enrollmentToken: enrollmentTokens.find(t => t.status === 'active')?.id ? "enr_tok_..." : "wp-prod-token-994821a8-8f82-4e89-a212-32b220199211",
    hostname: "DESKTOP-DIRETORIA-01",
    macAddress: "00:1B:44:11:3A:B7",
    operatingSystem: "Windows 11 Pro 23H2",
    ipAddress: "192.168.1.105",
    agentVersion: "v3.0.0-rmm"
  };

  const sampleHeartbeat = {
    agentId: customAgentId || "AGT-PC-FIN-01",
    deviceId: devices.find(d => d.agentId === customAgentId)?.deviceId || "dev_hw_001a2b3c4d5e",
    cpuUsagePct: 24.5,
    ramUsagePct: 58.2,
    diskUsagePct: 41.0,
    uptimeHours: 36,
    temperatureC: 46,
    agentVersion: "v3.0.0-rmm",
    isOnline: true
  };

  const sampleRotate = {
    agentId: customAgentId || "AGT-PC-FIN-01",
    reason: "ROUTINE_ROTATION"
  };

  const currentAdapter = useMemo(() => getPlatformAdapter(inventoryPlatform), [inventoryPlatform]);

  const sampleInventory = useMemo(() => {
    const rawHardware = currentAdapter.hardware.collect();
    const rawOS = currentAdapter.os.collect();
    const rawSoftware = currentAdapter.software.collect();
    const rawNetwork = currentAdapter.network.collect();
    const rawUser = currentAdapter.user.collect();
    const rawSecurity = currentAdapter.security.collect();

    if (inventoryMode === 'full') {
      return {
        origin: "AGENT" as const,
        platform: inventoryPlatform,
        inventoryType: "full" as const,
        agentId: customAgentId || "AGT-PC-FIN-01",
        deviceId: devices.find(d => d.agentId === customAgentId)?.deviceId || "dev_hw_001a2b3c4d5e",
        collectedAt: new Date().toISOString(),
        hardware: rawHardware,
        os: rawOS,
        software: rawSoftware,
        network: rawNetwork,
        user: rawUser,
        security: rawSecurity
      };
    }

    // Incremental Delta payload
    const deltaSample: any = {
      hardware: {
        ram: {
          ...rawHardware.ram,
          freeMb: Math.max(1024, (rawHardware.ram?.freeMb || 4096) - 1024)
        },
        disks: rawHardware.disks?.map(d => ({
          ...d,
          freeGb: d.freeGb !== null ? Math.max(1, d.freeGb - 2.5) : null,
          usedGb: d.usedGb !== null ? d.usedGb + 2.5 : null
        }))
      },
      software: [
        ...rawSoftware.slice(0, 3),
        {
          name: "Security KB5035853 / Patch Update",
          version: "2026.03.1",
          publisher: "Vendor Security Team",
          installDate: new Date().toISOString().split('T')[0],
          architecture: "x64",
          installPath: null,
          sizeMb: 120
        }
      ]
    };

    return {
      origin: "AGENT" as const,
      platform: inventoryPlatform,
      inventoryType: "incremental" as const,
      agentId: customAgentId || "AGT-PC-FIN-01",
      deviceId: devices.find(d => d.agentId === customAgentId)?.deviceId || "dev_hw_001a2b3c4d5e",
      collectedAt: new Date().toISOString(),
      changedFields: ["hardware.ram", "hardware.disks", "software"],
      snapshotHash: IncrementalInventoryEngine.computeHash(deltaSample),
      delta: deltaSample
    };
  }, [currentAdapter, inventoryPlatform, inventoryMode, customAgentId, devices]);

  const nativeCollectorScript = useMemo(() => {
    return currentAdapter.getNativeCollectorScript(
      typeof window !== 'undefined' ? window.location.origin : 'https://api.workpulse.internal',
      customToken || 'dev_tok_demo_active_secret_key_88412'
    );
  }, [currentAdapter, customToken]);

  const currentPayload = 
    selectedEndpoint === 'enroll' ? sampleEnroll :
    selectedEndpoint === 'heartbeat' ? sampleHeartbeat :
    selectedEndpoint === 'rotate-token' ? sampleRotate : sampleInventory;

  const handleTestApi = async () => {
    setIsSending(true);
    setApiResponse(null);

    const endpointUrl = `/api/v1/agent/${selectedEndpoint}`;
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-tenant-id': tenantId
      };

      if (selectedEndpoint !== 'enroll') {
        headers['Authorization'] = `Bearer ${customToken}`;
        headers['x-agent-id'] = customAgentId;
      }

      const res = await fetch(endpointUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(currentPayload)
      });

      const data = await res.json();
      setApiResponse({
        status: res.status,
        statusText: res.statusText,
        body: data
      });

      // Reload modal data to reflect heartbeat or new registration immediately
      loadModalData();
      onRefreshData();
    } catch (err: any) {
      setApiResponse({
        error: err.message
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyCurl = () => {
    const authHeaders = selectedEndpoint !== 'enroll'
      ? `  -H "Authorization: Bearer ${customToken}" \\\n  -H "x-agent-id: ${customAgentId}" \\\n`
      : '';

    const curlCommand = `curl -X POST "${window.location.origin}/api/v1/agent/${selectedEndpoint}" \\
  -H "Content-Type: application/json" \\
  -H "x-tenant-id: ${tenantId}" \\
${authHeaders}  -d '${JSON.stringify(currentPayload, null, 2)}'`;

    navigator.clipboard.writeText(curlCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-200">
        
        {/* Header */}
        <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-950 border border-blue-800 flex items-center justify-center text-blue-400">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Identidade do Agente, Autenticação & API RMM</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-emerald-950 text-emerald-400 border border-emerald-800">
                  Modelo Seguro
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Hierarquia: Tenant → Enrollment Token → Handshake → Agent ID & Credencial Individual Criptográfica
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadModalData}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer transition-colors"
              title="Recarregar dados"
            >
              <RefreshCw className={`w-4 h-4 ${loadingData ? 'animate-spin text-blue-400' : ''}`} />
            </button>
            <button onClick={onClose} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Tabs */}
        <div className="px-6 pt-3 bg-slate-950 border-b border-slate-800 flex items-center gap-2 text-xs">
          <button
            onClick={() => setActiveModalTab('devices')}
            className={`py-2.5 px-4 font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeModalTab === 'devices'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Laptop className="w-4 h-4" />
            <span>Equipamentos & Identidades ({devices.length})</span>
          </button>

          <button
            onClick={() => setActiveModalTab('enrollment')}
            className={`py-2.5 px-4 font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeModalTab === 'enrollment'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>Enrollment Tokens ({enrollmentTokens.length})</span>
          </button>

          <button
            onClick={() => setActiveModalTab('tester')}
            className={`py-2.5 px-4 font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeModalTab === 'tester'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>Testador de Endpoints REST</span>
          </button>

          <button
            onClick={() => setActiveModalTab('audit')}
            className={`py-2.5 px-4 font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeModalTab === 'audit'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Auditoria de Segurança ({auditLogs.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          
          {/* TAB 1: DEVICES & INDIVIDUAL IDENTITIES */}
          {activeModalTab === 'devices' && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-sm">Dispositivos com Identidade Registrada</h4>
                  <p className="text-slate-400 text-xs">
                    Cada equipamento possui credencial individual criptográfica isolada. O Tenant Token não é usado para comunicação contínua.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-950 text-blue-400 border border-blue-800">
                  {devices.length} Ativos Conectados
                </span>
              </div>

              {devices.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-950 rounded-xl border border-slate-800">
                  Nenhum equipamento registrado ainda. Execute o instalador ou utilize o Testador de API para simular o primeiro enrollment.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                        <th className="p-3">Agent ID</th>
                        <th className="p-3">Hostname & MAC</th>
                        <th className="p-3">Device ID</th>
                        <th className="p-3">Prefixo Token</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Último Heartbeat</th>
                        <th className="p-3 text-right">Ações de Segurança</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {devices.map(device => (
                        <tr key={device.agentId} className="hover:bg-slate-900/40 transition-colors">
                          <td className="p-3 font-mono font-bold text-emerald-400 flex items-center gap-1.5">
                            <Laptop className="w-3.5 h-3.5 text-blue-400" />
                            <span>{device.agentId}</span>
                          </td>
                          <td className="p-3">
                            <div className="font-semibold text-white">{device.hostname}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{device.macAddress} • {device.ipAddress}</div>
                          </td>
                          <td className="p-3 font-mono text-slate-400 text-[10px]">
                            {device.deviceId}
                          </td>
                          <td className="p-3 font-mono text-amber-400 text-[11px]">
                            {device.tokenPrefix}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              device.status === 'active' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                              device.status === 'blocked' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                              'bg-rose-950 text-rose-400 border border-rose-800'
                            }`}>
                              {device.status === 'active' ? 'Ativo' : device.status === 'blocked' ? 'Bloqueado' : 'Revogado'}
                            </span>
                          </td>
                          <td className="p-3 text-slate-400 text-[11px]">
                            {device.lastHeartbeatAt ? new Date(device.lastHeartbeatAt).toLocaleTimeString() : 'Nunca'}
                          </td>
                          <td className="p-3 text-right space-x-1.5">
                            {device.status === 'active' ? (
                              <button
                                onClick={() => handleDeviceAction(device.agentId, 'block')}
                                className="px-2 py-1 bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800 rounded text-[10px] font-bold cursor-pointer"
                                title="Bloquear temporariamente"
                              >
                                Bloquear
                              </button>
                            ) : device.status === 'blocked' ? (
                              <button
                                onClick={() => handleDeviceAction(device.agentId, 'unblock')}
                                className="px-2 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 rounded text-[10px] font-bold cursor-pointer"
                                title="Desbloquear"
                              >
                                Reativar
                              </button>
                            ) : null}

                            {device.status !== 'revoked' && (
                              <button
                                onClick={() => handleDeviceAction(device.agentId, 'revoke')}
                                className="px-2 py-1 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded text-[10px] font-bold cursor-pointer"
                                title="Revogar credencial permanentemente"
                              >
                                Revogar
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ENROLLMENT TOKENS */}
          {activeModalTab === 'enrollment' && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-sm">Enrollment Tokens de Instalação</h4>
                  <p className="text-slate-400 text-xs">
                    Tokens temporários, revogáveis e com controle de limite de máquinas. Usados exclusivamente para o registro inicial (handshake).
                  </p>
                </div>
                <button
                  onClick={() => setShowNewTokenModal(true)}
                  className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Novo Enrollment Token</span>
                </button>
              </div>

              {/* Newly Generated Token Alert */}
              {newlyGeneratedToken && (
                <div className="p-4 bg-emerald-950/80 border border-emerald-700 rounded-xl space-y-2 animate-in fade-in">
                  <div className="flex items-center justify-between text-emerald-300 font-bold text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Enrollment Token Gerado com Sucesso! Guarde este token seguro:</span>
                    </div>
                    <button 
                      onClick={() => setNewlyGeneratedToken(null)}
                      className="text-emerald-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={newlyGeneratedToken}
                      className="flex-1 p-2 bg-slate-900 border border-emerald-800 rounded-lg font-mono text-emerald-400 text-xs font-bold"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(newlyGeneratedToken);
                        alert('Token copiado!');
                      }}
                      className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar</span>
                    </button>
                  </div>
                  <p className="text-[11px] text-emerald-200">
                    O token em texto puro é exibido apenas uma vez por motivos de segurança. O banco armazena exclusivamente o hash SHA-256.
                  </p>
                </div>
              )}

              {/* Tokens Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                      <th className="p-3">Nome / Finalidade</th>
                      <th className="p-3">Prefixo Hash</th>
                      <th className="p-3">Usos / Máximo</th>
                      <th className="p-3">Expiração</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {enrollmentTokens.map(token => {
                      const isExpired = new Date(token.expiresAt) < new Date();
                      return (
                        <tr key={token.id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="p-3 font-semibold text-white">
                            <div>{token.name}</div>
                            <div className="text-[10px] text-slate-400">Criado em: {new Date(token.createdAt).toLocaleDateString()}</div>
                          </td>
                          <td className="p-3 font-mono text-blue-400">
                            {token.tokenPrefix}
                          </td>
                          <td className="p-3 font-mono text-slate-300">
                            {token.currentUses} / {token.maxUses === -1 ? 'Ilimitado' : token.maxUses}
                          </td>
                          <td className="p-3 text-slate-400">
                            {new Date(token.expiresAt).toLocaleDateString()}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              token.status === 'revoked' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                              isExpired ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                              'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            }`}>
                              {token.status === 'revoked' ? 'Revogado' : isExpired ? 'Expirado' : 'Ativo'}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            {token.status === 'active' && !isExpired && (
                              <button
                                onClick={() => handleRevokeToken(token.id)}
                                className="px-2.5 py-1 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded text-[10px] font-bold cursor-pointer"
                              >
                                Revogar
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Create Modal */}
              {showNewTokenModal && (
                <div className="p-4 bg-slate-950 border border-blue-800 rounded-xl space-y-3">
                  <h4 className="font-bold text-white text-xs">Criar Novo Enrollment Token</h4>
                  <form onSubmit={handleCreateEnrollmentToken} className="space-y-3">
                    <div>
                      <label className="block text-slate-400 text-[11px] mb-1">Nome / Finalidade do Token</label>
                      <input
                        type="text"
                        placeholder="Ex: Instalação Lote Filial POA - Outubro"
                        value={tokenName}
                        onChange={e => setTokenName(e.target.value)}
                        required
                        className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 text-[11px] mb-1">Validade (Dias)</label>
                        <select
                          value={validityDays}
                          onChange={e => setValidityDays(Number(e.target.value))}
                          className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
                        >
                          <option value={1}>24 horas (Alta segurança)</option>
                          <option value={7}>7 dias</option>
                          <option value={30}>30 dias</option>
                          <option value={90}>90 dias</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-400 text-[11px] mb-1">Limite de Máquinas (Usos)</label>
                        <select
                          value={maxUses}
                          onChange={e => setMaxUses(Number(e.target.value))}
                          className="w-full p-2 bg-slate-900 border border-slate-800 rounded-lg text-white"
                        >
                          <option value={1}>1 máquina (Uso Único)</option>
                          <option value={10}>10 máquinas</option>
                          <option value={50}>50 máquinas</option>
                          <option value={200}>200 máquinas</option>
                          <option value={-1}>Ilimitado (Não recomendado)</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowNewTokenModal(false)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg cursor-pointer"
                      >
                        Gerar Token
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: API TESTER */}
          {activeModalTab === 'tester' && (
            <div className="space-y-4">
              {/* Endpoint Selector */}
              <div className="flex items-center gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  onClick={() => setSelectedEndpoint('enroll')}
                  className={`flex-1 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                    selectedEndpoint === 'enroll' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  POST /agent/enroll
                </button>
                <button
                  onClick={() => setSelectedEndpoint('heartbeat')}
                  className={`flex-1 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                    selectedEndpoint === 'heartbeat' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  POST /agent/heartbeat
                </button>
                <button
                  onClick={() => setSelectedEndpoint('rotate-token')}
                  className={`flex-1 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                    selectedEndpoint === 'rotate-token' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  POST /agent/rotate-token
                </button>
                <button
                  onClick={() => setSelectedEndpoint('inventory')}
                  className={`flex-1 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                    selectedEndpoint === 'inventory' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  POST /agent/inventory
                </button>
              </div>

              {/* Security Header Details */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-400">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    {selectedEndpoint === 'enroll' 
                      ? 'Autenticação: Enrollment Token (Validação de uso e expiração)' 
                      : 'Autenticação: Bearer Token Individual do Equipamento (dev_tok_...)'}
                  </span>
                </div>
                <button
                  onClick={handleCopyCurl}
                  className="text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'cURL Copiado' : 'Copiar comando cURL'}</span>
                </button>
              </div>

              {/* Custom Header Overrides for tester */}
              {selectedEndpoint !== 'enroll' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Header x-agent-id</label>
                    <input
                      type="text"
                      value={customAgentId}
                      onChange={e => setCustomAgentId(e.target.value)}
                      className="w-full p-1.5 bg-slate-900 border border-slate-800 rounded font-mono text-emerald-400 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Bearer Token do Equipamento</label>
                    <input
                      type="text"
                      value={customToken}
                      onChange={e => setCustomToken(e.target.value)}
                      className="w-full p-1.5 bg-slate-900 border border-slate-800 rounded font-mono text-blue-400 text-xs"
                    />
                  </div>
                </div>
              )}

              {/* Multiplatform & Modular Collectors Control (when inventory endpoint is selected) */}
              {selectedEndpoint === 'inventory' && (
                <div className="p-3 bg-slate-950 rounded-xl border border-blue-900/60 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-blue-400" />
                      <span>Coleta Modular Multiplataforma</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowNativeScriptModal(true)}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1.5 cursor-pointer underline underline-offset-2"
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      <span>Ver Script Nativo de Coleta ({inventoryPlatform.toUpperCase()})</span>
                    </button>
                  </div>

                  {/* Platform Pills */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { key: 'windows' as const, label: 'Windows', desc: 'PowerShell / CIM' },
                      { key: 'linux' as const, label: 'Linux', desc: 'procfs / native CLI' },
                      { key: 'macos' as const, label: 'macOS', desc: 'system_profiler' },
                      { key: 'android' as const, label: 'Android', desc: 'SDK APIs Permitidas' }
                    ].map(item => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setInventoryPlatform(item.key)}
                        className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                          inventoryPlatform === item.key
                            ? 'bg-blue-600/20 border-blue-500 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="font-bold text-xs">{item.label}</div>
                        <div className="text-[10px] text-slate-500 truncate">{item.desc}</div>
                      </button>
                    ))}
                  </div>

                  {/* Inventory Mode (Full vs Incremental) */}
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-xs">
                    <span className="text-slate-400">Tipo de Ciclo:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setInventoryMode('full')}
                        className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                          inventoryMode === 'full'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Snapshot Full (Completo)
                      </button>
                      <button
                        type="button"
                        onClick={() => setInventoryMode('incremental')}
                        className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                          inventoryMode === 'incremental'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Delta Incremental (Apenas Mudanças)
                      </button>
                    </div>
                  </div>

                  {/* Collectors Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
                      'HardwareCollector',
                      'OSCollector',
                      'SoftwareCollector',
                      'NetworkCollector',
                      'UserCollector',
                      'SecurityCollector'
                    ].map(col => (
                      <span key={col} className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-300">
                        ✓ {col}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Native Script Modal */}
              {showNativeScriptModal && (
                <div className="p-4 bg-slate-950 border border-cyan-800 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Terminal className="w-4 h-4 text-cyan-400" />
                      <span className="font-bold text-white text-xs">
                        Script Nativo de Coleta: {inventoryPlatform.toUpperCase()}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowNativeScriptModal(false)}
                      className="text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
                    >
                      Fechar
                    </button>
                  </div>
                  <pre className="p-3 bg-slate-900 border border-slate-800 rounded font-mono text-[11px] text-cyan-300 overflow-x-auto max-h-60">
                    {nativeCollectorScript}
                  </pre>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      {inventoryPlatform === 'windows' && 'Execução silenciosa via powershell.exe -ExecutionPolicy Bypass'}
                      {inventoryPlatform === 'linux' && 'Execução segura via bash nativo com procfs/sysfs sem dependências extras'}
                      {inventoryPlatform === 'macos' && 'Execução via zsh e system_profiler'}
                      {inventoryPlatform === 'android' && 'Módulo de background com restrição estrita de privacidade (sem dados pessoais)'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(nativeCollectorScript);
                        alert('Script copiado para a área de transferência!');
                      }}
                      className="px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800 rounded font-bold cursor-pointer flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copiar Script</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Payload Display */}
              <div className="space-y-1.5">
                <div className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  Payload de Envio (JSON)
                </div>
                <pre className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-emerald-400 text-xs overflow-x-auto max-h-48">
                  {JSON.stringify(currentPayload, null, 2)}
                </pre>
              </div>

              {/* Test Trigger Button */}
              <button
                onClick={handleTestApi}
                disabled={isSending}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Play className="w-4 h-4" />
                <span>{isSending ? 'Enviando requisição segura ao servidor...' : 'Disparar Teste Real contra o Servidor'}</span>
              </button>

              {/* API Response display */}
              {apiResponse && (
                <div className="space-y-1.5 animate-in fade-in">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      Resposta do Servidor Express (Status {apiResponse.status})
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      apiResponse.status < 400 
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' 
                        : 'bg-rose-950 text-rose-400 border border-rose-800'
                    }`}>
                      HTTP {apiResponse.status} {apiResponse.statusText}
                    </span>
                  </div>
                  <pre className="p-3 bg-slate-950 border border-slate-800 rounded-xl font-mono text-blue-300 text-xs overflow-x-auto max-h-48">
                    {JSON.stringify(apiResponse.body || apiResponse, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: AUDIT LOGS */}
          {activeModalTab === 'audit' && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-white text-sm">Trilha de Auditoria Criptográfica & Segurança do Agente</h4>
                  <p className="text-slate-400 text-xs">
                    Registro imutável de todas as tentativas de enrollment, falhas de autenticação, rotações de chaves e bloqueios administrativos.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-950 text-purple-400 border border-purple-800">
                  {auditLogs.length} Registros
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-900/60 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                      <th className="p-3">Data / Hora</th>
                      <th className="p-3">Ação</th>
                      <th className="p-3">Agent ID</th>
                      <th className="p-3">IP Origem</th>
                      <th className="p-3">Detalhes Técnicos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                    {auditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="p-3 text-slate-400">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.action === 'ENROLLMENT_SUCCESS' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                            log.action === 'AUTH_FAILED' || log.action === 'ENROLLMENT_FAILED' ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                            log.action === 'TOKEN_ROTATED' ? 'bg-blue-950 text-blue-400 border border-blue-800' :
                            'bg-amber-950 text-amber-400 border border-amber-800'
                          }`}>
                            {log.action}
                          </span>
                        </td>
                        <td className="p-3 text-emerald-400 font-bold">
                          {log.agentId || '—'}
                        </td>
                        <td className="p-3 text-slate-400">
                          {log.ipAddress}
                        </td>
                        <td className="p-3 text-slate-300 font-sans text-xs">
                          {log.details}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Tenant ativo: <strong>{tenantId}</strong> • Tokens armazenados em hash SHA-256</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
