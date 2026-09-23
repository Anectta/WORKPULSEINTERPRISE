import {
  HardwareInventory,
  OperatingSystemInventory,
  InstalledSoftwareItem,
  NetworkInterfaceInventory,
  UserInventory,
  SecurityInventory,
  AgentPlatform
} from '../../types/cmdb';
import {
  IHardwareCollector,
  IOSCollector,
  ISoftwareCollector,
  INetworkCollector,
  IUserCollector,
  ISecurityCollector,
  IPlatformCollectorAdapter
} from './types';

export class WindowsHardwareCollector implements IHardwareCollector {
  collect(): HardwareInventory {
    return {
      manufacturer: "Dell Inc.",
      model: "Latitude 5540",
      serialNumber: "8XYZ992",
      serviceTag: "8XYZ992",
      systemUuid: "4c4c4544-0058-5910-805a-b2c04f393932",
      cpu: {
        name: "13th Gen Intel(R) Core(TM) i7-1365U",
        cores: 10,
        threads: 12,
        architecture: "x64",
        frequencyMhz: 1800
      },
      ram: {
        totalMb: 32768,
        freeMb: 14210,
        modules: [
          {
            slot: "DIMM A",
            capacityMb: 16384,
            type: "DDR5",
            speedMhz: 5200,
            partNumber: "M425R2GA3BB0-CQKOL",
            manufacturer: "Samsung"
          },
          {
            slot: "DIMM B",
            capacityMb: 16384,
            type: "DDR5",
            speedMhz: 5200,
            partNumber: "M425R2GA3BB0-CQKOL",
            manufacturer: "Samsung"
          }
        ]
      },
      disks: [
        {
          name: "\\\\.\\PHYSICALDRIVE0 (C:)",
          model: "KIOXIA KXG80ZNV1T02 NVMe 1024GB",
          type: "NVMe",
          capacityGb: 953.8,
          usedGb: 312.4,
          freeGb: 641.4,
          mountPoint: "C:",
          fileSystem: "NTFS",
          serialNumber: "23A4011B8XYZ"
        }
      ],
      gpu: [
        {
          name: "Intel(R) Iris(R) Xe Graphics",
          vramMb: 4096,
          driverVersion: "31.0.101.4575",
          manufacturer: "Intel Corporation"
        }
      ],
      motherboard: {
        manufacturer: "Dell Inc.",
        product: "0N3T84",
        serial: "/8XYZ992/CN1296338B0021/",
        version: "A01"
      },
      bios: {
        vendor: "Dell Inc.",
        version: "1.11.0",
        releaseDate: "2024-03-15"
      },
      tpm: {
        present: true,
        version: "2.0",
        status: "Pronto para uso (Especificação 2.0, Rev 1.59)"
      },
      monitors: [
        {
          model: "DELL U2723QE",
          manufacturer: "Dell",
          serial: "CN-0R9F2K-74261-35T-098L",
          resolution: "3840x2160",
          connectionType: "DisplayPort"
        },
        {
          model: "Internal Display",
          manufacturer: "Dell",
          serial: "SHP154D",
          resolution: "1920x1080",
          connectionType: "Embedded DisplayPort"
        }
      ],
      battery: {
        present: true,
        healthPct: 94,
        levelPct: 88,
        isCharging: true
      }
    };
  }
}

export class WindowsOSCollector implements IOSCollector {
  collect(): OperatingSystemInventory {
    return {
      osName: "Microsoft Windows 11 Pro",
      version: "23H2",
      build: "22631.3296",
      kernel: "10.0.22631",
      architecture: "x64",
      distribution: null,
      hostname: "DESKTOP-FIN-04",
      domain: "corp.workpulse.internal",
      workgroup: null,
      lastBootTime: new Date(Date.now() - 36 * 3600 * 1000).toISOString(),
      uptimeHours: 36,
      locale: "pt-BR"
    };
  }
}

export class WindowsSoftwareCollector implements ISoftwareCollector {
  collect(): InstalledSoftwareItem[] {
    return [
      {
        name: "WorkPulse RMM Agent",
        version: "3.2.0",
        publisher: "WorkPulse Systems Ltd.",
        installDate: "2026-01-10",
        architecture: "x64",
        installPath: "C:\\Program Files\\WorkPulse\\Agent",
        sizeMb: 42
      },
      {
        name: "Microsoft 365 Apps for Enterprise",
        version: "16.0.17328.20184",
        publisher: "Microsoft Corporation",
        installDate: "2025-11-20",
        architecture: "x64",
        installPath: "C:\\Program Files\\Microsoft Office",
        sizeMb: 3450
      },
      {
        name: "Google Chrome",
        version: "123.0.6312.86",
        publisher: "Google LLC",
        installDate: "2026-02-14",
        architecture: "x64",
        installPath: "C:\\Program Files\\Google\\Chrome\\Application",
        sizeMb: 580
      },
      {
        name: "FortiClient VPN",
        version: "7.2.4.0972",
        publisher: "Fortinet Technologies Inc.",
        installDate: "2025-10-05",
        architecture: "x64",
        installPath: "C:\\Program Files\\Fortinet\\FortiClient",
        sizeMb: 185
      },
      {
        name: "7-Zip 23.01",
        version: "23.01",
        publisher: "Igor Pavlov",
        installDate: "2025-09-12",
        architecture: "x64",
        installPath: "C:\\Program Files\\7-Zip",
        sizeMb: 5
      }
    ];
  }
}

