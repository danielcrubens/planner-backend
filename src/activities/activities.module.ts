import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { MailModule } from '../mail/mail.module.js';
import { TripsModule } from '../trips/trips.module.js';
import { ActivitiesController } from './activities.controller.js';
import { ActivitiesService } from './activities.service.js';
import { ActivityNotifierService } from './activity-notifier.service.js';

@Module({
  imports: [TripsModule, AuthModule, MailModule],
  controllers: [ActivitiesController],
  providers: [ActivitiesService, ActivityNotifierService],
  exports: [ActivityNotifierService],
})
export class ActivitiesModule {}
