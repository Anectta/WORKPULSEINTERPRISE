export * from './types';
export * from './WindowsCollector';
export * from './LinuxCollector';
export * from './MacOSCollector';
export * from './AndroidCollector';
export * from './IncrementalEngine';

import { WindowsCollectorAdapter } from './WindowsCollector';
import { LinuxCollectorAdapter } from './LinuxCollector';
import { MacOSCollectorAdapter } from './MacOSCollector';
import { AndroidCollectorAdapter } from './AndroidCollector';
import { AgentPlatform } from '../../types/cmdb';
import { IPlatformCollectorAdapter } from './types';

export function getPlatformAdapter(platform: AgentPlatform): IPlatformCollectorAdapter {
  switch (platform) {
    case 'windows':
      return new WindowsCollectorAdapter();
    case 'linux':
      return new LinuxCollectorAdapter();
    case 'macos':
      return new MacOSCollectorAdapter();
    case 'android':
      return new AndroidCollectorAdapter();
    default:
      return new WindowsCollectorAdapter();
  }
}
