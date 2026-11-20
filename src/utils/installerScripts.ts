// Enrollment token NUNCA deve ser fixo no código: gere um em CMDB > API de Agentes (enrollment tokens).
export const DEFAULT_TENANT_TOKEN = '<SEU_ENROLLMENT_TOKEN>';
// Também usado pelo servidor (rota /api/v1/agent/install.ps1), onde não existe window
export const DEFAULT_SERVER_URL =
  typeof window !== 'undefined' && window.location ? window.location.origin : 'http://localhost:3000';

const AGENT_VERSION = 'v3.1.0-rmm';

/** Escapa um valor para dentro de string PowerShell entre aspas simples. */
const psQuote = (value: string) => `'${String(value).replace(/'/g, "''")}'`;
/** Escapa um valor para dentro de string bash entre aspas simples. */
const shQuote = (value: string) => `'${String(value).replace(/'/g, `'\\''`)}'`;

export const downloadFile = (content: string, filename: string) => {
  const element = document.createElement("a");
  const file = new Blob([content], { type: 'text/plain' });
  element.href = URL.createObjectURL(file);
  element.download = filename;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
};

/**
 * Instalador Windows (PowerShell, executar como Administrador):
 * 1. enrollment com o token informado -> identidade individual (deviceToken)
 * 2. grava agent_service.ps1 (heartbeat a cada 30 s com o token individual)
 * 3. registra Tarefa Agendada que roda o serviço como SYSTEM na inicialização
 */
export const getIndividualPsScript = (
  tenantToken = DEFAULT_TENANT_TOKEN,
  serverUrl = DEFAULT_SERVER_URL,
  department = 'TI / Infraestrutura',
  roomLocation = 'Sala de Operações / NOC'
) => `# ==============================================================================
# WORKPULSE RMM AGENT - INSTALADOR WINDOWS (identidade individual)
# Execute em PowerShell como Administrador.
# Departamento: ${department || 'Geral'} | Local: ${roomLocation || 'Matriz'}
# ==============================================================================
#Requires -RunAsAdministrator
$ErrorActionPreference = 'Stop'

$EnrollmentToken = ${psQuote(tenantToken)}
$ServerUrl = ${psQuote(serverUrl)}
$InstallDir = Join-Path $env:ProgramData 'WorkPulse\\Agent'
$IdentityFile = Join-Path $InstallDir 'agent_identity.json'
$ServiceFile = Join-Path $InstallDir 'agent_service.ps1'
$TaskName = 'WorkPulseAgent'

if ($EnrollmentToken -like '<*>') {
    Write-Error 'Enrollment token nao configurado. Gere um token em CMDB > API de Agentes.'
    exit 1
}

Write-Host '>>> [WorkPulse] Preparando diretorio do agente...' -ForegroundColor Cyan
New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
# Restringe o diretorio (contem o token individual) a SYSTEM e Administradores
icacls $InstallDir /inheritance:r /grant:r 'SYSTEM:(OI)(CI)F' 'Administrators:(OI)(CI)F' | Out-Null

Write-Host '>>> [WorkPulse] Coletando identificadores do equipamento...' -ForegroundColor Yellow
$NetAdapter = Get-CimInstance Win32_NetworkAdapterConfiguration | Where-Object { $_.IPEnabled } | Select-Object -First 1
$MacAddress = if ($NetAdapter) { $NetAdapter.MACAddress } else { '00:00:00:00:00:00' }
$IpAddress = if ($NetAdapter -and $NetAdapter.IPAddress) { $NetAdapter.IPAddress[0] } else { '' }

$Identity = $null
if (Test-Path $IdentityFile) {
    try {
        $Existing = Get-Content $IdentityFile -Raw | ConvertFrom-Json
        if ($Existing.deviceToken -and $Existing.agentId) {
            Write-Host ">>> [Identidade] Ja registrado como $($Existing.agentId)" -ForegroundColor Green
            $Identity = $Existing
        }
    } catch {
        Write-Warning 'Arquivo de identidade invalido; um novo enrollment sera feito.'
    }
}

