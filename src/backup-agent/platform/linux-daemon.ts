export interface SystemdServiceConfig {
  unitName: string;
  description: string;
  execStart: string;
  workingDirectory: string;
  user: string;
  group: string;
  dataDir: string;
  logDir: string;
  enableHardening: boolean;
}

export class LinuxDaemonManager {
  public static getDefaultConfig(execPath: string): SystemdServiceConfig {
    return {
      unitName: 'workpulse-agent.service',
      description: 'WorkPulse Backup Agent Daemon',
      execStart: execPath,
      workingDirectory: '/var/lib/workpulse-agent',
      user: 'workpulse',
      group: 'workpulse',
      dataDir: '/var/lib/workpulse-agent',
      logDir: '/var/log/workpulse-agent',
      enableHardening: true
    };
  }

  public static generateSystemdUnit(config: SystemdServiceConfig): string {
    const hardeningDirectives = config.enableHardening ? [
      '# Hardening e isolamento de segurança para produção',
      'NoNewPrivileges=true',
      'PrivateTmp=true',
      'ProtectSystem=strict',
      'ProtectHome=read-only',
      'ReadWritePaths=/var/lib/workpulse-agent /var/log/workpulse-agent /tmp',
      'CapabilityBoundingSet=CAP_DAC_OVERRIDE CAP_FOWNER',
      'RestrictRealtime=true'
    ] : [];

    const lines = [
      '[Unit]',
      `Description=${config.description}`,
      'After=network-online.target local-fs.target remote-fs.target',
      'Wants=network-online.target',
      '',
      '[Service]',
      'Type=simple',
      `User=${config.user}`,
      `Group=${config.group}`,
      `WorkingDirectory=${config.workingDirectory}`,
      `ExecStart=${config.execStart}`,
      'Restart=on-failure',
      'RestartSec=5s',
      'StandardOutput=journal',
      'StandardError=journal',
      ...hardeningDirectives,
      '',
      '[Install]',
      'WantedBy=multi-user.target'
    ];

    return lines.join('\n');
  }

  public static generateSetupCommands(config: SystemdServiceConfig): string[] {
    return [
      `useradd -r -s /bin/false -d ${config.dataDir} ${config.user} || true`,
      `mkdir -p ${config.dataDir} ${config.logDir}`,
      `chown -R ${config.user}:${config.group} ${config.dataDir} ${config.logDir}`,
      `chmod 700 ${config.dataDir}`,
      `chmod 750 ${config.logDir}`,
      `systemctl daemon-reload`,
      `systemctl enable ${config.unitName}`,
      `systemctl start ${config.unitName}`
    ];
  }
}
