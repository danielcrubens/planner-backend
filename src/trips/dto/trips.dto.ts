import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateTripDto {
  @ApiProperty({ example: 'Florianópolis' })
  @IsString()
  @MinLength(1, { message: 'O destino é obrigatório' })
  @MaxLength(255)
  destination!: string;

  @ApiProperty({ example: '2026-11-10' })
  @IsISO8601({ strict: true }, { message: 'Data de início inválida (use YYYY-MM-DD)' })
  starts_at!: string;

  @ApiProperty({ example: '2026-11-15' })
  @IsISO8601({ strict: true }, { message: 'Data de fim inválida (use YYYY-MM-DD)' })
  ends_at!: string;

  @ApiPropertyOptional({ type: [String], example: ['amigo@example.com'] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsEmail({}, { each: true, message: 'Um dos e-mails de convite não é válido' })
  emails_to_invite?: string[];
}

export class UpdateTripDto {
  @ApiPropertyOptional({ example: 'Brasília' })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'O destino é obrigatório' })
  @MaxLength(255)
  destination?: string;

  @ApiPropertyOptional({ example: '2026-11-10' })
  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'Data de início inválida (use YYYY-MM-DD)' })
  starts_at?: string;

  @ApiPropertyOptional({ example: '2026-11-15' })
  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'Data de fim inválida (use YYYY-MM-DD)' })
  ends_at?: string;
}

export class ListTripsQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 20;
}
