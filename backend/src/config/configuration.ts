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
    // The phone app stays logged in for about a month, then asks for the password and a new email code.
    mobileTokenExpiresInSeconds: Number(env.MOBILE_TOKEN_EXPIRE_DAYS ?? 30) * 24 * 3600,
    // Where verification codes are emailed from. Leave SMTP_HOST empty in development: codes are then printed in the server log.
    smtp: {
      host: env.SMTP_HOST ?? '',
      port: Number(env.SMTP_PORT ?? 587),
      user: env.SMTP_USER ?? '',
      pass: env.SMTP_PASS ?? '',
      from: env.MAIL_FROM ?? 'HelloJess <no-reply@hellojess.local>',
    },
  };
}

export type AppConfig = ReturnType<typeof loadConfig>;
export const APP_CONFIG = 'APP_CONFIG';
