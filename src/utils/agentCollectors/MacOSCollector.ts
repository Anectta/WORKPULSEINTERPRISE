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

export class MacOSHardwareCollector implements IHardwareCollector {
  collect(): HardwareInventory {
    return {
      manufacturer: "Apple Inc.",
      model: "MacBook Pro (16-inch, Nov 2023)",
      serialNumber: "C02G89A2MD6R",
      serviceTag: "C02G89A2MD6R",
      systemUuid: "1F4A8C90-884A-5B5E-BAE0-C3139385B24E",
      cpu: {
        name: "Apple M3 Max (16 cores: 12 performance and 4 efficiency)",
        cores: 16,
        threads: 16,
        architecture: "arm64",
        frequencyMhz: 4050
      },
      ram: {
        totalMb: 36864, // 36 GB Unified Memory
        freeMb: 12450,
        modules: [
          {
            slot: "Internal LPDDR5",
            capacityMb: 36864,
            type: "Unified Memory (LPDDR5-6400)",
            speedMhz: 6400,
            partNumber: "Apple Silicon SoC",
            manufacturer: "Apple Inc."
          }
        ]
      },
      disks: [
        {
          name: "/dev/disk3s1s1 (Macintosh HD)",
          model: "Apple SSD APFS 1TB",
          type: "NVMe",
          capacityGb: 994.7,
          usedGb: 284.1,
          freeGb: 710.6,
          mountPoint: "/",
          fileSystem: "APFS (Encrypted)",
          serialNumber: "APPLE-SSD-AP01024Z"
        }
      ],
      gpu: [
        {
          name: "Apple M3 Max (40-core GPU)",
          vramMb: 36864,
          driverVersion: "Metal 3",
          manufacturer: "Apple Inc."
        }
      ],
      motherboard: {
        manufacturer: "Apple Inc.",
        product: "Mac-A61BDE1474B28375",
        serial: "C02340120194L",
        version: "1.0"
      },
      bios: {
        vendor: "Apple Inc.",
        version: "iBoot-10151.101.3",
        releaseDate: "2024-02-01"
      },
      tpm: {
        present: true,
        version: "Apple T2 / Secure Enclave",
        status: "Apple Silicon Hardware Secure Enclave Ativo"
      },
      monitors: [
        {
          model: "Liquid Retina XDR Display",
          manufacturer: "Apple",
          serial: "Color LCD Built-in",
          resolution: "3456x2234 ProMotion 120Hz",
          connectionType: "Internal Display"
        },
        {
          model: "Apple Studio Display",
          manufacturer: "Apple",
          serial: "F6XG1029MD6R",
          resolution: "5120x2880 (5K Retina)",
          connectionType: "Thunderbolt 4"
        }
      ],
      battery: {
        present: true,
        healthPct: 98,
        levelPct: 91,
        isCharging: true
      }
    };
  }
}

export class MacOSOSCollector implements IOSCollector {
  collect(): OperatingSystemInventory {
    return {
      osName: "macOS Sonoma",
      version: "14.4.1",
      build: "23E224",
      kernel: "Darwin Kernel Version 23.4.0",
      architecture: "arm64",
      distribution: null,
      hostname: "MBP-DESIGN-02.local",
      domain: null,
      workgroup: null,
      lastBootTime: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
      uptimeHours: 72,
      locale: "pt_BR.UTF-8"
    };
  }
}

export class MacOSSoftwareCollector implements ISoftwareCollector {
  collect(): InstalledSoftwareItem[] {
    return [
      {
        name: "WorkPulse RMM Agent for Mac",
        version: "3.2.0-mac",
        publisher: "WorkPulse Systems Ltd.",
        installDate: "2026-01-05",
        architecture: "Universal 2 (arm64/x86_64)",
        installPath: "/Library/Application Support/WorkPulse/Agent",
        sizeMb: 35
      },
      {
        name: "Visual Studio Code",
        version: "1.87.2",
        publisher: "Microsoft Corporation",
        installDate: "2026-02-12",
        architecture: "arm64",
        installPath: "/Applications/Visual Studio Code.app",
        sizeMb: 420
      },
      {
        name: "Docker Desktop",
        version: "4.28.0",
        publisher: "Docker Inc.",
        installDate: "2026-02-10",
        architecture: "arm64",
        installPath: "/Applications/Docker.app",
        sizeMb: 1200
      },
      {
        name: "Slack",
        version: "4.37.101",
        publisher: "Slack Technologies LLC",
        installDate: "2026-01-20",
        architecture: "arm64",
        installPath: "/Applications/Slack.app",
        sizeMb: 280
      },
      {
        name: "Figma",
        version: "116.15.4",
        publisher: "Figma, Inc.",
        installDate: "2026-01-18",
        architecture: "arm64",
        installPath: "/Applications/Figma.app",
        sizeMb: 210
      }
    ];
  }
}

