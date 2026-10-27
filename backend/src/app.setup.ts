import type { INestApplication } from '@nestjs/common';
import { ApiExceptionFilter } from './common/http-exception.filter';
import { loadConfig } from './config/configuration';

// Shared by main.ts and the end-to-end tests so both run the same app.
export function configureApp(app: INestApplication) {
  app.setGlobalPrefix('api', { exclude: ['health'] });
  app.enableCors({ origin: loadConfig().corsOrigin });
  app.useGlobalFilters(new ApiExceptionFilter());
}
