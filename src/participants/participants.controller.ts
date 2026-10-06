import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';
import { InviteDto } from './dto/participants.dto.js';
import { ParticipantsService } from './participants.service.js';

@ApiTags('participants')
@ApiBearerAuth()
@Controller('trips/:tripId')
export class ParticipantsController {
  constructor(private readonly participants: ParticipantsService) {}

  @Get('participants')
  @ApiOperation({ summary: 'Lista os convidados da viagem' })
  list(
    @CurrentUser() user: AuthUser,
    @Param('tripId', ParseUUIDPipe) tripId: string,
  ) {
    return this.participants.list(tripId, user.id);
  }

  @Post('invites')
  @ApiOperation({ summary: 'Convida pessoas por e-mail (só organizador)' })
  invite(
    @CurrentUser() user: AuthUser,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Body() dto: InviteDto,
  ) {
    return this.participants.invite(tripId, user.id, dto);
  }

  @Delete('participants/:participantId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove um convidado (só organizador)' })
  remove(
    @CurrentUser() user: AuthUser,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Param('participantId', ParseUUIDPipe) participantId: string,
  ) {
    return this.participants.remove(tripId, participantId, user.id);
  }
}
