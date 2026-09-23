import path from 'path';
import { EngineError, ErrorCategory } from '../core/errors.js';

export class PathSafety {
  /**
   * Sanitiza e valida o caminho relativo contra path traversal, null bytes e truques de escape.
   * Retorna o caminho absoluto canônico rigorosamente contido no targetDirectory.
   */
  public static resolveSafeTargetPath(targetDirectory: string, relativePath: string): string {
    if (!targetDirectory || typeof targetDirectory !== 'string') {
      throw new EngineError({
        code: 'INVALID_DESTINATION_PATH',
        message: 'O diretório de destino da restauração é inválido ou vazio.',
        category: ErrorCategory.VALIDATION
      });
    }

    if (!relativePath || typeof relativePath !== 'string') {
      throw new EngineError({
        code: 'INVALID_RELATIVE_PATH',
        message: 'O caminho relativo do arquivo a ser restaurado é inválido.',
        category: ErrorCategory.VALIDATION
      });
    }

    // 1. Proibição estrita de Null Bytes
    if (relativePath.includes('\0') || targetDirectory.includes('\0')) {
      throw new EngineError({
        code: 'PATH_SECURITY_VIOLATION',
        message: 'Tentativa de injeção de Null Byte detectada no caminho de restauração.',
        category: ErrorCategory.SECURITY
      });
    }

    // 2. Normalização de barras e remoção de prefixos absolutos indesejados
    let cleanRel = relativePath.replace(/\\/g, '/');
    while (cleanRel.startsWith('/')) {
      cleanRel = cleanRel.slice(1);
    }

    // Proibição de Windows Alternate Data Streams (ex: file.txt::$DATA)
    if (cleanRel.includes('::$') || cleanRel.includes(':')) {
      throw new EngineError({
        code: 'PATH_SECURITY_VIOLATION',
        message: `Caracteres de stream/drive inválidos no caminho relativo: "${cleanRel}"`,
        category: ErrorCategory.SECURITY
      });
    }

    // 3. Resolução absoluta canônica
    const resolvedBase = path.resolve(targetDirectory);
    const resolvedTarget = path.resolve(resolvedBase, cleanRel);

    // 4. Verificação de contenção no diretório de destino
    const relativeToBase = path.relative(resolvedBase, resolvedTarget);
    if (relativeToBase.startsWith('..') || path.isAbsolute(relativeToBase)) {
      throw new EngineError({
        code: 'PATH_TRAVERSAL_DETECTED',
        message: `Tentativa de Path Traversal bloqueada: caminho "${relativePath}" escaparia do destino "${targetDirectory}".`,
        category: ErrorCategory.SECURITY
      });
    }

    return resolvedTarget;
  }
}
