import type { ImpactRecord } from "../../entities/impact/types";
import { metricCatalog } from "../../entities/impact/domain";
export function receiptLines(record: ImpactRecord, optedInName?: string) {
  return [
    "DniproXP · Чек доброї справи",
    "ДЕМОНСТРАЦІЙНИЙ РЕЗУЛЬТАТ",
    record.questTitle,
    record.organizationName,
    ...(optedInName ? [`Волонтер: ${optedInName}`] : []),
    `Підтверджено: ${new Intl.DateTimeFormat("uk-UA", { timeZone: "Europe/Kyiv", dateStyle: "medium" }).format(new Date(record.verifiedAt!))}`,
    ...record.metrics.map(
      (m) =>
        `${metricCatalog[m.type].label}: ${m.value.toLocaleString("uk-UA")} ${metricCatalog[m.type].unitLabel}`,
    ),
    ...(!record.metrics.length
      ? ["Фактичні кількісні показники не зафіксовані."]
      : []),
    `+${record.awardedXp} XP · +${record.awardedPoints} бонусних балів`,
    record.provenance === "legacy-import"
      ? "Архівне демопідтвердження; перевіряльник не зафіксований."
      : "Демопідтвердження організатора.",
    "Не є офіційним сертифікатом чи незалежним доказом реальної допомоги.",
  ];
}
/** Public export intentionally excludes IDs, private report text, contacts and verifier identity. */
export async function receiptPng(
  record: ImpactRecord,
  optedInName?: string,
): Promise<Blob> {
  await document.fonts.ready;
  const canvas = document.createElement("canvas");
  canvas.width = 1000;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Браузер не підтримує створення PNG.");
  ctx.font = "28px sans-serif";
  const lines = receiptLines(record, optedInName).flatMap((line) => {
    const wrapped: string[] = [];
    let current = "";
    // Character wrapping also handles a title with no spaces.
    for (const char of line) {
      if (ctx.measureText(current + char).width > 840) {
        wrapped.push(current);
        current = char;
      } else current += char;
    }
    wrapped.push(current);
    return [...wrapped, ""];
  });
  canvas.height = 170 + lines.length * 42;
  ctx.fillStyle = "#faf9f5";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#268568";
  ctx.fillRect(0, 0, canvas.width, 16);
  ctx.strokeStyle = "#d7dfd8";
  ctx.strokeRect(40, 50, 920, canvas.height - 100);
  ctx.font = "28px sans-serif";
  ctx.fillStyle = "#20362f";
  lines.forEach((line, index) => ctx.fillText(line, 80, 110 + index * 42));
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Не вдалося створити PNG.")),
      "image/png",
    ),
  );
}
export function saveReceipt(blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "dniproxp-impact-receipt.png";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