export class WindowsNetworkCollector implements INetworkCollector {
  collect(): NetworkInterfaceInventory[] {
    return [
      {
        name: "Ethernet 1 (Intel Ethernet Connection I219-LM)",
        macAddress: "50:9A:4C:3B:11:02",
        ipAddresses: ["192.168.10.45"],
        ipv6Addresses: ["fe80::9c2b:4b7a:112:509a"],
        isPhysical: true,
        status: "up",
        speedMbps: 1000,
        gateway: "192.168.10.1",
        dnsServers: ["192.168.10.2", "1.1.1.1"],
        dhcpEnabled: true
      },
      {
        name: "Wi-Fi (Intel Wi-Fi 6E AX211)",
        macAddress: "50:9A:4C:3B:11:03",
        ipAddresses: [],
        isPhysical: true,
        status: "down",
        speedMbps: null,
        gateway: null,
        dnsServers: [],
        dhcpEnabled: true
      }
    ];
  }
}

export class WindowsUserCollector implements IUserCollector {
  collect(): UserInventory {
    return {
      currentUser: "CORP\\mariana.silva",
      loggedInUsers: ["CORP\\mariana.silva"],
      localUsersCount: 3,
      userDomain: "corp.workpulse.internal"
    };
  }
}

export class WindowsSecurityCollector implements ISecurityCollector {
  collect(): SecurityInventory {
    return {
      antivirusName: "Microsoft Defender Antivirus & EDR",
      antivirusStatus: "Ativo e Atualizado (Assinatura 1.407.291.0)",
      firewallEnabled: true,
      bitlockerOrEncryption: "Ativo (XTS-AES 256 bits no volume C:)",
      uacOrSelinuxStatus: "Habilitado (Nível Recomendado)",
      secureBootEnabled: true
    };
  }
}

export class WindowsCollectorAdapter implements IPlatformCollectorAdapter {
  platform: AgentPlatform = 'windows';
  hardware = new WindowsHardwareCollector();
  os = new WindowsOSCollector();
  software = new WindowsSoftwareCollector();
  network = new WindowsNetworkCollector();
  user = new WindowsUserCollector();
  security = new WindowsSecurityCollector();

  async collectAll() {
    return {
      platform: this.platform,
      origin: 'AGENT' as const,
      inventoryType: 'full' as const,
      collectedAt: new Date().toISOString(),
      hardware: this.hardware.collect(),
      os: this.os.collect(),
      software: this.software.collect(),
      network: this.network.collect(),
      user: this.user.collect(),
      security: this.security.collect()
    };
  }

