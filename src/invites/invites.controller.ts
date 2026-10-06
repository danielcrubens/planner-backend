import { Controller, Get, HttpCode, HttpStatus, Param, Post, Req, Res } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Throttle } from '@nestjs/throttler';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Public } from '../common/decorators/public.decorator.js';
import { InvitesService } from './invites.service.js';
import { setRefreshCookie } from '../common/cookies.js';

@ApiTags('invites')
@Controller('invites')
export class InvitesController {
  constructor(
    private readonly invites: InvitesService,
    private readonly jwt: JwtService,
  ) {}

  @Public()
  @Get(':token')
  @ApiOperation({ summary: 'Prévia pública do convite (destino, datas, e-mail)' })
  preview(@Param('token') token: string) {
    return this.invites.preview(token);
  }

  /**
   * O link de convite autentica: valida o token, encontra/cria o usuário,
   * confirma a participação e emite a sessão — um passo só.
   * Bearer opcional: se houver sessão com e-mail diferente, responde EMAIL_MISMATCH.
   */
  @Public()
  @Post(':token/accept')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Aceita o convite e autentica (o token é a credencial)' })
  async accept(
    @Param('token') token: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    let currentUser: { id: string } | undefined;
    const header = req.headers.authorization;
    if (header?.startsWith('Bearer ')) {
      try {
        const payload = this.jwt.verify<{ sub: string }>(header.slice(7));
        currentUser = { id: payload.sub };
      } catch {
        // bearer inválido/expirado — segue como anônimo
      }
    }

    const result = await this.invites.accept(token, currentUser);
    setRefreshCookie(res, result.refreshToken);
    return { user: result.user, accessToken: result.accessToken, tripId: result.tripId };
  }
}
