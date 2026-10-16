import { lazy, Suspense, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, MapPinned, ShieldCheck } from "lucide-react";
import {
  aggregateImpact,
  metricCatalog,
  selectImpact,
} from "../entities/impact/domain";
import type { ImpactMetricType } from "../entities/impact/types";
import type { ImpactGroup } from "../features/impact/impact-map";
import { BeforeAfter } from "../features/impact/before-after";
import { useVolunteerState } from "../shared/lib/use-volunteer";
import { Button } from "../shared/ui/button";
import { Badge, Card } from "../shared/ui/primitives";
import { categories } from "../mocks/data";
const ImpactMap = lazy(() =>
  import("../features/impact/impact-map").then((m) => ({
    default: m.ImpactMap,
  })),
);

export function ImpactPage() {
  const state = useVolunteerState();
  const [category, setCategory] = useState("");
  const [district, setDistrict] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [offline, setOffline] = useState(false);
  const [retry, setRetry] = useState(0);
  const invalidDates = !!(from && to && from > to);
  const records = useMemo(
    () =>
      invalidDates
        ? []
        : selectImpact(state.impactRecords, {
            categoryId: category,
            district,
            organizationId,
            from,
            to,
          }),
    [state, category, district, organizationId, from, to, invalidDates],
  );
  const groups = useMemo(() => {
    const grouped = new Map<string, ImpactGroup>();
    for (const r of records) {
      const old = grouped.get(r.questId);
      if (old) old.records.push(r);
      else
        grouped.set(r.questId, {
          questId: r.questId,
          title: r.questTitle,
          location: r.location,
          records: [r],
        });
    }
    return [...grouped.values()];
  }, [records]);
  const selected = groups.find((g) => g.questId === selectedId) || groups[0];
  const selectedStats = aggregateImpact(selected?.records || []);
  const collective = selected?.records.find((r) => r.scope === "collective");
  const stats = aggregateImpact(records);
  const districts = [
    ...new Set(state.impactRecords.map((r) => r.location.district)),
  ].sort();
  const missingLocation = groups.filter((g) => !g.location.coordinates).length;
  const reset = () => {
    setCategory("");
    setDistrict("");
    setOrganizationId("");
    setFrom("");
    setTo("");
    setSelectedId("");
  };
  return (
    <div className="container page-section impact-page">
      <div className="impact-section-heading">
        <div className="page-intro">
          <p className="eyebrow">CITY IMPACT · ДНІПРО</p>
          <h1>Місто, яке ми змінюємо</h1>
          <p>Не плани, а підтверджені результати спільних справ.</p>
        </div>
        <Button asChild variant="outline">
          <Link to="/map">
            Знайти новий квест <ArrowUpRight size={17} />
          </Link>
        </Button>
      </div>
      <div className="impact-disclaimer">
        <ShieldCheck size={24} />
        <p>
          <strong>Демонстрація, а не незалежна верифікація.</strong> Результати
          підтверджує організатор у локальному прототипі. Локації позначають
          території, не точні місця збору. Імена, контакти та приватні звіти не
          публікуються.
        </p>
      </div>
      <form
        className="impact-filters"
        onSubmit={(e) => e.preventDefault()}
        aria-label="Фільтри результатів"
      >
        <label>
          Напрям
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Усі напрями</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Район
          <select
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
          >
            <option value="">Усі райони</option>
            {districts.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
        <label>
          Організація
          <select
            value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value)}
          >
            <option value="">Усі організації</option>
            {state.organizations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Від (Київ)
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label>
          До включно
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <Button variant="ghost" type="button" onClick={reset}>
          Скинути
        </Button>
      </form>
      {invalidDates && (
        <p role="alert" className="error-message">
          Початок періоду має бути не пізніше його завершення.
        </p>
      )}
      <div className="impact-stat-strip" aria-live="polite">
        <span>
          <strong>{stats.quests}</strong> квестів з результатом
        </span>
        <span>
          <strong>{stats.activities}</strong> підтверджених участей
        </span>
        <span>
          <strong>{stats.collectiveResults}</strong> спільних підсумків
        </span>
      </div>
      {offline && (
        <div className="impact-disclaimer" role="status">
          <p>
            Картографічна підкладка недоступна. Список, фільтри та результати
            продовжують працювати.
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setOffline(false);
              setRetry((r) => r + 1);
            }}
          >
            Повторити
          </Button>
        </div>
      )}
      <div className="impact-map-layout">
        <section className="impact-map-panel">
          <Suspense
            fallback={<p className="empty-state">Завантажуємо мапу…</p>}
          >
            <ImpactMap
              groups={groups}
              selected={selected}
              onSelect={setSelectedId}
              onTileError={() => setOffline(true)}
              retry={retry}
            />
          </Suspense>
          <p className="impact-note">
            <MapPinned size={16} /> {missingLocation} квестів без перевірених
            координат показано лише у списку. Маркери не генеруються з адрес.
          </p>
        </section>
        <section
          className="impact-result-list"
          aria-label="Підтверджені квести"
        >
          {groups.length ? (
            groups.map((g) => (
              <button
                className={`impact-result-option ${selected?.questId === g.questId ? "is-selected" : ""}`}
                key={g.questId}
                onClick={() => setSelectedId(g.questId)}
                aria-pressed={selected?.questId === g.questId}
              >
                <Badge>
                  {g.records.some((r) => r.scope === "collective")
                    ? "Спільний результат"
                    : "Підтверджена участь"}
                </Badge>
                <strong>{g.title}</strong>
                <span>{g.location.label}</span>
                <small>
                  {g.records.filter((r) => r.scope === "individual").length}{" "}
                  підтверджених участей ·{" "}
                  {g.location.coordinates ? "Є на мапі" : "Без маркера"}
                </small>
              </button>
            ))
          ) : (
            <Card className="empty-state">
              <h2>Поки немає результатів</h2>
              <p>
                Зміни фільтри або пройди демосценарій з підтвердженням
                організатором.
              </p>
              <Link className="text-link" to="/demo">
                Відкрити демосценарій
              </Link>
            </Card>
          )}
        </section>
      </div>
      {selected && (
        <Card
          className="impact-detail"
          role="region"
          aria-label="Деталі результату"
        >
          <div className="impact-section-heading">
            <div>
              <p className="eyebrow">ПІДТВЕРДЖЕНІ ДІЇ</p>
              <h2>{selected.title}</h2>
              <p>{selected.location.label}</p>
            </div>
            <Link to={`/quests/${selected.questId}`} className="text-link">
              До квесту <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="impact-stat-strip">
            <span>
              <strong>{selectedStats.activities}</strong> підтверджених участей
            </span>
            {(Object.keys(metricCatalog) as ImpactMetricType[])
              .filter((t) => selectedStats.known.has(t))
              .map((t) => (
                <span key={t}>
                  <strong>
                    {selectedStats.totals[t].toLocaleString("uk-UA")}{" "}
                    {metricCatalog[t].unitLabel}
                  </strong>{" "}
                  {metricCatalog[t].label}
                </span>
              ))}
          </div>
          {!selectedStats.known.size && (
            <p className="impact-note">
              Кількісні показники не зафіксовані. Планова тривалість та фото не
              перетворюються на виміряний результат.
            </p>
          )}
          {collective && (
            <>
              <p>{collective.summary}</p>
              <BeforeAfter
                before={collective.beforePhoto}
                after={collective.afterPhoto}
              />
            </>
          )}
          {selected.location.coordinateSource && (
            <a
              className="text-link"
              href={selected.location.coordinateSource}
              target="_blank"
              rel="noreferrer"
            >
              Джерело координат території <ArrowUpRight size={16} />
            </a>
          )}
        </Card>
      )}
    </div>
  );
}
