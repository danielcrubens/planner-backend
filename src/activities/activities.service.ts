import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service.js';
import { TripsService } from '../trips/trips.service.js';
import { capitalizeFirst } from '../common/strings.js';
import type { Trip } from '@prisma/client';
import type { CreateActivityDto, UpdateActivityDto } from './dto/activities.dto.js';

@Injectable()
export class ActivitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trips: TripsService,
    private readonly events: EventEmitter2,
  ) {}

  async list(tripId: string, userId: string) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Viagem não encontrada');
    await this.trips.assertMember(trip, userId);

    return this.prisma.activity.findMany({
      where: { tripId },
      orderBy: { occursAt: 'asc' },
    });
  }

  async create(tripId: string, userId: string, dto: CreateActivityDto) {
    const trip = await this.trips.getOwnedTrip(tripId, userId);

    const occursAt = new Date(dto.occurs_at);
    // A atividade precisa caber dentro do período da viagem (regra de negócio do domínio)
    const withinRange =
      occursAt >= trip.startsAt && occursAt <= new Date(trip.endsAt.getTime() + 86_399_000);
    if (!withinRange) {
      throw new BadRequestException('A atividade deve acontecer dentro do período da viagem');
    }

    const activity = await this.prisma.activity.create({
      data: { tripId, title: capitalizeFirst(dto.title.trim()), occursAt },
    });

    // notificação dos convidados é assíncrona e agrupada (ActivityNotifierService) — não atrasa a resposta
    this.events.emit('activity.created', { tripId, activity });

    return activity;
  }

  async update(tripId: string, activityId: string, userId: string, dto: UpdateActivityDto) {
    const trip = await this.trips.getOwnedTrip(tripId, userId);
    const activity = await this.getActivity(activityId, tripId);

    const title = dto.title !== undefined ? capitalizeFirst(dto.title.trim()) : activity.title;
    const occursAt = dto.occurs_at ? new Date(dto.occurs_at) : activity.occursAt;
    this.assertWithinPeriod(trip, occursAt);

    return this.prisma.activity.update({
      where: { id: activity.id },
      data: { title, occursAt },
    });
  }

  async remove(tripId: string, activityId: string, userId: string) {
    await this.trips.getOwnedTrip(tripId, userId);
    const activity = await this.getActivity(activityId, tripId);

    await this.prisma.activity.delete({ where: { id: activity.id } });
  }

  private async getActivity(activityId: string, tripId: string) {
    const activity = await this.prisma.activity.findFirst({
      where: { id: activityId, tripId },
    });
    if (!activity) throw new NotFoundException('Atividade não encontrada');
    return activity;
  }

  private assertWithinPeriod(trip: Trip, occursAt: Date) {
    const withinRange =
      occursAt >= trip.startsAt && occursAt <= new Date(trip.endsAt.getTime() + 86_399_000);
    if (!withinRange) {
      throw new BadRequestException('A atividade deve acontecer dentro do período da viagem');
    }
  }
}
