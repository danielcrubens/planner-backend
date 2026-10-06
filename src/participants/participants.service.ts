import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service.js';
import { TripsService } from '../trips/trips.service.js';
import type { InviteDto } from './dto/participants.dto.js';

@Injectable()
export class ParticipantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trips: TripsService,
    private readonly events: EventEmitter2,
  ) {}

  async list(tripId: string, userId: string) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Viagem não encontrada');
    await this.trips.assertMember(trip, userId);

    return this.prisma.participant.findMany({
      where: { tripId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async invite(tripId: string, userId: string, dto: InviteDto) {
    const invites = await this.trips.addInvites(tripId, userId, dto.emails);
    if (invites.length > 0) {
      const trip = await this.prisma.trip.findUniqueOrThrow({
        where: { id: tripId },
        select: { id: true, destination: true, startsAt: true, endsAt: true, owner: { select: { name: true } } },
      });
      this.events.emit('participant.invited', { trip, ownerName: trip.owner.name, invites });
    } else {
      console.log(
        `[invite] nenhum novo convite criado — e-mails já participam da viagem ${tripId}: ${dto.emails.join(', ')}`,
      );
    }
    const participants = await this.prisma.participant.findMany({
      where: { tripId },
      orderBy: { createdAt: 'asc' },
    });
    return { invited: invites.length, participants };
  }

  async remove(tripId: string, participantId: string, userId: string) {
    await this.trips.getOwnedTrip(tripId, userId);

    const participant = await this.prisma.participant.findFirst({
      where: { id: participantId, tripId },
    });
    if (!participant) throw new NotFoundException('Participante não encontrado');
    if (participant.isOwner) {
      throw new BadRequestException('O organizador não pode ser removido da viagem');
    }

    await this.prisma.participant.delete({ where: { id: participant.id } });
    this.events.emit('participant.removed', { tripId, email: participant.email });
  }
}
