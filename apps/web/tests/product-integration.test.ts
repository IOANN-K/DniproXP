import { beforeEach, expect, it, vi } from "vitest";
import { buildRuleBasedDraft } from "../src/features/quest-generation/provider";
let storage: Map<string, string>;
let session: Record<string, string>;
const key = "dniproxp:platform:v5";
async function load() {
  const { repository, getVolunteer } = await import("../src/mocks/repository");
  const { authSession } = await import("../src/mocks/auth-session");
  return { repository, getVolunteer, authSession };
}
beforeEach(() => {
  vi.resetModules();
  storage = new Map();
  session = {};
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => storage.get(k) || null,
    setItem: (k: string, v: string) => storage.set(k, v),
    removeItem: (k: string) => storage.delete(k),
  });
  vi.stubGlobal(
    "sessionStorage",
    Object.assign(session, { removeItem: (k: string) => delete session[k] }),
  );
});
it("DX-025 saves one owned unpublished draft without awards; denies volunteer", async () => {
  const a = await load();
  const draft = buildRuleBasedDraft({
    goal: "Зібрати команду для прибирання погодженої ділянки",
    categoryId: "eco",
    district: "Соборний",
    capacity: 12,
    durationHours: 2,
  }).values;
  const before = a.repository.getSnapshot();
  a.authSession.set("demo-user");
  expect(() => a.repository.saveQuest(draft)).toThrow();
  a.authSession.set("demo-organizer");
  const id = a.repository.saveQuest(draft);
  const after = a.repository.getSnapshot();
  expect(after.questRecords.find((q) => q.id === id)).toMatchObject({
    organizationId: "green",
    lifecycle: "draft",
  });
  expect(after.transactions).toEqual(before.transactions);
  expect(after.impactRecords).toEqual(before.impactRecords);
  expect(after.questRecords).toHaveLength(before.questRecords.length + 1);
});
it("DX-027 reset requires demo admin and exact confirmation, without mutations", async () => {
  const a = await load();
  for (const id of [null, "demo-user", "demo-organizer"]) {
    a.authSession.set(id);
    const before = JSON.stringify(a.repository.getSnapshot());
    expect(() => a.repository.resetDemoData("СКИНУТИ")).toThrow();
    expect(JSON.stringify(a.repository.getSnapshot())).toBe(before);
  }
  a.authSession.set("demo-admin");
  const before = JSON.stringify(a.repository.getSnapshot());
  expect(() => a.repository.resetDemoData("скинути")).toThrow();
  expect(JSON.stringify(a.repository.getSnapshot())).toBe(before);
});
it("backs up exact snapshot, resets only app state, logs out and reloads consistently", async () => {
  const a = await load();
  a.authSession.set("demo-user");
  a.repository.newDemoRun();
  const before = a.repository.getSnapshot();
  session["dniproxp:quest-wizard:v1:demo-organizer"] = "draft";
  session["other-app"] = "keep";
  storage.set("other-app", "keep");
  storage.set("dniproxp:seen-xp:v1", "seen");
  a.authSession.set("demo-admin");
  a.repository.resetDemoData("СКИНУТИ");
  expect(
    JSON.parse(storage.get(`${key}:before-reset:${before.revision}`)!),
  ).toEqual(before);
  expect(a.repository.getSnapshot().questRecords).toHaveLength(
    before.questRecords.length - 1,
  );
  expect(a.authSession.get()).toBeNull();
  expect(storage.get("other-app")).toBe("keep");
  expect(session["other-app"]).toBe("keep");
  expect(session["dniproxp:quest-wizard:v1:demo-organizer"]).toBeUndefined();
  expect(storage.has("dniproxp:seen-xp:v1")).toBe(false);
  const after = a.repository.getSnapshot();
  vi.resetModules();
  const reloaded = await load();
  expect(reloaded.repository.getSnapshot()).toEqual(after);
  expect(reloaded.authSession.get()).toBeNull();
});
it.each(["backup", "snapshot"])(
  "aborts reset if %s persistence fails",
  async (failure) => {
    const a = await load();
    a.authSession.set("demo-user");
    a.repository.newDemoRun();
    a.authSession.set("demo-admin");
    const before = JSON.stringify(a.repository.getSnapshot());
    const persisted = storage.get(key);
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => storage.get(k) || null,
      setItem: (k: string, v: string) => {
        if (failure === "backup" || k === key) throw Error("quota");
        storage.set(k, v);
      },
    });
    expect(() => a.repository.resetDemoData("СКИНУТИ")).toThrow(
      "Скидання не виконано",
    );
    expect(JSON.stringify(a.repository.getSnapshot())).toBe(before);
    expect(storage.get(key)).toBe(persisted);
    expect(a.authSession.get()).toBe("demo-admin");
  },
);
it("new demo runs preserve completed history and never award XP", async () => {
  const a = await load();
  a.authSession.set("demo-user");
  const before = a.repository.getSnapshot();
  const id = a.repository.newDemoRun();
  const after = a.repository.getSnapshot();
  expect(id).not.toBe("demo-city-team");
  expect(after.demoQuestId).toBe(id);
  expect(after.transactions).toEqual(before.transactions);
  expect(after.impactRecords).toEqual(before.impactRecords);
  expect(after.redemptions).toEqual(before.redemptions);
});
it("rejects an in-flight draft save after the principal changes", async () => {
  vi.useFakeTimers();
  try {
    const a = await load();
    const { organizerApi } = await import("../src/mocks/organizer-api");
    const draft = buildRuleBasedDraft({
      goal: "Зібрати команду для прибирання погодженої ділянки",
      categoryId: "eco",
      district: "Соборний",
      capacity: 12,
      durationHours: 2,
    }).values;
    a.authSession.set("demo-organizer");
    const before = a.repository.getSnapshot();
    const pending = organizerApi.save(draft);
    const assertion = expect(pending).rejects.toThrow(
      "Обліковий запис змінився",
    );
    a.authSession.set("organizer-care");
    await vi.runAllTimersAsync();
    await assertion;
    expect(a.repository.getSnapshot()).toEqual(before);
  } finally {
    vi.useRealTimers();
  }
});
