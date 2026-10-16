import { ExplorationEntryCards } from "../features/exploration/sections";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, SlidersHorizontal, X, ArrowDown, Compass } from "lucide-react";
import { questApi } from "../mocks/api";
import { categories, DEMO_NOW } from "../mocks/data";
import { Container } from "../shared/ui/container";
import { Button } from "../shared/ui/button";
import { Input } from "../shared/ui/primitives";
import { QuestCard, QuestSkeleton } from "../entities/quest/quest-card";
import { CategoryIcon } from "../entities/quest/category-icon";
export function QuestsPage() {
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const {
    data = [],
    isPending,
    isError,
    refetch,
  } = useQuery({ queryKey: ["quests"], queryFn: () => questApi.list() });
  const districts = [...new Set(data.map((q) => q.district))].sort();
  const set = (key: string, value: string) =>
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== "limit") next.delete("limit");
      return next;
    });
  const search = params.get("search") || "";
  const category = params.get("category") || "";
  const district = params.get("district") || "";
  const difficulty = params.get("difficulty") || "";
  const date = params.get("date") || "";
  const xp = Number(params.get("xp")) || 0;
  const sort = params.get("sort") || "date";
  const limit = Math.max(9, Number(params.get("limit")) || 9);
  const active = ["district", "difficulty", "date", "xp"].filter((k) =>
    params.get(k),
  ).length;
  const filtered = data
    .filter(
      (q) =>
        (!category || q.categoryId === category) &&
        (!district || q.district === district) &&
        (!difficulty || q.difficulty === difficulty) &&
        q.xp >= xp &&
        (!search ||
          `${q.title} ${q.description}`
            .toLocaleLowerCase("uk")
            .includes(search.toLocaleLowerCase("uk"))) &&
        (!date ||
          (q.date.slice(0, 10) >= DEMO_NOW.slice(0, 10) &&
            (date === "week"
              ? new Date(q.date).getTime() <=
                new Date(DEMO_NOW).getTime() + 7 * 86400000
              : q.date.startsWith("2026-10")))),
    )
    .sort((a, b) =>
      sort === "xp"
        ? b.xp - a.xp
        : sort === "places"
          ? b.capacity - b.participants - (a.capacity - a.participants)
          : a.date.localeCompare(b.date),
    );
  return (
    <Container className="page-section">
      <div className="page-intro">
        <p className="eyebrow">ТВІЙ ЧАС ДЛЯ ДОБРИХ СПРАВ</p>
        <h1>Знайди свій квест</h1>
        <p>Маленька дія для тебе. Велика зміна для Дніпра.</p>
        <span className="demo-caption">
          Демонстраційні події · Дата сценарію: 16 жовтня 2026
        </span>
      </div>
      <div className="catalog-toolbar">
        <div className="search-field">
          <Search size={20} />
          <Input
            placeholder="Що хочеш зробити для міста?"
            aria-label="Пошук за назвою та описом"
            value={search}
            onChange={(e) => set("search", e.target.value)}
          />
          {search && (
            <button
              aria-label="Очистити пошук"
              onClick={() => set("search", "")}
            >
              <X size={18} />
            </button>
          )}
        </div>
        <Button
          variant="outline"
          onClick={() => setFiltersOpen(!filtersOpen)}
          aria-expanded={filtersOpen}
          aria-controls="quest-filters"
        >
          <SlidersHorizontal size={18} />
          Фільтри {active > 0 && <span className="count-badge">{active}</span>}
        </Button>
      </div>
      <div className="category-tabs" aria-label="Категорії квестів">
        <button
          aria-pressed={!category}
          className={!category ? "selected" : ""}
          onClick={() => set("category", "")}
        >
          Усі квести
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            aria-pressed={category === c.id}
            className={category === c.id ? "selected" : ""}
            onClick={() => set("category", c.id)}
          >
            <CategoryIcon category={c} size={16} />
            {c.name}
          </button>
        ))}
      </div>
      {filtersOpen && (
        <div className="filter-panel" id="quest-filters">
          <label>
            Район
            <select
              value={district}
              onChange={(e) => set("district", e.target.value)}
            >
              <option value="">Усі райони</option>
              {districts.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </label>
          <label>
            Коли
            <select value={date} onChange={(e) => set("date", e.target.value)}>
              <option value="">Будь-коли</option>
              <option value="week">Найближчі 7 днів</option>
              <option value="month">До кінця жовтня</option>
            </select>
          </label>
          <label>
            Складність
            <select
              value={difficulty}
              onChange={(e) => set("difficulty", e.target.value)}
            >
              <option value="">Будь-яка</option>
              {["Легкий", "Середній", "Складний"].map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </label>
          <label>
            Нагорода XP
            <select
              value={xp}
              onChange={(e) =>
                set("xp", e.target.value === "0" ? "" : e.target.value)
              }
            >
              <option value="0">Будь-яка</option>
              <option value="150">Від 150 XP</option>
              <option value="200">Від 200 XP</option>
              <option value="300">Від 300 XP</option>
            </select>
          </label>
          <Button variant="ghost" onClick={() => setParams({})}>
            Скинути все <X size={16} />
          </Button>
        </div>
      )}
      <div className="results-toolbar">
        <p role="status">
          {isPending ? (
            "Шукаємо добрі справи…"
          ) : (
            <>
              Знайдено квестів: <strong>{filtered.length}</strong>
            </>
          )}
        </p>
        <label>
          <ArrowDown size={15} />
          <span className="sr-only">Сортування</span>
          <select value={sort} onChange={(e) => set("sort", e.target.value)}>
            <option value="date">Найближчі за датою</option>
            <option value="xp">Найбільше XP</option>
            <option value="places">Більше вільних місць</option>
          </select>
        </label>
      </div>
      {isError ? (
        <div className="empty-state">
          <h2>Не вдалося завантажити квести</h2>
          <Button onClick={() => void refetch()}>Спробувати ще раз</Button>
        </div>
      ) : (
        <>
          <div className="quest-grid">
            {isPending
              ? Array.from({ length: 6 }, (_, i) => <QuestSkeleton key={i} />)
              : filtered
                  .slice(0, limit)
                  .map((q) => <QuestCard key={q.id} quest={q} />)}
          </div>
          {!isPending && filtered.length === 0 && (
            <div className="empty-state">
              <Compass size={44} />
              <h2>Твій квест ще попереду</h2>
              <p>Спробуй іншу категорію або послаб фільтри.</p>
              <Button variant="outline" onClick={() => setParams({})}>
                Показати всі квести
              </Button>
            </div>
          )}
          {filtered.length > limit && (
            <div className="load-more">
              <Button
                variant="outline"
                onClick={() => set("limit", String(limit + 9))}
              >
                Показати ще {Math.min(9, filtered.length - limit)} квестів
              </Button>
              <p>
                Показано {Math.min(limit, filtered.length)} з {filtered.length}
              </p>
            </div>
          )}
        </>
      )}
      <section className="personal-section">
        <ExplorationEntryCards />
      </section>
      <p className="demo-caption">
        Усі квести, адреси зустрічей і організатори — частина демонстраційного
        сценарію.
      </p>
    </Container>
  );
}
