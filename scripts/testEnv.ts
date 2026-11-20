/**
 * Ambiente isolado de testes. DEVE ser o primeiro import do runner: os módulos do
 * servidor resolvem o diretório de dados no momento em que são importados.
 *
 * Copia os arquivos de dados versionados para um diretório temporário e aponta
 * WORKPULSE_DATA_DIR para ele, de modo que as suítes nunca alterem src/data.
 */
import fs from "fs";
import os from "os";
import path from "path";

const sourceDir = path.join(process.cwd(), "src", "data");
const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "workpulse-test-data-"));

for (const file of fs.readdirSync(sourceDir)) {
  if (file.endsWith(".json")) {
    fs.copyFileSync(path.join(sourceDir, file), path.join(testDataDir, file));
  }
}

process.env.WORKPULSE_DATA_DIR = testDataDir;
export const TEST_DATA_DIR = testDataDir;

process.on("exit", () => {
  try {
    fs.rmSync(testDataDir, { recursive: true, force: true });
  } catch {}
});
