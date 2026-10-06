import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from '../auth/auth.service.js';
import { hashToken } from '../common/tokens.js';
import type { User } from '@prisma/client';

type InviteCode = 'INVITE_EXPIRED' | 'INVITE_ALREADY_USED' | 'INVITE_INVALID' | 'EMAIL_MISMATCH';

function inviteError(status: HttpStatus, code: InviteCode, message: string): HttpException {
  return new HttpException({ statusCode: status, code, message }, status);
}

@Injectable()
export class InvitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  /** Dados mínimos para páginas informativas (rota pública — nada além do necessário). */
  async preview(token: string) {
    const participant = await this.findByToken(token);
    if (!participant) throw inviteError(HttpStatus.NOT_FOUND, 'INVITE_INVALID', 'Convite inválido ou expirado');

    return {
      email: participant.email,
      trip: {
        destination: participant.trip.destination,
        startsAt: participant.trip.startsAt,
        endsAt: participant.trip.endsAt,
      },
    };
  }

  /**
   * O link de convite é a credencial: posse do token prova a caixa postal.
   * Find-or-create do usuário + membership + marcação de uso, tudo atômico,
   * e emissão de sessão reaproveitando o AuthService.
   */
  async accept(
    token: string,
    currentUser?: { id: string },
  ): Promise<{ tripId: string; user: Omit<User, 'passwordHash'>; accessToken: string; refreshToken: string }> {
    const participant = await this.findByToken(token);
    if (!participant) throw inviteError(HttpStatus.NOT_FOUND, 'INVITE_INVALID', 'Convite inválido ou expirado');
    if (participant.inviteUsedAt) {
      throw inviteError(HttpStatus.CONFLICT, 'INVITE_ALREADY_USED', 'Este convite já foi utilizado');
    }
    if (participant.inviteExpiresAt && participant.inviteExpiresAt < new Date()) {
      throw inviteError(HttpStatus.GONE, 'INVITE_EXPIRED', 'Este convite expirou — peça um novo ao organizador');
    }

    // Sessão existente com e-mail diferente: erro claro, sem trocar sessão silenciosamente
    if (currentUser) {
      const logged = await this.prisma.user.findUnique({ where: { id: currentUser.id } });
      if (logged && logged.email !== participant.email) {
        throw inviteError(
          HttpStatus.FORBIDDEN,
          'EMAIL_MISMATCH',
          `Este convite é para o e-mail ${participant.email} — use-o com a conta desse e-mail`,
        );
      }
    }

    const user = await this.prisma.$transaction(async (tx) => {
      // claim atômico: só a primeira chamada marca o uso (duplo clique / abas simultâneas)
      const claimed = await tx.participant.updateMany({
        where: { id: participant.id, inviteUsedAt: null },
        data: { inviteUsedAt: new Date() },
      });
      if (claimed.count === 0) {
        throw inviteError(HttpStatus.CONFLICT, 'INVITE_ALREADY_USED', 'Este convite já foi utilizado');
      }

      let u = await tx.user.findUnique({ where: { email: participant.email } });
      if (!u) {
        u = await tx.user
          .create({
            data: { name: participant.name ?? participant.email.split('@')[0], email: participant.email },
          })
          .catch(async (e) => {
            // corrida no unique de e-mail: alguém criou primeiro — busca o existente
            if ((e as { code?: string }).code === 'P2002') {
              return tx.user.findUniqueOrThrow({ where: { email: participant.email } });
            }
            throw e;
          });
      }

      await tx.participant.update({
        where: { id: participant.id },
        data: { accountId: u.id, name: participant.name ?? u.name, isConfirmed: true, inviteExpiresAt: null },
      });

      return u;
    });

    const session = await this.auth.issueSession(user);
    return { tripId: participant.tripId, ...session };
  }

  private async findByToken(token: string) {
    return this.prisma.participant.findUnique({
      where: { inviteTokenHash: hashToken(token) },
      include: {
        trip: { select: { destination: true, startsAt: true, endsAt: true } },
      },
    });
  }
}
