import type { Response } from 'express';
import { getEnv } from '../config/env.js';

export const REFRESH_COOKIE = 'planner.refresh_token';

export function setRefreshCookie(res: Response, token: string) {
  const env = getEnv();
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: env.JWT_REFRESH_EXPIRES_DAYS * 86_400_000,
  });
}

export function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE, { path: '/api/auth' });
}
