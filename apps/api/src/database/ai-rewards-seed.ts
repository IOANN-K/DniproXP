import { createHash } from 'node:crypto';
import type { DataSource,EntityManager } from 'typeorm';
import { RewardCatalogItem } from '../rewards/reward.entity.js';
import { rewardCategories } from '../rewards/reward.entity.js';
import { RewardsService } from '../rewards/rewards.service.js';
import { LedgerService } from '../ledger/ledger.service.js';
import { OrganizationAccess } from '../organizations/organization-access.service.js';
import { AuditService } from '../audit/audit.service.js';
import { AiGenerationSession,AiQuestSuggestion } from '../ai-quests/ai.entity.js';
import { requestSchema,validateOutput } from '../ai-quests/generation.schema.js';

/** Called only from the existing gated development/test transaction. No AI calls or fabricated balances. */
export async function seedAiRewards(manager: EntityManager,source: DataSource,users: Map<string,string>): Promise<void> {
  const volunteer = users.get('volunteer'),admin = users.get('admin');
  if (!volunteer || !admin) throw new Error('Missing BE-05.1 seed identities');
  const audit = new AuditService(),ledger = new LedgerService(source),service = new RewardsService(source,ledger,new OrganizationAccess(),audit);
  const titles = ['Демо: кава після доброї справи','Демо: чайна пауза','Демо: багаторазова торбинка','Демо: набір для сортування','Демо: майстерня міських історій','Демо: творчий вечір','Демо: значок волонтера','Демо: листівки Дніпра'];
  for (const [index,title] of titles.entries()) {
    const seedKey = `be05:reward:${index+1}`;
    let item = await manager.findOneBy(RewardCatalogItem,{ seedKey });
    if (!item) {
      const category = rewardCategories[Math.floor(index/2)];if (!category) throw new Error('Missing demo category');
      item = await manager.save(RewardCatalogItem,manager.create(RewardCatalogItem,{
        organizationId: null,title,category,description: 'Вигадана навчальна пропозиція локального DniproXP, не діє в жодному реальному закладі.',
        details: 'Лише демонстрація каталогу й обміну балів. Не є офертою, товаром у продажу або підтвердженням партнерства.',
        image: '/images/community.jpg',pricePoints: 25+index*35,stock: index === 6 ? 0 : 3+index,
        status: index === 7 ? 'UNAVAILABLE' : 'ACTIVE',visibility: 'PUBLIC',redemptionRules: 'Один навчальний обмін на користувача. До видачі можна скасувати з повним поверненням балів.',isDemo: true,seedKey,
      }));
      await audit.record(manager,admin,'DEMO_REWARD_CREATED','reward',item.id,{ isDemo: true });
      // One real, affordable reservation illustrates the engine; insufficient points simply skips the example.
      if (index === 0 && (await ledger.readProgression(manager,volunteer)).rewardPointsBalance >= item.pricePoints)
        await service.redeemWithin(manager,volunteer,item.id,'c5000000-0000-4000-8000-000000000001');
    }
  }
  const key = 'c5000000-0000-4000-8000-000000000002';
  if (!(await manager.existsBy(AiGenerationSession,{ userId: volunteer,idempotencyKey: key }))) {
    const request = requestSchema.parse({ schemaVersion: 1,input: { goal: 'Навчальний fixture: допомога в погодженому міському просторі.',categoryId: 'city',district: 'Соборний',capacity: 4,durationHours: 2 },count: 1 });
    const payload = validateOutput({ suggestions: [{ title: 'Демо: турбота про міський простір',shortDescription: 'Навчальна ідея допомоги для чотирьох волонтерів під наглядом координатора.',description: 'Це статичний fixture для локальної презентації. Погодьте з відповідальною особою місце, дату, перелік безпечних завдань і доступність укриття. Жоден зовнішній AI-провайдер не викликався.',category: 'city',suggestedDistrict: 'Соборний',estimatedDuration: 2,difficulty: 'Легкий',requiredVolunteers: 4,checklist: ['Погодити завдання','Пройти інструктаж','Підготувати особистий звіт'],requirements: ['Дотримуватися інструкцій координатора'],impactIntent: 'Можлива підтримка міського простору після погодження; результат не підтверджений.',safetyNotes: ['Без небезпечних робіт; під час тривоги перейти в укриття.'],uncertaintyNotes: ['Статичний демонстраційний fixture, не відповідь AI.','Локацію, дату та дозволи не встановлено.'] }] },request.input,1)[0];
    if (!payload) throw new Error('Missing demo suggestion');
    const now = Date.now();
    const session = await manager.save(AiGenerationSession,manager.create(AiGenerationSession,{ userId: volunteer,organizationId: null,idempotencyKey: key,requestHash: createHash('sha256').update(JSON.stringify(request)).digest('hex'),request,provider: 'fixture',model: 'static-demo-v1',status: 'SUCCEEDED',attempts: 0,isFixture: true,errorCode: null,createdAt: new Date(now),completedAt: new Date(now),leaseExpiresAt: new Date(now),retentionAt: new Date(now+30*86400000) }));
    await manager.save(AiQuestSuggestion,manager.create(AiQuestSuggestion,{ sessionId: session.id,position: 0,payload,validationStatus: 'VALIDATED',savedAt: new Date(now),convertedQuestId: null }));
    await audit.record(manager,admin,'DEMO_AI_FIXTURE_CREATED','ai_generation',session.id,{ isFixture: true });
  }
}
