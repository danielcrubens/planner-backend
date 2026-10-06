import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import { AppModule } from './app.module.js';
import { getEnv } from './config/env.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const env = getEnv();

  app.use(helmet());
  app.use(cookieParser());
  app.use(
    pinoHttp({
      redact: {
        paths: ['req.headers.authorization', 'req.body.password', 'req.body.email', 'res.headers["set-cookie"]'],
        censor: '[REDACTED]',
      },
      autoLogging: { ignore: (req) => req.url === '/api/health' },
    }),
  );
  app.enableCors({
    origin: env.CORS_ORIGINS.split(',').map((o) => o.trim()),
    credentials: true,
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // remove propriedades fora do DTO
      forbidNonWhitelisted: true, // rejeita payload com propriedades extras
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('plann.er API')
    .setDescription('Backend do planejador de viagens plann.er')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  await app.listen(env.PORT);
}

await bootstrap();
