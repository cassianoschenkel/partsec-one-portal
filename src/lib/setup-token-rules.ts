export type SetupTokenRecord = {
  usedAt: Date | null;
  expiresAt: Date;
} | null;

export function isSetupTokenUsable(
  token: SetupTokenRecord,
  now: Date = new Date()
): boolean {
  if (!token) {
    return false;
  }

  if (token.usedAt) {
    return false;
  }

  return token.expiresAt.getTime() > now.getTime();
}
