import type { Quest, VolunteerState } from "../types";
import type {
  ImpactRecord,
  ImpactMetricInput,
  ImpactMetricType,
  ImpactPhoto,
  ImpactScope,
  ImpactFilter,
} from "./types";

export const metricCatalog = {
  volunteer_hours: {
    label: "Години допомоги",
    unit: "hours",
    unitLabel: "год",
    scope: "individual",
  },
  waste_kg: {
    label: "Зібрані відходи",
    unit: "kg",
    unitLabel: "кг",
    scope: "collective",
  },
  trees_planted: {
    label: "Висаджені дерева",
    unit: "count",
    unitLabel: "дерев",
    scope: "collective",
  },
  animals_helped: {
    label: "Допомога тваринам",
    unit: "count",
    unitLabel: "тварин",
    scope: "collective",
  },
  people_helped: {
    label: "Допомога людям",
    unit: "count",
    unitLabel: "людей",
    scope: "collective",
  },
  area_cleaned: {
    label: "Прибрана територія",
    unit: "m2",
    unitLabel: "м²",
    scope: "collective",
  },
} as const;
export const demoImpactPhotos = [
  "/images/nature.jpg",
  "/images/community.jpg",
  "/images/dogs.jpg",
  "/images/books.jpg",
] as const;
export function validatePhoto(photo: ImpactPhoto | null) {
  if (
    photo &&
    (!demoImpactPhotos.includes(
      photo.url as (typeof demoImpactPhotos)[number],
    ) ||
      photo.isDemo !== true ||
      !photo.alt.trim())
  )
    throw new Error(
      "Обери підписане демонстраційне фото з локальної бібліотеки.",
    );
}
export function validateMetrics(
  metrics: ImpactMetricInput[],
  scope: ImpactScope,
) {
  const types = new Set<string>();
  for (const metric of metrics) {
    const definition = metricCatalog[metric.type];
    if (
      !definition ||
      definition.scope !== scope ||
      definition.unit !== metric.unit
    )
      throw new Error(
        "Тип, одиниця та область метрики мають відповідати каталогу.",
      );
    if (
      !Number.isFinite(metric.value) ||
      metric.value < 0 ||
      metric.value > 1_000_000 ||
      (metric.unit === "count" && !Number.isInteger(metric.value)) ||
      (metric.type === "volunteer_hours" &&
        (metric.value <= 0 || metric.value > 24))
    )
      throw new Error(
        "Вкажи невід’ємне значення; години — більше 0 і не більше 24, кількість — ціле число.",
      );
    if (types.has(metric.type))
      throw new Error("Одна метрика не може повторюватися у результаті.");
    types.add(metric.type);
  }
}
export function validateImpactRecord(record: ImpactRecord) {
  if (
    !["individual", "collective"].includes(record.scope) ||
    !["unverified", "verified", "rejected"].includes(
      record.verificationStatus,
    ) ||
    !["organizer-confirmation", "legacy-import"].includes(record.provenance) ||
    !Array.isArray(record.metrics)
  )
    throw new Error("Невідомий статус, область або формат результату.");
  if (
    !record.id ||
    !record.sourceEventId ||
    !record.questId ||
    !record.organizationId
  )
    throw new Error("Результату бракує доменних зв’язків.");
  if (
    (record.scope === "individual" &&
      (!record.participationId || !record.userId)) ||
    (record.scope === "collective" &&
      (record.participationId !== null || record.userId !== null))
  )
    throw new Error(
      "Особистий внесок належить участі; спільний — усьому квесту.",
    );
  if (
    record.verificationStatus === "verified" &&
    (!record.verifiedAt ||
      !Number.isFinite(Date.parse(record.verifiedAt)) ||
      (record.provenance === "organizer-confirmation" && !record.verifiedBy))
  )
    throw new Error("Підтверджений результат потребує дати й перевіряльника.");
  if (
    !Number.isFinite(record.awardedXp) ||
    record.awardedXp < 0 ||
    !Number.isFinite(record.awardedPoints) ||
    record.awardedPoints < 0
  )
    throw new Error("Некоректний знімок винагороди.");
  const c = record.location.coordinates;
  if (
    c &&
    (!record.location.coordinateSource ||
      !Number.isFinite(c[0]) ||
      !Number.isFinite(c[1]) ||
      Math.abs(c[0]) > 90 ||
      Math.abs(c[1]) > 180)
  )
    throw new Error("Маркер потребує коректних координат і джерела.");
  validateMetrics(record.metrics, record.scope);
  const ids = new Set<string>();
  for (const m of record.metrics) {
    if (m.impactRecordId !== record.id || !m.id || ids.has(m.id))
      throw new Error(
        "Метрика має належати своєму результату й мати унікальний ID.",
      );
    ids.add(m.id);
  }
  validatePhoto(record.beforePhoto);
  validatePhoto(record.afterPhoto);
}
export function locationFor(q: Quest): ImpactRecord["location"] {
  return {
    label: q.locationLabel || q.address,
    district: q.district,
    coordinates: q.coordinateSource ? q.coordinates : null,
    coordinateSource: q.coordinateSource || null,
  };
}
export function attachMetrics(id: string, metrics: ImpactMetricInput[]) {
  return metrics.map((m) => ({
    ...m,
    id: `${id}:${m.type}`,
    impactRecordId: id,
  }));
}
export function kyivDay(date: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Kyiv",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
}
/** IDs, source IDs AND logical scope keys are deduplicated, not just object identity. */
export function selectImpact(
  records: ImpactRecord[],
  filter: ImpactFilter = {},
) {
  const ids = new Set<string>(),
    sources = new Set<string>(),
    scopes = new Set<string>();
  // Prefer latest verification if an imported snapshot contains conflicting copies.
  return [...records]
    .sort((a, b) => (b.verifiedAt || "").localeCompare(a.verifiedAt || ""))
    .filter((r) => {
      try {
        validateImpactRecord(r);
      } catch {
        return false;
      }
      if (r.verificationStatus !== "verified") return false;
      const key =
        r.scope === "individual"
          ? `individual:${r.participationId}`
          : `collective:${r.questId}`;
      if (ids.has(r.id) || sources.has(r.sourceEventId) || scopes.has(key))
        return false;
      ids.add(r.id);
      sources.add(r.sourceEventId);
      scopes.add(key);
      const day = kyivDay(r.verifiedAt!);
      return (
        (!filter.userId || r.userId === filter.userId) &&
        (!filter.organizationId ||
          r.organizationId === filter.organizationId) &&
        (!filter.scope || r.scope === filter.scope) &&
        (!filter.categoryId || r.categoryId === filter.categoryId) &&
        (!filter.district || r.location.district === filter.district) &&
        (!filter.from || day >= filter.from) &&
        (!filter.to || day <= filter.to)
      );
    });
}
export function aggregateImpact(
  records: ImpactRecord[],
  filter: ImpactFilter = {},
) {
  const selected = selectImpact(records, filter);
  const totals = Object.fromEntries(
    Object.keys(metricCatalog).map((k) => [k, 0]),
  ) as Record<ImpactMetricType, number>;
  const known = new Set<ImpactMetricType>();
  for (const record of selected)
    for (const metric of record.metrics) {
      totals[metric.type] += metric.value;
      known.add(metric.type);
    }
  for (const type of known)
    totals[type] = Math.round((totals[type] + Number.EPSILON) * 100) / 100;
  return {
    records: selected,
    totals,
    known,
    activities: new Set(
      selected
        .filter((r) => r.scope === "individual")
        .map((r) => r.participationId),
    ).size,
    quests: new Set(selected.map((r) => r.questId)).size,
    volunteers: new Set(selected.flatMap((r) => (r.userId ? [r.userId] : [])))
      .size,
    collectiveResults: selected.filter((r) => r.scope === "collective").length,
  };
}
/** v4 already awarded XP; migration never creates transactions or guesses measured output. */
export function importLegacyImpact(
  s: Pick<
    VolunteerState,
    "participations" | "transactions" | "questRecords" | "organizations"
  >,
): ImpactRecord[] {
  return s.participations.flatMap((p) => {
    const q = s.questRecords.find((q) => q.id === p.questId);
    const tx = s.transactions.find(
      (t) =>
        t.id === `completion:${p.userId}:${p.questId}` &&
        t.userId === p.userId &&
        t.questId === p.questId,
    );
    if (!q || p.status !== "completed" || !p.confirmedAt || !tx) return [];
    const record: ImpactRecord = {
      id: `impact:${tx.id}`,
      sourceEventId: tx.id,
      questId: q.id,
      participationId: p.id,
      userId: p.userId,
      organizationId: q.organizationId,
      scope: "individual",
      verificationStatus: "verified",
      verifiedAt: p.confirmedAt,
      verifiedBy: null,
      provenance: "legacy-import",
      location: locationFor(q),
      metrics: [],
      beforePhoto: null,
      afterPhoto: null,
      summary:
        "Імпортоване демопідтвердження. Фактичні години й міські показники в архіві не зафіксовані.",
      questTitle: q.title,
      categoryId: q.categoryId,
      organizationName:
        s.organizations.find((o) => o.id === q.organizationId)?.name ||
        "Організація",
      awardedXp: tx.xp,
      awardedPoints: tx.points,
    };
    validateImpactRecord(record);
    return [record];
  });
}
