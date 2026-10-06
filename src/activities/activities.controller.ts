import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';
import { CreateActivityDto, UpdateActivityDto } from './dto/activities.dto.js';
import { ActivitiesService } from './activities.service.js';

@ApiTags('activities')
@ApiBearerAuth()
@Controller('trips/:tripId/activities')
export class ActivitiesController {
  constructor(private readonly activities: ActivitiesService) {}

  @Get()
  @ApiOperation({ summary: 'Lista atividades ordenadas por horário' })
  list(@CurrentUser() user: AuthUser, @Param('tripId', ParseUUIDPipe) tripId: string) {
    return this.activities.list(tripId, user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Cadastra uma atividade (só organizador)' })
  create(
    @CurrentUser() user: AuthUser,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Body() dto: CreateActivityDto,
  ) {
    return this.activities.create(tripId, user.id, dto);
  }

  @Patch(':activityId')
  @ApiOperation({ summary: 'Edita uma atividade (só organizador)' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Param('activityId', ParseUUIDPipe) activityId: string,
    @Body() dto: UpdateActivityDto,
  ) {
    return this.activities.update(tripId, activityId, user.id, dto);
  }

  @Delete(':activityId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Exclui uma atividade (só organizador)' })
  remove(
    @CurrentUser() user: AuthUser,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Param('activityId', ParseUUIDPipe) activityId: string,
  ) {
    return this.activities.remove(tripId, activityId, user.id);
  }
}
