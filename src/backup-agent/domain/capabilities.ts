export interface AgentCapabilities {
  supportsBackup: boolean;
  supportsRestore: boolean;
  supportsMirror: boolean;
  supportsIncremental: boolean;
  supportsDifferential: boolean;
  supportsEncryption: boolean;
  supportsCompression: boolean;
  supportsSmb: boolean;
  supportsSftp: boolean;
  supportsS3: boolean;
  platform: NodeJS.Platform;
  architecture: string;
  protocolVersion: string;
}

export function getEngineCapabilities(): AgentCapabilities {
  return {
    supportsBackup: true,
    supportsRestore: true,
    supportsMirror: true,
    supportsIncremental: true,
    supportsDifferential: true,
    supportsEncryption: true,
    supportsCompression: true,
    supportsSmb: true,
    supportsSftp: true,
    supportsS3: true,
    platform: process.platform,
    architecture: process.arch,
    protocolVersion: '1.0.0'
  };
}
