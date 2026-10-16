import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Check,
  Unique,
  Index,
} from 'typeorm';
import { Role, UserStatus } from './domain.js';
@Unique('users_seed_key_key', ['seedKey'])
@Index('users_email_ci_unique', { synchronize: false })
@Check('users_email_normalized', 'email = lower(btrim(email))')
@Check('users_status_check', "status IN ('ACTIVE','SUSPENDED','DEACTIVATED')")
@Check(
  'users_roles_valid',
  "cardinality(roles) >= 1 AND roles <@ ARRAY['VOLUNTEER','ORGANIZER','ADMIN']::text[] AND primary_role = ANY(roles)",
)
@Check(
  'users_display_name_valid',
  'length(btrim(display_name)) BETWEEN 2 AND 80',
)
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'varchar', length: 254 }) email: string;
  @Column({ type: 'text', name: 'password_hash', select: false })
  passwordHash: string;
  @Column({ type: 'varchar', length: 80, name: 'display_name' })
  displayName: string;
  @Column({ type: 'text', nullable: true, name: 'avatar_url' }) avatarUrl:
    string | null;
  @Column({ type: 'text', nullable: true }) bio: string | null;
  @Column({ type: 'varchar', default: UserStatus.ACTIVE }) status: UserStatus;
  @Column({
    type: 'text',
    array: true,
    default: () => "ARRAY['VOLUNTEER']::text[]",
  })
  roles: Role[];
  @Column({ type: 'varchar', name: 'primary_role', default: Role.VOLUNTEER })
  primaryRole: Role;
  @Column({ type: 'text', name: 'seed_key', nullable: true, select: false })
  seedKey: string | null;
  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
  @Column({ type: 'timestamptz', nullable: true, name: 'last_login_at' })
  lastLoginAt: Date | null;
}
