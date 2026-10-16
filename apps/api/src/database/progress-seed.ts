import type { DataSource, EntityManager } from 'typeorm';
import { AuditService } from '../audit/audit.service.js';
import { LedgerService } from '../ledger/ledger.service.js';
import { MissionProgressEngine } from '../missions/mission-progress.engine.js';
import { ChallengeProgressEngine } from '../challenges/challenge-progress.engine.js';
import { VerifiedProgressService } from '../progress/verified-progress.service.js';
import { DefinitionService } from '../progress/definition.service.js';
import { MissionDefinition, ChallengeDefinition, MissionEnrollment, ChallengeParticipant } from '../progress/definition.entity.js';
import type { MissionInputDto, ChallengeInputDto } from '../progress/progress.dto.js';
import { VerifiedActivity } from '../ledger/ledger.entity.js';
import { Quest } from '../quests/quest.entity.js';
import { lockVolunteer } from '../progress/reward-claims.service.js';
import { Transactions } from './database.module.js';

/** Same domain services as the HTTP path, using the seed's existing transaction. */
export function progressServices(source: DataSource) {
  const audit = new AuditService(), ledger = new LedgerService(source);
  const missions = new MissionProgressEngine(source, ledger, audit);
  const challenges = new ChallengeProgressEngine(source, audit);
  return { audit, missions, challenges, coordinator: new VerifiedProgressService(missions, challenges), definitions: new DefinitionService(source, new Transactions(source), audit) };
}

