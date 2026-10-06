import { Module } from '@nestjs/common';
import { TripsModule } from '../trips/trips.module.js';
import { ParticipantsController } from './participants.controller.js';
import { ParticipantsService } from './participants.service.js';

@Module({
  imports: [TripsModule],
  controllers: [ParticipantsController],
  providers: [ParticipantsService],
})
export class ParticipantsModule {}
