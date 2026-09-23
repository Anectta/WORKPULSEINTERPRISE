export interface WindowsServiceConfig {
  serviceName: string;
  displayName: string;
  description: string;
  binaryPath: string;
  startupType: 'auto' | 'demand' | 'disabled';
  failureRecovery: {
    firstAction: 'restart' | 'none';
    secondAction: 'restart' | 'none';
    subsequentAction: 'restart' | 'none';
    restartDelaySec: number;
    resetPeriodSec: number;
  };
}

export class WindowsServiceManager {
  public static getDefaultConfig(binaryPath: string): WindowsServiceConfig {
    return {
      serviceName: 'WorkPulseBackupAgent',
      displayName: 'WorkPulse Backup Agent Service',
      description: 'Supervisiona o Backup Engine local e conecta ao Control Plane com alta disponibilidade e execução em background.',
      binaryPath,
      startupType: 'auto',
      failureRecovery: {
        firstAction: 'restart',
        secondAction: 'restart',
        subsequentAction: 'restart',
        restartDelaySec: 5,
        resetPeriodSec: 86400 // 1 dia
      }
    };
  }

  public static generateInstallScript(config: WindowsServiceConfig): string {
    return [
      `@echo off`,
      `echo Instalando servico Windows ${config.serviceName}...`,
      `sc.exe create "${config.serviceName}" binPath= "\\"${config.binaryPath}\\"" start= ${config.startupType} DisplayName= "${config.displayName}"`,
      `sc.exe description "${config.serviceName}" "${config.description}"`,
      `sc.exe failure "${config.serviceName}" reset= ${config.failureRecovery.resetPeriodSec} actions= restart/${config.failureRecovery.restartDelaySec * 1000}/restart/${config.failureRecovery.restartDelaySec * 1000}/restart/${config.failureRecovery.restartDelaySec * 1000}`,
      `echo Servico instalado com sucesso.`
    ].join('\r\n');
  }

  public static generateUninstallScript(serviceName: string = 'WorkPulseBackupAgent'): string {
    return [
      `@echo off`,
      `echo Desinstalando servico Windows ${serviceName}...`,
      `sc.exe stop "${serviceName}"`,
      `sc.exe delete "${serviceName}"`,
      `echo Servico desinstalado com sucesso.`
    ].join('\r\n');
  }
}
