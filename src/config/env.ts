import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

loadDotenv({ quiet: true });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL é obrigatório'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET deve ter no mínimo 32 caracteres'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET deve ter no mínimo 32 caracteres'),
  JWT_ACCESS_EXPIRES_SECONDS: z.coerce.number().default(900), // 15 min
  JWT_REFRESH_EXPIRES_DAYS: z.coerce.number().default(30),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().optional(),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),

  CORS_ORIGINS: z.string().default('http://localhost:5173'),

  RESEND_API_KEY: z.string().optional(),
  MAIL_FROM: z.string().default('plann.er <no-reply@planner.local>'),
});

export type Env = z.infer<typeof envSchema>;

let env: Env;

/** Valida o process.env na inicialização — a app não sobe com config inválida. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Variáveis de ambiente inválidas: ${details}`);
  }
  env = parsed.data;
  return env;
}

export function getEnv(): Env {
  if (!env) loadEnv();
  return env;
}
