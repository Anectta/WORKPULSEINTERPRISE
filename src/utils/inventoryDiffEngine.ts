import { 
  DeviceInventorySnapshot, 
  InventoryChangeRecord, 
  InventoryChangeEventType, 
  InventoryChangeCategory 
} from '../types/cmdb';

export interface DiffContext {
  tenantId: string;
  assetId: string;
  agentId: string;
  ciCode: string;
  ciName: string;
  source?: 'AGENT' | 'Agente RMM' | 'Sistema';
  detectedAt?: string;
}

/**
 * Format RAM bytes/megabytes into human-readable string
 * e.g. 8192 -> "8 GB", 16384 -> "16 GB"
 */
export function formatRamCapacity(mb: number | null | undefined): string {
  if (!mb || mb <= 0) return '0 GB';
  if (mb >= 1024) {
    const gb = Math.round(mb / 1024);
    return `${gb} GB`;
  }
  return `${mb} MB`;
}

/**
 * Normalizes software name for loose matching
 */
export function normalizeSoftwareName(name: string): string {
  return (name || '')
    .toLowerCase()
    .replace(/[^\w\d]/g, '')
    .trim();
}

/**
 * Core Inventory Comparison Engine (PROMPT 4)
 * Compares a newly collected inventory snapshot against the previous snapshot
 * and emits structured, immutable change records.
 */
export class InventoryDiffEngine {

