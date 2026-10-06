import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'Daniel Rubens' })
  @IsString()
  @MinLength(3, { message: 'O nome deve ter no mínimo 3 caracteres' })
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'daniel@example.com' })
  @IsEmail({}, { message: 'O e-mail fornecido não é válido' })
  @MaxLength(255)
  email!: string;

  @ApiProperty({ example: 'senha-segura-123', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres' })
  @MaxLength(72) // limite do argon2/bcrypt
  password!: string;
}

export class LoginDto {
  @ApiProperty({ example: 'daniel@example.com' })
  @IsEmail({}, { message: 'O e-mail fornecido não é válido' })
  email!: string;

  @ApiProperty({ example: 'senha-segura-123' })
  @IsString()
  password!: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'daniel@example.com' })
  @IsEmail({}, { message: 'O e-mail fornecido não é válido' })
  email!: string;
}

export class MagicLinkDto {
  @ApiProperty({ example: 'convidado@exemplo.com' })
  @IsEmail({}, { message: 'O e-mail fornecido não é válido' })
  email!: string;

  /** Caminho interno para onde o link deve levar depois do clique (ex.: /invite/...) */
  @ApiPropertyOptional({ example: '/invite/abc' })
  @IsOptional()
  @IsString()
  @Matches(/^\//, { message: 'redirect deve ser um caminho interno começando com /' })
  @MaxLength(500)
  redirect?: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: '9f1c...' })
  @IsString()
  token!: string;

  @ApiProperty({ example: 'nova-senha-segura', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres' })
  @MaxLength(72)
  password!: string;
}
