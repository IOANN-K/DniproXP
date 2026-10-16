import type { ValidationError } from 'class-validator';
import { DomainError } from './http.js';
export function validationException(errors: ValidationError[]): DomainError {
  const fields: Record<string, string[]> = {};
  function visit(items: ValidationError[], prefix = ''): void {
    for (const item of items) {
      const path = prefix ? `${prefix}.${item.property}` : item.property;
      if (item.constraints) fields[path] = Object.values(item.constraints);
      if (item.children?.length) visit(item.children, path);
    }
  }
  visit(errors);
  return new DomainError(422, 'VALIDATION_FAILED', 'Перевір поля запиту.', {
    fields,
  });
}
