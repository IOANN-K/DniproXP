import { Injectable, OnModuleInit } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { argon2id, hash, verify } from 'argon2';
@Injectable()
export class PasswordService implements OnModuleInit {
  private dummyHash: string;
  async onModuleInit(): Promise<void> {
    this.dummyHash = await this.hash(randomBytes(32).toString('hex'));
  }
  hash(password: string): Promise<string> {
    return hash(password, {
      type: argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    });
  }
  async matches(
    passwordHash: string | undefined,
    password: string,
  ): Promise<boolean> {
    const encoded = passwordHash ?? this.dummyHash;
    if (!encoded) throw new Error('Password service has not initialized');
    try {
      const valid = await verify(encoded, password);
      return passwordHash !== undefined && valid;
    } catch {
      return false;
    }
  }
}
