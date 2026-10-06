import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import { generateOpaqueToken } from '../common/tokens.js';
import type { User } from '@prisma/client';
import { getEnv } from '../config/env.js';
import type { GoogleProfilePayload } from './strategies/google.strategy.js';
import type { RegisterDto, LoginDto } from './dto/auth.dto.js';

const REFRESH_BYTES = 48;
const RESET_TTL_MINUTES = 30;

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly events: EventEmitter2,
  ) {}

  async register(dto: RegisterDto): Promise<{ user: Omit<User, 'passwordHash'> } & TokenPair> {
    const existing = await this.users.findByEmail(dto.email);
    if (existing) throw new ConflictException('E-mail já cadastrado');

    const user = await this.users.create({
      name: dto.name.trim(),
      email: dto.email,
      passwordHash: await bcrypt.hash(dto.password, 12),
    }).catch((e) => {
      // corrida entre findByEmail e create — o índice único decide
      if ((e as { code?: string }).code === 'P2002') {
        throw new ConflictException('E-mail já cadastrado');
      }
      throw e;
    });

    return { user: this.strip(user), ...(await this.issueTokens(user)) };
  }

  async login(dto: LoginDto): Promise<{ user: Omit<User, 'passwordHash'> } & TokenPair> {
    const user = await this.users.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Credenciais inválidas');
    if (!user.passwordHash) {
      throw new UnauthorizedException(
        'Esta conta não utiliza senha — entre com Google ou solicite um link de acesso por e-mail',
      );
    }
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciais inválidas');

    return { user: this.strip(user), ...(await this.issueTokens(user)) };
  }

  /** Chamado pelo callback do Google: entra se o e-mail já tem conta, senão cria. */
  async googleAuth(
    profile: GoogleProfilePayload,
  ): Promise<{ user: Omit<User, 'passwordHash'> } & TokenPair> {
    if (!profile.email) throw new UnauthorizedException('Conta Google sem e-mail verificado');

    let user = await this.users.findByEmail(profile.email);
    if (user) {
      if (!user.googleId) {
        user = await this.users.updateRaw(user.id, { googleId: profile.googleId });
      }
    } else {
      user = await this.users.create({
        name: profile.name?.trim() || profile.email.split('@')[0],
        email: profile.email,
        googleId: profile.googleId,
        passwordHash: null,
      });
    }
    return { user: this.strip(user), ...(await this.issueTokens(user)) };
  }

  async refresh(token: string): Promise<TokenPair> {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.sha256(token) },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token inválido ou expirado');
    }

    if (stored.revokedAt) {
      // Reuso de token já rotacionado = sessão comprometida: revoga tudo do usuário.
      await this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token revogado');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(stored.user);
  }

  async logout(token: string | undefined): Promise<void> {
    if (!token) return;
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: this.sha256(token), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Sempre responde sem revelar se o e-mail existe (evita enumeração). */
  async forgotPassword(email: string): Promise<void> {
    const user = await this.users.findByEmail(email);
    if (!user || !user.passwordHash) return; // contas Google não têm senha para resetar

    const token = randomBytes(REFRESH_BYTES).toString('hex');
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: this.sha256(token),
        expiresAt: new Date(Date.now() + RESET_TTL_MINUTES * 60_000),
      },
    });

    this.events.emit('password.reset_requested', {
      email: user.email,
      name: user.name,
      token,
    });
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const stored = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: this.sha256(token) },
    });
    if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Token de recuperação inválido ou expirado');
    }

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({
        where: { id: stored.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: stored.userId },
        data: { passwordHash: await bcrypt.hash(password, 12) },
      }),
      // senha trocada → todas as sessões existentes moram
      this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  /**
   * Magic link (passwordless): e-mail existe ou é criado na hora; o token
   * prova a posse da caixa postal no clique (15 min, single-use).
   */
  async requestMagicLink(email: string, redirect?: string): Promise<void> {
    let user = await this.users.findByEmail(email);
    if (!user) {
      user = await this.users.create({
        name: email.split('@')[0],
        email,
        passwordHash: null,
      });
    }

    const token = generateOpaqueToken();
    await this.prisma.loginToken.create({
      data: {
        userId: user.id,
        tokenHash: this.sha256(token),
        redirect: redirect ?? null,
        expiresAt: new Date(Date.now() + 15 * 60_000),
      },
    });

    this.events.emit('auth.magic_link_requested', {
      email: user.email,
      name: user.name,
      token,
    });
  }

  async verifyMagicLink(
    token: string,
  ): Promise<{ user: Omit<User, 'passwordHash'>; redirect: string | null } & TokenPair> {
    const stored = await this.prisma.loginToken.findUnique({
      where: { tokenHash: this.sha256(token) },
      include: { user: true },
    });

    if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Link de acesso inválido ou expirado');
    }

    await this.prisma.loginToken.update({
      where: { id: stored.id },
      data: { usedAt: new Date() },
    });

    return {
      user: this.strip(stored.user),
      redirect: stored.redirect,
      ...(await this.issueTokens(stored.user)),
    };
  }

  /** Sessão completa para fluxos que autenticam por conta própria (ex.: aceite de convite). */
  async issueSession(user: User): Promise<{ user: Omit<User, 'passwordHash'> } & TokenPair> {
    return { user: this.strip(user), ...(await this.issueTokens(user)) };
  }

  /** Gera LoginToken (single-use) sem disparar e-mail — para links embutidos em outras mensagens. */
  async createLoginToken(userId: string, redirect: string, ttlMinutes = 60): Promise<string> {
    const token = generateOpaqueToken();
    await this.prisma.loginToken.create({
      data: {
        userId,
        tokenHash: this.sha256(token),
        redirect,
        expiresAt: new Date(Date.now() + ttlMinutes * 60_000),
      },
    });
    return token;
  }

  private async issueTokens(user: User): Promise<TokenPair> {
    const env = getEnv();
    const accessToken = this.jwt.sign(
      { sub: user.id, email: user.email },
      { secret: env.JWT_ACCESS_SECRET, expiresIn: env.JWT_ACCESS_EXPIRES_SECONDS },
    );
    const refreshToken = randomBytes(REFRESH_BYTES).toString('hex');
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.sha256(refreshToken),
        expiresAt: new Date(Date.now() + env.JWT_REFRESH_EXPIRES_DAYS * 86_400_000),
      },
    });
    return { accessToken, refreshToken };
  }

  private sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private strip(user: User): Omit<User, 'passwordHash'> {
    const { passwordHash: _ignored, ...publicUser } = user;
    return publicUser;
  }
}
