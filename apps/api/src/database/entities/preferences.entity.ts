import { Column, Entity, PrimaryColumn, JoinColumn, OneToOne } from 'typeorm';
import type { Relation } from 'typeorm';
import { User } from './user.entity.js';
@Entity('user_preferences')
export class UserPreferences {
  @OneToOne(() => User, { onDelete: 'CASCADE', nullable: false })
  @JoinColumn({
    name: 'user_id',
    foreignKeyConstraintName: 'user_preferences_user_id_fkey',
  })
  user: Relation<User>;
  @PrimaryColumn({ type: 'uuid', name: 'user_id' }) userId: string;
  @Column({ type: 'boolean', default: false, name: 'public_profile' })
  publicProfile: boolean;
  @Column({ type: 'boolean', default: true, name: 'show_display_name' })
  showDisplayName: boolean;
  @Column({ type: 'boolean', default: false, name: 'show_activity_history' })
  showActivityHistory: boolean;
  @Column({ type: 'boolean', default: false, name: 'show_teams' })
  showTeams: boolean;
  @Column({ type: 'boolean', default: false, name: 'show_verified_hours' })
  showVerifiedHours: boolean;
  @Column({ type: 'boolean', default: false, name: 'show_achievements' })
  showAchievements: boolean;
  @Column({ type: 'boolean', default: false, name: 'show_skill_progress' })
  showSkillProgress: boolean;
  @Column({ type: 'boolean', default: false, name: 'show_organizations' })
  showOrganizations: boolean;
}
