// Everything the app reads from the environment, in one place.
export function loadConfig() {
  const env = process.env;
  return {
    port: Number(env.PORT ?? 8000),
    databaseUrl: env.DATABASE_URL ?? 'postgres://hellojess:hellojess@localhost:5432/hellojess',
    corsOrigin: env.CORS_ORIGIN ?? '*',
    secretKey: env.SECRET_KEY ?? 'dev-only-secret-change-me',
    tokenExpiresInSeconds: Number(env.ACCESS_TOKEN_EXPIRE_MINUTES ?? 10080) * 60,
    synchronize: (env.DB_SYNCHRONIZE ?? 'true') === 'true',
  };
}

export type AppConfig = ReturnType<typeof loadConfig>;
export const APP_CONFIG = 'APP_CONFIG';
