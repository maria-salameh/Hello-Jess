// End-to-end tests run against a real PostgreSQL. In CI a service container is provided through
// TEST_DATABASE_URL; otherwise a throwaway PostgreSQL is started locally with the embedded-postgres package
// (no Docker needed) and removed afterwards.
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export default async function globalSetup() {
  if (process.env.TEST_DATABASE_URL) {
    process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
    return;
  }

  const { default: EmbeddedPostgres } = await import('embedded-postgres');
  const port = 54000 + Math.floor(Math.random() * 1000);
  const pg = new EmbeddedPostgres({
    databaseDir: mkdtempSync(join(tmpdir(), 'hellojess-pg-')),
    user: 'postgres',
    password: 'postgres',
    port,
    persistent: false,
  });
  await pg.initialise();
  await pg.start();
  await pg.createDatabase('hellojess_test');

  globalThis.__EMBEDDED_PG__ = pg;
  process.env.DATABASE_URL = `postgres://postgres:postgres@localhost:${port}/hellojess_test`;
}
