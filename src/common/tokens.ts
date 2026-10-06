import { createHash, randomBytes } from 'node:crypto';

/** Validade do link de convite, em dias (regra de negócio compartilhada). */
export const INVITE_TTL_DAYS = 1;

/** Token opaco para URLs (convite, reset): o banco guarda só o sha256. */
export function generateOpaqueToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
