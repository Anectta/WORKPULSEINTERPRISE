import fs from "fs";
import path from "path";

/**
 * Persistência segura de arquivos JSON do servidor.
 *
 * - Gravação atômica: escreve num arquivo temporário e faz rename sobre o destino,
 *   então uma queda no meio da escrita nunca deixa o JSON truncado.
 * - Mantém uma cópia ".bak" da última versão válida.
 * - Leitura tolerante: se o arquivo principal estiver corrompido, usa o ".bak";
 *   se ambos falharem, move o arquivo corrompido para quarentena (".corrupt-<data>")
 *   em vez de deixá-lo ser sobrescrito por dados iniciais.
 */

export type JsonReadResult<T> =
  | { status: "ok"; data: T; source: "primary" | "backup" }
  | { status: "missing" }
  | { status: "corrupt"; quarantinedTo: string | null };

function tryParse<T>(file: string): T | undefined {
  try {
    if (!fs.existsSync(file)) return undefined;
    return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
  } catch {
    return undefined;
  }
}

export function readJsonFile<T>(file: string): JsonReadResult<T> {
  if (!fs.existsSync(file)) {
    const fromBackup = tryParse<T>(`${file}.bak`);
    return fromBackup !== undefined ? { status: "ok", data: fromBackup, source: "backup" } : { status: "missing" };
  }

  const primary = tryParse<T>(file);
  if (primary !== undefined) return { status: "ok", data: primary, source: "primary" };

  const backup = tryParse<T>(`${file}.bak`);
  if (backup !== undefined) {
    console.error(`[persistence] ${path.basename(file)} corrompido; recuperado da cópia .bak.`);
    return { status: "ok", data: backup, source: "backup" };
  }

  // Preserva o arquivo corrompido para recuperação manual
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const quarantine = `${file}.corrupt-${stamp}`;
  try {
    fs.renameSync(file, quarantine);
    console.error(`[persistence] ${path.basename(file)} corrompido e sem .bak válido; movido para ${path.basename(quarantine)}.`);
    return { status: "corrupt", quarantinedTo: quarantine };
  } catch (err) {
    console.error(`[persistence] Falha ao colocar ${path.basename(file)} em quarentena:`, err);
    return { status: "corrupt", quarantinedTo: null };
  }
}

/** Grava JSON de forma atômica. Lança erro em caso de falha (o chamador decide como reportar). */
export function writeJsonFileAtomic(file: string, data: unknown): void {
  const dir = path.dirname(file);
  fs.mkdirSync(dir, { recursive: true });

  const payload = JSON.stringify(data, null, 2);
  const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;

  fs.writeFileSync(tmp, payload, "utf-8");
  try {
    // Guarda a versão anterior válida antes de substituir
    if (fs.existsSync(file) && tryParse(file) !== undefined) {
      fs.copyFileSync(file, `${file}.bak`);
    }
    fs.renameSync(tmp, file);
  } catch (err) {
    try { fs.unlinkSync(tmp); } catch {}
    throw err;
  }
}