  public static compareSnapshots(
    previous: DeviceInventorySnapshot | null | undefined,
    current: DeviceInventorySnapshot,
    context: DiffContext
  ): InventoryChangeRecord[] {
    const changes: InventoryChangeRecord[] = [];
    const timestamp = context.detectedAt || current.collectedAt || new Date().toISOString();
    const source = context.source || 'AGENT';

    if (!previous) {
      // First inventory ever collected for this device.
      // We don't generate diffs, or we can mark initial detection.
      return changes;
    }

    const createRecord = (
      eventType: InventoryChangeEventType,
      category: InventoryChangeCategory,
      field: string,
      oldValue: string,
      newValue: string,
      metadata?: Record<string, any>
    ): InventoryChangeRecord => {
      const id = `chg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      return {
        id,
        tenantId: context.tenantId,
        tenant_id: context.tenantId,
        assetId: context.assetId,
        asset_id: context.assetId,
        agentId: context.agentId,
        agent_id: context.agentId,
        ciCode: context.ciCode,
        ciName: context.ciName,
        eventType,
        event_type: eventType,
        category,
        field,
        oldValue,
        old_value: oldValue,
        newValue,
        new_value: newValue,
        detectedAt: timestamp,
        detected_at: timestamp,
        source,
        metadata
      };
    };

    // ==========================================
    // 1. HARDWARE COMPARISONS (HARDWARE_CHANGED)
    // ==========================================
    const prevHw = previous.hardware || ({} as any);
    const currHw = current.hardware || ({} as any);

    // 1.1. RAM Total
    const prevRamMb = prevHw.ram?.totalMb;
    const currRamMb = currHw.ram?.totalMb;
    if (prevRamMb && currRamMb && prevRamMb !== currRamMb) {
      changes.push(
        createRecord(
          'HARDWARE_CHANGED',
          'hardware',
          'ram',
          formatRamCapacity(prevRamMb),
          formatRamCapacity(currRamMb),
          { prevMb: prevRamMb, newMb: currRamMb }
        )
      );
    }

    // 1.2. CPU
    const prevCpu = prevHw.cpu?.name?.trim();
    const currCpu = currHw.cpu?.name?.trim();
    if (prevCpu && currCpu && prevCpu !== currCpu) {
      changes.push(
        createRecord(
          'HARDWARE_CHANGED',
          'hardware',
          'cpu',
          prevCpu,
          currCpu
        )
      );
    } else if (prevHw.cpu?.cores && currHw.cpu?.cores && prevHw.cpu.cores !== currHw.cpu.cores) {
      changes.push(
        createRecord(
          'HARDWARE_CHANGED',
          'hardware',
          'cpu_cores',
          `${prevHw.cpu.cores} Núcleos`,
          `${currHw.cpu.cores} Núcleos`
        )
      );
    }

    // 1.3. Disks Capacity & Storage
    const prevDisks = Array.isArray(prevHw.disks) ? prevHw.disks : [];
    const currDisks = Array.isArray(currHw.disks) ? currHw.disks : [];
    const prevDiskTotal = prevDisks.reduce((acc: number, d: any) => acc + (d.capacityGb || 0), 0);
    const currDiskTotal = currDisks.reduce((acc: number, d: any) => acc + (d.capacityGb || 0), 0);

    if (prevDiskTotal > 0 && currDiskTotal > 0 && prevDiskTotal !== currDiskTotal) {
      changes.push(
        createRecord(
          'HARDWARE_CHANGED',
          'hardware',
          'disks',
          `${prevDiskTotal} GB (${prevDisks.length} un.)`,
          `${currDiskTotal} GB (${currDisks.length} un.)`
        )
      );
    }

    // 1.4. GPU
    const prevGpu = Array.isArray(prevHw.gpu) && prevHw.gpu[0]?.name ? prevHw.gpu[0].name.trim() : null;
    const currGpu = Array.isArray(currHw.gpu) && currHw.gpu[0]?.name ? currHw.gpu[0].name.trim() : null;
    if (prevGpu && currGpu && prevGpu !== currGpu) {
      changes.push(
        createRecord(
          'HARDWARE_CHANGED',
          'hardware',
          'gpu',
          prevGpu,
          currGpu
        )
      );
    }

    // 1.5. BIOS / Motherboard / TPM
    if (prevHw.bios?.version && currHw.bios?.version && prevHw.bios.version !== currHw.bios.version) {
      changes.push(
        createRecord(
          'HARDWARE_CHANGED',
          'hardware',
          'bios',
          `v${prevHw.bios.version}`,
          `v${currHw.bios.version}`
        )
      );
    }

    if (prevHw.tpm?.present !== undefined && currHw.tpm?.present !== undefined && prevHw.tpm.present !== currHw.tpm.present) {
      changes.push(
        createRecord(
          'HARDWARE_CHANGED',
          'hardware',
          'tpm',
          prevHw.tpm.present ? 'Presente (Ativo)' : 'Não Detectado',
          currHw.tpm.present ? 'Presente (Ativo)' : 'Não Detectado'
        )
      );
    }

    // ==========================================
    // 2. SOFTWARE COMPARISONS (INSTALLED / UPDATED / REMOVED)
    // ==========================================
    const prevSoftware = Array.isArray(previous.software) ? previous.software : [];
    const currSoftware = Array.isArray(current.software) ? current.software : [];

    const prevMap = new Map<string, any>();
    prevSoftware.forEach(s => {
      if (s?.name) {
        prevMap.set(normalizeSoftwareName(s.name), s);
      }
    });

    const currMap = new Map<string, any>();
    currSoftware.forEach(s => {
      if (s?.name) {
        currMap.set(normalizeSoftwareName(s.name), s);
      }
    });

    // Check updates and installations
    currMap.forEach((currItem, normKey) => {
      const prevItem = prevMap.get(normKey);
      if (!prevItem) {
        // Newly installed software
        changes.push(
          createRecord(
            'SOFTWARE_INSTALLED',
            'software',
            currItem.name,
            'Não instalado',
            currItem.version || 'Instalado'
          )
        );
      } else {
        // Exists in both: check if version was updated
        const prevVer = (prevItem.version || '').trim();
        const currVer = (currItem.version || '').trim();
        if (prevVer && currVer && prevVer !== currVer) {
          changes.push(
            createRecord(
              'SOFTWARE_UPDATED',
              'software',
              currItem.name,
              prevVer,
              currVer
            )
          );
        }
      }
    });

    // If full inventory, check removals
    if (current.inventoryType === 'full' && prevSoftware.length > 0) {
      prevMap.forEach((prevItem, normKey) => {
        if (!currMap.has(normKey)) {
          changes.push(
            createRecord(
              'SOFTWARE_REMOVED',
              'software',
              prevItem.name,
              prevItem.version || 'Instalado',
              'Desinstalado / Removido'
            )
          );
        }
      });
    }

    // ==========================================
    // 3. OPERATING SYSTEM COMPARISONS (OS_CHANGED)
    // ==========================================
    const prevOs = previous.os || ({} as any);
    const currOs = current.os || ({} as any);

    const prevOsName = (prevOs.osName || prevOs.name || '').trim();
    const currOsName = (currOs.osName || currOs.name || '').trim();

    // Simplify name for clean comparisons (e.g. "Windows 10" -> "Windows 11")
    if (prevOsName && currOsName && prevOsName !== currOsName) {
      changes.push(
        createRecord(
          'OS_CHANGED',
          'sistema operacional',
          'Sistema Operacional',
          prevOsName,
          currOsName
        )
      );
    } else if (prevOs.version && currOs.version && prevOs.version !== currOs.version) {
      changes.push(
        createRecord(
          'OS_CHANGED',
          'sistema operacional',
          'Versão do SO',
          prevOs.version,
          currOs.version
        )
      );
    } else if (prevOs.build && currOs.build && prevOs.build !== currOs.build) {
      changes.push(
        createRecord(
          'OS_CHANGED',
          'sistema operacional',
          'Build do SO',
          prevOs.build,
          currOs.build
        )
      );
    }

    // ==========================================
    // 4. NETWORK COMPARISONS (NETWORK_CHANGED)
    // ==========================================
    const prevNet = previous.network || [];
    const currNet = current.network || [];

    const getPrimaryIp = (netArr: any[]): string | null => {
      for (const iface of netArr) {
        if (iface?.ipAddresses && iface.ipAddresses.length > 0) {
          const valid = iface.ipAddresses.find((ip: string) => !ip.startsWith('127.') && !ip.startsWith('169.254.'));
          if (valid) return valid;
        }
        if (iface?.ip) return iface.ip;
      }
      return null;
    };

    const prevIp = getPrimaryIp(prevNet);
    const currIp = getPrimaryIp(currNet);

    if (prevIp && currIp && prevIp !== currIp) {
      changes.push(
        createRecord(
          'NETWORK_CHANGED',
          'rede',
          'ipAddress',
          prevIp,
          currIp
        )
      );
    }

    const prevGateway = prevNet[0]?.gateway;
    const currGateway = currNet[0]?.gateway;
    if (prevGateway && currGateway && prevGateway !== currGateway) {
      changes.push(
        createRecord(
          'NETWORK_CHANGED',
          'rede',
          'gateway',
          prevGateway,
          currGateway
        )
      );
    }

    // ==========================================
    // 5. USER COMPARISONS (USER_CHANGED)
    // ==========================================
    const prevUser = previous.user?.currentUser?.trim();
    const currUser = current.user?.currentUser?.trim();

    if (prevUser && currUser && prevUser !== currUser) {
      changes.push(
        createRecord(
          'USER_CHANGED',
          'usuário',
          'currentUser',
          prevUser,
          currUser
        )
      );
    }

    // ==========================================
    // 6. IDENTITY COMPARISONS (IDENTITY_CHANGED)
    // ==========================================
    const prevHostname = (prevOs.hostname || '').trim();
    const currHostname = (currOs.hostname || '').trim();

    if (prevHostname && currHostname && prevHostname !== currHostname) {
      changes.push(
        createRecord(
          'IDENTITY_CHANGED',
          'hardware',
          'hostname',
          prevHostname,
          currHostname
        )
      );
    }

    const prevSerial = (prevHw.serialNumber || '').trim();
    const currSerial = (currHw.serialNumber || '').trim();
    if (prevSerial && currSerial && prevSerial !== 'Não disponível' && currSerial !== 'Não disponível' && prevSerial !== currSerial) {
      changes.push(
        createRecord(
          'IDENTITY_CHANGED',
          'hardware',
          'serialNumber',
          prevSerial,
          currSerial
        )
      );
    }

    // ==========================================
    // 7. SECURITY COMPARISONS (SECURITY_CHANGED)
    // ==========================================
    const prevSec = previous.security || ({} as any);
    const currSec = current.security || ({} as any);

    // Antivirus
    const prevAv = (prevSec.antivirusName || prevSec.antivirusStatus || '').trim();
    const currAv = (currSec.antivirusName || currSec.antivirusStatus || '').trim();
    if (prevAv && currAv && prevAv !== currAv) {
      changes.push(
        createRecord(
          'SECURITY_CHANGED',
          'segurança',
          'antivirus',
          prevAv,
          currAv
        )
      );
    }

    // BitLocker / Disk Encryption
    const prevEnc = (prevSec.bitlockerOrEncryption || '').trim();
    const currEnc = (currSec.bitlockerOrEncryption || '').trim();
    if (prevEnc && currEnc && prevEnc !== currEnc) {
      changes.push(
        createRecord(
          'SECURITY_CHANGED',
          'segurança',
          'bitlocker',
          prevEnc,
          currEnc
        )
      );
    }

    // Firewall
    if (prevSec.firewallEnabled !== undefined && currSec.firewallEnabled !== undefined && prevSec.firewallEnabled !== currSec.firewallEnabled) {
      changes.push(
        createRecord(
          'SECURITY_CHANGED',
          'segurança',
          'firewall',
          prevSec.firewallEnabled ? 'Habilitado' : 'Desabilitado',
          currSec.firewallEnabled ? 'Habilitado' : 'Desabilitado'
        )
      );
    }

    // Secure Boot
    if (prevSec.secureBootEnabled !== undefined && currSec.secureBootEnabled !== undefined && prevSec.secureBootEnabled !== currSec.secureBootEnabled) {
      changes.push(
        createRecord(
          'SECURITY_CHANGED',
          'segurança',
          'secureBoot',
          prevSec.secureBootEnabled ? 'Ativo' : 'Inativo',
          currSec.secureBootEnabled ? 'Ativo' : 'Inativo'
        )
      );
    }

    return changes;
  }
}
