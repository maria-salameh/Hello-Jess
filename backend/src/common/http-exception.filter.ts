import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';

// Keeps the API error shape used by the web and mobile apps: { detail: string, errors?: [...] }.
@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ApiExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      if (status === HttpStatus.UNAUTHORIZED) res.setHeader('WWW-Authenticate', 'Bearer');
      if (typeof body === 'object' && body !== null && 'detail' in body) return res.status(status).json(body);
      const message = typeof body === 'string' ? body : ((body as { message?: unknown }).message ?? exception.message);
      // body-parser's JSON.parse failure reaches us as a 400 carrying the engine's own wording.
      if (status === HttpStatus.BAD_REQUEST && typeof message === 'string' && /JSON/.test(message)) {
        return res.status(status).json({ detail: 'Invalid JSON body' });
      }
      return res.status(status).json({ detail: Array.isArray(message) ? message.join(', ') : message });
    }

    // Body-parser failures (invalid JSON) carry their own status.
    const parseError = exception as { type?: string };
    if (parseError?.type === 'entity.parse.failed') return res.status(400).json({ detail: 'Invalid JSON body' });

    this.logger.error(exception instanceof Error ? (exception.stack ?? exception.message) : String(exception));
    return res.status(500).json({ detail: 'Internal server error' });
  }
}
