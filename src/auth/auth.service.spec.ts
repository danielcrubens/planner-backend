import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import bcrypt from 'bcryptjs';
import { AuthService } from './auth.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { UsersService } from '../users/users.service.js';

process.env.JWT_ACCESS_SECRET = 'x'.repeat(32);
process.env.JWT_REFRESH_SECRET = 'y'.repeat(32);
process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test';

const passwordHash = await bcrypt.hash('senha-correta', 12);

const passwordUser = {
  id: 'u-1',
  name: 'Daniel',
  email: 'daniel@example.com',
  passwordHash,
  googleId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeService(prismaOverrides: Record<string, unknown> = {}) {
  const prisma = {
    refreshToken: {
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      findUnique: vi.fn(),
    },
    passwordResetToken: {
      create: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
    user: { update: vi.fn().mockResolvedValue(passwordUser) },
    $transaction: vi.fn().mockResolvedValue([]),
    ...prismaOverrides,
  } as unknown as PrismaService;

  const users = {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    create: vi.fn().mockResolvedValue(passwordUser),
    updateRaw: vi.fn().mockResolvedValue(passwordUser),
  } as unknown as UsersService;

  const jwt = { sign: vi.fn().mockReturnValue('access-token') } as never;
  const events = { emit: vi.fn() } as unknown as EventEmitter2;

  return { service: new AuthService(prisma, users, jwt, events), prisma, users, events };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('AuthService', () => {
  it('register: recusa e-mail já cadastrado', async () => {
    const { service, users } = makeService();
    (users.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(passwordUser);

    await expect(
      service.register({ name: 'Daniel', email: 'daniel@example.com', password: '12345678' }),
    ).rejects.toThrow(ConflictException);
  });

  it('login: senha errada → 401 genérico', async () => {
    const { service, users } = makeService();
    (users.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(passwordUser);

    await expect(service.login({ email: 'daniel@example.com', password: 'errada' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('login: conta criada via Google (sem senha) orienta usar Google', async () => {
    const { service, users } = makeService();
    (users.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...passwordUser,
      passwordHash: null,
    });

    await expect(
      service.login({ email: 'daniel@example.com', password: 'qualquer' }),
    ).rejects.toThrow('Esta conta não utiliza senha');
  });

  it('googleAuth: vincula googleId a conta existente com o mesmo e-mail', async () => {
    const { service, users } = makeService();
    (users.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(passwordUser);

    const result = await service.googleAuth({
      googleId: 'g-1',
      email: 'daniel@example.com',
      name: 'Daniel',
    });

    expect(users.updateRaw).toHaveBeenCalledWith('u-1', { googleId: 'g-1' });
    expect(result.accessToken).toBe('access-token');
  });

  it('googleAuth: sem e-mail verificado → 401', async () => {
    const { service } = makeService();
    await expect(service.googleAuth({ googleId: 'g-1' })).rejects.toThrow(UnauthorizedException);
  });

  it('refresh: reuso de token revogado revoga todas as sessões do usuário', async () => {
    const revoked = {
      id: 'rt-1',
      userId: 'u-1',
      revokedAt: new Date(),
      expiresAt: new Date(Date.now() + 60_000),
      user: passwordUser,
    };
    const { service, prisma } = makeService({
      refreshToken: {
        findUnique: vi.fn().mockResolvedValue(revoked),
        update: vi.fn().mockResolvedValue({}),
        updateMany: vi.fn().mockResolvedValue({ count: 2 }),
        create: vi.fn().mockResolvedValue({}),
      },
    });

    await expect(service.refresh('token-reusado')).rejects.toThrow('revogado');
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u-1', revokedAt: null } }),
    );
  });

  it('forgotPassword: e-mail inexistente responde sem erro (sem enumeração)', async () => {
    const { service, users, events } = makeService();
    (users.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(service.forgotPassword('ninguem@example.com')).resolves.toBeUndefined();
    expect(events.emit).not.toHaveBeenCalled();
  });
});
