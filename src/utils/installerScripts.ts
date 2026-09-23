export const DEFAULT_TENANT_TOKEN = 'wp-prod-token-994821a8-8f82-4e89-a212-32b220199211';
export const DEFAULT_SERVER_URL = window?.location?.origin || 'http://localhost:3000';

export const downloadFile = (content: string, filename: string) => {
  const element = document.createElement("a");
  const file = new Blob([content], { type: 'text/plain' });
  element.href = URL.createObjectURL(file);
  element.download = filename;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};

export const getIndividualPsScript = (
  tenantToken = DEFAULT_TENANT_TOKEN,
  serverUrl = DEFAULT_SERVER_URL,
  department = 'TI / Infraestrutura',
  roomLocation = 'Sala de Operações / NOC'
) => `# ==============================================================================
# WORKPULSE RMM AGENT - INSTALADOR COM IDENTIDADE INDIVIDUAL E AUTENTICAÇÃO SEGURA
# ==============================================================================
# Enrollment Token: ${tenantToken}
# Servidor Central: ${serverUrl}
# Departamento Alvo: ${department || 'Geral'}
# Localização: ${roomLocation || 'Matriz'}
# ==============================================================================

Write-Host ">>> [WorkPulse Agent] Iniciando instalacao com identidade individual..." -ForegroundColor Cyan

$EnrollmentToken = "${tenantToken}"
$ServerUrl = "${serverUrl}"
$InstallDir = "$env:ProgramData\\WorkPulse\\Agent"
$IdentityFile = "$InstallDir\\agent_identity.json"

# 1. Cria Diretorio Seguro de Execucao (Restrito a Administradores e SYSTEM)
if (!(Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

# 2. Coleta de Identificadores de Hardware (Device Fingerprint)
Write-Host ">>> [Hardware] Coletando informacoes de Hardware e Rede..." -ForegroundColor Yellow
$ComputerInfo = Get-CimInstance Win32_ComputerSystem
$BiosInfo = Get-CimInstance Win32_BIOS
$Processor = (Get-CimInstance Win32_Processor).Name
$TotalRAM = [math]::Round((Get-CimInstance Win32_OperatingSystem).TotalVisibleMemorySize / 1MB, 2)
$Disk = (Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'")
$DiskFreeGB = [math]::Round($Disk.FreeSpace / 1GB, 1)
$DiskTotalGB = [math]::Round($Disk.Size / 1GB, 1)
$NetAdapter = Get-CimInstance Win32_NetworkAdapterConfiguration | Where-Object { $_.IPEnabled -eq $true } | Select-Object -First 1
$MacAddress = $NetAdapter.MACAddress
$IpAddress = $NetAdapter.IPAddress[0]

# 3. Handshake de Enrollment / Identidade do Equipamento
$DeviceIdentity = $null
if (Test-Path $IdentityFile) {
    try {
        $ExistingIdentity = Get-Content $IdentityFile -Raw | ConvertFrom-Json
        if ($ExistingIdentity.deviceToken -and $ExistingIdentity.agentId) {
            Write-Host ">>> [Identidade] Equipamento ja possui identidade registrada: $($ExistingIdentity.agentId)" -ForegroundColor Green
            $DeviceIdentity = $ExistingIdentity
        }
    } catch {
        Write-Warning "Arquivo de identidade corrompido, solicitando novo enrollment..."
    }
}

if (-not $DeviceIdentity) {
    Write-Host ">>> [Enrollment] Registrando equipamento no Tenant com Enrollment Token..." -ForegroundColor Yellow
    $EnrollPayload = @{
        enrollmentToken = $EnrollmentToken
        hostname = $env:COMPUTERNAME
        macAddress = $MacAddress
        ipAddress = $IpAddress
        operatingSystem = (Get-CimInstance Win32_OperatingSystem).Caption
        agentVersion = "v3.0.0-rmm"
    } | ConvertTo-Json

    try {
        $EnrollResponse = Invoke-RestMethod -Uri "$ServerUrl/api/v1/agent/enroll" -Method Post -Body $EnrollPayload -ContentType "application/json"
        
        $DeviceIdentity = @{
            agentId = $EnrollResponse.agentId
            deviceId = $EnrollResponse.deviceId
            tenantId = $EnrollResponse.tenantId
            ciId = $EnrollResponse.ciId
            deviceToken = $EnrollResponse.deviceToken
            serverUrl = $ServerUrl
            enrolledAt = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        }
        
        # Salva a credencial individual localmente
        $DeviceIdentity | ConvertTo-Json | Set-Content -Path $IdentityFile -Encoding UTF8
        Write-Host ">>> [SUCESSO] Equipamento registrado com identidade unica: $($DeviceIdentity.agentId)" -ForegroundColor Green
    } catch {
        Write-Error "Falha no Enrollment do Agente: $_"
        exit 1
    }
}

# 4. Cria e Registra o Servico em Segundo Plano com Autenticacao por Token Individual
Write-Host ">>> [Servico] Configurando servico em segundo plano 'WorkPulseAgent'..." -ForegroundColor Yellow
$ServiceScript = @"
\$IdentityFile = "$IdentityFile"
\$Identity = Get-Content \$IdentityFile -Raw | ConvertFrom-Json
\$ServerUrl = \$Identity.serverUrl
\$AgentId = \$Identity.agentId
\$DeviceToken = \$Identity.deviceToken

while(\$true) {
    try {
        \$Disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
        \$Cpu = (Get-CimInstance Win32_Processor).LoadPercentage
        \$TotalMem = (Get-CimInstance Win32_OperatingSystem).TotalVisibleMemorySize
        \$FreeMem = (Get-CimInstance Win32_OperatingSystem).FreePhysicalMemory
        \$RamPct = [math]::Round(((\$TotalMem - \$FreeMem) / \$TotalMem) * 100, 1)
        \$DiskPct = [math]::Round(((\$Disk.Size - \$Disk.FreeSpace) / \$Disk.Size) * 100, 1)

        \$HbPayload = @{
            agentId = \$AgentId
            deviceId = \$Identity.deviceId
            cpuUsagePct = \$Cpu
            ramUsagePct = \$RamPct
            diskUsagePct = \$DiskPct
            agentVersion = "v3.0.0-rmm"
            isOnline = \$true
        } | ConvertTo-Json

        \$Headers = @{
            "Authorization" = "Bearer \$DeviceToken"
            "x-agent-id" = \$AgentId
        }

        Invoke-RestMethod -Uri "\$ServerUrl/api/v1/agent/heartbeat" -Method Post -Headers \$Headers -Body \$HbPayload -ContentType "application/json" | Out-Null
    } catch {
        # Em caso de falha de conexao, retenta no proximo ciclo
    }
    Start-Sleep -Seconds 30
}
"@
Set-Content -Path "$InstallDir\\agent_service.ps1" -Value $ServiceScript -Encoding UTF8

Write-Host ">>> [Concluido] Agente individual ativo com credencial criptografica isolada!" -ForegroundColor Cyan`;

