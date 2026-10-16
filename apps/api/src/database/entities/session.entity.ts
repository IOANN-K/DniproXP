import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Check,
  Unique,
} from 'typeorm';
import type { Relation } from 'typeorm';
import { User } from './user.entity.js';
@Index('sessions_user_active', ['userId'], { where: 'revoked_at IS NULL' })
@Check('auth_sessions_check', 'expires_at > created_at')
@Entity('auth_sessions')
export class AuthSession {
  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'auth_sessions_user_id_fkey',
  })
  user: Relation<User>;
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', name: 'user_id' }) userId: string;
  @Column({ type: 'timestamptz', name: 'expires_at' }) expiresAt: Date;
  @Column({ type: 'timestamptz', nullable: true, name: 'revoked_at' })
  revokedAt: Date | null;
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
@Index('refresh_tokens_session', ['sessionId'])
@Unique('refresh_tokens_verifier_key', ['verifier'])
@Check('refresh_tokens_check', 'expires_at > created_at')
@Entity('refresh_tokens')
export class RefreshToken {
  @ManyToOne(() => AuthSession, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({
    name: 'session_id',
    foreignKeyConstraintName: 'refresh_tokens_session_id_fkey',
  })
  session: Relation<AuthSession>;
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid', name: 'session_id' }) sessionId: string;
  @Column({ type: 'varchar', length: 64 }) verifier: string;
  @Column({ type: 'timestamptz', name: 'expires_at' }) expiresAt: Date;
  @Column({ type: 'timestamptz', nullable: true, name: 'consumed_at' })
  consumedAt: Date | null;
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
