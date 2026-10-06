import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { TripsModule } from './trips/trips.module.js';
import { ActivitiesModule } from './activities/activities.module.js';
import { LinksModule } from './links/links.module.js';
import { ParticipantsModule } from './participants/participants.module.js';
import { InvitesModule } from './invites/invites.module.js';
import { MailModule } from './mail/mail.module.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    EventEmitterModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    TripsModule,
    ParticipantsModule,
    InvitesModule,
    ActivitiesModule,
    LinksModule,
    MailModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
