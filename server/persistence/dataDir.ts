import path from "path";
import dotenv from "dotenv";

// Os módulos do servidor resolvem caminhos ao serem importados, antes do
// dotenv.config() do server.ts. Carregar aqui garante que WORKPULSE_DATA_DIR
// definido no .env seja respeitado (dotenv é idempotente).
dotenv.config();

/**
 * Diretório dos arquivos de dados do servidor (CMDB, segurança, WiFi, topologia).
 * Padrão: src/data. Defina WORKPULSE_DATA_DIR para usar outro local — por exemplo
 * fora do código-fonte em produção, ou um diretório temporário nos testes.
 */
export const DATA_DIR: string = process.env.WORKPULSE_DATA_DIR
  ? path.resolve(process.env.WORKPULSE_DATA_DIR)
  : path.join(process.cwd(), "src", "data");

export function dataFile(name: string): string {
  return path.join(DATA_DIR, name);
}
