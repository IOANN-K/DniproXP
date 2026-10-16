import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";

async function readable(page: Page) {
  const problems = await page.evaluate(() => {
    const elements = [...document.querySelectorAll<HTMLElement>("body *")];
    return elements.filter((el) => {
      if (el.closest('.sr-only,[aria-hidden="true"]')) return false;
      if (![...el.childNodes].some(n => n.nodeType === Node.TEXT_NODE && n.textContent?.trim())) return false;
      const style = getComputedStyle(el), bounds = el.getBoundingClientRect();
      const size = parseFloat(style.fontSize);
      return bounds.width > 0 && bounds.height > 0 && style.visibility !== "hidden" && size > 0 && size < 16;
    }).map(el => ({ text: el.textContent?.slice(0, 50), font: getComputedStyle(el).fontSize }));
  });
  expect(problems).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const img of await page.locator(".brand-icon").all()) {
    await expect(img).toHaveJSProperty("complete", true);
    expect(await img.evaluate(el => (el as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  }
}
for (const width of [1365, 390]) {
  test(`brand artwork and minimum 16px text at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.locator(".quest-card").first()).toBeVisible();
    await readable(page);
    if (width === 390) {
      await page.getByRole("button", { name: "Відкрити меню", exact: true }).click();
      await readable(page);
      await page.keyboard.press("Escape");
    }
    await page.getByRole("button", { name: "Демо", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await readable(page);
    await page.keyboard.press("Escape");
    await page.goto("/quests");
    await expect(page.locator(".quest-card").first()).toBeVisible();
    await page.getByRole("button", { name: /^Фільтри/ }).click();
    await readable(page);
    await page.evaluate(() => localStorage.setItem("dniproxp:auth:v2", JSON.stringify({ userId: "demo-organizer" })));
    await page.goto("/organizer/quests/generate");
    await expect(page.getByLabel("Опиши свою ідею")).toBeVisible();
    await readable(page);
    await page.getByRole("button", { name: "Прибрати парк", exact: true }).click();
    await page.getByLabel("Район", { exact: true }).fill("Соборний");
    await page.getByRole("button", { name: "Підготувати чернетку", exact: true }).click();
    await expect(page.getByLabel("Назва квесту")).toBeVisible();
    await readable(page);
  });
}
