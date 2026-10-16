import type { DataSource, EntityManager } from 'typeorm';
import { Transactions } from './database.module.js';
import { AuditService } from '../audit/audit.service.js';
import { OrganizationAccess } from '../organizations/organization-access.service.js';
import { Quest } from '../quests/quest.entity.js';
import { QuestPolicy } from '../quests/quest.policy.js';
import {
  QuestCategory,
  QuestDifficulty,
  QuestLifecycle,
  QuestModeration,
  ApplicationStatus,
  ParticipationStatus,
  ReportStatus,
} from '../quests/domain.js';
import {
  QuestApplication,
  Participation,
  ParticipationReport,
} from '../participations/participation.entity.js';
import { LedgerService } from '../ledger/ledger.service.js';
import { VerificationService } from '../participations/verification.service.js';
import { applyQuestInput } from '../quests/quest.mapper.js';

// Called only after BE-01's explicit dev/test seed gate and inside its existing transaction/advisory lock.
export async function seedQuestEngine(
  manager: EntityManager,
  source: DataSource,
  users: Map<string, string>,
  organizations: Map<string, string>,
): Promise<void> {
  const required = (values: Map<string, string>, key: string): string => {
    const value = values.get(key);
    if (!value) throw new Error('Missing seed identity');
    return value;
  };
  const orgId = required(organizations, 'zelenyi-dnipro-demo');
  const organizer = required(users, 'organizer'),
    admin = required(users, 'admin');
  const volunteers = [
    required(users, 'volunteer'),
    required(users, 'volunteer-2'),
  ];
  const audit = new AuditService(),
    policy = new QuestPolicy(new OrganizationAccess());
  const verification = new VerificationService(
    new Transactions(source),
    policy,
    new LedgerService(source),
    audit,
  );
  const definitions: {
    key: string;
    title: string;
    category: QuestCategory;
    district: string;
    address: string;
    locationId: string | null;
    scenario:
      'published' | 'draft' | 'review' | 'completed' | 'cancelled' | 'reports';
  }[] = [
    {
      key: 'eco',
      title: 'Приберемо берег Дніпра разом',
      category: QuestCategory.ECO,
      district: 'Соборний',
      address: 'Набережна Перемоги, 1',
      locationId: null,
      scenario: 'published',
    },
    {
      key: 'animals',
      title: 'Прогулянки та допомога тваринам',
      category: QuestCategory.ANIMALS,
      district: 'Чечелівський',
      address: 'Проспект Богдана Хмельницького, 15',
      locationId: null,
      scenario: 'published',
    },
    {
      key: 'social',
      title: 'Пакуємо набори підтримки для містян',
      category: QuestCategory.SOCIAL,
      district: 'Центральний',
      address: 'Вулиця Володимира Антоновича, 4',
      locationId: null,
      scenario: 'published',
    },
    {
      key: 'education',
      title: 'Книжки та взаємонавчання для громади',
      category: QuestCategory.EDUCATION,
      district: 'Соборний',
      address: 'Проспект Дмитра Яворницького, 18',
      locationId: null,
      scenario: 'published',
    },
    {
      key: 'culture',
      title: 'Дбаємо про культурний простір Дніпра',
      category: QuestCategory.CULTURE,
      district: 'Шевченківський',
      address: 'Площа Героїв Майдану',
      locationId: 'quest-20',
      scenario: 'published',
    },
    {
      key: 'city',
      title: 'Впорядковуємо стежки у парку Глоби',
      category: QuestCategory.CITY,
      district: 'Центральний',
      address: 'Парк Лазаря Глоби',
      locationId: 'quest-4',
      scenario: 'published',
    },
    {
      key: 'draft',
      title: 'Чернетка міської екологічної ініціативи',
      category: QuestCategory.ECO,
      district: 'Соборний',
      address: '',
      locationId: null,
      scenario: 'draft',
    },
    {
      key: 'review',
      title: 'Освітня зустріч очікує модерації',
      category: QuestCategory.EDUCATION,
      district: 'Соборний',
      address: 'Проспект Дмитра Яворницького, 18',
      locationId: null,
      scenario: 'review',
    },
    {
      key: 'completed-eco',
      title: 'Підтверджений догляд за зеленими зонами',
      category: QuestCategory.ECO,
      district: 'Центральний',
      address: 'Парк Лазаря Глоби',
      locationId: 'quest-4',
      scenario: 'completed',
    },
    {
      key: 'completed-social',
      title: 'Підтверджене пакування допомоги громаді',
      category: QuestCategory.SOCIAL,
      district: 'Центральний',
      address: 'Вулиця Володимира Антоновича, 4',
      locationId: null,
      scenario: 'completed',
    },
    {
      key: 'cancelled',
      title: 'Скасована зустріч з догляду за островом',
      category: QuestCategory.CITY,
      district: 'Соборний',
      address: 'Монастирський острів',
      locationId: 'quest-7',
      scenario: 'cancelled',
    },
    {
      key: 'reports',
      title: 'Допомога бібліотеці: звіти на розгляді',
      category: QuestCategory.EDUCATION,
      district: 'Соборний',
      address: 'Проспект Дмитра Яворницького, 18',
      locationId: null,
      scenario: 'reports',
    },
  ];
  for (const [index, d] of definitions.entries()) {
    const seedKey = `be02:quest:${d.key}`;
    const old = await manager
      .createQueryBuilder(Quest, 'q')
      .addSelect('q.seedKey')
      .where('q.seedKey=:seedKey', { seedKey })
      .getOne();
    if (old) {
      if (old.organizationId !== orgId)
        throw new Error('Seed quest scope collision');
      continue;
    }
    // Do not reset moderation or membership if an operator changed existing demo data.
    const access = new OrganizationAccess();
    await access.requireCapability(manager, orgId, organizer, 'publish');
    const historical = ['completed', 'cancelled', 'reports'].includes(
      d.scenario,
    );
    const startAt = new Date(
      Date.now() + (historical ? -48 * 3600000 : (index + 2) * 86400000),
    );
    const endAt = new Date(startAt.getTime() + 2 * 3600000);
    const draft = d.scenario === 'draft' || d.scenario === 'review';
    const q = manager.create(Quest, {
      organizationId: orgId,
      title: d.title,
      description:
        'Демонстраційний квест Дніпра для перевірки серверного сценарію участі.',
      fullDescription:
        'Навчальний приклад локального сервера DniproXP. Учасники отримують інструктаж, виконують погоджені завдання та подають власний звіт. Ця подія є демонстраційною і не є оголошенням реального заходу.',
      categoryId: d.category,
      difficulty: QuestDifficulty.EASY,
      district: d.district,
      address: d.address,
      latitude: null,
      longitude: null,
      coordinateSource: null,
      locationLabel: null,
      startAt: d.scenario === 'draft' ? null : startAt,
      endAt: d.scenario === 'draft' ? null : endAt,
      capacity: 8,
      xp: 150,
      rewardPoints: 75,
      requirements: ['Дотримуватися інструкцій координатора'],
      bring: ['Питна вода'],
      instructions:
        'Пройди інструктаж, виконай погоджене завдання і подай змістовний власний звіт.',
      image:
        d.category === QuestCategory.ANIMALS
          ? '/images/dogs.jpg'
          : '/images/community.jpg',
      imageAlt: d.title,
      lifecycle: draft
        ? QuestLifecycle.DRAFT
        : historical
          ? QuestLifecycle.ACTIVE
          : QuestLifecycle.PUBLISHED,
      moderation: draft ? QuestModeration.PENDING : QuestModeration.APPROVED,
      moderationReason: null,
      reviewSubmittedAt: d.scenario === 'review' ? new Date() : null,
      publishedAt: draft
        ? null
        : new Date(Math.min(Date.now(), startAt.getTime() - 86400000)),
      allowTeamParticipation: false,
      teamParticipantLimit: null,
      seedKey,
      createdAt: new Date(
        Math.min(Date.now(), startAt.getTime() - 2 * 86400000),
      ),
    });
    applyQuestInput(q, { locationId: d.locationId });
    await manager.save(q);
    await audit.record(manager, admin, 'DEMO_QUEST_CREATED', 'quest', q.id, {
      seedKey,
      scenario: d.scenario,
    });
    const application = async (userId: string, status: ApplicationStatus) => {
      const app = await manager.save(
        QuestApplication,
        manager.create(QuestApplication, {
          questId: q.id,
          userId,
          status,
          reason:
            status === ApplicationStatus.REJECTED
              ? 'Демонстраційне відхилення заявки.'
              : null,
          submittedAt: new Date(),
          reviewedAt: [
            ApplicationStatus.APPROVED,
            ApplicationStatus.REJECTED,
          ].includes(status)
            ? new Date()
            : null,
          reviewedByUserId: [
            ApplicationStatus.APPROVED,
            ApplicationStatus.REJECTED,
          ].includes(status)
            ? organizer
            : null,
        }),
      );
      await audit.record(
        manager,
        status === ApplicationStatus.PENDING ? userId : organizer,
        'DEMO_APPLICATION_CREATED',
        'quest_application',
        app.id,
        { questId: q.id, status },
      );
      return app;
    };
    for (const [volunteerIndex, userId] of volunteers.entries()) {
      if (d.scenario === 'published' && index === 0) {
        await application(
          userId,
          volunteerIndex === 0
            ? ApplicationStatus.PENDING
            : ApplicationStatus.REJECTED,
        );
        continue;
      }
      if (d.scenario === 'published' && index === 2 && volunteerIndex === 1) {
        await application(userId, ApplicationStatus.WITHDRAWN);
        continue;
      }
      if (!(
        d.scenario === 'completed' ||
        d.scenario === 'reports' ||
        d.scenario === 'cancelled' ||
        (d.key === 'animals' && volunteerIndex === 0)
      ))
        continue;
      if (d.key === 'completed-social' && volunteerIndex === 1) continue;
      const app = await application(userId, ApplicationStatus.APPROVED);
      const p = await manager.save(
        Participation,
        manager.create(Participation, {
          questId: q.id,
          userId,
          applicationId: app.id,
          status:
            d.scenario === 'published'
              ? ParticipationStatus.PLANNED
              : ParticipationStatus.PENDING,
          confirmedAt: null,
        }),
      );
      if (d.scenario === 'published') continue;
      const r = await manager.save(
        ParticipationReport,
        manager.create(ParticipationReport, {
          participationId: p.id,
          submittedByUserId: userId,
          description:
            'Демонстраційний звіт: виконав погоджене завдання, дотримувався інструктажу та передав результат координатору.',
          reportedMinutes: volunteerIndex === 0 ? 95 : null,
          evidenceReferences: [],
          status: ReportStatus.SUBMITTED,
          reviewedAt: null,
          reviewedByUserId: null,
          reviewReason: null,
        }),
      );
      if (d.scenario === 'completed')
        await verification.approveWithin(manager, organizer, r.id);
      if (d.scenario === 'reports' && volunteerIndex === 1) {
        r.status = ReportStatus.REJECTED;
        r.reviewedAt = new Date();
        r.reviewedByUserId = organizer;
        r.reviewReason = 'Демонстраційно: додай конкретний опис своєї роботи.';
        await manager.save(r);
        p.status = ParticipationStatus.ACTIVE;
        await manager.save(p);
        await audit.record(
          manager,
          organizer,
          'REPORT_REJECTED',
          'participation_report',
          r.id,
          { reason: r.reviewReason },
        );
      }
      if (d.scenario === 'cancelled') {
        p.status = ParticipationStatus.CANCELLED;
        await manager.save(p);
      }
    }
    if (d.scenario === 'completed' || d.scenario === 'cancelled') {
      q.lifecycle =
        d.scenario === 'completed'
          ? QuestLifecycle.COMPLETED
          : QuestLifecycle.CANCELLED;
      await manager.save(q);
    }
  }
}