if (-not $Identity) {
    Write-Host '>>> [Enrollment] Registrando equipamento...' -ForegroundColor Yellow
    $Payload = @{
        enrollmentToken = $EnrollmentToken
        hostname        = $env:COMPUTERNAME
        macAddress      = $MacAddress
        ipAddress       = $IpAddress
        operatingSystem = (Get-CimInstance Win32_OperatingSystem).Caption
        agentVersion    = '${AGENT_VERSION}'
    } | ConvertTo-Json

    $Response = Invoke-RestMethod -Uri "$ServerUrl/api/v1/agent/enroll" -Method Post -Body $Payload -ContentType 'application/json'
    if (-not $Response.deviceToken) {
        Write-Error 'O servidor nao retornou um token de dispositivo. Verifique o enrollment token.'
        exit 1
    }
    $Identity = [pscustomobject]@{
        agentId     = $Response.agentId
        deviceId    = $Response.deviceId
        tenantId    = $Response.tenantId
        ciId        = $Response.ciId
        deviceToken = $Response.deviceToken
        serverUrl   = $ServerUrl
        enrolledAt  = (Get-Date).ToString('s')
    }
    $Identity | ConvertTo-Json | Set-Content -Path $IdentityFile -Encoding UTF8
    Write-Host ">>> [Enrollment] Registrado como $($Identity.agentId)" -ForegroundColor Green
}

# Here-string LITERAL (@' '@): as variaveis sao avaliadas quando o servico roda,
# nao durante a instalacao.
$ServiceScript = @'
$IdentityFile = Join-Path $env:ProgramData 'WorkPulse\\Agent\\agent_identity.json'
$Identity = Get-Content $IdentityFile -Raw | ConvertFrom-Json
$Headers = @{ 'Authorization' = "Bearer $($Identity.deviceToken)"; 'x-agent-id' = $Identity.agentId }

