import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module.js';

// Smoke e2e sem banco: valida wiring de rotas, guards e ValidationPipe.
// Fluxos com DB (register → trips → activities) rodam contra o Postgres do docker compose.

describe('API (e2e smoke)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/health → 200', async () => {
    const res = await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('POST /api/trips sem token → 401', async () => {
    await request(app.getHttpServer())
      .post('/api/trips')
      .send({ destination: 'Floripa', starts_at: '2026-11-10', ends_at: '2026-11-15' })
      .expect(401);
  });

  it('POST /api/auth/register com payload inválido → 400 listando erros', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email: 'nao-e-email' })
      .expect(400);
    expect(Array.isArray(res.body.message)).toBe(true);
  });
});
