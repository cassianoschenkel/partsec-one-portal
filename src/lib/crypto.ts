import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey() {
  const secret = process.env.INTEGRATION_CREDENTIALS_SECRET;

  if (!secret) {
    throw new Error("INTEGRATION_CREDENTIALS_SECRET não configurado.");
  }

  const key = Buffer.from(secret, "hex");

  if (key.length !== 32) {
    throw new Error(
      "INTEGRATION_CREDENTIALS_SECRET deve ter 32 bytes em hex, ou seja, 64 caracteres."
    );
  }

  return key;
}

export function encryptSecret(value: string) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    iv.toString("hex"),
    authTag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

export function decryptSecret(payload: string) {
  const key = getEncryptionKey();
  const [ivHex, authTagHex, encryptedHex] = payload.split(":");

  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error("Payload criptografado inválido.");
  }

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}
