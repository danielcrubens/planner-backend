import { Module } from '@nestjs/common';
import { TripsModule } from '../trips/trips.module.js';
import { LinksController } from './links.controller.js';
import { LinksService } from './links.service.js';

@Module({
  imports: [TripsModule],
  controllers: [LinksController],
  providers: [LinksService],
})
export class LinksModule {}
