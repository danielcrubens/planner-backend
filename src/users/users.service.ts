import { Injectable, NotFoundException } from '@nestjs/common';
import type { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

export type PublicUser = Omit<User, 'passwordHash'>;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  create(data: { name: string; email: string; passwordHash?: string | null; googleId?: string | null }) {
    return this.prisma.user.create({
      data: { ...data, email: data.email.toLowerCase().trim() },
    });
  }

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  }

  async findById(id: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado');
    return this.strip(user);
  }

  async updateName(id: string, name: string): Promise<PublicUser> {
    await this.prisma.user.update({ where: { id }, data: { name } });
    return this.findById(id);
  }

  /** Uso interno: reset de senha e vínculo de provedores (Google). */
  updateRaw(id: string, data: { passwordHash?: string; googleId?: string }) {
    return this.prisma.user.update({ where: { id }, data });
  }

  private strip(user: User): PublicUser {
    const { passwordHash: _ignored, ...publicUser } = user;
    return publicUser;
  }
}
