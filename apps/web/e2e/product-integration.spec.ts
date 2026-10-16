import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
const wizard = "/organizer/quests/generate";
async function role(page: Page, userId: string) {
  await page.evaluate(
    (id) =>
      localStorage.setItem("dniproxp:auth:v2", JSON.stringify({ userId: id })),
    userId,
  );
  await page.reload();
}
async function start(page: Page) {
  await page.goto("/");
  await role(page, "demo-organizer");
  await page.goto(wizard);
}
async function idea(page: Page) {
  await page
    .getByLabel("Опиши свою ідею")
    .fill(
      "Зібрати команду для сортування звичайних відходів у погодженому парку",
    );
  await page.getByLabel("Район", { exact: true }).fill("Соборний");
}
async function snapshot(page: Page) {
  return page.evaluate(() =>
    JSON.parse(localStorage.getItem("dniproxp:platform:v5")!),
  );
}
test("wizard edits, restores and saves exactly one unpublished draft without awards", async ({
  page,
}) => {
  await start(page);
  const before = await snapshot(page);
  await idea(page);
  await page
    .getByRole("button", { name: "Підготувати чернетку", exact: true })
    .click();
  await expect(page.getByLabel("Назва квесту")).toBeVisible();
  await page
    .getByLabel("Назва квесту")
    .fill("Прибираємо парк разом — перевірена ідея");
  await page.reload();
  await expect(page.getByLabel("Назва квесту")).toHaveValue(
    "Прибираємо парк разом — перевірена ідея",
  );
  await page.getByRole("button", { name: "Переглянути", exact: true }).click();
  const save = page.getByRole("button", {
    name: "Зберегти чернетку",
    exact: true,
  });
  await expect(save).toBeDisabled();
  await page.getByLabel("Я перевірив(ла)").check();
  await save.dblclick();
  await expect(page).toHaveURL(/\/organizer\/quests\/created-/);
  const after = await snapshot(page);
  expect(after.questRecords.length).toBe(before.questRecords.length + 1);
  expect(after.questRecords.at(-1)).toMatchObject({
    title: "Прибираємо парк разом — перевірена ідея",
    organizationId: "green",
    lifecycle: "draft",
  });
  expect(after.transactions).toEqual(before.transactions);
  expect(after.impactRecords).toEqual(before.impactRecords);
  expect(
    await page.evaluate(() =>
      sessionStorage.getItem("dniproxp:quest-wizard:v1:demo-organizer"),
    ),
  ).toBeNull();
});
test("wizard validation, cancellation, account isolation and explicit discard", async ({
  page,
}) => {
  await start(page);
  await page
    .getByRole("button", { name: "Підготувати чернетку", exact: true })
    .click();
  await expect(page.getByLabel("Опиши свою ідею")).toBeVisible();
  await idea(page);
  await page
    .getByRole("button", { name: "Підготувати чернетку", exact: true })
    .click();
  await page.getByRole("button", { name: "Скасувати", exact: true }).click();
  await page.waitForTimeout(400);
  await expect(page.getByLabel("Опиши свою ідею")).toBeVisible();
  await role(page, "organizer-care");
  await expect(page.getByLabel("Опиши свою ідею")).toHaveValue("");
  await role(page, "demo-organizer");
  await expect(page.getByLabel("Опиши свою ідею")).not.toHaveValue("");
  await page
    .getByRole("button", { name: "Підготувати чернетку", exact: true })
    .click();
  await expect(page.getByLabel("Назва квесту")).toBeVisible();
  await page.getByLabel("Назва квесту").fill("a");
  await page.getByRole("button", { name: "Переглянути", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByRole("button", { name: "Очистити майстер" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Залишити", exact: true })
    .click();
  await expect(page.getByLabel("Назва квесту")).toHaveValue("a");
  await page.getByRole("button", { name: "Очистити майстер" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Очистити", exact: true })
    .click();
  await expect(page.getByLabel("Опиши свою ідею")).toHaveValue("");
  await page.reload();
  await expect(page.getByLabel("Опиши свою ідею")).toHaveValue("");
});
test("wizard route requires organizer and mobile navigation closes after a choice", async ({
  page,
}) => {
  await page.goto(wizard);
  await expect(page).toHaveURL(/\/login/);
  await role(page, "demo-user");
  await page.goto(wizard);
  await expect(
    page.getByRole("heading", { name: "Це простір іншої ролі" }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Відкрити меню" }).click();
  await page
    .getByRole("dialog")
    .getByRole("link", { name: "Демосценарій", exact: true })
    .click();
  await expect(page).toHaveURL(/\/demo$/);
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Почати зі своєї ідеї" }).click();
  await expect(page).toHaveURL(wizard);
  await expect(page.getByLabel("Опиши свою ідею")).toBeVisible();
  await idea(page);
  await page
    .getByRole("button", { name: "Підготувати чернетку", exact: true })
    .click();
  await page.getByRole("button", { name: "Переглянути", exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("demo reset cancels safely and confirms with backup and logout", async ({
  page,
}) => {
  await page.goto("/demo");
  await role(page, "demo-admin");
  const before = await snapshot(page);
  await page.evaluate(() => localStorage.setItem("other-app", "keep"));
  await page.getByRole("button", { name: "Скинути локальні демодані" }).click();
  await expect(
    page.getByRole("button", { name: "Підтвердити скидання" }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Залишити дані" }).click();
  expect(await snapshot(page)).toEqual(before);
  await page.getByRole("button", { name: "Скинути локальні демодані" }).click();
  await page.getByLabel("Для підтвердження введи СКИНУТИ").fill("СКИНУТИ");
  await page.getByRole("button", { name: "Підтвердити скидання" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Перейти до демоадміністратора" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      (rev) =>
        JSON.parse(
          localStorage.getItem(`dniproxp:platform:v5:before-reset:${rev}`)!,
        ),
      before.revision,
    ),
  ).toEqual(before);
  expect(await page.evaluate(() => localStorage.getItem("other-app"))).toBe(
    "keep",
  );
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("dniproxp:auth:v2")!).userId,
    ),
  ).toBeNull();
});
test("verified demo completion to reward exchange keeps XP and survives reload", async ({
  page,
}) => {
  await page.goto("/");
  await role(page, "demo-user");
  await page.goto("/quests/demo-city-team");
  await page
    .getByRole("button", { name: "Подати заявку", exact: true })
    .click();
  await expect(
    page.getByText("Заявка на розгляді", { exact: true }),
  ).toBeVisible();
  await role(page, "demo-organizer");
  await page.goto("/organizer/quests/demo-city-team?tab=applications");
  await page.getByRole("button", { name: "Схвалити", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Схвалити заявку", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await role(page, "demo-user");
  await page.goto("/quests/demo-city-team");
  await page.getByRole("button", { name: "Завершити й подати звіт" }).click();
  await page
    .getByLabel("Що вдалося зробити?")
    .fill("Допомогла команді прибрати погоджену ділянку парку.");
  await page.getByLabel("Фактичний час допомоги, год").fill("1.5");
  await page
    .getByRole("button", { name: "Надіслати на підтвердження" })
    .click();
  await expect(
    page.getByText("Організатор перевірить твій звіт"),
  ).toBeVisible();
  await role(page, "demo-organizer");
  await page.goto("/organizer/quests/demo-city-team?tab=reports");
  await page
    .getByRole("button", { name: "Підтвердити виконання", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Підтвердити виконання", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await role(page, "demo-user");
  const before = await snapshot(page);
  await page.goto("/rewards");
  await page
    .locator(".reward-card")
    .first()
    .getByRole("button", { name: "Детальніше" })
    .click();
  await page
    .getByRole("button", { name: "Обміняти бонусні бали", exact: true })
    .click();
  await page.getByRole("button", { name: /Підтверджую:/ }).click();
  await expect(page.getByText("Демосертифікат отримано")).toBeVisible();
  const after = await snapshot(page);
  expect(after.redemptions.length).toBe(before.redemptions.length + 1);
  expect(
    after.transactions.reduce(
      (sum: number, t: { xp: number }) => sum + t.xp,
      0,
    ),
  ).toBe(
    before.transactions.reduce(
      (sum: number, t: { xp: number }) => sum + t.xp,
      0,
    ),
  );
  expect(
    after.transactions.find(
      (t: { id: string }) => t.id === "completion:demo-user:demo-city-team",
    ),
  ).toEqual(
    before.transactions.find(
      (t: { id: string }) => t.id === "completion:demo-user:demo-city-team",
    ),
  );
  expect(after.transactions.at(-1).points).toBe(-after.redemptions.at(-1).cost);
  await page.reload();
  expect((await snapshot(page)).transactions).toEqual(after.transactions);
  await page.goto("/demo");
  await expect(page.locator(".demo-step.done")).toHaveCount(7);
});
