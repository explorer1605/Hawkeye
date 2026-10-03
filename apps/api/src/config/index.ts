import { z } from 'zod';

const ConfigSchema = z.object({
  PORT: z.coerce.number().default(8000),
  HOST: z.string().default('0.0.0.0'),
  CORS_ORIGIN: z.string().default('*'),
});

export const config = ConfigSchema.parse({
  PORT: process.env.PORT,
  HOST: process.env.HOST,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
});
