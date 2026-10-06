import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { ActivitiesService } from './activities.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { TripsService } from '../trips/trips.service.js';
import type { EventEmitter2 } from '@nestjs/event-emitter';

const trip = {
  id: 't-1',
  startsAt: new Date('2026-11-10T00:00:00.000Z'),
  endsAt: new Date('2026-11-15T00:00:00.000Z'),
  ownerId: 'u-1',
};

function makeService() {
  const prisma = { activity: { create: vi.fn().mockResolvedValue({ id: 'a-1', title: 'Praia', occursAt: new Date() }) } } as unknown as PrismaService;
  const trips = {
    getOwnedTrip: vi.fn().mockResolvedValue(trip),
    assertMember: vi.fn(),
  } as unknown as TripsService;
  const events = { emit: vi.fn() } as unknown as EventEmitter2;
  return { service: new ActivitiesService(prisma, trips, events), prisma, trips, events };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('ActivitiesService', () => {
  it('create: atividade dentro do período é criada', async () => {
    const { service, prisma } = makeService();

    await service.create('t-1', 'u-1', {
      title: 'Praia',
      occurs_at: '2026-11-11T09:00:00.000Z',
    });

    expect(prisma.activity.create).toHaveBeenCalled();
  });

  it('create: emite evento activity.created para o notificador', async () => {
    const { service, events } = makeService();

    await service.create('t-1', 'u-1', {
      title: 'Praia',
      occurs_at: '2026-11-11T09:00:00.000Z',
    });

    expect(events.emit).toHaveBeenCalledWith('activity.created', {
      tripId: 't-1',
      activity: expect.objectContaining({ id: 'a-1' }),
    });
  });

  it('create: atividade fora do período é rejeitada', async () => {
    const { service, prisma } = makeService();

    await expect(
      service.create('t-1', 'u-1', { title: 'Praia', occurs_at: '2026-12-25T09:00:00.000Z' }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.activity.create).not.toHaveBeenCalled();
  });
});
