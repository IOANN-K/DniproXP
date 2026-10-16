import { Column,CreateDateColumn,Entity,PrimaryGeneratedColumn } from 'typeorm';
import type { GenerationRequest,GeneratedPayload } from './generation.schema.js';
export type GenerationStatus = 'RUNNING' | 'SUCCEEDED' | 'FAILED';
@Entity('ai_generation_sessions')
export class AiGenerationSession {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid',name: 'user_id' }) userId: string;
  @Column({ type: 'uuid',name: 'organization_id',nullable: true }) organizationId: string | null;
  @Column({ type: 'uuid',name: 'idempotency_key' }) idempotencyKey: string;
  @Column({ type: 'varchar',name: 'request_hash' }) requestHash: string;
  @Column({ type: 'jsonb',nullable: true }) request: GenerationRequest | null;
  @Column({ type: 'varchar' }) provider: string;
  @Column({ type: 'varchar' }) model: string;
  @Column({ type: 'varchar' }) status: GenerationStatus;
  @Column({ type: 'varchar',name: 'error_code',nullable: true }) errorCode: string | null;
  @Column({ type: 'integer' }) attempts: number;
  @Column({ type: 'boolean',name: 'is_fixture' }) isFixture: boolean;
  @Column({ type: 'timestamptz',name: 'lease_expires_at' }) leaseExpiresAt: Date;
  @Column({ type: 'timestamptz',name: 'retention_at' }) retentionAt: Date;
  @Column({ type: 'timestamptz',name: 'completed_at',nullable: true }) completedAt: Date | null;
  @CreateDateColumn({ type: 'timestamptz',name: 'created_at' }) createdAt: Date;
}
@Entity('ai_quest_suggestions')
export class AiQuestSuggestion {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid',name: 'session_id' }) sessionId: string;
  @Column({ type: 'integer' }) position: number;
  @Column({ type: 'jsonb',nullable: true }) payload: GeneratedPayload | null;
  @Column({ type: 'varchar',name: 'validation_status' }) validationStatus: 'VALIDATED';
  @Column({ type: 'timestamptz',name: 'saved_at',nullable: true }) savedAt: Date | null;
  @Column({ type: 'uuid',name: 'converted_quest_id',nullable: true }) convertedQuestId: string | null;
  @CreateDateColumn({ type: 'timestamptz',name: 'created_at' }) createdAt: Date;
}
