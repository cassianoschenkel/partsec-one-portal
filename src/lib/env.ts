const requiredEnvVars = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "AUTH_URL",
  "APP_URL",
  "INTEGRATION_CREDENTIALS_SECRET",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM_EMAIL",
] as const;

export function validateRequiredEnv() {
  const missing = requiredEnvVars.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `Variáveis de ambiente obrigatórias ausentes: ${missing.join(", ")}`
    );
  }

  const integrationSecret = process.env.INTEGRATION_CREDENTIALS_SECRET;

  if (integrationSecret && integrationSecret.length !== 64) {
    throw new Error(
      "INTEGRATION_CREDENTIALS_SECRET deve ter 64 caracteres hexadecimais."
    );
  }

  const smtpPort = Number(process.env.SMTP_PORT);

  if (!Number.isFinite(smtpPort)) {
    throw new Error("SMTP_PORT deve ser numérico.");
  }
}
