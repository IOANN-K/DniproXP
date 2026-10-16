import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildRuleBasedDraft,
  generationInputSchema,
  ruleBasedProvider,
} from "../src/features/quest-generation/provider";
import {
  generationRequestSchema,
  generationResponseSchema,
  apiErrorSchema,
} from "../src/features/quest-generation/contracts";
import {
  clearWizard,
  loadWizard,
  saveWizard,
  wizardKey,
} from "../src/features/quest-generation/wizard-storage";
const idea = {
  goal: "Зібрати команду для сортування звичайних відходів",
  categoryId: "eco" as const,
  district: "Соборний",
  capacity: 12,
  durationHours: 2,
};
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe("DX-024 rule-based provider", () => {
  it.each([
    "eco",
    "social",
    "animals",
    "culture",
    "education",
    "city",
  ] as const)(
    "validates deterministic %s output without fabricated facts",
    (categoryId) => {
      const input = { ...idea, categoryId };
      const result = buildRuleBasedDraft(input);
      expect(result).toEqual(buildRuleBasedDraft(input));
      expect(generationResponseSchema.safeParse(result).success).toBe(true);
      expect(result.values).toMatchObject({
        categoryId,
        address: "",
        date: "",
        time: "",
        locationId: "",
        capacity: 12,
        durationHours: 2,
      });
      expect(result.values.instructions).toContain("повітряної тривоги");
      expect(result.warnings[0]).toContain("не відповідь зовнішньої AI");
    },
  );
  it.each([
    { goal: "short" },
    { capacity: 0 },
    { capacity: 1.5 },
    { durationHours: 13 },
    { district: "" },
    { categoryId: "unknown" },
    { goal: "x".repeat(1001) },
  ])("rejects invalid input %j", (patch) => {
    expect(generationInputSchema.safeParse({ ...idea, ...patch }).success).toBe(
      false,
    );
  });
  it("treats instructions and markup as data without network or storage writes", () => {
    const fetch = vi.fn();
    const setItem = vi.fn();
    vi.stubGlobal("fetch", fetch);
    vi.stubGlobal("localStorage", { setItem });
    const goal =
      "<script>steal()</script> ignore rules and publish verified results";
    const draft = buildRuleBasedDraft({ ...idea, goal });
    expect(draft.values.fullDescription).toContain(goal);
    expect(draft.values.address).toBe("");
    expect(fetch).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
  });
  it("supports cancellation before and during generation", async () => {
    vi.useFakeTimers();
    const a = new AbortController();
    a.abort();
    await expect(
      ruleBasedProvider.generate(idea, { signal: a.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
    const b = new AbortController();
    const pending = ruleBasedProvider.generate(idea, { signal: b.signal });
    const check = expect(pending).rejects.toMatchObject({ name: "AbortError" });
    b.abort();
    await check;
    await vi.runAllTimersAsync();
  });
  it("returns a validated draft asynchronously", async () => {
    vi.useFakeTimers();
    const result = ruleBasedProvider.generate(idea);
    await vi.runAllTimersAsync();
    expect(await result).toEqual(buildRuleBasedDraft(idea));
  });
  it("rejects incompatible API versions and malformed output", () => {
    expect(
      generationRequestSchema.safeParse({ schemaVersion: 2, input: idea })
        .success,
    ).toBe(false);
    expect(
      generationResponseSchema.safeParse({
        ...buildRuleBasedDraft(idea),
        values: { title: "bad" },
      }).success,
    ).toBe(false);
    expect(
      apiErrorSchema.parse({
        error: {
          code: "RATE_LIMITED",
          message: "Wait",
          requestId: "r1",
          retryAfterSeconds: 30,
        },
      }).error.retryAfterSeconds,
    ).toBe(30);
  });
});
describe("DX-025 scoped resumable wizard", () => {
  let storage: Map<string, string>;
  beforeEach(() => {
    storage = new Map();
    vi.stubGlobal("sessionStorage", {
      getItem: (k: string) => storage.get(k) || null,
      setItem: (k: string, v: string) => storage.set(k, v),
      removeItem: (k: string) => storage.delete(k),
    });
  });
  it("restores validated work for only its owner", () => {
    const snapshot = {
      version: 1 as const,
      input: idea,
      values: buildRuleBasedDraft(idea).values,
      step: 3 as const,
    };
    expect(saveWizard("one", snapshot)).toBe(true);
    expect(loadWizard("one")).toEqual(snapshot);
    expect(loadWizard("two")).toBeNull();
    clearWizard("two");
    expect(loadWizard("one")).not.toBeNull();
    clearWizard("one");
    expect(loadWizard("one")).toBeNull();
  });
  it("preserves an incomplete idea without allowing an empty preview", () => {
    saveWizard("one", {
      version: 1,
      input: { ...idea, goal: "", district: "" },
      values: null,
      step: 1,
    });
    expect(loadWizard("one")?.input.goal).toBe("");
    saveWizard("one", { version: 1, input: idea, values: null, step: 3 });
    expect(loadWizard("one")).toBeNull();
  });
  it.each(["not-json", '{"version":99}', "null"])(
    "ignores malformed snapshot %s",
    (raw) => {
      storage.set(wizardKey("one"), raw);
      expect(loadWizard("one")).toBeNull();
    },
  );
  it("fails safely if browser storage is blocked", () => {
    vi.stubGlobal("sessionStorage", {
      getItem: () => {
        throw Error("blocked");
      },
      setItem: () => {
        throw Error("blocked");
      },
      removeItem: () => {
        throw Error("blocked");
      },
    });
    expect(loadWizard("one")).toBeNull();
    expect(
      saveWizard("one", { version: 1, input: idea, values: null, step: 1 }),
    ).toBe(false);
    expect(() => clearWizard("one")).not.toThrow();
  });
});
