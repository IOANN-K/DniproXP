import { Column,CreateDateColumn,Entity,PrimaryGeneratedColumn,UpdateDateColumn } from 'typeorm';
export const rewardCategories = ['Напої та їжа','Екотовари','Враження','Мерч'] as const;
export type RewardCategory = typeof rewardCategories[number];
export type RedemptionStatus = 'requested' | 'reserved' | 'fulfilled' | 'cancelled' | 'refunded';
@Entity('reward_catalog_items')
export class RewardCatalogItem {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid',name: 'organization_id',nullable: true }) organizationId: string | null;
  @Column({ type: 'varchar' }) title: string;
  @Column({ type: 'text' }) description: string;
  @Column({ type: 'text' }) details: string;
  @Column({ type: 'varchar',nullable: true }) image: string | null;
  @Column({ type: 'varchar' }) category: RewardCategory;
  @Column({ type: 'integer',name: 'price_points' }) pricePoints: number;
  @Column({ type: 'integer' }) stock: number;
  @Column({ type: 'varchar' }) status: 'ACTIVE' | 'UNAVAILABLE' | 'ARCHIVED';
  @Column({ type: 'varchar' }) visibility: 'PUBLIC' | 'PRIVATE';
  @Column({ type: 'text',name: 'redemption_rules' }) redemptionRules: string;
  @Column({ type: 'boolean',name: 'is_demo' }) isDemo: boolean;
  @Column({ type: 'varchar',name: 'seed_key',nullable: true,select: false }) seedKey: string | null;
  @CreateDateColumn({ type: 'timestamptz',name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ type: 'timestamptz',name: 'updated_at' }) updatedAt: Date;
}
@Entity('reward_redemptions')
export class RewardRedemption {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid',name: 'user_id' }) userId: string;
  @Column({ type: 'uuid',name: 'reward_id' }) rewardId: string;
  @Column({ type: 'uuid',name: 'organization_id',nullable: true }) organizationId: string | null;
  @Column({ type: 'uuid',name: 'idempotency_key' }) idempotencyKey: string;
  @Column({ type: 'integer',name: 'price_points' }) pricePoints: number;
  @Column({ type: 'varchar',name: 'reward_title' }) rewardTitle: string;
  @Column({ type: 'boolean',name: 'is_demo' }) isDemo: boolean;
  @Column({ type: 'varchar' }) status: RedemptionStatus;
  @Column({ type: 'uuid',name: 'debit_ledger_id',nullable: true }) debitLedgerId: string | null;
  @Column({ type: 'uuid',name: 'refund_ledger_id',nullable: true }) refundLedgerId: string | null;
  @Column({ type: 'timestamptz',name: 'reserved_at',nullable: true }) reservedAt: Date | null;
  @Column({ type: 'timestamptz',name: 'fulfilled_at',nullable: true }) fulfilledAt: Date | null;
  @Column({ type: 'timestamptz',name: 'cancelled_at',nullable: true }) cancelledAt: Date | null;
  @Column({ type: 'text',name: 'cancellation_reason',nullable: true }) cancellationReason: string | null;
  @CreateDateColumn({ type: 'timestamptz',name: 'created_at' }) createdAt: Date;
}
@Entity('reward_redemption_history')
export class RewardRedemptionHistory {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ type: 'uuid',name: 'redemption_id' }) redemptionId: string;
  @Column({ type: 'uuid',name: 'actor_user_id' }) actorUserId: string;
  @Column({ type: 'varchar' }) status: RedemptionStatus;
  @Column({ type: 'text',nullable: true }) reason: string | null;
  @CreateDateColumn({ type: 'timestamptz',name: 'created_at' }) createdAt: Date;
}
