import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { loadConfig } from './config/configuration';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  configureApp(app);
  // Lets Kubernetes stop the pod cleanly (close sockets and the database connection) on SIGTERM.
  app.enableShutdownHooks();
  const { port } = loadConfig();
  await app.listen(port, '0.0.0.0');
  console.log(`HelloJess API listening on http://localhost:${port}`);
}

void bootstrap();
