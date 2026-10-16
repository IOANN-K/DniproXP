import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type { Quest } from "../../entities/types";
import type {
  ImpactMetricType,
  ImpactMetricInput,
  ImpactPhoto,
} from "../../entities/impact/types";
import { demoImpactPhotos, metricCatalog } from "../../entities/impact/domain";
import { repository } from "../../mocks/repository";
import { useVolunteerState } from "../../shared/lib/use-volunteer";
import { Button } from "../../shared/ui/button";
import { Card } from "../../shared/ui/primitives";
import { BeforeAfter } from "./before-after";
const collectiveTypes = (
  Object.keys(metricCatalog) as ImpactMetricType[]
).filter((t) => metricCatalog[t].scope === "collective");
const photo = (url: string, when: string): ImpactPhoto | null =>
  url ? { url, alt: `Ілюстративне демофото ${when}`, isDemo: true } : null;

export function CollectiveImpactForm({ quest }: { quest: Quest }) {
  const state = useVolunteerState();
  const existing = state.impactRecords.find(
    (r) => r.scope === "collective" && r.questId === quest.id,
  );
  const ready = state.participations.some(
    (p) => p.questId === quest.id && p.status === "completed",
  );
  return (
    <Card className="impact-organizer">
      <p className="eyebrow">CITY IMPACT · СПІЛЬНИЙ РЕЗУЛЬТАТ</p>
      <h2>Що змінилося завдяки квесту?</h2>
      <p className="impact-note">
        Вкажи виміряний підсумок усієї команди один раз — не для кожного
        учасника. Редагування замінює підсумок, не додає його повторно. XP тут
        не нараховується.
      </p>
      {ready && quest.lifecycle !== "cancelled" ? (
        <ImpactEditor
          key={`${quest.id}:${existing?.verifiedAt || "new"}`}
          quest={quest}
        />
      ) : (
        <p className="impact-note">
          Форма відкриється після підтвердження виконання хоча б одного
          волонтера. Для скасованого квесту публікація недоступна.
        </p>
      )}
      {existing && (
        <>
          <p className="impact-verified">
            Спільний результат збережено · демопідтвердження організатора
          </p>
          <BeforeAfter
            before={existing.beforePhoto}
            after={existing.afterPhoto}
          />
        </>
      )}
    </Card>
  );
}
function ImpactEditor({ quest }: { quest: Quest }) {
  const state = useVolunteerState();
  const existing = state.impactRecords.find(
    (r) => r.scope === "collective" && r.questId === quest.id,
  );
  const [values, setValues] = useState<
    Partial<Record<ImpactMetricType, string>>
  >(() =>
    Object.fromEntries(
      existing?.metrics.map((m) => [m.type, String(m.value)]) || [],
    ),
  );
  const [summary, setSummary] = useState(existing?.summary || "");
  const [before, setBefore] = useState(existing?.beforePhoto?.url || "");
  const [after, setAfter] = useState(existing?.afterPhoto?.url || "");
  const mutation = useMutation({
    mutationFn: async () => {
      const metrics: ImpactMetricInput[] = collectiveTypes
        .filter((t) => values[t]?.trim())
        .map((type) => ({
          type,
          value: Number(values[type]),
          unit: metricCatalog[type].unit,
        }));
      repository.publishCollectiveImpact(quest.id, {
        summary,
        metrics,
        beforePhoto: photo(before, "до"),
        afterPhoto: photo(after, "після"),
      });
    },
  });
  return (
    <form
      className="impact-form"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <div className="impact-form-grid">
        {collectiveTypes.map((type) => (
          <label key={type}>
            {metricCatalog[type].label} ({metricCatalog[type].unitLabel})
            <input
              type="number"
              min={0}
              max="1000000"
              step={metricCatalog[type].unit === "count" ? 1 : 0.01}
              value={values[type] || ""}
              onChange={(e) =>
                setValues((v) => ({ ...v, [type]: e.target.value }))
              }
              placeholder="Не виміряно"
            />
          </label>
        ))}
      </div>
      <label>
        Публічний опис результату
        <textarea
          minLength={10}
          maxLength={2000}
          required
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={3}
          placeholder="Опиши підсумок без імен, контактів та приватних даних учасників"
        />
      </label>
      <div className="impact-form-grid">
        {(
          [
            ["До", before, setBefore],
            ["Після", after, setAfter],
          ] as const
        ).map(([label, value, setter]) => (
          <label key={label}>
            Фото {label.toLowerCase()}
            <select value={value} onChange={(e) => setter(e.target.value)}>
              <option value="">Не додавати</option>
              {demoImpactPhotos.map((url) => (
                <option key={url} value={url}>
                  {url.split("/").pop()} · демо
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <p className="impact-note">
        Порожнє поле означає «не виміряно», а не нуль. Фотографії ілюстративні.
        Це локальний прототип, не незалежна перевірка реальної допомоги.
      </p>
      {mutation.isError && (
        <p className="error-message" role="alert">
          {mutation.error.message}
        </p>
      )}
      <Button type="submit" disabled={mutation.isPending}>
        {mutation.isPending
          ? "Зберігаємо…"
          : existing
            ? "Оновити підтверджений підсумок"
            : "Підтвердити спільний результат"}
      </Button>
    </form>
  );
}
