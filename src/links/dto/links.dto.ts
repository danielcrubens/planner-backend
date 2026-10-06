import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUrl, MaxLength, MinLength } from 'class-validator';

export class CreateLinkDto {
  @ApiProperty({ example: 'Reserva do AirBnB' })
  @IsString()
  @MinLength(1, { message: 'O título do link é obrigatório' })
  @MaxLength(255)
  title!: string;

  @ApiProperty({ example: 'https://www.airbnb.com.br/rooms/104700011' })
  @IsUrl({ require_tld: false }, { message: 'URL inválida' })
  url!: string;
}
