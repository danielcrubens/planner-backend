import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateActivityDto {
  @ApiProperty({ example: 'Passeio até a praia' })
  @IsString()
  @MinLength(1, { message: 'O nome da atividade é obrigatório' })
  @MaxLength(255)
  title!: string;

  @ApiProperty({ example: '2026-11-12T10:00:00.000Z' })
  @IsISO8601({ strict: true }, { message: 'Data/hora da atividade inválida' })
  occurs_at!: string;
}

export class UpdateActivityDto extends PartialType(CreateActivityDto) {
  @ApiPropertyOptional({ example: 'Passeio até a praia (editado)' })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'O nome da atividade é obrigatório' })
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({ example: '2026-11-12T11:30:00.000Z' })
  @IsOptional()
  @IsISO8601({ strict: true }, { message: 'Data/hora da atividade inválida' })
  occurs_at?: string;
}