  getNativeCollectorScript(serverUrl: string, token: string): string {
    return `# ==============================================================================
# WorkPulse RMM - Windows Automated Modular Collector (PowerShell 5.1 / 7+)
# ==============================================================================
$ServerUrl = "${serverUrl}"
$Token = "${token}"
$Headers = @{
    "Content-Type"  = "application/json"
    "Authorization" = "Bearer $Token"
    "x-agent-id"    = $env:COMPUTERNAME
}

# 1. Hardware Collector (CIM / WMI)
$cs = Get-CimInstance Win32_ComputerSystem
$bb = Get-CimInstance Win32_BaseBoard
$bios = Get-CimInstance Win32_BIOS
$proc = Get-CimInstance Win32_Processor | Select-Object -First 1
$ramModules = Get-CimInstance Win32_PhysicalMemory | ForEach-Object {
    @{
        slot         = $_.DeviceLocator
        capacityMb   = [math]::Round($_.Capacity / 1MB)
        type         = "DDR5"
        speedMhz     = $_.Speed
        partNumber   = $_.PartNumber.Trim()
        manufacturer = $_.Manufacturer
    }
}
$disks = Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" | ForEach-Object {
    @{
        name       = $_.DeviceID
        mountPoint = $_.DeviceID
        capacityGb = [math]::Round($_.Size / 1GB, 1)
        freeGb     = [math]::Round($_.FreeSpace / 1GB, 1)
        usedGb     = [math]::Round(($_.Size - $_.FreeSpace) / 1GB, 1)
        fileSystem = $_.FileSystem
        type       = "SSD"
    }
}
$tpmInstance = Get-CimInstance -Namespace root\\CIMV2\\Security\\MicrosoftTpm -ClassName Win32_Tpm -ErrorAction SilentlyContinue

$Hardware = @{
    manufacturer = $cs.Manufacturer
    model        = $cs.Model
    serialNumber = $bios.SerialNumber
    serviceTag   = $bios.SerialNumber
    systemUuid   = (Get-CimInstance Win32_ComputerSystemProduct).UUID
    cpu = @{
        name         = $proc.Name
        cores        = $proc.NumberOfCores
        threads      = $proc.NumberOfLogicalProcessors
        architecture = "x64"
        frequencyMhz = $proc.MaxClockSpeed
    }
    ram = @{
        totalMb = [math]::Round($cs.TotalPhysicalMemory / 1MB)
        modules = $ramModules
    }
    disks = $disks
    motherboard = @{
        manufacturer = $bb.Manufacturer
        product      = $bb.Product
        serial       = $bb.SerialNumber
    }
    bios = @{
        vendor      = $bios.Manufacturer
        version     = $bios.SMBIOSBIOSVersion
        releaseDate = $bios.ReleaseDate.ToString("yyyy-MM-dd")
    }
    tpm = @{
        present = ($null -ne $tpmInstance)
        version = if ($tpmInstance) { $tpmInstance.SpecVersion } else { "Não disponível" }
    }
}

# 2. OS Collector
$osInfo = Get-CimInstance Win32_OperatingSystem
$OS = @{
    osName       = $osInfo.Caption
    version      = $osInfo.Version
    build        = $osInfo.BuildNumber
    architecture = $osInfo.OSArchitecture
    hostname     = $env:COMPUTERNAME
    domain       = $cs.Domain
    lastBootTime = $osInfo.LastBootUpTime.ToString("o")
    uptimeHours  = [math]::Round(((Get-Date) - $osInfo.LastBootUpTime).TotalHours, 1)
}

# 3. Software Collector (Uninstall Registry Keys)
$regPaths = @(
    "HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*",
    "HKLM:\\Software\\Wow6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*"
)
$Software = Get-ItemProperty $regPaths -ErrorAction SilentlyContinue | 
    Where-Object { $_.DisplayName -and $_.SystemComponent -ne 1 } | 
    Select-Object -First 200 | ForEach-Object {
        @{
            name        = $_.DisplayName
            version     = $_.DisplayVersion
            publisher   = $_.Publisher
            installDate = $_.InstallDate
        }
    }

# 4. Network Collector
$Network = Get-CimInstance Win32_NetworkAdapterConfiguration -Filter "IPEnabled=True" | ForEach-Object {
    @{
        name        = $_.Description
        macAddress  = $_.MACAddress
        ipAddresses = @($_.IPAddress)
        gateway     = $_.DefaultIPGateway[0]
        dnsServers  = @($_.DNSServerSearchOrder)
        dhcpEnabled = $_.DHCPEnabled
    }
}

# 5. User Collector
$User = @{
    currentUser   = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
    loggedInUsers = @((quser 2>$null | Select-Object -Skip 1) -replace '^\\s+([^\\s]+).*', '$1')
}

# 6. Security Collector
$bitlocker = Get-BitLockerVolume -MountPoint "C:" -ErrorAction SilentlyContinue
$Security = @{
    antivirusName         = "Microsoft Defender"
    firewallEnabled       = (Get-NetFirewallProfile -Profile Domain,Public,Private | Where-Object Enabled).Count -gt 0
    bitlockerOrEncryption = if ($bitlocker) { $bitlocker.ProtectionStatus } else { "Não disponível" }
}

# Full Snapshot Assembly
$Snapshot = @{
    origin       = "AGENT"
    platform     = "windows"
    collectedAt  = (Get-Date).ToString("o")
    hardware     = $Hardware
    os           = $OS
    software     = $Software
    network      = $Network
    user         = $User
    security     = $Security
}

# Incremental Engine Check
$CacheFile = "$env:ProgramData\\WorkPulse\\inventory_cache.json"
$CurrentJson = $Snapshot | ConvertTo-Json -Depth 6
$CurrentHash = (Get-FileHash -InputStream ([IO.MemoryStream]::new([Text.Encoding]::UTF8.GetBytes($CurrentJson))) -Algorithm SHA256).Hash

if (Test-Path $CacheFile) {
    $PreviousHash = Get-Content $CacheFile -Raw -ErrorAction SilentlyContinue
    if ($PreviousHash -eq $CurrentHash) {
        Write-Host "[WorkPulse RMM] Nenhuma alteração detectada. Sincronização incremental ignorada."
        return
    }
}

# Dispatch to RMM Server
$Response = Invoke-RestMethod -Uri "$ServerUrl/api/v1/agent/inventory" -Method Post -Headers $Headers -Body $CurrentJson
Set-Content -Path $CacheFile -Value $CurrentHash
Write-Host "[WorkPulse RMM] Inventário sincronizado com sucesso: Versão $($Response.inventoryVersion)"
`;
  }
}
