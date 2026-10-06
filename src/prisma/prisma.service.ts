import { Injectable, OnApplicationShutdown } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnApplicationShutdown {
  // Conexão é lazy (na primeira query) — rotas sem DB (health, docs) funcionam sem Postgres.
  async onApplicationShutdown() {
    await this.$disconnect();
  }
}