while ($true) {
    try {
        $Os = Get-CimInstance Win32_OperatingSystem
        $Disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'"
        $Body = @{
            agentId      = $Identity.agentId
            deviceId     = $Identity.deviceId
            hostname     = $env:COMPUTERNAME
            agentVersion = '${AGENT_VERSION}'
            isOnline     = $true
            cpuUsagePct  = (Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average
            ramUsagePct  = [math]::Round((($Os.TotalVisibleMemorySize - $Os.FreePhysicalMemory) / $Os.TotalVisibleMemorySize) * 100, 1)
            diskUsagePct = [math]::Round((($Disk.Size - $Disk.FreeSpace) / $Disk.Size) * 100, 1)
            uptimeHours  = [math]::Round(((Get-Date) - $Os.LastBootUpTime).TotalHours, 1)
        } | ConvertTo-Json
        Invoke-RestMethod -Uri "$($Identity.serverUrl)/api/v1/agent/heartbeat" -Method Post -Headers $Headers -Body $Body -ContentType 'application/json' | Out-Null
    } catch {
        # Falha de rede: tenta novamente no proximo ciclo
    }
    Start-Sleep -Seconds 30
}
'@
Set-Content -Path $ServiceFile -Value $ServiceScript -Encoding UTF8

Write-Host '>>> [Servico] Registrando tarefa agendada (SYSTEM, na inicializacao)...' -ForegroundColor Yellow
$Action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \`"$ServiceFile\`""
$Trigger = New-ScheduledTaskTrigger -AtStartup
$Principal = New-ScheduledTaskPrincipal -UserId 'SYSTEM' -LogonType ServiceAccount -RunLevel Highest
$Settings = New-ScheduledTaskSettingsSet -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit (New-TimeSpan -Seconds 0)
Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Principal $Principal -Settings $Settings -Force | Out-Null
Start-ScheduledTask -TaskName $TaskName

Write-Host ">>> [Concluido] Agente $($Identity.agentId) ativo (tarefa '$TaskName')." -ForegroundColor Cyan
`;

/**
 * Instalador .BAT: verifica privilégio de administrador e executa o instalador
 * PowerShell servido pela API (/api/v1/agent/install.ps1), validado pelo token.
 */
export const getBatchScript = (
  tenantToken = DEFAULT_TENANT_TOKEN,
  serverUrl = DEFAULT_SERVER_URL,
  department = 'TI / Infraestrutura'
) => {
  // Em .BAT, "%" precisa ser duplicado para não ser interpretado como variável
  const enc = (v: string) => encodeURIComponent(v).replace(/'/g, '%27');
  const url = `${serverUrl}/api/v1/agent/install.ps1?token=${enc(tenantToken)}&dept=${enc(department)}`
    .replace(/%/g, '%%');
  return `@echo off
:: ===================================================================
:: WorkPulse Agent - Instalador (identidade individual)
:: Clique com o botao direito e escolha "Executar como administrador".
:: ===================================================================
title Instalando WorkPulse Agent
echo [1/2] Verificando privilegios de administrador...
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERRO] Execute este arquivo como ADMINISTRADOR - botao direito, Executar como administrador.
    pause
    exit /b 1
)

echo [2/2] Baixando e executando o instalador do agente...
powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = 'Tls12'; iex ((New-Object Net.WebClient).DownloadString('${url}'))"
if %errorLevel% neq 0 (
    echo [ERRO] A instalacao falhou. Verifique o token e a conexao com ${serverUrl.replace(/%/g, '%%')}.
    pause
    exit /b 1
)

echo Instalacao concluida. O equipamento aparecera no CMDB apos o primeiro heartbeat.
pause
exit /b 0`;
};

/**
 * Implantação em massa via GPO (script de inicialização do computador).
 * Não existe pacote MSI: a GPO executa o instalador PowerShell publicado num
 * compartilhamento (NETLOGON/SYSVOL), que é idempotente.
 */
export const getGpoScript = (tenantToken = DEFAULT_TENANT_TOKEN) => `# ==============================================================================
# WorkPulse Agent - Script de inicializacao para GPO
# Configure em: Configuracao do Computador > Politicas > Configuracoes do Windows >
#               Scripts (Inicializacao/Desligamento) > Inicializacao (aba PowerShell)
# 1. Baixe o instalador individual (.ps1) na aba LGPD/GPO.
# 2. Publique-o em um compartilhamento legivel pelos computadores, ex.: NETLOGON.
# 3. Ajuste o caminho abaixo.
# ==============================================================================
$InstallerPath = '\\\\dominio.local\\NETLOGON\\WorkPulse\\Instalar_WorkPulse_Individual.ps1'
$Marker = Join-Path $env:ProgramData 'WorkPulse\\Agent\\agent_identity.json'
$LogPath = 'C:\\Windows\\Temp\\WorkPulseInstall.log'

# Idempotente: se o equipamento ja tem identidade, nao reinstala
if (Test-Path $Marker) { exit 0 }

# Token usado pelo instalador publicado: ${tenantToken.startsWith('<') ? 'configure-o no .ps1 publicado' : 'definido no .ps1 publicado'}
& powershell.exe -NoProfile -ExecutionPolicy Bypass -File $InstallerPath *> $LogPath
exit $LASTEXITCODE`;

/**
 * Instalador Linux (systemd) e macOS (launchd). Executar como root.
 */
export const getUnixScript = (
  tenantToken = DEFAULT_TENANT_TOKEN,
  serverUrl = DEFAULT_SERVER_URL,
  department = 'TI / Infraestrutura',
  roomLocation = 'Sala de Operações / NOC'
) => `#!/usr/bin/env bash
# ==============================================================================
# WorkPulse RMM Agent - Linux (systemd) e macOS (launchd)
# Departamento: ${department || 'Geral'} | Local: ${roomLocation || 'Matriz'}
# Execute como root:  sudo bash instalar_workpulse.sh
# ==============================================================================
set -euo pipefail

ENROLLMENT_TOKEN=${shQuote(tenantToken)}
SERVER_URL=${shQuote(serverUrl)}
OS_NAME="$(uname -s)"
if [ "$OS_NAME" = "Darwin" ]; then INSTALL_DIR="/Library/Application Support/WorkPulse"; else INSTALL_DIR="/opt/workpulse/agent"; fi
IDENTITY_FILE="$INSTALL_DIR/agent_identity.json"
SERVICE_FILE="$INSTALL_DIR/agent_service.sh"

if [ "$(id -u)" -ne 0 ]; then echo "[ERRO] Execute como root (sudo)." >&2; exit 1; fi
case "$ENROLLMENT_TOKEN" in "<"*) echo "[ERRO] Enrollment token nao configurado. Gere um em CMDB > API de Agentes." >&2; exit 1;; esac
command -v curl >/dev/null || { echo "[ERRO] curl nao encontrado." >&2; exit 1; }

mkdir -p "$INSTALL_DIR"
chmod 700 "$INSTALL_DIR"

json_get() { sed -n "s/.*\\"$1\\"[[:space:]]*:[[:space:]]*\\"\\([^\\"]*\\)\\".*/\\1/p" | head -n 1; }

detect_mac() {
  local mac=""
  if command -v ip >/dev/null 2>&1; then mac="$(ip link show 2>/dev/null | awk '/link\\/ether/ {print $2; exit}')"; fi
  if [ -z "$mac" ] && command -v ifconfig >/dev/null 2>&1; then mac="$(ifconfig 2>/dev/null | awk '/ether/ {print $2; exit}')"; fi
  echo "\${mac:-00:00:00:00:00:00}"
}
detect_ip() {
  local ip=""
  if command -v hostname >/dev/null 2>&1; then ip="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"; fi
  if [ -z "$ip" ] && [ "$OS_NAME" = "Darwin" ]; then ip="$(ipconfig getifaddr en0 2>/dev/null || true)"; fi
  echo "\${ip:-}"
}

if [ ! -s "$IDENTITY_FILE" ]; then
  echo ">>> Enrollment em $SERVER_URL ..."
  PAYLOAD=$(printf '{"enrollmentToken":"%s","hostname":"%s","macAddress":"%s","ipAddress":"%s","operatingSystem":"%s","agentVersion":"${AGENT_VERSION}"}' \\
    "$ENROLLMENT_TOKEN" "$(hostname)" "$(detect_mac)" "$(detect_ip)" "$OS_NAME $(uname -r)")
  RESPONSE=$(curl -fsS -X POST "$SERVER_URL/api/v1/agent/enroll" -H "Content-Type: application/json" -d "$PAYLOAD")
  if [ -z "$(printf '%s' "$RESPONSE" | json_get deviceToken)" ]; then
    echo "[ERRO] O servidor nao retornou token de dispositivo: $RESPONSE" >&2
    exit 1
  fi
  printf '%s' "$RESPONSE" > "$IDENTITY_FILE"
  chmod 600 "$IDENTITY_FILE"
  echo ">>> Identidade registrada."
fi

cat > "$SERVICE_FILE" <<'AGENT_EOF'
#!/usr/bin/env bash
DIR="$(cd "$(dirname "$0")" && pwd)"
IDENTITY="$(cat "$DIR/agent_identity.json")"
get() { printf '%s' "$IDENTITY" | sed -n "s/.*\\"$1\\"[[:space:]]*:[[:space:]]*\\"\\([^\\"]*\\)\\".*/\\1/p" | head -n 1; }
AGENT_ID="$(get agentId)"; DEVICE_ID="$(get deviceId)"; TOKEN="$(get deviceToken)"
SERVER_URL="__SERVER_URL__"
while true; do
  BODY=$(printf '{"agentId":"%s","deviceId":"%s","hostname":"%s","agentVersion":"${AGENT_VERSION}","isOnline":true}' "$AGENT_ID" "$DEVICE_ID" "$(hostname)")
  curl -fsS -m 15 -X POST "$SERVER_URL/api/v1/agent/heartbeat" \\
    -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -H "x-agent-id: $AGENT_ID" -d "$BODY" >/dev/null 2>&1 || true
  sleep 30
done
AGENT_EOF
# Injeta a URL do servidor sem expandir o restante do script
sed -i.bak "s|__SERVER_URL__|$SERVER_URL|" "$SERVICE_FILE" && rm -f "$SERVICE_FILE.bak"
chmod 700 "$SERVICE_FILE"

if [ "$OS_NAME" = "Darwin" ]; then
  PLIST="/Library/LaunchDaemons/com.workpulse.agent.plist"
  cat > "$PLIST" <<PLIST_EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.workpulse.agent</string>
  <key>ProgramArguments</key><array><string>/bin/bash</string><string>$SERVICE_FILE</string></array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
</dict></plist>
PLIST_EOF
  launchctl unload "$PLIST" 2>/dev/null || true
  launchctl load -w "$PLIST"
  echo ">>> Daemon launchd 'com.workpulse.agent' ativo."
else
  cat > /etc/systemd/system/workpulse-agent.service <<UNIT_EOF
[Unit]
Description=WorkPulse RMM Agent
After=network-online.target
Wants=network-online.target

[Service]
ExecStart=/bin/bash $SERVICE_FILE
Restart=always
RestartSec=30

[Install]
WantedBy=multi-user.target
UNIT_EOF
  systemctl daemon-reload
  systemctl enable --now workpulse-agent.service
  echo ">>> Servico systemd 'workpulse-agent' ativo."
fi
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
