export default async function globalTeardown() {
  await globalThis.__EMBEDDED_PG__?.stop();
}
