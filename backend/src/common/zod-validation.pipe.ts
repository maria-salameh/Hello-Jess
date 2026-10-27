import { PipeTransform, UnprocessableEntityException } from '@nestjs/common';
import type { ZodType } from 'zod';

export type FieldError = { field: string; message: string };

export function validationException(errors: FieldError[]) {
  return new UnprocessableEntityException({ detail: 'Validation failed', errors });
}

// Validates a body or query with a zod schema. Failures answer 422 with the list of fields in error,
// for example { detail: "Validation failed", errors: [{ field: "title", message: "title must not be empty" }] }.
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(
    private readonly schema: ZodType<T>,
    private readonly source = 'body',
  ) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value ?? {});
    if (!result.success) {
      throw validationException(
        result.error.issues.map((issue) => ({ field: issue.path.join('.') || this.source, message: issue.message })),
      );
    }
    return result.data;
  }
}
