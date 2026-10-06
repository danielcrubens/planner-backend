import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { getEnv } from '../../config/env.js';
import type { AuthUser } from '../../common/decorators/current-user.decorator.js';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: getEnv().JWT_ACCESS_SECRET,
    });
  }

  validate(payload: { sub: string; email: string }): AuthUser {
    return { id: payload.sub, email: payload.email };
  }
}
