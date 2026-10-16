import { describe, it, expect } from "vitest";
import {
  aggregateImpact,
  attachMetrics,
  importLegacyImpact,
  kyivDay,
  selectImpact,
  validateImpactRecord,
  validateMetrics,
} from "../src/entities/impact/domain";
import type { ImpactRecord } from "../src/entities/impact/types";
import { receiptLines } from "../src/features/impact/receipt-export";
export function record(overrides: Partial<ImpactRecord> = {}): ImpactRecord {
  const id = overrides.id || "impact:completion:u:q";
  return {
    id,
    sourceEventId: "completion:u:q",
    questId: "q",
    participationId: "p",
    userId: "u",
    organizationId: "org",
    scope: "individual",
    verificationStatus: "verified",
    verifiedAt: "2026-10-16T22:30:00Z",
    verifiedBy: "owner",
    provenance: "organizer-confirmation",
    location: {
      label: "Парк",
      district: "Центр",
      coordinates: null,
      coordinateSource: null,
    },
    metrics: attachMetrics(id, [
      { type: "volunteer_hours", value: 1.5, unit: "hours" },
    ]),
    beforePhoto: null,
    afterPhoto: null,
    summary: "PRIVATE REPORT SHOULD NOT BE EXPORTED",
    questTitle: "Добра справа",
    categoryId: "eco",
    organizationName: "Команда",
    awardedXp: 100,
    awardedPoints: 50,
    ...overrides,
  };
}
describe("DX-001: impact invariants", () => {
  it("validates an individual record", () =>
    expect(() => validateImpactRecord(record())).not.toThrow());
  it.each([NaN, Infinity, -1, 0, 25])(
    "rejects invalid individual hours %s",
    (value) =>
      expect(() =>
        validateMetrics(
          [{ type: "volunteer_hours", unit: "hours", value }],
          "individual",
        ),
      ).toThrow(),
  );
  it("rejects wrong units, scopes, fractional counts and duplicate metrics", () => {
    expect(() =>
      validateMetrics(
        [{ type: "waste_kg", value: 2, unit: "hours" }],
        "collective",
      ),
    ).toThrow();
    expect(() =>
      validateMetrics(
        [{ type: "waste_kg", value: 2, unit: "kg" }],
        "individual",
      ),
    ).toThrow();
    expect(() =>
      validateMetrics(
        [{ type: "trees_planted", value: 1.5, unit: "count" }],
        "collective",
      ),
    ).toThrow();
    expect(() =>
      validateMetrics(
        [
          { type: "waste_kg", value: 2, unit: "kg" },
          { type: "waste_kg", value: 3, unit: "kg" },
        ],
        "collective",
      ),
    ).toThrow();
  });
  it("keeps measured zero distinct from an unknown collective result", () => {
    const group = record({
      id: "zero",
      sourceEventId: "collective:q",
      scope: "collective",
      participationId: null,
      userId: null,
      metrics: attachMetrics("zero", [
        { type: "waste_kg", value: 0, unit: "kg" },
      ]),
    });
    const measured = aggregateImpact([group]);
    expect(measured.known.has("waste_kg")).toBe(true);
    expect(measured.totals.waste_kg).toBe(0);
    expect(aggregateImpact([]).known.has("waste_kg")).toBe(false);
  });
  it("excludes unknown runtime scopes and statuses", () => {
    expect(
      aggregateImpact([
        record({ scope: "invalid" as ImpactRecord["scope"] }),
        record({
          verificationStatus: "invalid" as ImpactRecord["verificationStatus"],
        }),
      ]).activities,
    ).toBe(0);
  });
  it("requires verifier, valid date, valid coordinates and metric ownership", () => {
    expect(() => validateImpactRecord(record({ verifiedBy: null }))).toThrow();
    expect(() => validateImpactRecord(record({ verifiedAt: "bad" }))).toThrow();
    expect(() =>
      validateImpactRecord(
        record({
          location: {
            label: "",
            district: "",
            coordinates: [99, 35],
            coordinateSource: "source",
          },
        }),
      ),
    ).toThrow();
    expect(() =>
      validateImpactRecord(
        record({
          metrics: [
            {
              id: "m",
              impactRecordId: "wrong",
              type: "volunteer_hours",
              unit: "hours",
              value: 1,
            },
          ],
        }),
      ),
    ).toThrow();
  });
});
describe("DX-003: verified aggregation", () => {
  it("excludes pending, rejected and malformed results", () => {
    expect(
      aggregateImpact([
        record({ verificationStatus: "unverified" }),
        record({ id: "rejected", verificationStatus: "rejected" }),
        record({ id: "bad", verifiedAt: "bad" }),
      ]).activities,
    ).toBe(0);
  });
  it("deduplicates IDs, source IDs and participation keys", () => {
    const a = record();
    const duplicate = record({
      id: "other",
      sourceEventId: "other",
      metrics: [],
    });
    expect(aggregateImpact([a, a, duplicate]).activities).toBe(1);
    expect(aggregateImpact([a, a]).totals.volunteer_hours).toBe(1.5);
  });
  it("counts collective output once, without attributing it to each volunteer", () => {
    const group = record({
      id: "group",
      sourceEventId: "collective:q",
      scope: "collective",
      participationId: null,
      userId: null,
      metrics: attachMetrics("group", [
        { type: "waste_kg", value: 15, unit: "kg" },
      ]),
    });
    const other = record({
      id: "other",
      sourceEventId: "completion:v:q",
      participationId: "pv",
      userId: "v",
      metrics: [],
    });
    const stats = aggregateImpact([record(), other, group, group]);
    expect(stats.activities).toBe(2);
    expect(stats.quests).toBe(1);
    expect(stats.totals.waste_kg).toBe(15);
    expect(
      aggregateImpact([record(), group], { userId: "u" }).totals.waste_kg,
    ).toBe(0);
  });
  it("uses inclusive Kyiv dates and applies all filters", () => {
    expect(kyivDay("2026-10-16T22:30:00Z")).toBe("2026-10-17");
    const r = record();
    expect(
      selectImpact([r], {
        from: "2026-10-17",
        to: "2026-10-17",
        district: "Центр",
        categoryId: "eco",
        organizationId: "org",
      }),
    ).toHaveLength(1);
    expect(selectImpact([r], { to: "2026-10-16" })).toHaveLength(0);
    expect(selectImpact([r], { district: "Інший" })).toHaveLength(0);
  });
  it("does not guess hours from archival planned duration", () => {
    const s = {
      participations: [
        {
          id: "p",
          questId: "q",
          userId: "u",
          status: "completed",
          confirmedAt: "2026-10-16",
          createdAt: "2026-10-16",
        },
      ],
      transactions: [
        {
          id: "completion:u:q",
          questId: "q",
          userId: "u",
          xp: 100,
          points: 50,
          date: "2026-10-16",
          description: "Done",
        },
      ],
      questRecords: [
        {
          id: "q",
          organizationId: "org",
          title: "Demo",
          duration: "3 години",
          address: "Парк",
          district: "Центр",
          categoryId: "eco",
          coordinates: null,
        },
      ],
      organizations: [{ id: "org", name: "Org" }],
    } as unknown as Parameters<typeof importLegacyImpact>[0];
    const results = importLegacyImpact(s);
    expect(results).toHaveLength(1);
    expect(results[0].verifiedBy).toBeNull();
    expect(aggregateImpact(results).known.has("volunteer_hours")).toBe(false);
    expect(s.transactions).toHaveLength(1);
  });
});
describe("DX-006: privacy-safe receipt export", () => {
  it("omits private text, internal IDs and name by default", () => {
    const lines = receiptLines(record()).join("\n");
    expect(lines).not.toContain("PRIVATE");
    expect(lines).not.toContain("owner");
    expect(lines).not.toContain("completion:");
    expect(lines).toContain("1,5");
    expect(lines).toContain("ДЕМОНСТРАЦІЙНИЙ");
  });
  it("includes name only when explicitly supplied", () =>
    expect(receiptLines(record(), "Олена").join("\n")).toContain(
      "Волонтер: Олена",
    ));
});
