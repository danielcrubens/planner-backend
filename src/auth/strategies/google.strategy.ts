import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type VerifyCallback } from 'passport-google-oauth20';
import { getEnv } from '../../config/env.js';

export interface GoogleProfilePayload {
  googleId: string;
  email?: string;
  name?: string;
}

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    const env = getEnv();
    super({
      clientID: env.GOOGLE_CLIENT_ID!,
      clientSecret: env.GOOGLE_CLIENT_SECRET!,
      callbackURL: env.GOOGLE_CALLBACK_URL,
      scope: ['openid', 'email', 'profile'],
      // profile.email é verificado pelo Google (scope email) — base do vínculo por e-mail.
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: { id: string; displayName?: string; emails?: { value: string; verified?: boolean }[] },
    done: VerifyCallback,
  ) {
    const email = profile.emails?.find((e) => e.verified !== false)?.value;
    done(null, { googleId: profile.id, email, name: profile.displayName });
  }
}