export class MacOSNetworkCollector implements INetworkCollector {
  collect(): NetworkInterfaceInventory[] {
    return [
      {
        name: "en0 (Wi-Fi 6E)",
        macAddress: "f4:d4:88:51:9a:0c",
        ipAddresses: ["192.168.10.115"],
        ipv6Addresses: ["fe80::1092:38bb:fe51:9a0c"],
        isPhysical: true,
        status: "up",
        speedMbps: 1200,
        gateway: "192.168.10.1",
        dnsServers: ["192.168.10.2", "1.1.1.1"],
        dhcpEnabled: true
      },
      {
        name: "en1 (Thunderbolt Ethernet)",
        macAddress: "f4:d4:88:51:9a:0d",
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

export class MacOSUserCollector implements IUserCollector {
  collect(): UserInventory {
    return {
      currentUser: "lucas.dev",
      loggedInUsers: ["lucas.dev"],
      localUsersCount: 2,
      userDomain: null
    };
  }
}

export class MacOSSecurityCollector implements ISecurityCollector {
  collect(): SecurityInventory {
    return {
      antivirusName: "Apple XProtect & CrowdStrike Falcon",
      antivirusStatus: "Ativo (XProtect Payload 2191)",
      firewallEnabled: true, // macOS Application Firewall
      bitlockerOrEncryption: "FileVault Ativo (Criptografia APFS XTS-AES-128)",
      uacOrSelinuxStatus: "SIP (System Integrity Protection): Enabled",
      secureBootEnabled: true // Apple Full Security Mode
    };
  }
}

export class MacOSCollectorAdapter implements IPlatformCollectorAdapter {
  platform: AgentPlatform = 'macos';
  hardware = new MacOSHardwareCollector();
  os = new MacOSOSCollector();
  software = new MacOSSoftwareCollector();
  network = new MacOSNetworkCollector();
  user = new MacOSUserCollector();
  security = new MacOSSecurityCollector();

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
    return `#!/usr/bin/env zsh
# ==============================================================================
# WorkPulse RMM - macOS Automated Modular Collector (Apple Silicon & Intel)
# ==============================================================================
set -euo pipefail

SERVER_URL="${serverUrl}"
TOKEN="${token}"
AGENT_ID="$(scutil --get ComputerName 2>/dev/null || hostname)"

# 1. Hardware & Model via system_profiler
SP_HARDWARE="$(system_profiler SPHardwareDataType -json 2>/dev/null)"
MODEL="$(echo "$SP_HARDWARE" | awk -F'"machine_model" : "' '{print $2}' | cut -d'"' -f1)"
SERIAL="$(echo "$SP_HARDWARE" | awk -F'"serial_number" : "' '{print $2}' | cut -d'"' -f1)"
CHIP_NAME="$(sysctl -n machdep.cpu.brand_string 2>/dev/null || echo 'Apple Silicon')"
CORES="$(sysctl -n hw.ncpu 2>/dev/null || echo 8)"
MEM_BYTES="$(sysctl -n hw.memsize 2>/dev/null || echo 17179869184)"
RAM_MB=$(( MEM_BYTES / 1024 / 1024 ))

# 2. OS via sw_vers
OS_NAME="$(sw_vers -productName)"
OS_VERSION="$(sw_vers -productVersion)"
OS_BUILD="$(sw_vers -buildVersion)"
ARCH="$(uname -m)"

# 3. Security (SIP & FileVault)
SIP_STATUS="$(csrutil status 2>/dev/null | cut -d: -f2 | xargs || echo 'Unknown')"
FV_STATUS="$(fdesetup status 2>/dev/null || echo 'Não disponível')"

# 4. Battery (pmset)
BATT_PCT="$(pmset -g batt 2>/dev/null | grep -Eo '[0-9]+%' | tr -d '%' || echo 'null')"

PAYLOAD=$(cat <<EOF
{
  "origin": "AGENT",
  "platform": "macos",
  "collectedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "hardware": {
    "manufacturer": "Apple Inc.",
    "model": "$MODEL",
    "serialNumber": "$SERIAL",
    "cpu": { "name": "$CHIP_NAME", "cores": $CORES, "architecture": "$ARCH" },
    "ram": { "totalMb": $RAM_MB },
    "battery": { "levelPct": $BATT_PCT }
  },
  "os": {
    "osName": "$OS_NAME",
    "version": "$OS_VERSION",
    "build": "$OS_BUILD",
    "architecture": "$ARCH",
    "hostname": "$AGENT_ID"
  },
  "security": {
    "bitlockerOrEncryption": "$FV_STATUS",
    "uacOrSelinuxStatus": "SIP: $SIP_STATUS"
  }
}
EOF
)

curl -s -X POST "$SERVER_URL/api/v1/agent/inventory" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "x-agent-id: $AGENT_ID" \\
  -d "$PAYLOAD"
`;
  }
}
