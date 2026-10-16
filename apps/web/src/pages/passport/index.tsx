import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Copy, Printer, ShieldCheck, ArrowUpRight } from "lucide-react";
import {
  usePassport,
  useCredential,
  usePassportPrivacy,
} from "../../features/passport/hooks";
import { useSession } from "../../features/session/store";
import {
  PassportHero,
  PassportStatistics,
  PassportAchievements,
  PassportSkills,
  PassportActivityTimeline,
  PassportPrivacySettings,
  PassportCredentialCard,
} from "../../entities/passport/components";
import { Button } from "../../shared/ui/button";
import { Card } from "../../shared/ui/primitives";
import {
  ExplorationSkeleton,
  ExplorationError,
} from "../../shared/ui/exploration-states";
export function PassportPage() {
  const { userId } = useParams();
  const user = useSession((s) => s.user);
  const id = userId || user?.id || "";
  const query = usePassport(id, !!userId);
  const privacy = usePassportPrivacy();
  const [copy, setCopy] = useState("");
  if (query.isPending)
    return (
      <div className="container page-section">
        <ExplorationSkeleton />
      </div>
    );
  if (query.isError)
    return (
      <div className="container page-section">
        <ExplorationError retry={() => void query.refetch()} />
      </div>
    );
  if (!query.data || query.data.restricted === true)
    return (
      <div className="container empty-state">
        <ShieldCheck size={40} />
        <h1>{query.data ? "Цей паспорт приватний" : "Паспорт не знайдено"}</h1>
        <p>Власник керує доступом до свого демонстраційного документа.</p>
        <Button asChild>
          <Link to="/teams">До спільноти</Link>
        </Button>
      </div>
    );
  const p = query.data.passport;
  const url = new URL(
    `/passport/${encodeURIComponent(p.userId)}`,
    window.location.origin,
  ).href;
  return (
    <div className="container page-section passport-page">
      <div className="identity-page-heading no-print">
        <div>
          <p className="eyebrow">ТВОЯ ІСТОРІЯ ДОБРИХ СПРАВ</p>
          <h1>{userId ? "Публічний паспорт" : "Мій волонтерський паспорт"}</h1>
          <p>Підтверджений досвід, який розповідає про тебе.</p>
        </div>
        <div>
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                setCopy("Посилання скопійовано.");
              } catch {
                setCopy(`Не вдалося скопіювати. Публічне посилання: ${url}`);
              }
            }}
          >
            <Copy size={17} />
            Копіювати посилання
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer size={17} />
            Друк / PDF
          </Button>
        </div>
      </div>
      {copy && (
        <p className="field-hint no-print" role="status">
          {copy}
        </p>
      )}
      <PassportHero passport={p} url={url} />
      <PassportStatistics passport={p} />
      {p.achievements && (
        <PassportAchievements achievements={p.achievements} />
      )}{" "}
      {p.skillProgress && <PassportSkills progress={p.skillProgress} />}{" "}
      {p.organizationExperience && (
        <section className="personal-section">
          <h2>Досвід в організаціях</h2>
          <div className="identity-small-grid">
            {p.organizationExperience.length ? (
              p.organizationExperience.map((o) => (
                <Card className="passport-organization" key={o.organizationId}>
                  <h3>{o.name}</h3>
                  <p>
                    {o.completedQuests} підтверджених справ
                    {o.verifiedHours !== undefined
                      ? ` · ${o.verifiedHours} год`
                      : ""}
                  </p>
                  <Link
                    className="text-link"
                    to={`/organizations/${o.organizationId}`}
                  >
                    Про організацію <ArrowUpRight size={15} />
                  </Link>
                </Card>
              ))
            ) : (
              <p>Перший досвід з’явиться після підтвердження.</p>
            )}
          </div>
        </section>
      )}
      {p.activityHistory && (
        <PassportActivityTimeline activities={p.activityHistory} />
      )}{" "}
      {p.visibilitySettings && (
        <PassportPrivacySettings
          settings={p.visibilitySettings}
          pending={privacy.isPending}
          onChange={(settings) => privacy.mutate(settings)}
          error={privacy.error?.message}
        />
      )}
      <p className="demo-caption">
        Демонстраційний паспорт · Дані походять із локальних підтверджених
        участей. Не є офіційним документом.
      </p>
    </div>
  );
}
export function PassportCredentialPage() {
  const { id = "" } = useParams();
  const query = useCredential(id);
  return (
    <div className="container page-section">
      {query.isPending ? (
        <ExplorationSkeleton />
      ) : query.isError ? (
        <ExplorationError retry={() => void query.refetch()} />
      ) : query.data ? (
        <PassportCredentialCard credential={query.data} />
      ) : (
        <Card className="empty-state">
          <ShieldCheck size={40} />
          <h1>Підтвердження недоступне</h1>
          <p>
            Запис відсутній, ще не підтверджений або прихований налаштуваннями
            паспорта.
          </p>
          <Button asChild>
            <Link to="/passport">Мій паспорт</Link>
          </Button>
        </Card>
      )}
    </div>
  );
}
