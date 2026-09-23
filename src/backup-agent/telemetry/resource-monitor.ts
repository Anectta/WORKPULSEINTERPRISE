import * as os from 'node:os';
import * as fs from 'node:fs/promises';

export interface SystemResourceMetrics {
  cpuUsagePercent: number;
  memoryTotalBytes: number;
  memoryFreeBytes: number;
  memoryUsedPercent: number;
  processMemoryRssBytes: number;
  processMemoryHeapBytes: number;
  diskFreeBytes?: number;
  diskTotalBytes?: number;
  uptimeSeconds: number;
  loadAverage: number[];
}

export class ResourceMonitor {
  private static lastCpuUsage = process.cpuUsage();
  private static lastCpuCheckTime = Date.now();

  public static async sampleMetrics(storageMountPath?: string): Promise<SystemResourceMetrics> {
    const memTotal = os.totalmem();
    const memFree = os.freemem();
    const memUsedPercent = Math.round(((memTotal - memFree) / memTotal) * 100);

    // Cálculo da porcentagem de uso de CPU do processo
    const now = Date.now();
    const elapsedMs = now - this.lastCpuCheckTime;
    const cpuDiff = process.cpuUsage(this.lastCpuUsage);
    this.lastCpuUsage = process.cpuUsage();
    this.lastCpuCheckTime = now;

    const totalCpuTimeUs = cpuDiff.user + cpuDiff.system;
    const elapsedUs = Math.max(elapsedMs * 1000, 1000);
    const cpuUsagePercent = Math.min(Math.round((totalCpuTimeUs / elapsedUs) * 100), 100);

    const memUsage = process.memoryUsage();

    let diskFreeBytes: number | undefined;
    let diskTotalBytes: number | undefined;

    if (storageMountPath && typeof (fs as any).statfs === 'function') {
      try {
        const stats = await (fs as any).statfs(storageMountPath);
        diskFreeBytes = Number(stats.bavail) * Number(stats.bsize);
        diskTotalBytes = Number(stats.blocks) * Number(stats.bsize);
      } catch {}
    }

    return {
      cpuUsagePercent,
      memoryTotalBytes: memTotal,
      memoryFreeBytes: memFree,
      memoryUsedPercent: memUsedPercent,
      processMemoryRssBytes: memUsage.rss,
      processMemoryHeapBytes: memUsage.heapUsed,
      diskFreeBytes,
      diskTotalBytes,
      uptimeSeconds: Math.floor(process.uptime()),
      loadAverage: os.loadavg()
    };
  }
}
