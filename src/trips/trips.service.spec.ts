import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { TripsService } from './trips.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { UsersService } from '../users/users.service.js';

const trip = {
  id: 't-1',
  destination: 'Florianópolis',
  startsAt: new Date('2026-11-10T00:00:00.000Z'),
  endsAt: new Date('2026-11-15T00:00:00.000Z'),
  ownerId: 'u-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeService(prismaOverrides: Record<string, unknown> = {}) {
  const prisma = {
    trip: {
      create: vi.fn().mockResolvedValue(trip),
      findUnique: vi.fn().mockResolvedValue(trip),
      update: vi.fn().mockResolvedValue(trip),
    },
    participant: {
      create: vi.fn(),
      createMany: vi.fn().mockResolvedValue({ count: 0 }),
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
    },
    activity: { count: vi.fn().mockResolvedValue(0) },
    user: { findMany: vi.fn().mockResolvedValue([]) },
    $transaction: vi.fn().mockResolvedValue([0, []]),
    ...prismaOverrides,
  } as unknown as PrismaService;

  const users = { findById: vi.fn().mockResolvedValue({ id: 'u-1', name: 'Daniel', email: 'd@example.com' }) } as unknown as UsersService;
  const events = { emit: vi.fn() } as never;

  return { service: new TripsService(prisma, users, events), prisma, events };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('TripsService', () => {
  it('create: recusa período invertido', async () => {
    const { service } = makeService();

    await expect(
      service.create('u-1', {
        destination: 'Floripa',
        starts_at: '2026-11-15',
        ends_at: '2026-11-10',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('update: não-owner recebe 403', async () => {
    const { service } = makeService();

    await expect(service.update('t-1', 'intruso', { destination: 'Brasília' })).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('update: encurtar o período com atividade fora é rejeitado citando os dias', async () => {
    const { service, prisma } = makeService({
      activity: {
        findMany: vi.fn().mockResolvedValue([{ occursAt: new Date('2026-11-15T12:00:00.000Z') }]),
      },
    });

    await expect(service.update('t-1', 'u-1', { ends_at: '2026-11-11' })).rejects.toThrow(
      'atividades dos dias 15/11',
    );
    expect(prisma.trip.update).not.toHaveBeenCalled();
  });

  it('addInvites: deduplica e-mails, gera token de convite e vincula conta existente', async () => {
    const { service, prisma } = makeService({
      participant: {
        findMany: vi.fn().mockResolvedValue([{ email: 'ja@example.com' }]),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      user: { findMany: vi.fn().mockResolvedValue([{ id: 'u-2', email: 'novo@example.com' }]) },
    });

    const invited = await service.addInvites('t-1', 'u-1', [
      'novo@example.com',
      'NOVO@example.com',
      'ja@example.com',
    ]);

    expect(invited).toEqual([{ email: 'novo@example.com', token: expect.any(String) }]);
    expect(prisma.participant.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            tripId: 't-1',
            email: 'novo@example.com',
            accountId: 'u-2',
            inviteTokenHash: expect.any(String),
          }),
        ],
      }),
    );
  });
});
