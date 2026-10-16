import { Link } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import {
  BadgeCheck,
  BookOpen,
  Clock3,
  Flag,
  Leaf,
  Heart,
  Sun,
  ShieldCheck,
  Sparkles,
  Trophy,
  ArrowUpRight,
} from "lucide-react";
import type {
  VolunteerPassport,
  PassportCredential,
  PassportVisibilitySettings,
  PassportActivity,
} from "./types";
import { Card, Badge } from "../../shared/ui/primitives";
import { Button } from "../../shared/ui/button";
import { formatDate } from "../../shared/lib/utils";
import { skillDefinitions } from "../skill/catalog";
export function PassportVerificationStatus() {
  return (
    <Badge>
      <ShieldCheck size={14} />
      Демо: підтверджено організатором
    </Badge>
  );
}
export function VolunteerPassportCard({
  passport: p,
}: {
  passport: VolunteerPassport;
}) {
  return (
    <Card className="volunteer-passport-card">
      <div className="passport-brand">
        <span>
          DNIPRO<span>XP</span> · ПАСПОРТ ВОЛОНТЕРА
        </span>
        <BadgeCheck size={26} />
      </div>
      <div className="passport-identity">
        <span className="passport-avatar">
          {p.avatar === "leaf" ? (
            <Leaf size={38} />
          ) : p.avatar === "heart" ? (
            <Heart size={38} />
          ) : p.avatar === "sun" ? (
            <Sun size={38} />
          ) : (
            p.displayName
              .split(/\s+/)
              .slice(0, 2)
              .map((n) => n[0])
              .join("")
          )}
        </span>
        <div>
          <small>ДОБРІ СПРАВИ МАЮТЬ ІМ’Я</small>
          <h2>{p.displayName}</h2>
          <Badge>
            Рівень {p.volunteerLevel} · {p.totalXp.toLocaleString("uk-UA")} XP
          </Badge>
        </div>
      </div>
      <div className="passport-card-footer">
        <div>
          <small>СТАЛИЙ НОМЕР ПАСПОРТА</small>
          <strong>{p.passportId}</strong>
        </div>
        <div>
          <small>У СПІЛЬНОТІ З</small>
          <strong>{formatDate(p.joinDate)}</strong>
        </div>
      </div>
      <span className="passport-demo-label">Демонстраційний паспорт</span>
    </Card>
  );
}
export function PassportQRCode({ url }: { url: string }) {
  return (
    <div className="passport-qr">
      <QRCodeSVG
        value={url}
        size={144}
        marginSize={4}
        level="M"
        fgColor="#20362F"
        title="QR-код публічного паспорта"
      />
      <p>Відкрий публічний паспорт</p>
      <a href={url}>{url}</a>
    </div>
  );
}
export function PassportHero({
  passport,
  url,
}: {
  passport: VolunteerPassport;
  url: string;
}) {
  return (
    <section className="passport-hero">
      <VolunteerPassportCard passport={passport} />
      <Card>
        <PassportQRCode url={url} />
        <p className="field-hint">
          QR містить посилання на цю демоверсію. Дані доступні в межах
          локального браузера; документ не має юридичної сили.
        </p>
      </Card>
    </section>
  );
}
export function PassportStatistics({
  passport: p,
}: {
  passport: VolunteerPassport;
}) {
  return (
    <div className="personal-stats passport-statistics">
      {[
        {
          icon: Flag,
          value: p.completedQuests,
          label: "підтверджених квестів",
        },
        ...(p.verifiedHours !== undefined
          ? [
              {
                icon: Clock3,
                value: p.verifiedHours,
                label: "перевірених годин",
              },
            ]
          : []),
        { icon: Sparkles, value: p.totalXp, label: "накопичено XP" },
        ...(p.organizationExperience
          ? [
              {
                icon: BookOpen,
                value: p.organizationExperience.length,
                label: "організацій у досвіді",
              },
            ]
          : []),
      ].map((s) => (
        <Card className="personal-stat" key={s.label}>
          <s.icon size={23} />
          <strong>{s.value.toLocaleString("uk-UA")}</strong>
          <h3>{s.label}</h3>
        </Card>
      ))}
    </div>
  );
}
export function PassportAchievements({
  achievements,
}: {
  achievements: NonNullable<VolunteerPassport["achievements"]>;
}) {
  return (
    <section className="personal-section">
      <h2>Підтверджені досягнення</h2>
      <div className="identity-small-grid">
        {achievements.length ? (
          achievements.map((a) => (
            <Card className="passport-achievement" key={a.id}>
              <Trophy size={25} />
              <h3>{a.title}</h3>
              <p>{a.description}</p>
              {a.href && (
                <Link className="text-link" to={a.href}>
                  Історія відзнаки <ArrowUpRight size={15} />
                </Link>
              )}
            </Card>
          ))
        ) : (
          <Card className="inline-empty">
            <p>Перша відзнака ще попереду.</p>
          </Card>
        )}
      </div>
    </section>
  );
}
export function PassportSkills({
  progress,
}: {
  progress: NonNullable<VolunteerPassport["skillProgress"]>;
}) {
  const earned = progress.filter((p) => p.level > 0);
  return (
    <section className="personal-section">
      <h2>Навички та спеціалізації</h2>
      <div className="passport-skills">
        {earned.length ? (
          earned.map((p) => (
            <Card key={p.skillId}>
              <span className="skill-dot" />
              <div>
                <strong>
                  {skillDefinitions.find((s) => s.id === p.skillId)?.name}
                </strong>
                <small>
                  Рівень {p.level} · {p.earnedXp} досвіду навички
                </small>
              </div>
            </Card>
          ))
        ) : (
          <Card className="inline-empty">
            <p>Навички розвиваються після підтверджених справ.</p>
          </Card>
        )}
      </div>
    </section>
  );
}
export function PassportActivityTimeline({
  activities,
}: {
  activities: PassportActivity[];
}) {
  return (
    <section className="personal-section">
      <h2>Підтверджена історія</h2>
      <div className="passport-timeline">
        {activities.length ? (
          activities.map((a) => (
            <Card key={a.id}>
              <BadgeCheck size={22} />
              <div>
                <h3>
                  <Link to={`/quests/${a.questId}`}>{a.title}</Link>
                </h3>
                <p>
                  {formatDate(a.confirmedAt)}
                  {a.hours !== undefined ? ` · ${a.hours} год` : ""}
                </p>
                <Link
                  className="text-link"
                  to={`/passport/credentials/${encodeURIComponent(a.credentialId)}`}
                >
                  Деталі підтвердження <ArrowUpRight size={15} />
                </Link>
              </div>
            </Card>
          ))
        ) : (
          <Card className="inline-empty">
            <p>
              Після перевірки організатором тут з’явиться твоя перша добра
              справа.
            </p>
          </Card>
        )}
      </div>
    </section>
  );
}
export function PassportCredentialCard({
  credential: c,
}: {
  credential: PassportCredential;
}) {
  return (
    <Card className="passport-credential">
      <ShieldCheck size={45} />
      <PassportVerificationStatus />
      <h1>{c.title}</h1>
      <dl>
        <dt>Ідентифікатор</dt>
        <dd>{c.id}</dd>
        <dt>Джерело активності</dt>
        <dd>{c.verification.sourceActivityId}</dd>
        <dt>Підтверджено</dt>
        <dd>{formatDate(c.verification.issuedAt)}</dd>
        <dt>Видавець</dt>
        <dd>{c.verification.issuedBy}</dd>
        {c.hours !== undefined && (
          <>
            <dt>Перевірені години</dt>
            <dd>{c.hours}</dd>
          </>
        )}
        {c.verification.evidenceReferences.length > 0 && (
          <>
            <dt>Посилання на локальні джерела</dt>
            <dd>{c.verification.evidenceReferences.join(" · ")}</dd>
          </>
        )}
      </dl>
      <p className="field-hint">
        Локальний демонстраційний запис. Не є криптографічним доказом чи
        документом юридичної сили.
      </p>
      <Button asChild>
        <Link to={`/passport/${c.userId}`}>До публічного паспорта</Link>
      </Button>
    </Card>
  );
}
export function PassportPrivacySettings({
  settings,
  pending,
  onChange,
  error,
}: {
  settings: PassportVisibilitySettings;
  pending: boolean;
  onChange: (value: PassportVisibilitySettings) => void;
  error?: string;
}) {
  const fields: { key: keyof PassportVisibilitySettings; label: string }[] = [
    { key: "publicProfile", label: "Публічний паспорт" },
    { key: "showVerifiedHours", label: "Підтверджені години" },
    { key: "showAchievements", label: "Досягнення" },
    { key: "showSkillProgress", label: "Навички та спеціалізації" },
    {
      key: "showActivityHistory",
      label: "Історія активностей і підтвердження",
    },
    { key: "showOrganizations", label: "Досвід в організаціях" },
  ];
  return (
    <Card className="passport-privacy no-print">
      <h2>Ти обираєш, чим ділитися</h2>
      <p>
        Налаштування застосовуються до публічного паспорта й його підтверджень.
        Власний паспорт показує повну картину.
      </p>
      {fields.map((f) => (
        <label key={f.key}>
          <input
            type="checkbox"
            checked={settings[f.key]}
            disabled={pending}
            onChange={(e) =>
              onChange({ ...settings, [f.key]: e.target.checked })
            }
          />
          <span>{f.label}</span>
        </label>
      ))}
      {pending && <p role="status">Зберігаємо видимість…</p>}
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
    </Card>
  );
}
