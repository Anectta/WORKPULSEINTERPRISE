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

export class LinuxHardwareCollector implements IHardwareCollector {
  collect(): HardwareInventory {
    return {
      manufacturer: "Lenovo",
      model: "ThinkSystem SR650 V2",
      serialNumber: "J309L99X",
      serviceTag: "J309L99X",
      systemUuid: "7b0938b8-47e1-4c12-9c3f-42a1928372bf",
      cpu: {
        name: "Intel(R) Xeon(R) Silver 4314 CPU @ 2.40GHz",
        cores: 16,
        threads: 32,
        architecture: "x86_64",
        frequencyMhz: 2400
      },
      ram: {
        totalMb: 65536,
        freeMb: 38240,
        modules: [
          {
            slot: "DIMM_1",
            capacityMb: 32768,
            type: "DDR4 ECC Reg",
            speedMhz: 3200,
            partNumber: "M393A4K40EB3-CWE",
            manufacturer: "Samsung"
          },
          {
            slot: "DIMM_2",
            capacityMb: 32768,
            type: "DDR4 ECC Reg",
            speedMhz: 3200,
            partNumber: "M393A4K40EB3-CWE",
            manufacturer: "Samsung"
          }
        ]
      },
      disks: [
        {
          name: "/dev/nvme0n1p2",
          model: "SAMSUNG MZQL2960HCJR-00A07",
          type: "NVMe",
          capacityGb: 894.2,
          usedGb: 148.5,
          freeGb: 745.7,
          mountPoint: "/",
          fileSystem: "ext4",
          serialNumber: "S64RNE0T129031"
        },
        {
          name: "/dev/sdb1",
          model: "SEAGATE ST2000NM0001",
          type: "HDD",
          capacityGb: 1863.0,
          usedGb: 520.1,
          freeGb: 1342.9,
          mountPoint: "/data",
          fileSystem: "xfs",
          serialNumber: "W4609LX2"
        }
      ],
      gpu: [
        {
          name: "ASPEED Graphics Family (AST2500)",
          vramMb: 64,
          driverVersion: "ast",
          manufacturer: "ASPEED Technology, Inc."
        }
      ],
      motherboard: {
        manufacturer: "Lenovo",
        product: "ThinkSystem SR650 V2 Motherboard",
        serial: "01PG281982",
        version: "V02"
      },
      bios: {
        vendor: "Lenovo",
        version: "U8E124G-2.10",
        releaseDate: "2024-01-18"
      },
      tpm: {
        present: true,
        version: "2.0",
        status: "Ativo (/dev/tpmrm0 registrado)"
      },
      monitors: [],
      battery: null // Servidor rack: sem bateria de laptop
    };
  }
}

export class LinuxOSCollector implements IOSCollector {
  collect(): OperatingSystemInventory {
    return {
      osName: "Ubuntu Linux",
      version: "24.04 LTS (Noble Numbat)",
      build: null,
      kernel: "6.8.0-31-generic",
      architecture: "x86_64",
      distribution: "Ubuntu",
      hostname: "srv-app-prod-01",
      domain: "workpulse.internal",
      workgroup: null,
      lastBootTime: new Date(Date.now() - 148 * 3600 * 1000).toISOString(),
      uptimeHours: 148,
      locale: "en_US.UTF-8"
    };
  }
}

export class LinuxSoftwareCollector implements ISoftwareCollector {
  collect(): InstalledSoftwareItem[] {
    return [
      {
        name: "workpulse-agent",
        version: "3.2.0-linux",
        publisher: "WorkPulse Systems",
        installDate: "2026-02-01",
        architecture: "amd64",
        installPath: "/opt/workpulse/agent",
        sizeMb: 28
      },
      {
        name: "nginx",
        version: "1.24.0-2ubuntu7",
        publisher: "Ubuntu Developers",
        installDate: "2026-01-15",
        architecture: "amd64",
        installPath: "/usr/sbin/nginx",
        sizeMb: 14
      },
      {
        name: "docker-ce",
        version: "26.0.0-1~ubuntu.24.04~noble",
        publisher: "Docker Inc.",
        installDate: "2026-01-18",
        architecture: "amd64",
        installPath: "/usr/bin/dockerd",
        sizeMb: 220
      },
      {
        name: "openssh-server",
        version: "1:9.6p1-3ubuntu13",
        publisher: "Ubuntu Developers",
        installDate: "2026-01-10",
        architecture: "amd64",
        installPath: "/usr/sbin/sshd",
        sizeMb: 4
      },
      {
        name: "postgresql-16",
        version: "16.2-1.pgdg24.04+1",
        publisher: "PostgreSQL Global Development Group",
        installDate: "2026-02-10",
        architecture: "amd64",
        installPath: "/usr/lib/postgresql/16",
        sizeMb: 180
      }
    ];
  }
}

export class LinuxNetworkCollector implements INetworkCollector {
  collect(): NetworkInterfaceInventory[] {
    return [
      {
        name: "eno1",
        macAddress: "b4:96:91:8a:22:90",
        ipAddresses: ["10.0.1.50"],
        ipv6Addresses: ["fe80::b696:91ff:fe8a:2290"],
        isPhysical: true,
        status: "up",
        speedMbps: 10000,
        gateway: "10.0.1.1",
        dnsServers: ["10.0.1.2", "1.1.1.1"],
        dhcpEnabled: false
      },
      {
        name: "docker0",
        macAddress: "02:42:e2:21:49:10",
        ipAddresses: ["172.17.0.1"],
        isPhysical: false,
        status: "up",
        speedMbps: null,
        gateway: null,
        dnsServers: [],
        dhcpEnabled: false
      }
    ];
  }
}

