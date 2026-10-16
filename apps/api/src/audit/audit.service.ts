import { Injectable } from '@nestjs/common';
import type { EntityManager } from 'typeorm';
import { AuditLog } from '../database/entities/audit.entity.js';
@Injectable()
export class AuditService {
  record(
    manager: EntityManager,
    actorUserId: string | null,
    action: string,
    targetType: string,
    targetId: string | null,
    metadata: AuditLog['metadata'] = {},
  ): Promise<AuditLog> {
    return manager.save(
      AuditLog,
      manager.create(AuditLog, {
        actorUserId,
        action,
        targetType,
        targetId,
        metadata,
      }),
    );
  }
}
