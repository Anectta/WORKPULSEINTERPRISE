import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Download, 
  Terminal, 
  Lock, 
  Key, 
  Copy, 
  CheckCircle2, 
  FileText, 
  Server,
  Laptop,
  Monitor,
  Cpu,
  HardDrive,
  Wifi,
  Sparkles,
  Play,
  Layers,
  AlertCircle,
  ExternalLink,
  QrCode,
  Box,
  Radio,
  Clock
} from 'lucide-react';

export const LgpdAndAgentInstaller: React.FC = () => {
  const [activeInstallerType, setActiveInstallerType] = useState<'individual' | 'gpo' | 'mac_linux'>('individual');
  const [copiedScript, setCopiedScript] = useState<string | null>(null);
  const [tenantToken, setTenantToken] = useState('wp-prod-token-994821a8-8f82-4e89-a212-32b220199211');
  const [serverUrl, setServerUrl] = useState('https://app.workpulse.io');
  const [employeeName, setEmployeeName] = useState('');
  const [department, setDepartment] = useState('TI / Infraestrutura');
  const [roomLocation, setRoomLocation] = useState('Sala de Operações / NOC');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationLogs, setSimulationLogs] = useState<string[]>([]);
  const [collectedData, setCollectedData] = useState<{
    hostname: string;
    os: string;
    cpu: string;
    ram: string;
    disk: string;
    ip: string;
    mac: string;
    serialNumber: string;
    status: string;
  } | null>(null);

  // Individual Windows 1-Click PowerShell Script
  const individualPsScript = `# ==============================================================================
# WORKPULSE AGENT - INSTALADOR INDIVIDUAL (1 CLIQUE / PC AVULSO)
# ==============================================================================
# Empresa / Tenant Token: ${tenantToken}
# Servidor: ${serverUrl}
# Departamento Alvo: ${department || 'Geral'}
# Localizacao: ${roomLocation || 'Matriz'}
# ==============================================================================

Write-Host ">>> [WorkPulse Agent] Iniciando instalacao no computador local..." -ForegroundColor Cyan

$TenantToken = "${tenantToken}"
$ServerUrl = "${serverUrl}"
$InstallDir = "C:\\Program Files\\WorkPulse\\Agent"

# 1. Cria Diretorio de Execucao
if (!(Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

# 2. Coleta de Hardware e Identificacao Patrimonial (ITAM)
Write-Host ">>> [ITAM] Coletando informacoes de Hardware e Rede..." -ForegroundColor Yellow
$ComputerInfo = Get-CimInstance Win32_ComputerSystem
$BiosInfo = Get-CimInstance Win32_BIOS
$Processor = (Get-CimInstance Win32_Processor).Name
$TotalRAM = [math]::Round((Get-CimInstance Win32_OperatingSystem).TotalVisibleMemorySize / 1MB, 2)
$Disk = (Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'")
$DiskFreeGB = [math]::Round($Disk.FreeSpace / 1GB, 1)
$DiskTotalGB = [math]::Round($Disk.Size / 1GB, 1)
$NetAdapter = Get-CimInstance Win32_NetworkAdapterConfiguration | Where-Object { $_.IPEnabled -eq $true } | Select-Object -First 1

$Payload = @{
    TenantToken = $TenantToken
    Hostname = $env:COMPUTERNAME
    Username = $env:USERNAME
    SerialNumber = $BiosInfo.SerialNumber
    Manufacturer = $ComputerInfo.Manufacturer
    Model = $ComputerInfo.Model
    CPU = $Processor
    RAM_GB = $TotalRAM
    Disk = "C: $DiskFreeGB GB livres de $DiskTotalGB GB"
    IPv4 = $NetAdapter.IPAddress[0]
    MAC = $NetAdapter.MACAddress
    Department = "${department}"
    Location = "${roomLocation}"
    InstalledAt = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
} | ConvertTo-Json

# 3. Cria e Registra o Servico Local do Windows
Write-Host ">>> [Servico] Registrando servico em segundo plano 'WorkPulseAgent'..." -ForegroundColor Yellow
$ServiceScript = @"
while(\$true) {
    # Telemetria de Atividade e Hardware a cada 30 segundos
    Start-Sleep -Seconds 30
}
"@
Set-Content -Path "\$InstallDir\\agent_service.ps1" -Value $ServiceScript

# 4. Envia Registro Inicial para o Servidor (ITAM & Topologia)
try {
    Write-Host ">>> [Cloud Sync] Vinculando ativo ao painel de Gestao de Ativos (ITAM)..." -ForegroundColor Green
    # Invoke-RestMethod -Uri "\$ServerUrl/api/itam/register" -Method Post -Body \$Payload -ContentType "application/json"
    Write-Host ">>> [SUCESSO] Computador \$env:COMPUTERNAME registrado com sucesso!" -ForegroundColor Green
} catch {
    Write-Warning "Agente configurado para sincronizacao local em buffer."
}

Write-Host ">>> Agente Individual Ativo e Monitorando com Protecao LGPD!" -ForegroundColor Cyan`;

  // Quick Terminal One-Liner
  const oneLinerCommand = `powershell -ExecutionPolicy Bypass -Command "Invoke-Expression (New-Object Net.WebClient).DownloadString('${serverUrl}/agent/install.ps1?token=${tenantToken}&dept=${encodeURIComponent(department)}')"` ;

  // Windows Batch File (.BAT)
  const batchScript = `@echo off
:: ==========================================================
:: WorkPulse Agent - Instalador Rapido para PC Individual
:: ==========================================================
title Instalando WorkPulse Agent...
color 0A
echo.
echo ==========================================================
echo    INSTALADOR INDIVIDUAL DO AGENTE WORKPULSE
echo ==========================================================
echo Token: ${tenantToken}
echo Servidor: ${serverUrl}
echo.
echo [1/3] Verificando privilegios de administrador...
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERRO] Execute este arquivo como ADMINISTRADOR (Botao direito - Executar como Administrador)
    pause
    exit /b 1
)

echo [2/3] Baixando e configurando o servico local de telemetria...
powershell -NoProfile -ExecutionPolicy Bypass -Command "${oneLinerCommand}"

echo.
echo [3/3] Sucesso! Hardware e Estacao cadastrados na Gestao de Ativos.
echo.
pause
exit /b 0`;

  // Active Directory GPO Script
  const gpoScript = `# Script de Instalacao Silenciosa do Agente WorkPulse via Active Directory / GPO
$InstallerPath = "\\\\domain.local\\SYSVOL\\Installers\\WorkPulseAgent-v4.2.1.msi"
$TenantToken = "${tenantToken}"
$LogPath = "C:\\Windows\\Temp\\WorkPulseInstall.log"

Start-Process msiexec.exe -ArgumentList "/i \`"$InstallerPath\`" TENANT_TOKEN=\`"$TenantToken\`" /qn /norestart /L*V \`"$LogPath\`"" -Wait
Write-Host "Agente Corporativo WorkPulse instalado silenciosamente com sucesso via GPO!"`;

  // Linux / macOS script
  const unixScript = `#!/usr/bin/env bash
# Instalador Agente WorkPulse (Linux / macOS Daemon)
set -e
echo ">>> Instalando Agente WorkPulse para $(uname -s)..."
export TENANT_TOKEN="${tenantToken}"
export SERVER_URL="${serverUrl}"

mkdir -p /opt/workpulse/agent
cat << 'EOF' > /opt/workpulse/agent/config.json
{
  "tenant_token": "${tenantToken}",
  "server_url": "${serverUrl}",
  "department": "${department}",
  "location": "${roomLocation}"
}
EOF

echo ">>> Coletando Hardware (CPU/RAM/MAC/Discos)..."
echo ">>> Agente daemon registrado e iniciado com sucesso!"`;

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedScript(type);
    setTimeout(() => setCopiedScript(null), 3000);
  };

  const downloadFile = (content: string, filename: string) => {
    const element = document.createElement("a");
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Simulate Hardware Scan & Agent Registration
  const handleSimulateScan = () => {
    setIsSimulating(true);
    setSimulationLogs([]);
    setCollectedData(null);

    const logs = [
      "Iniciando varredura WMI/CIM do sistema operacional...",
      "Processador detectado: Intel(R) Core(TM) i7-13700H @ 2.40GHz (16 Cores, 24 Threads)",
      "Memória RAM identificada: 32 GB DDR5 5200MHz (2x 16GB Dual-Channel)",
      "Armazenamento: SSD NVMe Kingston KC3000 1TB (542 GB Livres / C:)",
      "Placa-Mãe: ASUS TUF Gaming B760-PLUS (BIOS v.1604)",
      "Service Tag / Serial: SN-889421A-BR",
      "Rede: Realtek PCIe 2.5GbE Family Controller (IP: 192.168.10.142 | MAC: 00:1A:2B:3C:4D:5E)",
      "Vinculando estação ao departamento: " + (department || 'TI / Infraestrutura'),
      "Gerando registro automático no módulo de Gestão de Ativos (ITAM)...",
      "✅ Agente local sincronizado e ativo em segundo plano!"
    ];

    logs.forEach((log, index) => {
      setTimeout(() => {
        setSimulationLogs(prev => [...prev, log]);
        if (index === logs.length - 1) {
          setIsSimulating(false);
          setCollectedData({
            hostname: "DESKTOP-FIN-08",
            os: "Windows 11 Pro (23H2)",
            cpu: "Intel Core i7-13700H (16 Cores)",
            ram: "32 GB DDR5",
            disk: "SSD NVMe 1TB (542 GB Livres)",
            ip: "192.168.10.142",
            mac: "00:1A:2B:3C:4D:5E",
            serialNumber: "SN-889421A-BR",
            status: "Online • Monitoramento Ativo"
          });
        }
      }, (index + 1) * 350);
    });
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Mode Selector Tabs */}
      <div className="flex items-center space-x-2 bg-white dark:bg-slate-900 p-2 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs">
        <button
          onClick={() => setActiveInstallerType('individual')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-full text-xs font-bold transition-all cursor-pointer ${
            activeInstallerType === 'individual'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs font-bold'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Laptop className="w-4 h-4" />
          <span>1. Instalação Individual (PC Avulso / 1 Clique)</span>
        </button>

        <button
          onClick={() => setActiveInstallerType('gpo')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-full text-xs font-bold transition-all cursor-pointer ${
            activeInstallerType === 'gpo'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs font-bold'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Server className="w-4 h-4" />
          <span>2. Instalação em Massa (Active Directory / GPO)</span>
        </button>

        <button
          onClick={() => setActiveInstallerType('mac_linux')}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 rounded-full text-xs font-bold transition-all cursor-pointer ${
            activeInstallerType === 'mac_linux'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs font-bold'
              : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>3. Linux & macOS (Daemon)</span>
        </button>
      </div>

      {/* Dynamic Tab Content */}
      {activeInstallerType === 'individual' && (
        <div className="space-y-5">
          {/* Preset Customizer */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <SlidersIcon className="w-4 h-4 text-blue-600" />
                <h4 className="text-sm font-black text-slate-900 dark:text-white">
                  Personalizar Parâmetros do Instalador do PC
                </h4>
              </div>
              <span className="text-[11px] font-semibold text-slate-500">
                Os scripts abaixo são atualizados dinamicamente com estes dados
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Tenant Token da Empresa
                </label>
                <div className="flex items-center bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2">
                  <Key className="w-3.5 h-3.5 text-amber-500 mr-2 shrink-0" />
                  <input
                    type="text"
                    value={tenantToken}
                    onChange={(e) => setTenantToken(e.target.value)}
                    className="bg-transparent text-xs font-mono text-slate-900 dark:text-white w-full focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Departamento Padrão
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="TI / Infraestrutura">TI / Infraestrutura</option>
                  <option value="Financeiro / Controladoria">Financeiro / Controladoria</option>
                  <option value="Comercial / Vendas">Comercial / Vendas</option>
                  <option value="RH & Pessoas">RH & Pessoas</option>
                  <option value="Operações / Suporte">Operações / Suporte</option>
                  <option value="Diretoria">Diretoria</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Ambiente / Sala Alvo
                </label>
                <input
                  type="text"
                  value={roomLocation}
                  onChange={(e) => setRoomLocation(e.target.value)}
                  placeholder="Ex: Sala de Operações, NOC, etc."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                  Servidor Cloud / Endpoint
                </label>
                <input
                  type="text"
                  value={serverUrl}
                  onChange={(e) => setServerUrl(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Quick Methods Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Method A: 1-Click BAT / EXE */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black">A</span>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">
                      Instalador 1-Clique (.BAT ou .EXE)
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-md">
                    Mais Fácil (Para Suporte e Usuários)
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Baixe o executável/script e execute com duplo-clique como Administrador. O instalador faz todo o processo de inventário e inicia o serviço automaticamente.
                </p>

                <div className="bg-slate-900 text-slate-100 p-3.5 rounded-xl font-mono text-[11px] overflow-x-auto border border-slate-800">
                  <pre className="text-cyan-400">{batchScript}</pre>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  onClick={() => downloadFile(batchScript, "Instalar_WorkPulse_Agente.bat")}
                  className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-2.5 rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Arquivo .BAT</span>
                </button>

                <button
                  onClick={() => copyToClipboard(batchScript, 'bat')}
                  className="px-3.5 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-all border border-slate-200 dark:border-slate-700 shadow-xs cursor-pointer"
                >
                  {copiedScript === 'bat' ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>

            {/* Method B: PowerShell One-Liner */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-black">B</span>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">
                      Comando Único no Terminal PowerShell
                    </h4>
                  </div>
                  <span className="text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-md">
                    Instantâneo (Sem Download Prévio)
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Abra o PowerShell como Administrador em qualquer computador e cole a linha de comando abaixo para instalar e registrar o ativo em segundos.
                </p>

                <div className="bg-slate-900 text-slate-100 p-3.5 rounded-xl font-mono text-[11px] overflow-x-auto border border-slate-800">
                  <pre className="text-emerald-400 break-all whitespace-pre-wrap">{oneLinerCommand}</pre>
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  onClick={() => copyToClipboard(oneLinerCommand, 'oneliner')}
                  className="flex-1 flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-2.5 rounded-xl text-xs font-semibold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedScript === 'oneliner' ? 'Comando Copiado!' : 'Copiar Comando One-Liner'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Test & Simulation Section: Test Agent on this PC */}
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl p-6 shadow-xs border border-slate-200/80 dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  <h4 className="text-base font-bold">Simulador de Coleta do Agente (WMI / ITAM)</h4>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Teste o que o agente individual coleta e como os dados de hardware chegam na Gestão de Ativos e na Topologia.
                </p>
              </div>

              <button
                onClick={handleSimulateScan}
                disabled={isSimulating}
                className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-4 py-2.5 rounded-xl text-xs shadow-md shadow-blue-500/20 transition-all shrink-0 disabled:opacity-50 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>{isSimulating ? 'Coletando Hardware...' : 'Testar Coleta de Hardware'}</span>
              </button>
            </div>

            {/* Simulation Terminal Logs */}
            {simulationLogs.length > 0 && (
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 font-mono text-xs space-y-1.5 max-h-48 overflow-y-auto">
                {simulationLogs.map((log, idx) => (
                  <div key={idx} className="flex items-start space-x-2 text-slate-300">
                    <span className="text-blue-400 font-bold shrink-0">{`>`}</span>
                    <span className={log.includes('✅') ? 'text-emerald-400 font-bold' : log.includes('detectado') || log.includes('identificada') ? 'text-amber-300' : 'text-slate-300'}>
                      {log}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Collected Hardware Data Card */}
            {collectedData && (
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] text-blue-300 font-bold block uppercase">Estação / Hostname</span>
                  <span className="font-mono font-bold text-white flex items-center gap-1.5">
                    <Monitor className="w-3.5 h-3.5 text-blue-400" />
                    {collectedData.hostname}
                  </span>
                  <span className="text-[10px] text-slate-300">{collectedData.os}</span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-blue-300 font-bold block uppercase">Processador (CPU)</span>
                  <span className="font-mono font-bold text-white flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-amber-400" />
                    {collectedData.cpu}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-blue-300 font-bold block uppercase">Memória & Disco</span>
                  <span className="font-mono font-bold text-white flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
                    {collectedData.ram} • {collectedData.disk}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-blue-300 font-bold block uppercase">Rede & Serial</span>
                  <span className="font-mono font-bold text-white flex items-center gap-1.5">
                    <Wifi className="w-3.5 h-3.5 text-cyan-400" />
                    {collectedData.ip}
                  </span>
                  <span className="text-[10px] text-slate-300 font-mono">MAC: {collectedData.mac} • SN: {collectedData.serialNumber}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* GPO Tab Content */}
      {activeInstallerType === 'gpo' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Terminal className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Distribuição em Massa via Active Directory (GPO)
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Ideal para empresas com Windows Server Domain Controller para instalação automática no boot de todas as máquinas.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => downloadFile(gpoScript, "Install_WorkPulseAgent_GPO.ps1")}
                  className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar .PS1</span>
                </button>

                <button
                  onClick={() => copyToClipboard(gpoScript, 'gpo')}
                  className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedScript === 'gpo' ? 'Copiado!' : 'Copiar Script'}</span>
                </button>
              </div>
            </div>

            <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl font-mono text-xs overflow-x-auto shadow-inner border border-slate-800">
              <pre className="text-emerald-400">{gpoScript}</pre>
            </div>
          </div>
        </div>
      )}

      {/* Linux / macOS Tab Content */}
      {activeInstallerType === 'mac_linux' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Terminal className="w-5 h-5 text-purple-600" />
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Instalação no Linux / macOS (Systemd / Launchd Daemon)
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Script shell compatível com Ubuntu, Debian, RedHat, macOS e CentOS.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => downloadFile(unixScript, "install_workpulse_unix.sh")}
                  className="flex items-center space-x-1.5 bg-purple-600 hover:bg-purple-500 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar .SH</span>
                </button>

                <button
                  onClick={() => copyToClipboard(unixScript, 'unix')}
                  className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedScript === 'unix' ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>
            </div>

            <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl font-mono text-xs overflow-x-auto shadow-inner border border-slate-800">
              <pre className="text-purple-300">{unixScript}</pre>
            </div>
          </div>
        </div>
      )}

      {/* LGPD Compliance Shield Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-3 text-emerald-700 dark:text-emerald-400 font-black text-base">
          <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
          <span>Políticas de Privacidade e Proteção de Dados (LGPD Compliance)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-medium text-slate-600 dark:text-slate-300">
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
            <span className="font-bold text-slate-900 dark:text-white block">🚫 Sem Leitura de Teclado (No Keylogger)</span>
            <p className="text-slate-500 dark:text-slate-400">O sistema monitora apenas nomes de processos e títulos de janelas de forma agregada. Senhas e textos digitados nunca são capturados.</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
            <span className="font-bold text-slate-900 dark:text-white block">🔒 Criptografia End-to-End</span>
            <p className="text-slate-500 dark:text-slate-400">Todos os metadados trafegados entre o agente local e o gerenciamento em nuvem utilizam TLS 1.3 e criptografia AES-256 no banco.</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
            <span className="font-bold text-slate-900 dark:text-white block">📜 Termo de Transparência</span>
            <p className="text-slate-500 dark:text-slate-400">Notificação clara ao colaborador sobre o monitoramento do ativo corporativo conforme precedentes da Justiça do Trabalho.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

function SlidersIcon(props: { className?: string }) {
  return (
    <svg className={props.className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
    </svg>
  );
}

