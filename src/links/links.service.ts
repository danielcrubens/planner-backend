import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { TripsService } from '../trips/trips.service.js';
import { capitalizeFirst } from '../common/strings.js';
import type { CreateLinkDto } from './dto/links.dto.js';

@Injectable()
export class LinksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trips: TripsService,
  ) {}

  async list(tripId: string, userId: string) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Viagem não encontrada');
    await this.trips.assertMember(trip, userId);

    return this.prisma.link.findMany({
      where: { tripId },
      orderBy: { createdAt: 'asc' },
    });
  }

  create(tripId: string, userId: string, dto: CreateLinkDto) {
    // valida existência + ownership antes de inserir
    return this.trips.getOwnedTrip(tripId, userId).then(() =>
      this.prisma.link.create({
        data: { tripId, title: capitalizeFirst(dto.title.trim()), url: dto.url },
      }),
    );
  }

  async remove(linkId: string, userId: string) {
    const link = await this.prisma.link.findUnique({ where: { id: linkId } });
    if (!link) throw new NotFoundException('Link não encontrado');
    await this.trips.getOwnedTrip(link.tripId, userId);

    await this.prisma.link.delete({ where: { id: linkId } });
  }
}
