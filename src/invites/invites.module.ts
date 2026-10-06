import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from '../auth/auth.module.js';
import { getEnv } from '../config/env.js';
import { InvitesController } from './invites.controller.js';
import { InvitesService } from './invites.service.js';

const env = getEnv();

@Module({
  imports: [
    AuthModule,
    JwtModule.register({ secret: env.JWT_ACCESS_SECRET }),
  ],
  controllers: [InvitesController],
  providers: [InvitesService],
})
export class InvitesModule {}
