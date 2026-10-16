import type { DataSource,EntityManager } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { Transactions } from './database.module.js';
import { AuditService } from '../audit/audit.service.js';
import { OrganizationAccess } from '../organizations/organization-access.service.js';
import { QuestPolicy } from '../quests/quest.policy.js';
import { Quest } from '../quests/quest.entity.js';
import { QuestCategory,QuestDifficulty,QuestLifecycle,QuestModeration,ParticipationStatus } from '../quests/domain.js';
import { Participation } from '../participations/participation.entity.js';
import { ParticipationQueries } from '../participations/participation.queries.js';
import { ParticipationsService } from '../participations/participations.service.js';
import { VerificationService } from '../participations/verification.service.js';
import { LedgerService } from '../ledger/ledger.service.js';
import { Team,TeamMembership } from '../teams/team.entity.js';
import { TeamAccess } from '../teams/team-access.service.js';
import { TeamsService } from '../teams/teams.service.js';
import { TeamApplicationsService } from '../team-applications/team-applications.service.js';
import { TeamQuestApplication } from '../team-applications/team-application.entity.js';
import { AchievementEvaluator } from '../achievements/achievement-evaluator.js';
import { progressServices } from './progress-seed.js';

/** Only invoked inside the existing gated dev/test seed transaction. No credentials or prior awards are modified. */
export async function seedVolunteerIdentity(manager: EntityManager,source: DataSource,users: Map<string,string>,organizations: Map<string,string>): Promise<void> {
  const required = (map: Map<string,string>,key: string) => { const value = map.get(key);if (!value) throw new Error('Missing BE-04 seed identity');return value; };
  const volunteer = required(users,'volunteer'), second = required(users,'volunteer-2'), organizer = required(users,'organizer'), helper = required(users,'organizer-2'), admin = required(users,'admin'), orgId = required(organizations,'zelenyi-dnipro-demo');
  const transactions = new Transactions(source),audit = new AuditService(),access = new TeamAccess(),orgAccess = new OrganizationAccess(),policy = new QuestPolicy(orgAccess),queries = new ParticipationQueries(source,orgAccess);
  const teams = new TeamsService(transactions,access,audit),participations = new ParticipationsService(source,transactions,policy,queries,audit,access);
  const applications = new TeamApplicationsService(source,transactions,access,policy,participations,queries,audit);
  const create = async (key: string,owner: string,name: string,visibility: 'PUBLIC' | 'PRIVATE',joinPolicy: 'OPEN' | 'APPROVAL' | 'INVITE_ONLY') => {
    const seedKey = `be04:team:${key}`,old = await manager.findOneBy(Team,{ seedKey });
    if (old) return { team: old,fresh: false };
    const team = await teams.createWithin(manager,owner,{ name,description: 'Навчальна команда локального demo seed DniproXP. Її події та показники не є статистикою реальних волонтерських організацій.',category: 'city',city: 'Дніпро',avatar: 'flag',coverImage: '/images/community.jpg',visibility,joinPolicy,maxMembers: 8 },seedKey);
    return { team,fresh: true };
  };
  const first = await create('city',volunteer,'Демо: спільні міські справи','PUBLIC','OPEN');
  const review = await create('review',helper,'Демо: команда підтримки','PUBLIC','APPROVAL');
  const privateTeam = await create('private',admin,'Демо: приватна спільнота','PRIVATE','INVITE_ONLY');
  if (first.fresh) {
    for (const userId of [second,helper]) {
      const invitation = await teams.inviteWithin(manager,volunteer,first.team.id,userId);
      await teams.invitationWithin(manager,userId,invitation.id,'accept');
    }
    const officer = await manager.findOneByOrFail(TeamMembership,{ teamId: first.team.id,userId: second,status: 'ACTIVE' });
    officer.role = 'MANAGER';await manager.save(officer);
    await audit.record(manager,volunteer,'DEMO_TEAM_MANAGER_ASSIGNED','team',first.team.id,{ userId: second });
  }
  if (review.fresh) { await teams.joinWithin(manager,volunteer,review.team.id);await teams.inviteWithin(manager,helper,review.team.id,organizer); }
  if (privateTeam.fresh) await teams.inviteWithin(manager,admin,privateTeam.team.id,second);
  const seedKey = 'be04:quest:team-city';
  let quest = await manager.findOneBy(Quest,{ seedKey });
  if (quest && quest.organizationId !== orgId) throw new Error('BE-04 quest seed scope collision');
  if (!quest) {
    await orgAccess.requireCapability(manager,orgId,organizer,'publish');
    // Explicit historical dev fixture, matching BE-02 seed practice. Actual reports use the production verification pipeline.
    quest = await manager.save(Quest,manager.create(Quest,{
      organizationId: orgId,title: 'Демо: командна турбота про міський простір',description: 'Демонстраційний командний квест із персональними звітами та перевіркою.',
      fullDescription: 'Навчальний локальний сценарій: два волонтери подають власні звіти, а координатор перевіряє кожен окремо. Це не оголошення реальної події та не справжній сертифікат професійної компетентності.',
      categoryId: QuestCategory.CITY,difficulty: QuestDifficulty.EASY,district: 'Соборний',address: 'Парк імені Тараса Шевченка, Дніпро',
      latitude: null,longitude: null,coordinateSource: null,locationLabel: null,startAt: new Date(Date.now()-150*60000),endAt: new Date(Date.now()+30*60000),capacity: 8,xp: 150,rewardPoints: 75,
      requirements: ['Дотримуватися інструкцій координатора'],bring: ['Питна вода'],instructions: 'Виконай погоджені завдання, подай власний звіт із фактичним часом та дочекайся підтвердження.',image: '/images/community.jpg',imageAlt: 'Демонстрація спільного волонтерства',
      lifecycle: QuestLifecycle.ACTIVE,moderation: QuestModeration.APPROVED,archivedFrom: null,moderationReason: null,reviewSubmittedAt: null,publishedAt: new Date(Date.now()-180*60000),allowTeamParticipation: true,teamParticipantLimit: 4,seedKey,
    }));
    await audit.record(manager,admin,'DEMO_TEAM_QUEST_CREATED','quest',quest.id);
    const group = await applications.applyWithin(manager,volunteer,quest.id,{ teamId: first.team.id,participantIds: [volunteer,second],operationId: 'c4000000-0000-4000-8000-000000009001' });
    await applications.reviewWithin(manager,organizer,group.id,true,null);
    const verification = new VerificationService(transactions,policy,new LedgerService(source),audit,progressServices(source).coordinator);
    for (const [index,userId] of [volunteer,second].entries()) {
      const participation = await manager.findOneByOrFail(Participation,{ userId,questId: quest.id,status: ParticipationStatus.ACTIVE });
      const report = await participations.submitReportWithin(manager,userId,participation.id,{ description: 'Демонстраційний особистий звіт: виконав погоджені завдання команди, дотримувався інструктажу і передав результат координатору.',reportedMinutes: index === 0 ? 90 : 120 });
      await verification.approveWithin(manager,organizer,report.id);
    }
    quest.lifecycle = QuestLifecycle.COMPLETED;await manager.save(quest);
  } else if (!(await manager.existsBy(TeamQuestApplication,{ questId: quest.id }))) throw new Error('Existing BE-04 seed quest has no team workflow; refusing implicit repair');
  const upcomingKey = 'be04:quest:team-upcoming';
  const upcoming = await manager.findOneBy(Quest,{ seedKey: upcomingKey });
  if (upcoming && upcoming.organizationId !== orgId) throw new Error('BE-04 upcoming quest scope collision');
  if (!upcoming) {
    await orgAccess.requireCapability(manager,orgId,organizer,'publish');
    const start = new Date(Date.now()+2*86400000);
    const next = await manager.save(Quest,manager.create(Quest,{ ...quest,id: randomUUID(),seedKey: upcomingKey,title: 'Демо: наступна командна міська ініціатива',lifecycle: QuestLifecycle.PUBLISHED,archivedFrom: null,moderation: QuestModeration.APPROVED,publishedAt: new Date(),startAt: start,endAt: new Date(start.getTime()+2*3600000),allowTeamParticipation: true,teamParticipantLimit: 4,createdAt: new Date(),updatedAt: new Date() }));
    await audit.record(manager,organizer,'DEMO_TEAM_QUEST_CREATED','quest',next.id);
    await applications.applyWithin(manager,volunteer,next.id,{ teamId: first.team.id,participantIds: [volunteer,second],operationId: 'c4000000-0000-4000-8000-000000009002' });
  }
  // Existing verified sources and BE-03 badges are replayed without issuing any currency.
  const evaluator = new AchievementEvaluator();
  for (const userId of [...users.values()].sort()) await evaluator.recompute(manager,userId);
}