export class LinuxUserCollector implements IUserCollector {
  collect(): UserInventory {
    return {
      currentUser: "workpulse-svc",
      loggedInUsers: ["admin-carlos", "workpulse-svc"],
      localUsersCount: 18,
      userDomain: null
    };
  }
}

export class LinuxSecurityCollector implements ISecurityCollector {
  collect(): SecurityInventory {
    return {
      antivirusName: "ClamAV & CrowdStrike Falcon Sensor",
      antivirusStatus: "Ativo (Daemon em execução)",
      firewallEnabled: true, // ufw / iptables
      bitlockerOrEncryption: "LUKS dm-crypt (/dev/nvme0n1p2 criptografado)",
      uacOrSelinuxStatus: "AppArmor: Enforce mode",
      secureBootEnabled: true
    };
  }
}

export class LinuxCollectorAdapter implements IPlatformCollectorAdapter {
  platform: AgentPlatform = 'linux';
  hardware = new LinuxHardwareCollector();
  os = new LinuxOSCollector();
  software = new LinuxSoftwareCollector();
  network = new LinuxNetworkCollector();
  user = new LinuxUserCollector();
  security = new LinuxSecurityCollector();

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
    return `#!/usr/bin/env bash
# ==============================================================================
# WorkPulse RMM - Linux Automated Modular Collector
# Suporta: Debian, Ubuntu, RHEL, CentOS, Rocky, Fedora, Arch, SLES
# ==============================================================================
set -euo pipefail

SERVER_URL="${serverUrl}"
TOKEN="${token}"
AGENT_ID="$(hostname)"

# 1. Hardware Collector
MANUFACTURER="$(cat /sys/class/dmi/id/sys_vendor 2>/dev/null || echo 'Não disponível')"
MODEL="$(cat /sys/class/dmi/id/product_name 2>/dev/null || echo 'Não disponível')"
SERIAL="$(cat /sys/class/dmi/id/product_serial 2>/dev/null || echo 'Não disponível')"
UUID="$(cat /sys/class/dmi/id/product_uuid 2>/dev/null || echo 'Não disponível')"
CPU_NAME="$(grep -m1 'model name' /proc/cpuinfo | cut -d: -f2 | sed 's/^[ \\t]*//' || echo 'Não disponível')"
CORES="$(grep -c ^processor /proc/cpuinfo || echo 1)"
RAM_TOTAL_MB="$(free -m | awk '/^Mem:/{print $2}')"
RAM_FREE_MB="$(free -m | awk '/^Mem:/{print $4}')"

# 2. OS Collector
OS_DISTRO="$(grep -E '^ID=' /etc/os-release | cut -d= -f2 | tr -d '"' || echo 'linux')"
OS_VERSION="$(grep -E '^VERSION_ID=' /etc/os-release | cut -d= -f2 | tr -d '"' || echo 'unknown')"
KERNEL="$(uname -r)"
ARCH="$(uname -m)"
UPTIME_HOURS="$(awk '{printf "%.1f", $1/3600}' /proc/uptime)"

# 3. Disks & Filesystem
DISKS_JSON="[]"
if command -v lsblk >/dev/null 2>&1; then
    DISKS_JSON="$(lsblk -b -J -o NAME,SIZE,FSTYPE,MOUNTPOINT,TYPE,MODEL 2>/dev/null || echo '[]')"
fi

# 4. Network Collector
NETWORKS_JSON="$(ip -j addr 2>/dev/null || echo '[]')"

# 5. Security (AppArmor / SELinux / Firewall)
SELINUX_STATUS="Não disponível"
if command -v getenforce >/dev/null 2>&1; then
    SELINUX_STATUS="SELinux: $(getenforce)"
elif command -v aa-status >/dev/null 2>&1; then
    SELINUX_STATUS="AppArmor: Active"
fi

CACHE_FILE="/opt/workpulse/agent/inventory_cache.hash"
mkdir -p /opt/workpulse/agent

PAYLOAD=$(cat <<EOF
{
  "origin": "AGENT",
  "platform": "linux",
  "collectedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "hardware": {
    "manufacturer": "$MANUFACTURER",
    "model": "$MODEL",
    "serialNumber": "$SERIAL",
    "systemUuid": "$UUID",
    "cpu": { "name": "$CPU_NAME", "cores": $CORES, "architecture": "$ARCH" },
    "ram": { "totalMb": $RAM_TOTAL_MB, "freeMb": $RAM_FREE_MB }
  },
  "os": {
    "osName": "Linux ($OS_DISTRO)",
    "version": "$OS_VERSION",
    "kernel": "$KERNEL",
    "architecture": "$ARCH",
    "hostname": "$AGENT_ID",
    "uptimeHours": $UPTIME_HOURS
  },
  "security": {
    "uacOrSelinuxStatus": "$SELINUX_STATUS"
  }
}
EOF
)

# Incremental verification
CURRENT_HASH=$(echo "$PAYLOAD" | sha256sum | awk '{print $1}')
if [ -f "$CACHE_FILE" ]; then
    PREV_HASH=$(cat "$CACHE_FILE")
    if [ "$PREV_HASH" = "$CURRENT_HASH" ]; then
        echo "[WorkPulse RMM] Nenhuma alteração detectada. Inventário já sincronizado."
        exit 0
    fi
fi

# POST inventory to server
curl -s -X POST "$SERVER_URL/api/v1/agent/inventory" \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "x-agent-id: $AGENT_ID" \\
  -d "$PAYLOAD"

echo "$CURRENT_HASH" > "$CACHE_FILE"
echo "[WorkPulse RMM] Inventário Linux sincronizado com sucesso."
`;
  }
}
