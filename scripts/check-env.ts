import "dotenv/config";
import { validateRequiredEnv } from "../src/lib/env";

try {
  validateRequiredEnv();
  console.log("Ambiente OK. Todas as variáveis obrigatórias estão configuradas.");
} catch (error) {
  console.error("Falha na validação do ambiente:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
