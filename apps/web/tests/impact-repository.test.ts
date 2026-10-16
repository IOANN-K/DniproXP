import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CollectiveImpactInput } from "../src/entities/impact/types";
let storage: Map<string, string>;
async function load() {
  const { repository, getVolunteer } = await import("../src/mocks/repository");
  const { authSession } = await import("../src/mocks/auth-session");
  return { repository, getVolunteer, authSession };
}
beforeEach(() => {
  vi.resetModules();
  storage = new Map();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => storage.get(k) || null,
    setItem: (k: string, v: string) => storage.set(k, v),
    removeItem: (k: string) => storage.delete(k),
  });
});
async function report() {
  const api = await load();
  api.authSession.set("demo-user");
  api.repository.join("demo-city-team", "demo-user");
  api.authSession.set("demo-organizer");
  api.repository.reviewApplication("demo-city-team", "demo-user", true, "");
  api.authSession.set("demo-user");
  api.repository.submitReport("demo-city-team", "demo-user", {
    text: "Допомогла команді прибрати погоджену ділянку парку.",
    photo: null,
    photoName: null,
    actualHours: 1.5,
  });
  return api;
}
const groupInput: CollectiveImpactInput = {
  summary: "Команда зібрала та відсортувала відходи на ділянці.",
  metrics: [{ type: "waste_kg", value: 15, unit: "kg" }],
  beforePhoto: null,
  afterPhoto: null,
};
describe("DX-002: verified pipeline", () => {
  it("awards no XP or impact on join, approval or report", async () => {
    const a = await load();
    const before = a.getVolunteer("demo-user")!.xp;
    const size = a.repository.getSnapshot().impactRecords.length;
    await report();
    expect(a.getVolunteer("demo-user")!.xp).toBe(before);
    expect(a.repository.getSnapshot().impactRecords).toHaveLength(size);
  });
  it("commits XP, points, hours, result and event once; persists across reload", async () => {
    const a = await report();
    const before = a.getVolunteer("demo-user")!;
    a.authSession.set("demo-organizer");
    a.repository.confirmDemo("demo-city-team", "demo-user");
    const confirmed = a.getVolunteer("demo-user")!;
    expect(confirmed.xp - before.xp).toBe(200);
    expect(confirmed.points - before.points).toBe(100);
    expect(confirmed.hours - before.hours).toBe(1.5);
    a.repository.confirmDemo("demo-city-team", "demo-user");
    expect(a.getVolunteer("demo-user")!.xp).toBe(confirmed.xp);
    const s = a.repository.getSnapshot();
    expect(
      s.impactRecords.filter(
        (r) => r.sourceEventId === "completion:demo-user:demo-city-team",
      ),
    ).toHaveLength(1);
    expect(
      s.activity.filter(
        (e) => e.sourceEventId === "completion:demo-user:demo-city-team",
      ),
    ).toHaveLength(1);
    vi.resetModules();
    const reload = await load();
    expect(reload.getVolunteer("demo-user")!.xp).toBe(confirmed.xp);
    expect(reload.getVolunteer("demo-user")!.hours).toBe(confirmed.hours);
  });
  it("denies self-confirmation, another organization and anonymous callers without writes", async () => {
    const a = await report();
    for (const id of ["demo-user", "organizer-dobro", null]) {
      a.authSession.set(id);
      const before = JSON.stringify(a.repository.getSnapshot());
      expect(() =>
        a.repository.confirmDemo("demo-city-team", "demo-user"),
      ).toThrow();
      expect(JSON.stringify(a.repository.getSnapshot())).toBe(before);
    }
  });
  it("a returned report creates no awards; resubmission is confirmed with its latest hours", async () => {
    const a = await report();
    a.authSession.set("demo-organizer");
    const before = a.getVolunteer("demo-user")!.xp;
    a.repository.rejectReport(
      "demo-city-team",
      "demo-user",
      "Уточни фактичний час допомоги",
    );
    expect(a.getVolunteer("demo-user")!.xp).toBe(before);
    expect(() =>
      a.repository.confirmDemo("demo-city-team", "demo-user"),
    ).toThrow();
    a.authSession.set("demo-user");
    a.repository.submitReport("demo-city-team", "demo-user", {
      text: "Уточнений звіт: допомогла команді прибрати ділянку парку.",
      photo: null,
      photoName: null,
      actualHours: 2,
    });
    a.authSession.set("demo-organizer");
    a.repository.confirmDemo("demo-city-team", "demo-user");
    expect(a.getVolunteer("demo-user")!.hours).toBe(2);
    expect(
      a.repository
        .getSnapshot()
        .participations.find(
          (p) => p.questId === "demo-city-team" && p.userId === "demo-user",
        )!.reportHistory,
    ).toHaveLength(1);
  });
  it("does not confirm cancelled quests or unmoderated organizations", async () => {
    const a = await report();
    a.authSession.set("demo-organizer");
    a.repository.transitionQuest("demo-city-team", "cancelled");
    expect(() =>
      a.repository.confirmDemo("demo-city-team", "demo-user"),
    ).toThrow();
  });
  it("suspended organizations cannot confirm reports", async () => {
    const a = await report();
    a.authSession.set("demo-admin");
    a.repository.moderateOrganization("green", false, "Перевірка організації");
    a.authSession.set("demo-organizer");
    expect(() =>
      a.repository.confirmDemo("demo-city-team", "demo-user"),
    ).toThrow();
  });
  it.each([0, -1, 25, NaN, Infinity])(
    "rejects bad report hours %s without writing",
    async (actualHours) => {
      const a = await report();
      a.authSession.set("demo-organizer");
      a.repository.rejectReport(
        "demo-city-team",
        "demo-user",
        "Уточни результат",
      );
      a.authSession.set("demo-user");
      const before = JSON.stringify(a.repository.getSnapshot());
      expect(() =>
        a.repository.submitReport("demo-city-team", "demo-user", {
          text: "Виконала завдання разом із командою волонтерів.",
          photo: null,
          photoName: null,
          actualHours,
        }),
      ).toThrow();
      expect(JSON.stringify(a.repository.getSnapshot())).toBe(before);
    },
  );
});
describe("DX-003/005: group totals", () => {
  it("requires confirmed participation, replaces totals and never awards XP", async () => {
    const a = await report();
    a.authSession.set("demo-organizer");
    expect(() =>
      a.repository.publishCollectiveImpact("demo-city-team", groupInput),
    ).toThrow();
    a.repository.confirmDemo("demo-city-team", "demo-user");
    const xp = a.getVolunteer("demo-user")!.xp;
    a.repository.publishCollectiveImpact("demo-city-team", groupInput);
    a.repository.publishCollectiveImpact("demo-city-team", {
      ...groupInput,
      metrics: [{ type: "waste_kg", unit: "kg", value: 20 }],
    });
    const groups = a.repository
      .getSnapshot()
      .impactRecords.filter((r) => r.scope === "collective");
    expect(groups).toHaveLength(1);
    expect(groups[0].metrics[0].value).toBe(20);
    expect(a.getVolunteer("demo-user")!.xp).toBe(xp);
    expect(
      a.repository
        .getSnapshot()
        .activity.filter(
          (e) => e.sourceEventId === "collective:demo-city-team",
        ),
    ).toHaveLength(1);
  });
  it("rejects remote photos and rolls back the complete update", async () => {
    const a = await report();
    a.authSession.set("demo-organizer");
    a.repository.confirmDemo("demo-city-team", "demo-user");
    const before = JSON.stringify(a.repository.getSnapshot());
    expect(() =>
      a.repository.publishCollectiveImpact("demo-city-team", {
        ...groupInput,
        beforePhoto: {
          url: "https://invalid.example/photo",
          alt: "Photo",
          isDemo: true,
        },
      }),
    ).toThrow();
    expect(JSON.stringify(a.repository.getSnapshot())).toBe(before);
  });
});
describe("DX-001: v4 migration", () => {
  it("preserves existing XP, profiles, reward history, and unknown measurements", async () => {
    const a = await load();
    const before = structuredClone(a.repository.getSnapshot());
    storage.set(
      "dniproxp:platform:v4",
      JSON.stringify({ ...before, version: 4, impactRecords: undefined }),
    );
    storage.delete("dniproxp:platform:v5");
    vi.resetModules();
    const b = await load();
    const next = b.repository.getSnapshot();
    expect(next.version).toBe(5);
    expect(next.transactions).toEqual(before.transactions);
    expect(next.redemptions).toEqual(before.redemptions);
    expect(next.profiles).toEqual(before.profiles);
    expect(next.participations).toEqual(before.participations);
    expect(next.impactRecords.length).toBeGreaterThan(0);
    expect(
      next.impactRecords.every(
        (r) => !r.metrics.length && r.verifiedBy === null,
      ),
    ).toBe(true);
    expect(storage.has("dniproxp:platform:v4")).toBe(true);
  });
});
