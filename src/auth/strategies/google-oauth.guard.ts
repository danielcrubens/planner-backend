import { ExecutionContext, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { getEnv } from '../../config/env.js';

/** Como o JwtAuthGuard, mas recusa com 503 se o Google OAuth não estiver configurado. */
@Injectable()
export class GoogleOAuthGuard extends AuthGuard('google') {
  canActivate(context: ExecutionContext) {
    const env = getEnv();
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) {
      throw new ServiceUnavailableException(
        'Login com Google não configurado (defina GOOGLE_CLIENT_ID/SECRET)',
      );
    }
    return super.canActivate(context);
  }
}
