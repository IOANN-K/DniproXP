import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import type { Page } from "@playwright/test";
async function role(page: Page, id: string) {
  await page.evaluate(
    (userId) =>
      localStorage.setItem("dniproxp:auth:v2", JSON.stringify({ userId })),
    id,
  );
  await page.reload();
}
async function fixture(page: Page) {
  await page.goto("/");
  // Drive the actual repository for fixture setup, not a second mock implementation.
  await page.evaluate(async () => {
    // Vite serves these source modules in development; tests do not add a production backdoor.
    const path = "/src/mocks/";
    const { repository } = await import(
      /* @vite-ignore */ `${path}repository.ts`
    );
    const { authSession } = await import(
      /* @vite-ignore */ `${path}auth-session.ts`
    );
    authSession.set("demo-user");
    repository.join("demo-city-team", "demo-user");
    authSession.set("demo-organizer");
    repository.reviewApplication("demo-city-team", "demo-user", true, "");
    authSession.set("demo-user");
  });
  await role(page, "demo-user");
}
test("volunteer report → organizer verification → receipt and PNG", async ({
  page,
}, testInfo) => {
  await fixture(page);
  await page.goto("/quests/demo-city-team");
  await page.getByRole("button", { name: "Завершити й подати звіт" }).click();
  await page
    .getByLabel("Що вдалося зробити?")
    .fill("Допомогла команді прибрати та впорядкувати ділянку парку.");
  await page.getByLabel("Фактичний час допомоги, год").fill("1.5");
  await page
    .getByRole("button", { name: "Надіслати на підтвердження" })
    .click();
  await expect(
    page.getByText("Організатор перевірить твій звіт"),
  ).toBeVisible();
  await role(page, "demo-organizer");
  await page.goto("/organizer/quests/demo-city-team?tab=reports");
  await expect(page.getByText("Фактичний час:")).toBeVisible();
  await page
    .getByRole("button", { name: "Підтвердити виконання", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Підтвердити виконання", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await role(page, "demo-user");
  await page.goto(
    "/impact/receipts/impact%3Acompletion%3Ademo-user%3Ademo-city-team",
  );
  await expect(page.getByTestId("impact-receipt")).toContainText("1,5 год");
  await expect(page.getByTestId("impact-receipt")).not.toContainText(
    "Волонтер: Олександра",
  );
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Завантажити PNG" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("dniproxp-impact-receipt.png");
  expect(await download.failure()).toBeNull();
  const pngPath = testInfo.outputPath("receipt.png");
  await download.saveAs(pngPath);
  expect((await readFile(pngPath)).subarray(0, 8).toString("hex")).toBe(
    "89504e470d0a1a0a",
  );
  await page.evaluate(() =>
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: () => false,
    }),
  );
  const fallback = page.waitForEvent("download");
  await page.getByRole("button", { name: "Поділитися PNG" }).click();
  expect((await fallback).suggestedFilename()).toBe(
    "dniproxp-impact-receipt.png",
  );
  await page.getByLabel("Додати моє ім’я").check();
  await expect(page.getByTestId("impact-receipt")).toContainText(
    "Волонтер: Олександра Коваль",
  );
});
test("group result, before/after keyboard, date filters and offline tiles", async ({
  page,
}) => {
  await fixture(page);
  await page.evaluate(async () => {
    const path = "/src/mocks/";
    const { repository } = await import(
      /* @vite-ignore */ `${path}repository.ts`
    );
    const { authSession } = await import(
      /* @vite-ignore */ `${path}auth-session.ts`
    );
    authSession.set("demo-user");
    repository.submitReport("demo-city-team", "demo-user", {
      text: "Допомогла команді прибрати погоджену ділянку парку.",
      photo: null,
      photoName: null,
      actualHours: 1.5,
    });
    authSession.set("demo-organizer");
    repository.confirmDemo("demo-city-team", "demo-user");
  });
  await role(page, "demo-organizer");
  await page.goto("/organizer/quests/demo-city-team");
  await page.getByLabel("Зібрані відходи").fill("15");
  await page
    .getByLabel("Публічний опис результату")
    .fill(
      "Команда зібрала та відсортувала 15 кг відходів на погодженій ділянці.",
    );
  await page
    .getByRole("combobox", { name: "Фото до", exact: true })
    .selectOption("/images/nature.jpg");
  await page
    .getByRole("combobox", { name: "Фото після", exact: true })
    .selectOption("/images/community.jpg");
  await page
    .getByRole("button", { name: "Підтвердити спільний результат" })
    .click();
  await expect(page.getByText("Спільний результат збережено")).toBeVisible();
  await page.route("**/*.tile.openstreetmap.org/**", (route) => route.abort());
  await page.goto("/impact");
  await page
    .getByRole("button")
    .filter({ hasText: "Разом озеленюємо парк" })
    .click();
  await expect(
    page
      .getByRole("region", { name: "Деталі результату" })
      .getByText("15 кг", { exact: true }),
  ).toBeVisible();
  const slider = page.getByRole("slider");
  await slider.focus();
  await slider.press("Home");
  await expect(slider).toHaveValue("0");
  await slider.press("End");
  await expect(slider).toHaveValue("100");
  await expect(
    page.getByText("Картографічна підкладка недоступна.", { exact: false }),
  ).toBeVisible();
  await page.getByLabel("Від (Київ)").fill("2030-01-01");
  await expect(
    page.getByRole("heading", { name: "Поки немає результатів" }),
  ).toBeVisible();
  await page.getByLabel("До включно").fill("2020-01-01");
  await expect(page.getByRole("alert")).toContainText("Початок періоду");
});
test("receipt history never exposes another volunteer's receipt", async ({
  page,
}) => {
  await page.goto("/");
  await role(page, "demo-user");
  await page.goto("/impact/receipts/impact%3Acompletion%3Au2%3Ahistory-1");
  await expect(
    page.getByRole("heading", { name: "Чек недоступний" }),
  ).toBeVisible();
  await expect(page.getByTestId("impact-receipt")).toHaveCount(0);
});
test("empty personal history remains honest", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const path = "/src/mocks/";
    const { repository } = await import(
      /* @vite-ignore */ `${path}repository.ts`
    );
    const id = repository.register({
      name: "Новий волонтер",
      email: "new@demo.invalid",
      code: "dnipro-demo",
      role: "VOLUNTEER",
    });
    localStorage.setItem("dniproxp:auth:v2", JSON.stringify({ userId: id }));
  });
  await page.goto("/impact/receipts");
  await expect(
    page.getByRole("heading", { name: "Твоя історія тільки починається" }),
  ).toBeVisible();
});
test("mobile routes have no horizontal page overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await role(page, "demo-user");
  for (const route of ["/", "/impact", "/impact/receipts", "/dashboard"]) {
    await page.goto(route);
    await expect(page.locator("h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
});

test("before/after handles one photo and missing evidence", async ({
  page,
}) => {
  await fixture(page);
  await page.evaluate(async () => {
    const path = "/src/mocks/";
    const { repository } = await import(
      /* @vite-ignore */ `${path}repository.ts`
    );
    const { authSession } = await import(
      /* @vite-ignore */ `${path}auth-session.ts`
    );
    authSession.set("demo-user");
    repository.submitReport("demo-city-team", "demo-user", {
      text: "Допомогла команді прибрати погоджену ділянку парку.",
      photo: null,
      photoName: null,
    });
    authSession.set("demo-organizer");
    repository.confirmDemo("demo-city-team", "demo-user");
    repository.publishCollectiveImpact("demo-city-team", {
      summary: "Команда підтвердила виміряний спільний результат.",
      metrics: [{ type: "waste_kg", value: 0, unit: "kg" }],
      beforePhoto: {
        url: "/images/nature.jpg",
        alt: "Ілюстрація до",
        isDemo: true,
      },
      afterPhoto: null,
    });
  });
  await page.goto("/impact");
  await page
    .getByRole("button")
    .filter({ hasText: "Разом озеленюємо парк" })
    .click();
  await expect(page.locator(".impact-single-photo")).toContainText(
    "Демонстраційне зображення",
  );
  await expect(page.getByRole("slider")).toHaveCount(0);
  await page.evaluate(async () => {
    const path = "/src/mocks/";
    const { repository } = await import(
      /* @vite-ignore */ `${path}repository.ts`
    );
    repository.publishCollectiveImpact("demo-city-team", {
      summary: "Команда підтвердила виміряний спільний результат.",
      metrics: [{ type: "waste_kg", value: 0, unit: "kg" }],
      beforePhoto: null,
      afterPhoto: null,
    });
  });
  // Source-module fixture writes are rehydrated through the app's module graph.
  await page.reload();
  await page
    .getByRole("button")
    .filter({ hasText: "Разом озеленюємо парк" })
    .click();
  await expect(
    page.getByText("Фото до / після не додані.", { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole("slider")).toHaveCount(0);
});
