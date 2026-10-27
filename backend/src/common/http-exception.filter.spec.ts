import { ArgumentsHost, ForbiddenException, Logger, UnauthorizedException } from '@nestjs/common';
import { ApiExceptionFilter } from './http-exception.filter';
import { ZodValidationPipe } from './zod-validation.pipe';
import { z } from 'zod';

function run(exception: unknown) {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn(), setHeader: jest.fn() };
  const host = { switchToHttp: () => ({ getResponse: () => res }) } as unknown as ArgumentsHost;
  new ApiExceptionFilter().catch(exception, host);
  return res;
}

describe('ApiExceptionFilter', () => {
  it('keeps the { detail } shape, and adds WWW-Authenticate on 401', () => {
    const res = run(new UnauthorizedException({ detail: 'Not authenticated' }));
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ detail: 'Not authenticated' });
    expect(res.setHeader).toHaveBeenCalledWith('WWW-Authenticate', 'Bearer');
  });

  it('turns plain Nest exceptions into { detail }', () => {
    const res = run(new ForbiddenException('nope'));
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ detail: 'nope' });
  });

  it('answers 400 for invalid JSON bodies and hides the details of unexpected errors', () => {
    expect(run({ type: 'entity.parse.failed' }).json).toHaveBeenCalledWith({ detail: 'Invalid JSON body' });
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const res = run(new Error('db password is hunter2'));
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ detail: 'Internal server error' });
  });
});

describe('ZodValidationPipe', () => {
  const pipe = new ZodValidationPipe(z.object({ title: z.string().min(1, 'title must not be empty') }));

  it('returns the parsed value', () => {
    expect(pipe.transform({ title: 'ok', extra: 1 })).toEqual({ title: 'ok' });
  });

  it('throws a 422 with the list of fields in error', () => {
    try {
      pipe.transform({ title: '' });
      fail('should have thrown');
    } catch (err) {
      expect((err as { getStatus(): number }).getStatus()).toBe(422);
      expect((err as { getResponse(): unknown }).getResponse()).toEqual({
        detail: 'Validation failed',
        errors: [{ field: 'title', message: 'title must not be empty' }],
      });
    }
  });
});
