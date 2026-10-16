import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Clock3,
  MapPinned,
  Users,
  CheckCircle2,
} from "lucide-react";
import type { ImpactMetricType } from "../../entities/impact/types";
import { aggregateImpact, metricCatalog } from "../../entities/impact/domain";
import { useVolunteerState } from "../../shared/lib/use-volunteer";
import { Card } from "../../shared/ui/primitives";
export function ImpactSummary({ userId }: { userId?: string }) {
  const state = useVolunteerState();
  const stats = aggregateImpact(state.impactRecords, userId ? { userId } : {});
  const metrics = [
    {
      Icon: CheckCircle2,
      value: stats.activities,
      label: userId ? "підтверджені участі" : "підтверджені участі містян",
    },
    {
      Icon: Clock3,
      value: stats.known.has("volunteer_hours")
        ? stats.totals.volunteer_hours.toLocaleString("uk-UA")
        : "—",
      label: "фактичних годин допомоги",
    },
    {
      Icon: userId ? MapPinned : Users,
      value: userId ? stats.quests : stats.volunteers,
      label: userId ? "квести з твоїм внеском" : "волонтерів долучилося",
    },
  ];
  return (
    <section
      className="impact-summary"
      aria-label={userId ? "Мій вплив" : "Вплив міста"}
    >
      <div className="impact-section-heading">
        <div>
          <p className="eyebrow">CITY IMPACT</p>
          <h2>
            {userId
              ? "Твій внесок має значення"
              : "Маленькі дії. Спільні зміни."}
          </h2>
        </div>
        <Link
          className="text-link"
          to={userId ? "/impact/receipts" : "/impact"}
        >
          {userId ? "Мої чеки допомоги" : "Мапа результатів"}
          <ArrowUpRight size={18} />
        </Link>
      </div>
      <div className="impact-stats">
        {metrics.map(({ Icon, value, label }) => (
          <Card key={label} className="impact-stat">
            <Icon size={23} />
            <strong>{value}</strong>
            <span>{label}</span>
          </Card>
        ))}
      </div>
      {!userId && stats.collectiveResults > 0 && (
        <div
          className="impact-stat-strip"
          aria-label="Спільні міські показники"
        >
          {(Object.keys(metricCatalog) as ImpactMetricType[])
            .filter(
              (type) =>
                metricCatalog[type].scope === "collective" &&
                stats.known.has(type),
            )
            .map((type) => (
              <span key={type}>
                <strong>
                  {stats.totals[type].toLocaleString("uk-UA")}{" "}
                  {metricCatalog[type].unitLabel}
                </strong>
                {metricCatalog[type].label}
              </span>
            ))}
        </div>
      )}
      <p className="impact-note">
        Демонстраційні дані цього браузера. Лише підтверджені внески; години —
        тільки зі звітів. Архів без фактичних показників не додає вигаданих
        годин. Спільні показники рахуються один раз на квест.
      </p>
    </section>
  );
}
