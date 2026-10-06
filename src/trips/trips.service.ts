import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@prisma/client';
import type { Trip } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { UsersService } from '../users/users.service.js';
import { generateOpaqueToken, hashToken, INVITE_TTL_DAYS } from '../common/tokens.js';
import type { CreateTripDto, UpdateTripDto } from './dto/trips.dto.js';

const tripWithDetails = {
  participants: { orderBy: { createdAt: 'asc' as const } },
  activities: { orderBy: { occursAt: 'asc' as const } },
  links: { orderBy: { createdAt: 'asc' as const } },
};

@Injectable()
export class TripsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly events: EventEmitter2,
  ) {}

  async create(userId: string, dto: CreateTripDto) {
    const startsAt = this.toDate(dto.starts_at);
    const endsAt = this.toDate(dto.ends_at);
    this.assertPeriod(startsAt, endsAt);

    const owner = await this.users.findById(userId);

    const trip = await this.prisma.trip.create({
      data: {
        destination: dto.destination.trim(),
        startsAt,
        endsAt,
        ownerId: userId,
        participants: {
          create: [{ email: owner.email, name: owner.name, isOwner: true, isConfirmed: true, accountId: userId }],
        },
      },
      include: tripWithDetails,
    });

    const invites = dto.emails_to_invite?.length
      ? await this.addInvites(trip.id, userId, dto.emails_to_invite)
      : [];

    this.events.emit('trip.created', { trip, ownerName: owner.name, invites });
    return invites.length
      ? this.prisma.trip.findUniqueOrThrow({ where: { id: trip.id }, include: tripWithDetails })
      : trip;
  }

  async list(userId: string, page = 1, limit = 20) {
    const [total, trips] = await this.prisma.$transaction([
      this.prisma.trip.count({
        where: this.memberFilter(userId),
      }),
      this.prisma.trip.findMany({
        where: this.memberFilter(userId),
        orderBy: { startsAt: 'desc' },
        skip: (page - 1) * limit,
        take: Math.min(limit, 100),
        select: {
          id: true,
          destination: true,
          startsAt: true,
          endsAt: true,
          ownerId: true,
          owner: { select: { id: true, name: true, email: true } },
          _count: { select: { participants: true, activities: true, links: true } },
        },
      }),
    ]);

    return {
      data: trips.map(({ _count, ...trip }) => ({ ...trip, counts: _count })),
      meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    };
  }

  async findOne(tripId: string, userId: string) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId }, include: tripWithDetails });
    if (!trip) throw new NotFoundException('Viagem não encontrada');
    await this.assertMember(trip, userId);
    return trip;
  }

  async update(tripId: string, userId: string, dto: UpdateTripDto) {
    const trip = await this.getOwnedTrip(tripId, userId);

    const startsAt = dto.starts_at ? this.toDate(dto.starts_at) : trip.startsAt;
    const endsAt = dto.ends_at ? this.toDate(dto.ends_at) : trip.endsAt;
    this.assertPeriod(startsAt, endsAt);

    // Período encurtado não pode deixar atividades de fora
    if (startsAt.getTime() !== trip.startsAt.getTime() || endsAt.getTime() !== trip.endsAt.getTime()) {
      const outside = await this.prisma.activity.findMany({
        where: {
          tripId,
          OR: [{ occursAt: { lt: startsAt } }, { occursAt: { gt: this.endOfDay(endsAt) } }],
        },
        select: { occursAt: true },
        orderBy: { occursAt: 'asc' },
      });
      if (outside.length > 0) {
        const days = [...new Set(outside.map((a) => a.occursAt.toISOString().slice(0, 10)))]
          .map((d) => d.split('-').reverse().join('/'))
          .join(', ');
        throw new BadRequestException(
          `O novo período deixaria atividades dos dias ${days} fora da viagem — edite ou remova essas atividades antes`,
        );
      }
    }

    const updated = await this.prisma.trip.update({
      where: { id: tripId },
      data: { destination: dto.destination?.trim() ?? trip.destination, startsAt, endsAt },
      include: tripWithDetails,
    });
    this.events.emit('trip.updated', { trip: updated });
    return updated;
  }

  /** Viagem existe e o usuário é owner — usado também pelos módulos activities/links/participants. */
  async getOwnedTrip(tripId: string, userId: string): Promise<Trip> {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Viagem não encontrada');
    if (trip.ownerId !== userId) throw new ForbiddenException('Apenas o organizador pode fazer isso');
    return trip;
  }

  /** Viagem existe e o usuário é owner ou participante confirmado/pendente. */
  async assertMember(trip: Trip, userId: string): Promise<void> {
    if (trip.ownerId === userId) return;
    const participant = await this.prisma.participant.findFirst({
      where: { tripId: trip.id, accountId: userId },
    });
    if (!participant) throw new ForbiddenException('Você não tem acesso a esta viagem');
  }

  /** Cria participantes por e-mail com token de convite; ignora duplicados; vincula conta existente. */
  async addInvites(
    tripId: string,
    userId: string,
    emails: string[],
  ): Promise<{ email: string; token: string }[]> {
    await this.getOwnedTrip(tripId, userId);

    const normalized = [...new Set(emails.map((e) => e.toLowerCase().trim()))];
    const existing = await this.prisma.participant.findMany({
      where: { tripId, email: { in: normalized } },
      select: { email: true },
    });
    const existingEmails = new Set(existing.map((p) => p.email));
    const newEmails = normalized.filter((e) => !existingEmails.has(e));
    if (newEmails.length === 0) return [];

    const accounts = await this.prisma.user.findMany({
      where: { email: { in: newEmails } },
      select: { id: true, email: true },
    });
    const accountByEmail = new Map(accounts.map((a) => [a.email, a]));

    const created: { email: string; token: string }[] = [];
    const data = newEmails.map((email) => {
      const token = generateOpaqueToken();
      created.push({ email, token });
      return {
        tripId,
        email,
        accountId: accountByEmail.get(email)?.id ?? null,
        invitedById: userId,
        inviteTokenHash: hashToken(token),
        inviteExpiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 86_400_000),
      };
    });

    await this.prisma.participant.createMany({ data, skipDuplicates: true });

    return created;
  }

  private memberFilter(userId: string): Prisma.TripWhereInput {
    return {
      OR: [{ ownerId: userId }, { participants: { some: { accountId: userId } } }],
    };
  }

  private assertPeriod(startsAt: Date, endsAt: Date) {
    if (endsAt < startsAt) {
      throw new BadRequestException('A data de fim deve ser igual ou posterior à data de início');
    }
  }

  private toDate(iso: string): Date {
    // @db.Date: grava apenas a parte da data, sempre à meia-noite UTC
    return new Date(`${iso.slice(0, 10)}T00:00:00.000Z`);
  }

  private endOfDay(date: Date): Date {
    return new Date(date.getTime() + 86_399_000);
  }
}
