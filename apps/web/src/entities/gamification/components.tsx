import {
  Leaf,
  Heart,
  Sun,
  Sprout,
  Flame,
  Trophy,
  Coins,
  Zap,
  LockKeyhole,
  CheckCircle2,
} from "lucide-react";
import type { VolunteerStats, Achievement, Transaction } from "../types";
import { Card, Badge } from "../../shared/ui/primitives";
import { achievements } from "../../mocks/data";
import { levelFor } from "./levels";
import { formatDate } from "../../shared/lib/utils";
export function VolunteerAvatar({
  user,
  large = false,
}: {
  user: Pick<VolunteerStats, "avatar" | "initials" | "name">;
  large?: boolean;
}) {
  const Icon =
    user.avatar === "leaf"
      ? Leaf
      : user.avatar === "heart"
        ? Heart
        : user.avatar === "sun"
          ? Sun
          : null;
  return (
    <span
      className={large ? "volunteer-avatar large" : "volunteer-avatar"}
      role="img"
      aria-label={`Аватар: ${user.name}`}
    >
      {Icon ? <Icon size={large ? 38 : 20} /> : user.initials}
    </span>
  );
}
export function LevelBadge({ xp }: { xp: number }) {
  const level = levelFor(xp);
  return (
    <Badge className="level-badge">
      <Sprout size={14} />
      Рівень {level.level} · {level.name}
    </Badge>
  );
}
export function XPProgress({
  xp,
  compact = false,
}: {
  xp: number;
  compact?: boolean;
}) {
  const level = levelFor(xp);
  return (
    <div className={`xp-progress-widget ${compact ? "compact" : ""}`}>
      <div>
        <strong>{xp.toLocaleString("uk-UA")} XP</strong>
        <span>
          {level.nextXp
            ? `Наступний рівень: ${level.nextXp.toLocaleString("uk-UA")} XP`
            : "Найвищий рівень"}
        </span>
      </div>
      <div
        className="progress-track"
        role="progressbar"
        aria-label="Прогрес до наступного рівня"
        aria-valuenow={Math.round(level.progress)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span style={{ width: `${level.progress}%` }} />
      </div>
      {!compact && (
        <p>
          {level.nextXp
            ? `Ще ${level.nextXp - xp} XP до нової суперсили`
            : "Ти — легенда спільноти. Продовжуй добрі справи!"}
        </p>
      )}
    </div>
  );
}
export function RewardPointsBalance({ balance }: { balance: number }) {
  return (
    <div className="points-balance">
      <span className="points-icon">
        <Coins size={23} />
      </span>
      <div>
        <small>БОНУСНІ БАЛИ</small>
        <strong>
          {balance.toLocaleString("uk-UA")} <span>балів</span>
        </strong>
      </div>
    </div>
  );
}
export function AchievementCard({
  achievement,
  completed,
}: {
  achievement: Achievement;
  completed: number;
}) {
  const unlocked = completed >= achievement.target;
  const Icon =
    achievement.icon === "sprout"
      ? Sprout
      : achievement.icon === "flame"
        ? Flame
        : Trophy;
  return (
    <Card className={`achievement-detail ${unlocked ? "is-unlocked" : ""}`}>
      <span className={`achievement-medallion ${unlocked ? "" : "locked"}`}>
        <Icon size={38} />
      </span>
      <h3>{achievement.name}</h3>
      <p>{achievement.description}</p>
      <Badge>
        {unlocked ? (
          <>
            <CheckCircle2 size={13} />
            Відкрито
          </>
        ) : (
          <>
            <LockKeyhole size={13} />
            {completed} / {achievement.target}
          </>
        )}
      </Badge>
      <div
        className="progress-track"
        role="progressbar"
        aria-label={`Досягнення «${achievement.name}»`}
        aria-valuenow={Math.min(completed, achievement.target)}
        aria-valuemax={achievement.target}
        aria-valuemin={0}
      >
        <span
          style={{
            width: `${Math.min(100, (completed / achievement.target) * 100)}%`,
          }}
        />
      </div>
    </Card>
  );
}
export function AchievementGrid({
  completed,
  recent = false,
}: {
  completed: number;
  recent?: boolean;
}) {
  const items = recent
    ? [
        ...achievements
          .filter((a) => a.target <= completed)
          .reverse()
          .slice(0, 2),
        ...achievements.filter((a) => a.target > completed).slice(0, 1),
      ]
    : achievements;
  return (
    <div className="reward-grid achievement-collection">
      {items.map((a) => (
        <AchievementCard key={a.id} achievement={a} completed={completed} />
      ))}
    </div>
  );
}
export function XPTransactionHistory({
  transactions,
}: {
  transactions: Transaction[];
}) {
  return (
    <div className="transaction-history">
      {transactions.length === 0 ? (
        <p className="muted">Тут з’являться підтверджені внески та обміни.</p>
      ) : (
        [...transactions]
          .sort(
            (a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id),
          )
          .map((t) => (
            <div className="transaction-row" key={t.id}>
              <span className={`transaction-icon ${t.xp > 0 ? "" : "spent"}`}>
                {t.xp > 0 ? <Zap size={18} /> : <Coins size={18} />}
              </span>
              <div>
                <strong>{t.description}</strong>
                <time dateTime={t.date}>{formatDate(t.date)}</time>
              </div>
              <div className="transaction-values">
                {t.xp > 0 && <strong>+{t.xp} XP</strong>}
                <span>
                  {t.points > 0 ? "+" : ""}
                  {t.points} балів
                </span>
              </div>
            </div>
          ))
      )}
    </div>
  );
}
