import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Check,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { User } from './user.entity.js';
@Index('audit_actor_date', { synchronize: false })
@Index('audit_target_date', { synchronize: false })
@Check('audit_logs_metadata_check', "jsonb_typeof(metadata) = 'object'")
@Entity('audit_logs')
export class AuditLog {
  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({
    name: 'actor_user_id',
    foreignKeyConstraintName: 'audit_logs_actor_user_id_fkey',
  })
  actor: Relation<User> | null;
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', nullable: true, name: 'actor_user_id' }) actorUserId:
    string | null;
  @Column({ type: 'varchar', length: 80 }) action: string;
  @Column({ type: 'varchar', length: 80, name: 'target_type' })
  targetType: string;
  @Column({ type: 'uuid', nullable: true, name: 'target_id' }) targetId:
    string | null;
  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" }) metadata: Record<
    string,
    string | number | boolean | null
  >;
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
