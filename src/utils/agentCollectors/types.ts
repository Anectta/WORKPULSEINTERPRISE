import { 
  HardwareInventory, 
  OperatingSystemInventory, 
  InstalledSoftwareItem, 
  NetworkInterfaceInventory, 
  UserInventory, 
  SecurityInventory,
  DeviceInventorySnapshot,
  AgentPlatform
} from '../../types/cmdb';

export interface IHardwareCollector {
  collect(): HardwareInventory;
}

export interface IOSCollector {
  collect(): OperatingSystemInventory;
}

export interface ISoftwareCollector {
  collect(): InstalledSoftwareItem[];
}

export interface INetworkCollector {
  collect(): NetworkInterfaceInventory[];
}

export interface IUserCollector {
  collect(): UserInventory;
}

export interface ISecurityCollector {
  collect(): SecurityInventory;
}

export interface IPlatformCollectorAdapter {
  platform: AgentPlatform;
  hardware: IHardwareCollector;
  os: IOSCollector;
  software: ISoftwareCollector;
  network: INetworkCollector;
  user: IUserCollector;
  security: ISecurityCollector;
  collectAll(): Promise<Omit<DeviceInventorySnapshot, 'id' | 'tenantId' | 'agentId' | 'deviceId' | 'inventoryVersion' | 'snapshotHash' | 'syncedAt'>>;
  getNativeCollectorScript(serverUrl: string, token: string): string;
}