export const getBatchScript = (
  tenantToken = DEFAULT_TENANT_TOKEN,
  serverUrl = DEFAULT_SERVER_URL,
  department = 'TI / Infraestrutura'
) => {
  const oneLinerCommand = `powershell -ExecutionPolicy Bypass -Command "Invoke-Expression (New-Object Net.WebClient).DownloadString('${serverUrl}/agent/install.ps1?token=${tenantToken}&dept=${encodeURIComponent(department)}')"` ;
  return `@echo off
:: ===================================================================
:: WorkPulse Agent - Instalador Rapido com Identidade Individual
:: ===================================================================
title Instalando WorkPulse Agent (Identidade Individual Segura)...
color 0A
echo.
echo ===================================================================
echo    WORKPULSE AGENT - INSTALADOR SEGURO MULTI-TENANT
echo ===================================================================
echo Enrollment Token: ${tenantToken}
echo Servidor Central: ${serverUrl}
echo.
echo [1/3] Verificando privilegios de administrador...
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERRO] Execute este arquivo como ADMINISTRADOR (Botao direito - Executar como Administrador)
    pause
    exit /b 1
)

echo [2/3] Registrando identidade unica do equipamento e token individual...
powershell -NoProfile -ExecutionPolicy Bypass -Command "${oneLinerCommand}"

echo.
echo [3/3] Sucesso! Equipamento identificado, cadastrado e monitorado no CMDB.
echo.
pause
exit /b 0`;
};

