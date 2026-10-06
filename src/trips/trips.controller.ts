import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';
import { CreateTripDto, ListTripsQueryDto, UpdateTripDto } from './dto/trips.dto.js';
import { TripsService } from './trips.service.js';

@ApiTags('trips')
@ApiBearerAuth()
@Controller('trips')
export class TripsController {
  constructor(private readonly trips: TripsService) {}

  @Post()
  @ApiOperation({ summary: 'Cria uma viagem (com convites opcionais)' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTripDto) {
    return this.trips.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Lista viagens em que sou organizador ou participante' })
  list(@CurrentUser() user: AuthUser, @Query() query: ListTripsQueryDto) {
    return this.trips.list(user.id, query.page, query.limit);
  }

  @Get(':tripId')
  @ApiOperation({ summary: 'Detalhes da viagem (atividades, links, participantes)' })
  findOne(@CurrentUser() user: AuthUser, @Param('tripId', ParseUUIDPipe) tripId: string) {
    return this.trips.findOne(tripId, user.id);
  }

  @Patch(':tripId')
  @ApiOperation({ summary: 'Atualiza destino e/ou datas (só organizador)' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Body() dto: UpdateTripDto,
  ) {
    return this.trips.update(tripId, user.id, dto);
  }
}
