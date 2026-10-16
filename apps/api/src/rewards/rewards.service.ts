import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import type { EntityManager } from 'typeorm';
import { AuditService } from '../audit/audit.service.js';
import { LedgerService } from '../ledger/ledger.service.js';
import { DomainError } from '../common/http.js';
import { OrganizationAccess } from '../organizations/organization-access.service.js';
import { Organization } from '../database/entities/organization.entity.js';
import { User } from '../database/entities/user.entity.js';
import { Role,UserStatus,ModerationStatus } from '../database/entities/domain.js';
import { rows,numeric } from '../progress/sql.js';
import { RewardCatalogItem,RewardRedemption,RewardRedemptionHistory } from './reward.entity.js';
import type { RedemptionStatus } from './reward.entity.js';
import type { RewardDto,RewardPageDto,RewardFormDto,UpdateRewardDto,RewardQueryDto,RewardHistoryQueryDto,RedemptionDto,RedemptionPageDto,RedemptionResultDto,FulfillmentPageDto } from './rewards.dto.js';
const usedStock = `(SELECT count(*)::integer FROM reward_redemptions r WHERE r.reward_id=i.id AND r.status IN ('reserved','fulfilled'))`;
const publicScope = `(i.visibility='PUBLIC' AND i.status<>'ARCHIVED' AND (i.organization_id IS NULL OR EXISTS(SELECT 1 FROM organizations o WHERE o.id=i.organization_id AND o.moderation_status='approved')))`;
function redemptionView(r: RewardRedemption): RedemptionDto {
  return { id: r.id,rewardId: r.rewardId,rewardTitle: r.rewardTitle,pricePoints: r.pricePoints,status: r.status,isDemo: r.isDemo,createdAt: r.createdAt.toISOString(),reservedAt: r.reservedAt?.toISOString() ?? null,fulfilledAt: r.fulfilledAt?.toISOString() ?? null,cancelledAt: r.cancelledAt?.toISOString() ?? null,cancellationReason: r.cancellationReason };
}
@Injectable()
export class RewardsService {
  constructor(private readonly source: DataSource,private readonly ledger: LedgerService,private readonly access: OrganizationAccess,private readonly audit: AuditService) {}
  private async actor(m: EntityManager,id: string) {
    const user = await m.findOneBy(User,{ id,status: UserStatus.ACTIVE });if (!user) throw new DomainError(403,'FORBIDDEN','Обліковий запис недоступний.');return user;
  }
  private async manage(m: EntityManager,userId: string,organizationId: string | null) {
    const user = await this.actor(m,userId);
    if (user.roles.includes(Role.ADMIN)) return;
    if (!organizationId || !user.roles.includes(Role.ORGANIZER)) throw new DomainError(403,'FORBIDDEN','Потрібні права адміністратора або партнера.');
    await this.access.requireCapability(m,organizationId,userId,'manage');
  }
  private async consumed(m: EntityManager,id: string) {
    const result = rows(await m.query("SELECT count(*)::text AS used FROM reward_redemptions WHERE reward_id=$1 AND status IN ('reserved','fulfilled')",[id]));return numeric(result[0]?.used);
  }
  private async view(m: EntityManager,item: RewardCatalogItem): Promise<RewardDto> {
    const available = item.stock-await this.consumed(m,item.id);
    const org = item.organizationId ? await m.findOneBy(Organization,{ id: item.organizationId }) : null;
    return { id: item.id,organizationId: item.organizationId,title: item.title,name: item.title,description: item.description,details: item.details,image: item.image,category: item.category,pricePoints: item.pricePoints,cost: item.pricePoints,stock: available,stockTotal: item.stock,availability: item.visibility === 'PUBLIC' && item.status === 'ACTIVE' && available>0 && (!item.organizationId || org?.moderationStatus === ModerationStatus.APPROVED),status: item.status,visibility: item.visibility,redemptionRules: item.redemptionRules,isDemo: item.isDemo,createdAt: item.createdAt.toISOString(),updatedAt: item.updatedAt.toISOString() };
  }
  list(q: RewardQueryDto): Promise<RewardPageDto> {
    return this.source.transaction('REPEATABLE READ',async m => {
      const query = m.createQueryBuilder(RewardCatalogItem,'i').where(publicScope);
      if (q.category) query.andWhere('i.category=:category',{ category: q.category });
      if (q.maxCost !== undefined) query.andWhere('i.price_points<=:cost',{ cost: q.maxCost });
      if (q.search) query.andWhere('(i.title ILIKE :search OR i.description ILIKE :search)',{ search: `%${q.search.replace(/[\\%_]/g,'\\$&')}%` });
      if (q.available) query.andWhere(q.available === 'true' ? `i.status='ACTIVE' AND i.stock>${usedStock}` : `(i.status<>'ACTIVE' OR i.stock<=${usedStock})`);
      const [items,total] = await query.orderBy('i.createdAt',q.order).addOrderBy('i.id',q.order).skip((q.page-1)*q.pageSize).take(q.pageSize).getManyAndCount();
      return { items: await this.pageViews(m,items),total,page: q.page,pageSize: q.pageSize };
    });
  }
  private async pageViews(m: EntityManager,items: RewardCatalogItem[]): Promise<RewardDto[]> {
      // Batch availability for the page; no per-item queries.
      const ids = items.map(i => i.id),counts = ids.length ? rows(await m.query("SELECT reward_id,count(*)::text AS used FROM reward_redemptions WHERE reward_id=ANY($1::uuid[]) AND status IN ('reserved','fulfilled') GROUP BY reward_id",[ids])) : [];
      const orgIds = [...new Set(items.flatMap(i => i.organizationId ? [i.organizationId] : []))];
      const approved = orgIds.length ? rows(await m.query("SELECT id FROM organizations WHERE id=ANY($1::uuid[]) AND moderation_status='approved'",[orgIds])) : [];
      return items.map(i => { const found = counts.find(r => r.reward_id === i.id),stock = i.stock-(found ? numeric(found.used) : 0);return { id: i.id,organizationId: i.organizationId,title: i.title,name: i.title,description: i.description,details: i.details,image: i.image,category: i.category,pricePoints: i.pricePoints,cost: i.pricePoints,stock,stockTotal: i.stock,availability: i.visibility === 'PUBLIC' && i.status === 'ACTIVE' && stock>0 && (!i.organizationId || approved.some(o => o.id === i.organizationId)),status: i.status,visibility: i.visibility,redemptionRules: i.redemptionRules,isDemo: i.isDemo,createdAt: i.createdAt.toISOString(),updatedAt: i.updatedAt.toISOString() }; });
  }
  managedList(actorId: string,organizationId: string | null,q: RewardHistoryQueryDto): Promise<RewardPageDto> {
    return this.source.transaction('REPEATABLE READ',async m => {
      await this.manage(m,actorId,organizationId);
      const query = m.createQueryBuilder(RewardCatalogItem,'i');
      if (organizationId) query.where('i.organization_id=:organizationId',{ organizationId });
      const [items,total] = await query.orderBy('i.createdAt',q.order).addOrderBy('i.id',q.order).skip((q.page-1)*q.pageSize).take(q.pageSize).getManyAndCount();
      return { items: await this.pageViews(m,items),total,page: q.page,pageSize: q.pageSize };
    });
  }
  managedGet(actorId: string,id: string) {
    return this.source.transaction('REPEATABLE READ',async m => {
      const item = await m.findOneBy(RewardCatalogItem,{ id });if (!item) throw new DomainError(404,'NOT_FOUND','Винагороду не знайдено.');
      await this.manage(m,actorId,item.organizationId);return this.view(m,item);
    });
  }
  get(id: string): Promise<RewardDto> {
    return this.source.transaction('REPEATABLE READ',async m => { const item = await m.createQueryBuilder(RewardCatalogItem,'i').where('i.id=:id',{ id }).andWhere(publicScope).getOne();if (!item) throw new DomainError(404,'NOT_FOUND','Винагороду не знайдено.');return this.view(m,item); });
  }
  create(actorId: string,input: RewardFormDto) {
    return this.source.transaction(async m => { await this.manage(m,actorId,input.organizationId ?? null);const item = await m.save(RewardCatalogItem,m.create(RewardCatalogItem,{ ...input,organizationId: input.organizationId ?? null,image: input.image ?? null,seedKey: null }));await this.audit.record(m,actorId,'REWARD_CREATED','reward',item.id,{ isDemo: item.isDemo });return this.view(m,item); });
  }
  update(actorId: string,id: string,input: UpdateRewardDto | null) {
    return this.source.transaction(async m => {
      const ref = await m.findOneBy(RewardCatalogItem,{ id });if (!ref) throw new DomainError(404,'NOT_FOUND','Винагороду не знайдено.');
      await this.manage(m,actorId,ref.organizationId);
      const item = await m.findOneOrFail(RewardCatalogItem,{ where: { id },lock: { mode: 'pessimistic_write' } });
      if (item.status === 'ARCHIVED') { if (!input) return this.view(m,item);throw new DomainError(409,'REWARD_ARCHIVED','Архівну винагороду не редагують.'); }
      if (!input) item.status = 'ARCHIVED';
      else {
        if (input.stock !== undefined && input.stock < await this.consumed(m,id)) throw new DomainError(409,'STOCK_RESERVED','Ліміт менший за зарезервований і виданий залишок.');
        for (const field of ['title','description','details','image','category','pricePoints','stock','status','visibility','redemptionRules'] as const) if (input[field] !== undefined) Object.assign(item,{ [field]: input[field] });
        if (input.isDemo !== undefined && input.isDemo !== item.isDemo) throw new DomainError(409,'DEMO_STATUS_IMMUTABLE','Навчальну пропозицію не можна перетворити на реальну.');
      }
      await m.save(item);await this.audit.record(m,actorId,input ? 'REWARD_UPDATED' : 'REWARD_ARCHIVED','reward',id);return this.view(m,item);
    });
  }
  private async history(m: EntityManager,r: RewardRedemption,actorId: string,status: RedemptionStatus,reason: string | null = null) {
    await m.save(RewardRedemptionHistory,m.create(RewardRedemptionHistory,{ redemptionId: r.id,actorUserId: actorId,status,reason }));
    await this.audit.record(m,actorId,`REDEMPTION_${status.toUpperCase()}`,'reward_redemption',r.id,{ rewardId: r.rewardId,reason });
  }
  async redeemWithin(m: EntityManager,userId: string,rewardId: string,key: string): Promise<RedemptionResultDto> {
    if (!m.queryRunner?.isTransactionActive) throw new Error('Redemption requires a transaction');
    // Global lock order: organization -> item -> recipient user -> redemption -> ledger/account.
    const ref = await m.findOneBy(RewardCatalogItem,{ id: rewardId });if (!ref) throw new DomainError(404,'NOT_FOUND','Винагороду не знайдено.');
    const org = ref.organizationId ? await m.findOne(Organization,{ where: { id: ref.organizationId },lock: { mode: 'pessimistic_write' } }) : null;
    const item = await m.findOneOrFail(RewardCatalogItem,{ where: { id: rewardId },lock: { mode: 'pessimistic_write' } });
    const user = await m.findOne(User,{ where: { id: userId,status: UserStatus.ACTIVE },lock: { mode: 'pessimistic_write' } });
    if (!user?.roles.includes(Role.VOLUNTEER)) throw new DomainError(403,'FORBIDDEN','Обмін доступний волонтерам.');
    const priorKey = await m.findOneBy(RewardRedemption,{ userId,idempotencyKey: key });
    if (priorKey) {
      if (priorKey.rewardId !== rewardId) throw new DomainError(409,'IDEMPOTENCY_CONFLICT','Ключ використано для іншої винагороди.');
      return { redemption: redemptionView(priorKey),rewardPointsBalance: (await this.ledger.readProgression(m,userId)).rewardPointsBalance };
    }
    if (await m.existsBy(RewardRedemption,{ userId,rewardId })) throw new DomainError(409,'ALREADY_REDEEMED','Цю винагороду можна отримати один раз.');
    if (item.status !== 'ACTIVE' || item.visibility !== 'PUBLIC' || (item.organizationId && org?.moderationStatus !== ModerationStatus.APPROVED)) throw new DomainError(409,'REWARD_UNAVAILABLE','Пропозиція недоступна.');
    if (await this.consumed(m,rewardId) >= item.stock) throw new DomainError(409,'OUT_OF_STOCK','Немає доступних одиниць.');
    const balance = (await this.ledger.readProgression(m,userId)).rewardPointsBalance;
    if (balance < item.pricePoints) throw new DomainError(409,'INSUFFICIENT_POINTS','Недостатньо бонусних балів.');
    const r = await m.save(RewardRedemption,m.create(RewardRedemption,{ userId,rewardId,organizationId: item.organizationId,idempotencyKey: key,pricePoints: item.pricePoints,rewardTitle: item.title,isDemo: item.isDemo,status: 'requested',debitLedgerId: null,refundLedgerId: null,reservedAt: null,fulfilledAt: null,cancelledAt: null,cancellationReason: null }));
    await this.history(m,r,userId,'requested');
    const debit = await this.ledger.spendPoints(m,userId,item.pricePoints,r.id,`redemption:${r.id}`);
    r.debitLedgerId = debit.id;r.status = 'reserved';r.reservedAt = new Date();await m.save(r);await this.history(m,r,userId,'reserved');
    return { redemption: redemptionView(r),rewardPointsBalance: (await this.ledger.readProgression(m,userId)).rewardPointsBalance };
  }
  redeem(userId: string,rewardId: string,key: string) { return this.source.transaction(m => this.redeemWithin(m,userId,rewardId,key)); }
  own(userId: string,q: RewardHistoryQueryDto): Promise<RedemptionPageDto> {
    return this.source.transaction('REPEATABLE READ',async m => { const [items,total] = await m.findAndCount(RewardRedemption,{ where: { userId },order: { createdAt: q.order,id: q.order },skip: (q.page-1)*q.pageSize,take: q.pageSize });return { items: items.map(redemptionView),total,page: q.page,pageSize: q.pageSize }; });
  }
  async redemption(userId: string,id: string): Promise<RedemptionDto> {
    const r = await this.source.manager.findOneBy(RewardRedemption,{ id,userId });if (!r) throw new DomainError(404,'NOT_FOUND','Обмін не знайдено.');return redemptionView(r);
  }
  fulfillmentQueue(actorId: string,rewardId: string,q: RewardHistoryQueryDto): Promise<FulfillmentPageDto> {
    return this.source.transaction('REPEATABLE READ',async m => {
      const item = await m.findOneBy(RewardCatalogItem,{ id: rewardId });if (!item) throw new DomainError(404,'NOT_FOUND','Винагороду не знайдено.');await this.manage(m,actorId,item.organizationId);
      const [items,total] = await m.findAndCount(RewardRedemption,{ where: { rewardId },order: { createdAt: q.order,id: q.order },skip: (q.page-1)*q.pageSize,take: q.pageSize });
      return { items: items.map(r => ({ id: r.id,userId: r.userId,rewardId: r.rewardId,rewardTitle: r.rewardTitle,status: r.status,isDemo: r.isDemo,reservedAt: r.reservedAt?.toISOString() ?? null })),total,page: q.page,pageSize: q.pageSize };
    });
  }
  transition(actorId: string,id: string,action: 'fulfill' | 'cancel',reason: string | null) {
    return this.source.transaction(async m => {
      const ref = await m.findOneBy(RewardRedemption,{ id });if (!ref) throw new DomainError(404,'NOT_FOUND','Обмін не знайдено.');
      if (action === 'fulfill' || ref.userId !== actorId) await this.manage(m,actorId,ref.organizationId);else await this.actor(m,actorId);
      await m.findOneOrFail(RewardCatalogItem,{ where: { id: ref.rewardId },lock: { mode: 'pessimistic_write' } });
      await m.findOneOrFail(User,{ where: { id: ref.userId },lock: { mode: 'pessimistic_write' } });
      const r = await m.findOneOrFail(RewardRedemption,{ where: { id },lock: { mode: 'pessimistic_write' } });
      if (action === 'fulfill') {
        if (r.status === 'fulfilled') return redemptionView(r);
        if (r.status !== 'reserved') throw new DomainError(409,'INVALID_TRANSITION','Видати можна лише зарезервовану винагороду.');
        r.status = 'fulfilled';r.fulfilledAt = new Date();await m.save(r);await this.history(m,r,actorId,'fulfilled');
      } else {
        if (r.status === 'refunded') return redemptionView(r);
        if (r.status !== 'reserved' || !r.debitLedgerId) throw new DomainError(409,'INVALID_TRANSITION','Видану винагороду автоматично не скасовують.');
        if (!reason || reason.trim().length < 5 || reason.length > 1000) throw new DomainError(422,'REASON_REQUIRED','Вкажи причину скасування.');
        r.status = 'cancelled';r.cancelledAt = new Date();r.cancellationReason = reason.trim();await m.save(r);await this.history(m,r,actorId,'cancelled',r.cancellationReason);
        const refund = await this.ledger.compensate(m,r.debitLedgerId,r.pricePoints,r.id,`redemption-refund:${r.id}`,r.cancellationReason);
        r.refundLedgerId = refund.id;r.status = 'refunded';await m.save(r);await this.history(m,r,actorId,'refunded',r.cancellationReason);
      }
      return redemptionView(r);
    });
  }
}