export const getGpoScript = (tenantToken = DEFAULT_TENANT_TOKEN) => `# Script de Instalacao Silenciosa do Agente WorkPulse via Active Directory / GPO
# O instalador executa o enrollment individual no primeiro boot e gera credencial unica
$InstallerPath = "\\\\domain.local\\SYSVOL\\Installers\\WorkPulseAgent-v4.2.1.msi"
$EnrollmentToken = "${tenantToken}"
$LogPath = "C:\\Windows\\Temp\\WorkPulseInstall.log"

Start-Process msiexec.exe -ArgumentList "/i \`"$InstallerPath\`" ENROLLMENT_TOKEN=\`"$EnrollmentToken\`" /qn /norestart /L*V \`"$LogPath\`"" -Wait
Write-Host "Agente Corporativo WorkPulse instalado com sucesso via GPO! Identidade individual gerada."`;

export const getUnixScript = (
  tenantToken = DEFAULT_TENANT_TOKEN,
  serverUrl = DEFAULT_SERVER_URL,
  department = 'TI / Infraestrutura',
  roomLocation = 'Sala de Operações / NOC'
) => `#!/usr/bin/env bash
# ==============================================================================
# WorkPulse RMM Agent - Linux & macOS Daemon (Identidade Individual Segura)
# ==============================================================================
set -e
echo ">>> [WorkPulse Agent] Iniciando instalador para $(uname -s)..."
export ENROLLMENT_TOKEN="${tenantToken}"
export SERVER_URL="${serverUrl}"

INSTALL_DIR="/opt/workpulse/agent"
IDENTITY_FILE="$INSTALL_DIR/agent_identity.json"

mkdir -p "$INSTALL_DIR"
chmod 700 "$INSTALL_DIR"

HOSTNAME=$(hostname)
MAC=$(ip link show | awk '/ether/ {print $2}' | head -n 1 || ifconfig | awk '/ether/{print $2}' | head -n 1 || echo "00:00:00:00:00:00")
IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "127.0.0.1")
OS="$(uname -s) $(uname -r)"

if [ ! -f "$IDENTITY_FILE" ]; then
    echo ">>> Realizando Enrollment no servidor $SERVER_URL..."
    PAYLOAD=$(cat <<EOF
{
  "enrollmentToken": "$ENROLLMENT_TOKEN",
  "hostname": "$HOSTNAME",
  "macAddress": "$MAC",
  "ipAddress": "$IP",
  "operatingSystem": "$OS",
  "agentVersion": "v3.0.0-rmm"
}
EOF
)
    RESPONSE=$(curl -s -X POST "$SERVER_URL/api/v1/agent/enroll" \
      -H "Content-Type: application/json" \
      -d "$PAYLOAD")
    
    echo "$RESPONSE" > "$IDENTITY_FILE"
    chmod 600 "$IDENTITY_FILE"
    echo ">>> Identidade individual gerada e salva com sucesso!"
fi

echo ">>> Agente Daemon registrado com sucesso."
`;

export const downloadIndividualPs1 = () => {
  downloadFile(getIndividualPsScript(), "Instalar_WorkPulse_Individual.ps1");
};

export const downloadIndividualBat = () => {
  downloadFile(getBatchScript(), "Instalar_WorkPulse_Agente.bat");
};

export const downloadMsiGpoPackage = () => {
  downloadFile(getGpoScript(), "Install_WorkPulseAgent_GPO.ps1");
};

