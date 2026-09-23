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
  collect(): Promise<HardwareInventory> | HardwareInventory;
}

export interface IOSCollector {
  collect(): Promise<OperatingSystemInventory> | OperatingSystemInventory;
}

export interface ISoftwareCollector {
  collect(): Promise<InstalledSoftwareItem[]> | InstalledSoftwareItem[];
}

export interface INetworkCollector {
  collect(): Promise<NetworkInterfaceInventory[]> | NetworkInterfaceInventory[];
}

export interface IUserCollector {
  collect(): Promise<UserInventory> | UserInventory;
}

export interface ISecurityCollector {
  collect(): Promise<SecurityInventory> | SecurityInventory;
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
