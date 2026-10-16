import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
async function organizer(page: Page) {
  await page.goto("/");
  await page.evaluate(() =>
    localStorage.setItem(
      "dniproxp:auth:v2",
      JSON.stringify({ userId: "demo-organizer" }),
    ),
  );
  await page.goto("/organizer");
}
for (const width of [1365, 390]) {
  test(`discovery search, district, removable filters and empty state at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.getByLabel("Знайти добру справу", { exact: true }).fill("берег");
    await page
      .getByRole("button", { name: "Шукати квести", exact: true })
      .click();
    await expect(page).toHaveURL(/\/quests\?search=/);
    await expect(page.locator(".quest-card").first()).toBeVisible();
    await expect(page.locator(".quest-card").first()).toContainText(/берег/i);
    await page
      .getByRole("button", {
        name: "Прибрати фільтр: Пошук: берег",
        exact: true,
      })
      .click();
    await page
      .getByLabel("Район пошуку", { exact: true })
      .selectOption("Соборний");
    await expect(page).toHaveURL(/district=/);
    await page.reload();
    await expect(page.getByLabel("Район пошуку")).toHaveValue("Соборний");
    await page
      .getByRole("button", { name: "Прибрати фільтр: Соборний", exact: true })
      .click();
    await page.getByRole("button", { name: /^Фільтри/ }).click();
    await expect(page.locator("#quest-filters")).toBeVisible();
    await page.getByLabel("Складність", { exact: true }).selectOption("Легкий");
    await expect(page.locator(".quest-card").first()).toBeVisible();
    await page
      .getByLabel("Пошук за назвою та описом")
      .fill("немає-такого-квесту-9876");
    await expect(
      page.getByRole("heading", { name: "Твій квест ще попереду" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Показати всі квести", exact: true })
      .click();
    await expect(page.locator(".quest-card")).toHaveCount(9);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
  test(`workspace navigation and wizard suggestions preserve user input at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await organizer(page);
    const nav = page.getByRole("navigation", { name: "Кабінет організатора" });
    await expect(
      nav.getByRole("link", { name: "Огляд", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await nav
      .getByRole("link", { name: "Мої квести та заявки", exact: true })
      .click();
    await page.getByLabel("Пошук власних квестів").fill("zzzz-not-found");
    await expect(
      page.getByRole("heading", { name: "За цими фільтрами нічого немає" }),
    ).toBeVisible();
    await nav
      .getByRole("link", { name: "Майстер квестів", exact: true })
      .click();
    await page.getByLabel("Район", { exact: true }).fill("Соборний");
    for (const [name, category] of [
      ["Допомогти притулку", "animals"],
      ["Поділитися знаннями", "education"],
      ["Прибрати парк", "eco"],
    ]) {
      await page.getByRole("button", { name, exact: true }).click();
      await expect(page.getByLabel("Напрям", { exact: true })).toHaveValue(
        category,
      );
      await expect(page.getByLabel("Опиши свою ідею")).not.toHaveValue("");
      await expect(page.getByLabel("Район", { exact: true })).toHaveValue(
        "Соборний",
      );
    }
    await page
      .getByRole("button", { name: "Підготувати чернетку", exact: true })
      .click();
    await expect(page.getByLabel("Назва квесту")).toBeVisible();
    await expect(
      page.locator(".wizard-steps [aria-current='step']"),
    ).toContainText("Редагування");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  });
}
