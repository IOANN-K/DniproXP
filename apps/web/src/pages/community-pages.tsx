import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Award,
  Coffee,
  Gift,
  Leaf,
  LockKeyhole,
  MapPin,
  Medal,
  Sparkles,
  Trophy,
  Users,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { users, achievements, rewards, organizations } from "../mocks/data";
import { questApi, rewardsApi } from "../mocks/api";
import { Button } from "../shared/ui/button";
import { Badge, Card } from "../shared/ui/primitives";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../shared/ui/tabs";
import { useSession } from "../features/session/store";
import { DemoDialog } from "../features/session/demo-dialog";
import { QuestCard, QuestSkeleton } from "../entities/quest/quest-card";
import { SectionHeading } from "../shared/ui/section-heading";
export function LeaderboardPage() {
  const sorted = [...users].sort((a, b) => b.xp - a.xp);
  return (
    <div className="container page-section">
      <div className="page-intro">
        <p className="eyebrow">ЛЮДИ, ЯКІ НАДИХАЮТЬ</p>
        <h1>Герої нашого міста</h1>
        <p>За кожним балом — час, турбота та маленька зміна на краще.</p>
        <span className="demo-caption">
          Демонстраційний рейтинг за весь час
        </span>
      </div>
      <div className="leader-podium">
        {sorted.slice(0, 3).map((u, i) => (
          <Card key={u.id} className={`podium podium-${i}`}>
            <span className="podium-rank">
              <Medal size={24} />
              {i + 1} місце
            </span>
            <span className="large-avatar">{u.initials}</span>
            <h2>{u.name}</h2>
            <p>{u.questsCompleted} добрих справ</p>
            <Badge>
              <Zap size={15} />
              {u.xp.toLocaleString("uk")} XP
            </Badge>
          </Card>
        ))}
      </div>
      <section className="leader-list">
        <SectionHeading title="Кожен внесок має значення" />
        {sorted.map((u, i) => (
          <Card key={u.id} className="leader-row">
            <strong className="rank">{i + 1}</strong>
            <span className="avatar">{u.initials}</span>
            <div>
              <h3>{u.name}</h3>
              <p>
                Рівень {u.level} · {u.questsCompleted} квестів
              </p>
            </div>
            <strong className="leader-xp">
              {u.xp.toLocaleString("uk")} XP
            </strong>
          </Card>
        ))}
      </section>
    </div>
  );
}
export function RewardsPage() {
  const user = useSession((s) => s.user);
  const client = useQueryClient();
  const [notice, setNotice] = useState("");
  const { data: balance = 650 } = useQuery({
    queryKey: ["balance"],
    queryFn: () => rewardsApi.balance(),
  });
  const { data: redeemed = [] } = useQuery({
    queryKey: ["redeemed"],
    queryFn: () => rewardsApi.redeemed(),
  });
  const mutation = useMutation({
    mutationFn: (id: string) => rewardsApi.redeem(id, user!.id),
    onSuccess: async (code) => {
      setNotice(
        `Демосертифікат отримано: ${code}. Він доступний у твоєму профілі й не діє в реальних закладах.`,
      );
      await Promise.all([
        client.invalidateQueries({ queryKey: ["balance"] }),
        client.invalidateQueries({ queryKey: ["redeemed"] }),
      ]);
    },
  });
  return (
    <div className="container page-section">
      <div className="page-intro">
        <p className="eyebrow">ТУРБОТА ПОВЕРТАЄТЬСЯ</p>
        <h1>Добрі справи. Приємні нагороди.</h1>
        <p>Зростай, збирай досягнення й відкривай нові можливості.</p>
      </div>
      <div className="reward-balance">
        <div>
          <Zap size={30} />
          <span>
            <small>{user ? "ТВІЙ БАЛАНС" : "БАЛАНС ДЕМОПРОФІЛЮ"}</small>
            <strong>{balance} XP</strong>
          </span>
        </div>
        <p>
          XP за виконані квести — це вдячність за твій внесок.
          <br />
          Обмін у демоверсії створює лише локальний демосертифікат.
        </p>
      </div>
      <Tabs defaultValue="rewards">
        <TabsList aria-label="Нагороди та досягнення">
          <TabsTrigger value="rewards">
            <Gift size={18} /> Винагороди
          </TabsTrigger>
          <TabsTrigger value="achievements">
            <Award size={18} /> Досягнення
          </TabsTrigger>
        </TabsList>
        <TabsContent value="rewards">
          <div className="reward-grid">
            {rewards.map((r, i) => {
              const Icon = [Coffee, Leaf, Sparkles][i];
              const done = redeemed.includes(r.id);
              return (
                <Card key={r.id} className="reward-card">
                  <div className={`reward-art reward-art-${i}`}>
                    <Icon size={68} strokeWidth={1.4} />
                    <Badge>ДЕМО</Badge>
                  </div>
                  <div className="reward-body">
                    <span className="eyebrow">
                      {
                        organizations.find((o) => o.id === r.organizationId)
                          ?.name
                      }
                    </span>
                    <h2>{r.name}</h2>
                    <p>{r.description}</p>
                    <div className="reward-footer">
                      <strong>
                        <Zap size={17} />
                        {r.cost} XP
                      </strong>
                      {!user ? (
                        <DemoDialog>
                          <Button size="sm" variant="outline">
                            Увійти
                          </Button>
                        </DemoDialog>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => {
                            setNotice("");
                            mutation.mutate(r.id);
                          }}
                          disabled={
                            done || balance < r.cost || mutation.isPending
                          }
                        >
                          {done
                            ? "Отримано"
                            : balance < r.cost
                              ? "Бракує XP"
                              : "Обміняти"}
                          {done ? <CheckCircle2 size={16} /> : null}
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
          <p className="demo-caption">
            Це вигадані пропозиції, які не можна використати у справжніх
            закладах.
          </p>
        </TabsContent>
        <TabsContent value="achievements">
          <div className="reward-grid">
            {achievements.map((a, i) => {
              const unlocked = !!user && user.questsCompleted >= a.target;
              return (
                <Card key={a.id} className="achievement-detail">
                  <span
                    className={`achievement-medallion ${unlocked ? "" : "locked"}`}
                  >
                    {unlocked ? (
                      <Trophy size={40} />
                    ) : (
                      <LockKeyhole size={36} />
                    )}
                  </span>
                  <h2>{a.name}</h2>
                  <p>{a.description}</p>
                  <Badge>
                    {unlocked
                      ? "Відкрито в демопрофілі"
                      : `${Math.min(user?.questsCompleted || 0, a.target)} / ${a.target} квестів`}
                  </Badge>
                  <p className="demo-caption">Рівень досягнення: {i + 1}</p>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
      {notice && (
        <p className="success-message" role="status">
          {notice}
        </p>
      )}
      {mutation.isError && (
        <p className="error-message" role="alert">
          {mutation.error.message}
        </p>
      )}
    </div>
  );
}
export function ProfilePage() {
  const user = useSession((s) => s.user);
  const {
    data: entries = [],
    isPending: entriesPending,
    isError: entriesError,
    refetch: retryEntries,
  } = useQuery({
    queryKey: ["participations"],
    queryFn: () => questApi.participations(),
    enabled: !!user,
  });
  const {
    data: quests = [],
    isPending: questsPending,
    isError: questsError,
    refetch: retryQuests,
  } = useQuery({
    queryKey: ["quests"],
    queryFn: () => questApi.list(),
    enabled: !!user,
  });
  const { data: redeemed = [] } = useQuery({
    queryKey: ["redeemed"],
    queryFn: () => rewardsApi.redeemed(),
    enabled: !!user,
  });
  const { data: balance = 650 } = useQuery({
    queryKey: ["balance"],
    queryFn: () => rewardsApi.balance(),
    enabled: !!user,
  });
  if (!user)
    return (
      <div className="container empty-state">
        <Users size={48} />
        <h1>Твоє місце у спільноті</h1>
        <p>Увійди в демопрофіль, щоб бачити свої квести й нагороди.</p>
        <DemoDialog>
          <Button>Спробувати демопрофіль</Button>
        </DemoDialog>
      </div>
    );
  const mine = quests.filter((q) =>
    entries.some((p) => p.questId === q.id && p.userId === user.id),
  );
  return (
    <div className="container page-section">
      <Card className="profile-hero">
        <span className="large-avatar">{user.initials}</span>
        <div>
          <p className="eyebrow">ДЕМОНСТРАЦІЙНИЙ ПРОФІЛЬ</p>
          <h1>{user.name}</h1>
          <p>
            Рівень {user.level} · {user.questsCompleted} завершені квести ·{" "}
            {balance} XP для обміну
          </p>
        </div>
      </Card>
      <section className="section">
        <SectionHeading
          title="Твої найближчі добрі справи"
          action={
            <Link to="/quests" className="text-link">
              Знайти квест <ArrowUpRight size={18} />
            </Link>
          }
        />
        {entriesError || questsError ? (
          <div className="empty-state">
            <p>Не вдалося завантажити записи.</p>
            <Button
              onClick={() => {
                void retryEntries();
                void retryQuests();
              }}
            >
              Повторити
            </Button>
          </div>
        ) : entriesPending || questsPending ? (
          <div className="quest-grid">
            <QuestSkeleton />
            <QuestSkeleton />
          </div>
        ) : mine.length ? (
          <div className="quest-grid">
            {mine.map((q) => (
              <QuestCard quest={q} key={q.id} />
            ))}
          </div>
        ) : (
          <Card className="empty-state">
            <MapPin size={36} />
            <h2>Перший запис ще попереду</h2>
            <p>Обери квест і забронюй місце у команді.</p>
            <Button asChild>
              <Link to="/quests">До каталогу</Link>
            </Button>
          </Card>
        )}
      </section>
      <SectionHeading title="Твої демосертифікати" />
      {redeemed.length ? (
        <div className="achievement-grid">
          {redeemed.map((id) => (
            <Card className="certificate" key={id}>
              <Gift size={28} />
              <h3>{rewards.find((r) => r.id === id)?.name}</h3>
              <code>DEMO-{id.toUpperCase()}-2026</code>
              <p>Демонстраційний. Не діє в реальних закладах.</p>
            </Card>
          ))}
        </div>
      ) : (
        <p className="muted">
          Тут з’являться нагороди після обміну XP.{" "}
          <Link className="text-link" to="/rewards">
            Переглянути нагороди
          </Link>
        </p>
      )}
    </div>
  );
}
export function OrganizersPage() {
  return (
    <div className="container page-section">
      <div className="page-intro">
        <p className="eyebrow">РАЗОМ ДІЄМО МАСШТАБНІШЕ</p>
        <h1>Добра ідея шукає команду</h1>
        <p>DniproXP допоможе ініціативам знаходити людей, яким не байдуже.</p>
      </div>
      <div className="organizer-benefits">
        {[
          [
            Users,
            "Збирай спільноту",
            "Зрозумілі квести допомагають людям знайти свою роль.",
          ],
          [
            MapPin,
            "Дій локально",
            "Об’єднуй мешканців навколо потреб свого району.",
          ],
          [
            Trophy,
            "Відзначай внесок",
            "Підтверджуй участь і допомагай волонтерам зростати.",
          ],
        ].map(([Icon, title, text]) => {
          const I = Icon as typeof Users;
          return (
            <Card key={String(title)}>
              <I size={32} />
              <h2>{String(title)}</h2>
              <p>{String(text)}</p>
            </Card>
          );
        })}
      </div>
      <Card className="organizer-info">
        <Badge>ДЕМОНСТРАЦІЙНА ВЕРСІЯ</Badge>
        <h2>Публікація квестів з’явиться згодом</h2>
        <p>
          Зараз можна дослідити каталог і спробувати шлях волонтера. Створення
          подій та перевірка організацій потребуватимуть підключення backend.
        </p>
        <Button asChild>
          <Link to="/quests">
            Подивитися приклади квестів <ArrowUpRight size={18} />
          </Link>
        </Button>
      </Card>
      <section className="section">
        <SectionHeading
          title="Знайомся з демоспільнотою"
          description="Ці вигадані організації показують різні напрями волонтерства."
        />
        <div className="organization-grid">
          {organizations.map((o) => (
            <Card key={o.id}>
              <span className="organization-avatar">{o.initials}</span>
              <h3>{o.name}</h3>
              <p>{o.description}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
