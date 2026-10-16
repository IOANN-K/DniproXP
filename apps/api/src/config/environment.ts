import { z } from 'zod';

const integer = (fallback: number, min: number, max: number) =>
  z.coerce.number().int().min(min).max(max).default(fallback);
const secret = z
  .string()
  .min(48)
  .refine(
    (value) => !/^(change|replace|example|your[_-])/i.test(value),
    'Generate an independent random secret',
  );
const blankToUndefined = (value: unknown): unknown =>
  value === '' ? undefined : value;
const schema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    API_PORT: integer(3000, 1, 65535),
    DATABASE_URL: z.preprocess(blankToUndefined, z.url().optional()),
    DB_HOST: z.string().min(1).default('localhost'),
    DB_PORT: integer(5434, 1, 65535),
    DB_USER: z.preprocess(blankToUndefined, z.string().min(1).optional()),
    DB_PASSWORD: z.preprocess(blankToUndefined, z.string().min(1).optional()),
    DB_NAME: z.preprocess(blankToUndefined, z.string().min(1).optional()),
    DB_SSL: z.enum(['true', 'false']).default('false'),
    DB_SSL_CA: z.string().optional(),
    JWT_ACCESS_SECRET: secret,
    JWT_REFRESH_SECRET: secret,
    JWT_ACCESS_TTL: integer(900, 60, 1800),
    JWT_REFRESH_TTL: integer(2592000, 3600, 7776000),
    JWT_ISSUER: z.string().min(1).default('dniproxp-api'),
    JWT_AUDIENCE: z.string().min(1).default('dniproxp-web'),
    CORS_ORIGINS: z.string().min(1),
    COOKIE_SECURE: z.enum(['true', 'false']).default('true'),
    COOKIE_SAME_SITE: z.enum(['strict', 'lax', 'none']).default('lax'),
    SWAGGER_ENABLED: z.enum(['true', 'false']).default('false'),
    TRUST_PROXY_HOPS: integer(0, 0, 5),
  })
  .superRefine((env, ctx) => {
    if (!env.DATABASE_URL && (!env.DB_USER || !env.DB_PASSWORD || !env.DB_NAME))
      ctx.addIssue({
        code: 'custom',
        path: ['DATABASE_URL'],
        message: 'Provide DATABASE_URL or DB_USER/DB_PASSWORD/DB_NAME',
      });
    if (env.DATABASE_URL && !/^postgres(ql)?:/.test(env.DATABASE_URL))
      ctx.addIssue({
        code: 'custom',
        path: ['DATABASE_URL'],
        message: 'Expected PostgreSQL URL',
      });
    if (env.DATABASE_URL) {
      try {
        const url = new URL(env.DATABASE_URL);
        if (
          [
            'ssl',
            'sslmode',
            'sslcert',
            'sslkey',
            'sslrootcert',
            'sslpassword',
          ].some((key) => url.searchParams.has(key))
        )
          ctx.addIssue({
            code: 'custom',
            path: ['DATABASE_URL'],
            message:
              'Configure TLS only through DB_SSL/DB_SSL_CA, not URL query parameters',
          });
      } catch {
        /* URL validation above reports malformed input. */
      }
    }
    if (env.NODE_ENV === 'production' && env.DB_SSL !== 'true')
      ctx.addIssue({
        code: 'custom',
        path: ['DB_SSL'],
        message: 'Production database requires verified TLS',
      });
    if (env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET)
      ctx.addIssue({
        code: 'custom',
        path: ['JWT_REFRESH_SECRET'],
        message: 'Access and refresh secrets must differ',
      });
    if (
      (env.NODE_ENV === 'production' || env.COOKIE_SAME_SITE === 'none') &&
      env.COOKIE_SECURE !== 'true'
    )
      ctx.addIssue({
        code: 'custom',
        path: ['COOKIE_SECURE'],
        message: 'Secure cookies are required',
      });
    const origins = env.CORS_ORIGINS.split(',').map((s) => s.trim());
    for (const origin of origins) {
      try {
        const url = new URL(origin);
        if (
          url.origin !== origin ||
          !['http:', 'https:'].includes(url.protocol) ||
          (env.NODE_ENV === 'production' && url.protocol !== 'https:')
        )
          throw new Error();
      } catch {
        ctx.addIssue({
          code: 'custom',
          path: ['CORS_ORIGINS'],
          message: 'Use exact HTTP(S) origins; production requires HTTPS',
        });
      }
    }
    if (env.NODE_ENV === 'production' && env.SWAGGER_ENABLED === 'true')
      ctx.addIssue({
        code: 'custom',
        path: ['SWAGGER_ENABLED'],
        message: 'Public Swagger is disabled in production',
      });
  });
export type Environment = z.infer<typeof schema>;
export function parseEnvironment(input: Record<string, unknown>): Environment {
  const result = schema.safeParse({
    ...input,
    API_PORT: input.API_PORT ?? input.PORT,
    DB_USER: input.DB_USER ?? input.DB_USERNAME,
    DB_NAME: input.DB_NAME ?? input.DB_DATABASE,
  });
  if (!result.success)
    throw new Error(
      `Invalid environment: ${result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`,
    );
  return result.data;
}
