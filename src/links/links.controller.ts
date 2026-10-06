import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthUser } from '../common/decorators/current-user.decorator.js';
import { CreateLinkDto } from './dto/links.dto.js';
import { LinksService } from './links.service.js';

@ApiTags('links')
@ApiBearerAuth()
@Controller()
export class LinksController {
  constructor(private readonly links: LinksService) {}

  @Get('trips/:tripId/links')
  @ApiOperation({ summary: 'Lista os links importantes da viagem' })
  list(@CurrentUser() user: AuthUser, @Param('tripId', ParseUUIDPipe) tripId: string) {
    return this.links.list(tripId, user.id);
  }

  @Post('trips/:tripId/links')
  @ApiOperation({ summary: 'Cadastra um link importante (só organizador)' })
  create(
    @CurrentUser() user: AuthUser,
    @Param('tripId', ParseUUIDPipe) tripId: string,
    @Body() dto: CreateLinkDto,
  ) {
    return this.links.create(tripId, user.id, dto);
  }

  @Delete('links/:linkId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove um link (só organizador)' })
  remove(@CurrentUser() user: AuthUser, @Param('linkId', ParseUUIDPipe) linkId: string) {
    return this.links.remove(linkId, user.id);
  }
}