// Only called after the existing dev/test + explicit credential/seed gate, under its advisory lock.
export async function seedVerifiedProgress(manager: EntityManager, source: DataSource, users: Map<string, string>, organizations: Map<string, string>): Promise<void> {
  const required = (values: Map<string, string>, key: string): string => {
    const value = values.get(key); if (!value) throw new Error('Missing progress seed identity'); return value;
  };
  const admin = required(users, 'admin'), userId = required(users, 'volunteer');
  const organizationId = required(organizations, 'zelenyi-dnipro-demo');
  const quest = async (key: string): Promise<Quest> => {
    const found = await manager.findOneBy(Quest, { seedKey: `be02:quest:${key}` });
    if (!found || found.organizationId !== organizationId) throw new Error('Missing or conflicting BE-02 seed quest');
    return found;
  };
  const eco = await quest('completed-eco'), social = await quest('completed-social'), next = await quest('eco'), optional = await quest('education');
  const { audit, definitions, missions, challenges } = progressServices(source);
  const createMission = async (key: string, input: MissionInputDto): Promise<MissionDefinition> => {
    const seedKey = `be03:mission:${key}`, existing = await manager.findOneBy(MissionDefinition, { seedKey });
    if (existing) { if (existing.organizationId !== organizationId) throw new Error('Mission seed scope collision'); return existing; }
    const created = await definitions.saveMissionWithin(manager, admin, input, undefined, seedKey);
    await definitions.transitionWithin(manager, admin, 'mission', created.id, 'publish');
    return definitions.mission(manager, created.id);
  };
  const common = { organizationId, description: 'Демонстраційна серверна історія. Прогрес підтверджується лише реальними звітами з BE-02 demo seed; це не статистика реальної платформи.', coverImage: '/images/community.jpg', difficulty: 'Легкий', estimatedDuration: 'Два підтверджені квести', prerequisites: { chainIds: [], questIds: [], minLevel: 1 } };
  const first = await createMission('eco-start', {
    ...common, slug: 'demo-eco-start', title: 'Демо: перший екологічний внесок', shortDescription: 'Підтверди участь у прибиранні міста.', category: 'eco',
    steps: [{ id: 'b3000000-0000-4000-8000-000000000001', questId: eco.id, title: 'Допомога берегу Дніпра', description: 'Потрібне підтвердження організатора.', order: 1, isOptional: false, prerequisiteStepIds: [] }],
    rewards: { xp: 100, rewardPoints: 40, achievement: { id: 'b3000000-0000-4000-8000-000000000101', title: 'Екологічний початок', description: 'Демонстраційна відзнака підтвердженого внеску.' } },
  });
  await createMission('social-start', {
    ...common, slug: 'demo-social-start', title: 'Демо: підтримка громади', shortDescription: 'Підтверджена допомога людям.', category: 'social',
    steps: [{ id: 'b3000000-0000-4000-8000-000000000002', questId: social.id, title: 'Підтримка містян', description: 'Завершений квест допомоги громаді.', order: 1, isOptional: false, prerequisiteStepIds: [] }],
    rewards: { xp: 120, rewardPoints: 50, achievement: { id: 'b3000000-0000-4000-8000-000000000102', title: 'Поруч із громадою', description: 'Демонстраційна відзнака соціальної допомоги.' } },
  });
  const continuing = await createMission('city-path', {
    ...common, slug: 'demo-city-path', title: 'Демо: шлях міських змін', shortDescription: 'Наступна ініціатива та необов’язкова освіта.', category: 'city', prerequisites: { chainIds: [first.id], questIds: [], minLevel: 1 },
    steps: [
      { id: 'b3000000-0000-4000-8000-000000000003', questId: next.id, title: 'Наступне прибирання', description: 'Продовжуй екологічну історію.', order: 1, isOptional: false, prerequisiteStepIds: [] },
      { id: 'b3000000-0000-4000-8000-000000000004', questId: optional.id, title: 'Додаткове взаємонавчання', description: 'Необов’язковий освітній етап.', order: 2, isOptional: true, prerequisiteStepIds: ['b3000000-0000-4000-8000-000000000003'] },
    ], rewards: { xp: 180, rewardPoints: 80, achievement: { id: 'b3000000-0000-4000-8000-000000000103', title: 'Шлях змін', description: 'Демонстраційна відзнака продовження історії.' } },
  });
  const proofs = await manager.find(VerifiedActivity, { where: [{ questId: eco.id }, { questId: social.id }], order: { verifiedAt: 'ASC', id: 'ASC' } });
  const earliest = proofs[0], latest = proofs.at(-1);
  if (!earliest || !latest) throw new Error('BE-03 requires genuine BE-02 verification records');
  const challengeBase = { organizationId, category: 'all', coverImage: '/images/community.jpg', description: 'Демонстраційний спільний виклик на основі підтверджених звітів BE-02. Фізичні метрики без окремого вимірювання залишаються невідомими.', startDate: new Date(earliest.verifiedAt.getTime() - 1000).toISOString(), endDate: new Date(latest.verifiedAt.getTime() + 30 * 86400000).toISOString(), relatedQuestIds: [eco.id, social.id, next.id], milestones: [25, 50, 75, 100] };
  let active: ChallengeDefinition | undefined;
  for (const [index, target] of [10, 2].entries()) {
    const seedKey = `be03:challenge:${index}`, existing = await manager.findOneBy(ChallengeDefinition, { seedKey });
    if (existing) { if (existing.organizationId !== organizationId) throw new Error('Challenge seed scope collision'); if (index === 0) active = existing; continue; }
    const input: ChallengeInputDto = {
      ...challengeBase, slug: index === 0 ? 'demo-ten-hours' : 'demo-first-two-hours', title: index === 0 ? 'Демо: десять годин для Дніпра' : 'Демо: перші дві години разом',
      goals: [
        { id: `b3000000-0000-4000-8000-00000000020${index}`, metric: 'VOLUNTEER_HOURS', targetValue: target, unit: 'год', description: 'Сума відомих підтверджених годин.', isOptional: false },
        { id: `b3000000-0000-4000-8000-00000000021${index}`, metric: 'LITTER_KG', targetValue: 50, unit: 'кг', description: 'Необов’язкова ціль; вимір ще не підтверджено.', isOptional: true },
      ], rewards: { xp: 200, rewardPoints: 90, achievement: { id: `b3000000-0000-4000-8000-00000000030${index}`, title: 'Разом для Дніпра', description: 'Демонстраційна відзнака спільного внеску.' } },
    };
    const created = await definitions.saveChallengeWithin(manager, admin, input, undefined, seedKey);
    await definitions.transitionWithin(manager, admin, 'challenge', created.id, 'publish');
    if (index === 0) active = await definitions.challenge(manager, created.id);
  }
  // Preserve existing awards: record completions/milestones only, never auto-claim bonuses.
  for (const id of [userId, required(users, 'volunteer-2')].sort()) {
    await lockVolunteer(manager, id);
    await missions.reconcileUser(manager, id);
  }
  const context = await missions.context(manager, userId);
  if (['AVAILABLE', 'IN_PROGRESS'].includes(missions.calculate(continuing, userId, context).status) && !(await manager.existsBy(MissionEnrollment, { missionId: continuing.id, userId }))) {
    await manager.save(MissionEnrollment, manager.create(MissionEnrollment, { missionId: continuing.id, userId }));
    await audit.record(manager, userId, 'DEMO_MISSION_ENROLLED', 'mission', continuing.id);
  }
  if (active && (await challenges.calculate(manager, active)).status === 'ACTIVE' && !(await manager.existsBy(ChallengeParticipant, { challengeId: active.id, userId }))) {
    await manager.save(ChallengeParticipant, manager.create(ChallengeParticipant, { challengeId: active.id, userId }));
    await audit.record(manager, userId, 'DEMO_CHALLENGE_JOINED', 'challenge', active.id);
  }
  await challenges.reconcileAll(manager);
}
