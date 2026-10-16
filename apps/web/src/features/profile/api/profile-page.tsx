import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Clock3, Flag, Zap, Coins, ShieldCheck } from "lucide-react";
import { useSession } from "../../session/store";
import { useApiMe, useApiPassport } from "./hooks";
import { ApiEditProfileDialog } from "./edit-dialog";
import { ApiPrivacySettings } from "./preferences";
import { ApiQueryError } from "../../../shared/api/query-feedback";
import { usersApi } from "../../../shared/api/users";
import { apiKeys } from "../../../shared/api/query-client";
import { Card, Badge, Skeleton } from "../../../shared/ui/primitives";
import { Button } from "../../../shared/ui/button";
import { SectionHeading } from "../../../shared/ui/section-heading";
import type { PassportContent } from "../../../shared/api/contracts";
const date = (value: string) => new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value));
export function ApiProfilePage({ passport = false }: { passport?: boolean }) {
  const params = useParams(), publicId = params.id ?? params.userId;
  const session = useSession(s => s.user);
  const profile = useApiMe(), query = useApiPassport(publicId);
  const publicIdentity = useQuery({ queryKey: apiKeys.publicUser(publicId ?? ""), queryFn: ({ signal }) => usersApi.public(publicId ?? "", signal), enabled: !!publicId });
  if (query.isPending || (publicId && publicIdentity.isPending)) return <div className="container page-section" role="status" aria-label="Завантаження профілю"><Skeleton className="skeleton-photo" /><Skeleton className="skeleton-title" /></div>;
  if (query.isError) return <div className="container page-section"><ApiQueryError error={query.error} retry={() => void query.refetch()} /></div>;
  if (publicId && publicIdentity.isError) return <div className="container page-section"><ApiQueryError error={publicIdentity.error} retry={() => void publicIdentity.refetch()} /></div>;
  if (query.data.restricted || (publicId && publicIdentity.data?.restricted)) return <div className="container empty-state"><ShieldCheck size={40} /><h1>Профіль недоступний</h1><p>Власник обмежив публічний доступ або запис не існує.</p></div>;
  const p = query.data.passport, own = !publicId && !!session;
  return <div className="container page-section passport-page">
    <Card className="public-profile-hero"><div className="profile-cover"><span>ДОБРІ СПРАВИ МАЮТЬ ОБЛИЧЧЯ</span><div className="cover-rings" /></div>
      <div className="public-profile-content">
        <ProfileAvatar name={p.displayName} avatar={p.avatar} />
        <div className="profile-heading"><div><p className="eyebrow">{passport ? "ВОЛОНТЕРСЬКИЙ ПАСПОРТ" : "ВОЛОНТЕРСЬКА СПІЛЬНОТА ДНІПРА"}</p><h1>{p.displayName ?? "Ім’я приховано"}</h1>
          <div className="profile-badges"><Badge>Рівень {p.volunteerLevel}</Badge><Badge>{p.passportId}</Badge></div></div>
          {own && profile.data && <ApiEditProfileDialog user={profile.data} />}
        </div><p className="profile-bio">{p.bio ?? "Біографію не опубліковано."}</p>
      </div>
    </Card>
    {own && profile.isError && <ApiQueryError error={profile.error} retry={() => void profile.refetch()} />}
    <div className="personal-stats profile-stat-grid">
      {[{ icon: Zap, value: p.totalXp.toLocaleString("uk-UA"), label: "накопичено XP" },
        { icon: Flag, value: p.completedQuests.toLocaleString("uk-UA"), label: "підтверджено квестів" },
        ...(p.statistics.verifiedHours !== undefined ? [{ icon: Clock3, value: p.statistics.verifiedHours === null ? "Невідомо" : p.statistics.verifiedHours.toLocaleString("uk-UA"), label: "відомих годин волонтерства" }] : []),
      ].map(s => <Card className="personal-stat" key={s.label}><s.icon size={21} /><strong>{s.value}</strong><h3>{s.label}</h3></Card>)}
      {own && "rewardPointsBalance" in p && typeof p.rewardPointsBalance === "number" && <Card className="personal-stat"><Coins size={21} /><strong>{p.rewardPointsBalance.toLocaleString("uk-UA")}</strong><h3>бонусних балів</h3></Card>}
    </div>
    {p.statistics.unknownMinutesCount !== undefined && p.statistics.unknownMinutesCount > 0 && <p className="field-hint">Кількість справ без виміряного часу: {p.statistics.unknownMinutesCount}. Вони не прирівнюються до нуля годин.</p>}
    <section className="personal-section"><SectionHeading title="Прогрес добрих справ" /><Card className="profile-progress-card"><div><h3>Підтверджена діяльність</h3><p>У спільноті з {date(p.joinDate)}.</p>{p.volunteerSince && <p>Перша підтверджена справа: {date(p.volunteerSince)}.</p>}</div><strong>{p.totalXp.toLocaleString("uk-UA")} XP · Рівень {p.volunteerLevel}</strong></Card></section>
    {p.achievements && <section className="personal-section"><SectionHeading title="Досягнення" /><div className="quest-grid">{p.achievements.map(a => <Card key={a.id}><h3>{a.badge.title}</h3><p>{a.badge.description}</p>{a.unlockedAt && <time dateTime={a.unlockedAt}>{date(a.unlockedAt)}</time>}</Card>)}</div>{!p.achievements.length && <Card className="inline-empty">Підтверджених досягнень поки немає.</Card>}<p className="field-hint">Показано {p.achievements.length} із {p.achievementsTotal ?? p.achievements.length}.</p></section>}
    <ProfileDetails passport={p} />
    {own && <><ProfileHistory userId={p.userId} /><ApiPrivacySettings /></>}
    {!own && p.activityHistory && <section className="personal-section"><SectionHeading title="Підтверджені справи" />{p.activityHistory.map(a => <Card key={a.id}><h3>{a.title}</h3><time dateTime={a.confirmedAt}>{date(a.confirmedAt)}</time>{a.hours !== undefined && <p>{a.hours === null ? "Години невідомі" : `${a.hours} год`}</p>}</Card>)}{!p.activityHistory.length && <p className="muted">Опублікованих справ поки немає.</p>}</section>}
    {own && <p><Link to={`/profile/${p.userId}`}>Переглянути публічний профіль</Link> · <Link to={`/passport/${p.userId}`}>Публічний паспорт</Link></p>}
  </div>;
}
function ProfileDetails({ passport: p }: { passport: PassportContent }) {
  const definitions = useQuery({ queryKey: ["api", "public", "skill-definitions"], queryFn: ({ signal }) => usersApi.skillDefinitions(signal), enabled: !!p.skillProgress });
  const categories: Record<string,string> = { eco: "Екологія", social: "Соціальна допомога", animals: "Допомога тваринам", culture: "Культура", education: "Освіта", city: "Міський простір" };
  return <div className="profile-columns">
    {p.skillProgress && <section><SectionHeading title="Навички" /><div className="profile-completed">{definitions.isError && <ApiQueryError error={definitions.error} retry={() => void definitions.refetch()} />}{p.skillProgress.map(s => <Card key={s.skillId}><h3>{definitions.data?.items.find(d => d.id === s.skillId)?.title ?? "Навичка"}</h3><Badge>Рівень {s.level}</Badge><p>{s.evidenceStatus === "VERIFIED" ? "Є підтверджені докази" : "Підтверджених доказів поки немає"}</p>{s.earnedXp !== undefined && <p>{s.earnedXp.toLocaleString("uk-UA")} XP навички</p>}{s.percentage !== undefined && <progress value={s.percentage} max={100} aria-label="Прогрес навички" />}{!s.unlocked && <p className="muted">Спочатку виконайте передумови навички.</p>}</Card>)}</div><p className="field-hint">Показано {p.skillProgress.length} із {p.skillsTotal ?? p.skillProgress.length}. </p></section>}
    {p.organizationExperience && <section><SectionHeading title="Досвід в організаціях" />{p.organizationExperience.map(o => <Card key={o.organizationId}><h3>{o.name}</h3><p>Підтверджено квестів: {o.completedQuests}</p>{o.verifiedHours !== undefined && <p>{o.verifiedHours === null ? "Час невідомий" : `${o.verifiedHours} год`}</p>}</Card>)}{!p.organizationExperience.length && <p>Підтверджений досвід ще попереду.</p>}</section>}
    {p.statistics.categories && <section><SectionHeading title="Напрями активності" />{p.statistics.categories.map(c => <Card key={c.key}><strong>{categories[c.key] ?? "Інший напрям"}</strong><p>Підтверджених внесків: {c.contributions}</p>{c.hours !== null && <p>{c.hours} год</p>}</Card>)}</section>}
    {p.teams && <section><SectionHeading title="Команди" />{p.teams.map(t => <Card key={t.id}><h3>{t.name}</h3><Badge>{t.role === "OWNER" ? "Капітан" : t.role === "MANAGER" ? "Координатор" : "Учасник"}</Badge></Card>)}{!p.teams.length && <p>Активних команд немає.</p>}</section>}
  </div>;
}
function ProfileHistory({ userId }: { userId: string }) {
  const [page, setPage] = useState(1);
  const query = useQuery({ queryKey: ["api", "private", userId, "activities", page], queryFn: ({ signal }) => usersApi.activities({ page, pageSize: 10 }, signal) });
  return <section className="personal-section"><SectionHeading title="Історія підтверджених справ" />
    {query.isPending ? <p role="status">Завантажуємо історію…</p> : query.isError ? <ApiQueryError error={query.error} retry={() => void query.refetch()} /> : <>
      {query.data.items.map(a => <Card key={a.id}><h3>{a.title}</h3><time dateTime={a.confirmedAt}>{date(a.confirmedAt)}</time><p>{a.hours === null || a.hours === undefined ? "Час не виміряно" : `${a.hours} год`}</p><small>Публічний номер підтвердження: {a.credentialId}</small></Card>)}
      {!query.data.items.length && <Card className="inline-empty">Підтверджених справ на цій сторінці немає.</Card>}
      <div className="load-more"><Button variant="outline" disabled={page === 1} onClick={() => setPage(p => p-1)}>Попередня</Button><span>Сторінка {page} · Усього {query.data.total}</span><Button variant="outline" disabled={page * 10 >= query.data.total} onClick={() => setPage(p => p+1)}>Наступна</Button></div>
    </>}
  </section>;
}

function ProfileAvatar({ name, avatar }: { name?: string; avatar?: string | null }) {
  const [failed, setFailed] = useState<string | null>(null);
  return <span className="volunteer-avatar large" role="img" aria-label={name ? `Аватар: ${name}` : "Аватар прихований"}>
    {avatar && failed !== avatar ? <img src={avatar} alt="" referrerPolicy="no-referrer" style={{ width: "100%", height: "100%", borderRadius: "inherit", objectFit: "cover" }} onError={() => setFailed(avatar)} /> : name?.split(/\s+/).slice(0,2).map(s => s.slice(0,1)).join("") ?? "—"}
  </span>;
}
