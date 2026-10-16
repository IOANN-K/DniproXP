import { Injectable } from '@nestjs/common';
import { validateOutput } from './generation.schema.js';
import type { GenerationInput } from './generation.schema.js';
@Injectable()
export class GeneratedQuestValidator {
  validate(value: unknown,input: GenerationInput,count: number) {
    return validateOutput(value,input,count);
  }
}
