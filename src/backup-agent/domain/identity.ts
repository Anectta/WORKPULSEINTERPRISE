import * as crypto from 'node:crypto';
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';

export interface AgentIdentity {
  agentId: string;
  installationId: string;
  machineId: string;
  agentVersion: string;
  engineVersion: string;
  platform: NodeJS.Platform;
  architecture: string;
  hostname: string;
  createdAt: string;
  registeredAt?: string;
  lastSeenAt: string;
}

export class IdentityManager {
  private static readonly CURRENT_AGENT_VERSION = '1.0.0';
  private static readonly CURRENT_ENGINE_VERSION = '1.0.0';

  public static async loadOrCreateIdentity(dataDir: string): Promise<AgentIdentity> {
    const identityFilePath = path.join(dataDir, 'agent-identity.json');

    try {
      const content = await fs.readFile(identityFilePath, 'utf-8');
      const identity: AgentIdentity = JSON.parse(content);
      // Atualiza lastSeenAt mantendo os identificadores imutáveis
      identity.lastSeenAt = new Date().toISOString();
      identity.agentVersion = this.CURRENT_AGENT_VERSION;
      identity.engineVersion = this.CURRENT_ENGINE_VERSION;
      await this.saveIdentity(identityFilePath, identity);
      return identity;
    } catch {
      // Cria uma nova identidade persistente
      await fs.mkdir(dataDir, { recursive: true });
      const machineId = this.generateMachineId();
      const identity: AgentIdentity = {
        agentId: crypto.randomUUID(),
        installationId: crypto.randomUUID(),
        machineId,
        agentVersion: this.CURRENT_AGENT_VERSION,
        engineVersion: this.CURRENT_ENGINE_VERSION,
        platform: os.platform(),
        architecture: os.arch(),
        hostname: os.hostname(),
        createdAt: new Date().toISOString(),
        lastSeenAt: new Date().toISOString()
      };

      await this.saveIdentity(identityFilePath, identity);
      return identity;
    }
  }

  private static async saveIdentity(filePath: string, identity: AgentIdentity): Promise<void> {
    const tmpPath = `${filePath}.${crypto.randomUUID()}.tmp`;
    await fs.writeFile(tmpPath, JSON.stringify(identity, null, 2), { mode: 0o600 });
    await fs.rename(tmpPath, filePath);
  }

  private static generateMachineId(): string {
    // Deriva um hash estável a partir de características estáveis do hardware / sistema
    const cpus = os.cpus();
    const cpuModel = cpus.length > 0 ? cpus[0].model : 'unknown-cpu';
    const totalMem = os.totalmem().toString();
    const platform = os.platform();
    const networkInterfaces = os.networkInterfaces();
    let macAddress = '';
    for (const name of Object.keys(networkInterfaces)) {
      const iface = networkInterfaces[name];
      if (iface) {
        for (const entry of iface) {
          if (!entry.internal && entry.mac && entry.mac !== '00:00:00:00:00:00') {
            macAddress = entry.mac;
            break;
          }
        }
      }
      if (macAddress) break;
    }

    const entropy = `${platform}:${cpuModel}:${totalMem}:${macAddress || 'no-mac'}`;
    return crypto.createHash('sha256').update(entropy).digest('hex');
  }
}
