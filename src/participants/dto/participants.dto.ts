import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsEmail } from 'class-validator';

export class InviteDto {
  @ApiProperty({ type: [String], example: ['amigo@example.com'] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsEmail({}, { each: true, message: 'Um dos e-mails de convite não é válido' })
  emails!: string[];
}
