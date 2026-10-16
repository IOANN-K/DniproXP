import { useSession } from "../features/session/store";
import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  Coffee,
  Gift,
  Leaf,
  Palette,
  Search,
  Coins,
  CheckCircle2,
  ArrowUpRight,
} from "lucide-react";
import { rewards, organizations } from "../mocks/data";
import { useVolunteer, useVolunteerState } from "../shared/lib/use-volunteer";
import { Card, Badge, Input } from "../shared/ui/primitives";
import { Button } from "../shared/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../shared/ui/tabs";
import {
  RewardPointsBalance,
  AchievementGrid,
} from "../entities/gamification/components";
import { RewardDialog } from "../features/rewards/reward-dialog";
import { DemoDialog } from "../features/session/demo-dialog";
import { formatDate } from "../shared/lib/utils";
const rewardCategories = ["Напої та їжа", "Екотовари", "Враження", "Мерч"];
export function RewardsPage() {
  const current = useVolunteer();
  const role = useSession((s) => s.user?.role);
  const user = role === "VOLUNTEER" ? current : null;
  const state = useVolunteerState();
  const [params, setParams] = useSearchParams();
  const tab = ["catalog", "history", "achievements"].includes(
    params.get("tab") || "",
  )
    ? params.get("tab")!
    : "catalog";
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [available, setAvailable] = useState(false);
  const [affordable, setAffordable] = useState(false);
  const [sort, setSort] = useState("low");
  const history = state.redemptions
    .filter((r) => r.userId === user?.id)
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date));
  const catalog = rewards
    .filter(
      (r) =>
        (!search ||
          `${r.name} ${r.description}`
            .toLocaleLowerCase("uk")
            .includes(search.toLocaleLowerCase("uk"))) &&
        (!category || r.category === category) &&
        (!available ||
          r.stock >
            state.redemptions.filter((e) => e.rewardId === r.id).length) &&
        (!affordable ||
          !user ||
          (!!user &&
            r.cost <= user.points &&
            !history.some((h) => h.rewardId === r.id))),
    )
    .sort((a, b) => (sort === "high" ? b.cost - a.cost : a.cost - b.cost));
  return (
    <div className="container page-section">
      <div className="page-intro">
        <p className="eyebrow">ДОБРО ПОВЕРТАЄТЬСЯ</p>
        <h1>Приємності за добрі справи</h1>
        <p>
          Накопичуй досвід. Витрачай бонусні бали. Відкривай більше можливостей.
        </p>
      </div>
      <div className="reward-balance reward-balance-v2">
        <RewardPointsBalance balance={user?.points || 0} />
        <p>
          XP визначає твій рівень і накопичується назавжди.
          <br />
          Бонусні бали — окремий ресурс для обміну на винагороди.
        </p>
        {user ? (
          <Button asChild variant="outline">
            <Link to="/my-quests">
              Заробити бали <ArrowUpRight size={17} />
            </Link>
          </Button>
        ) : (
          <DemoDialog>
            <Button>Спробувати демопрофіль</Button>
          </DemoDialog>
        )}
      </div>
      <Tabs value={tab} onValueChange={(value) => setParams({ tab: value })}>
        <TabsList className="rewards-tabs" aria-label="Простір винагород">
          <TabsTrigger value="catalog">
            <Gift size={17} />
            Каталог
          </TabsTrigger>
          <TabsTrigger value="history">
            <CheckCircle2 size={17} />
            Отримані <span>{history.length}</span>
          </TabsTrigger>
          <TabsTrigger value="achievements">
            <Leaf size={17} />
            Досягнення
          </TabsTrigger>
        </TabsList>
        <TabsContent value="catalog">
          <div className="rewards-filters">
            <div className="search-field">
              <Search size={18} />
              <Input
                aria-label="Пошук винагород"
                placeholder="Знайти щось приємне…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <label>
              <span className="sr-only">Категорія винагороди</span>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">Усі категорії</option>
                {rewardCategories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              <span className="sr-only">Сортування винагород</span>
              <select value={sort} onChange={(e) => setSort(e.target.value)}>
                <option value="low">Спочатку дешевші</option>
                <option value="high">Спочатку дорожчі</option>
              </select>
            </label>
          </div>
          <div className="reward-filter-checks">
            <label>
              <input
                type="checkbox"
                checked={available}
                onChange={(e) => setAvailable(e.target.checked)}
              />
              Лише доступні
            </label>
            <label>
              <input
                type="checkbox"
                checked={affordable}
                disabled={!user}
                onChange={(e) => setAffordable(e.target.checked)}
              />
              Вистачає моїх балів
            </label>
            <span role="status">Знайдено: {catalog.length}</span>
          </div>
          <div className="reward-grid">
            {catalog.map((r) => {
              const Icon =
                r.category === "Напої та їжа"
                  ? Coffee
                  : r.category === "Екотовари"
                    ? Leaf
                    : r.category === "Враження"
                      ? Palette
                      : Gift;
              const remaining = Math.max(
                0,
                r.stock -
                  state.redemptions.filter((h) => h.rewardId === r.id).length,
              );
              const done = history.some((h) => h.rewardId === r.id);
              return (
                <Card key={r.id} className="reward-card">
                  <div
                    className={`reward-art reward-art-${rewardCategories.indexOf(r.category) % 3}`}
                  >
                    <Icon size={65} strokeWidth={1.5} />
                    <Badge>ДЕМОНСТРАЦІЙНА ПРОПОЗИЦІЯ</Badge>
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
                    <div className="reward-stock">
                      <Badge>
                        {done
                          ? "Уже отримано"
                          : remaining
                            ? `Доступно: ${remaining}`
                            : "Тимчасово недоступно"}
                      </Badge>
                      <span>{r.category}</span>
                    </div>
                    <div className="reward-footer">
                      <strong>
                        <Coins size={18} />
                        {r.cost} балів
                      </strong>
                      <RewardDialog reward={r} />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
          {!catalog.length && (
            <Card className="empty-state">
              <Gift size={40} />
              <h2>Спробуй інші побажання</h2>
              <p>Зміни пошук або фільтри, щоб побачити більше винагород.</p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setCategory("");
                  setAvailable(false);
                  setAffordable(false);
                }}
              >
                Скинути фільтри
              </Button>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="history">
          {history.length ? (
            <div className="redemption-history">
              {history.map((h) => {
                const r = rewards.find((r) => r.id === h.rewardId)!;
                return (
                  <Card className="redemption-card" key={h.id}>
                    <span className="redemption-icon">
                      <Gift size={27} />
                    </span>
                    <div>
                      <Badge>ДЕМОСЕРТИФІКАТ</Badge>
                      <h2>{r.name}</h2>
                      <p>
                        {formatDate(h.date)} ·{" "}
                        {h.cost
                          ? `${h.cost} бонусних балів`
                          : "Перенесено з попередньої демоверсії"}
                      </p>
                      <code>{h.code}</code>
                      <small>
                        Не діє в реальних закладах. Показує лише роботу
                        демонстраційного обміну.
                      </small>
                    </div>
                    <CheckCircle2 size={25} />
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="empty-state">
              <Gift size={42} />
              <h2>
                {user
                  ? "Приємності ще попереду"
                  : "Увійди, щоб побачити свої винагороди"}
              </h2>
              <p>
                Отримані демосертифікати зберігаються тут після обміну балів.
              </p>
              {user ? (
                <Button onClick={() => setParams({ tab: "catalog" })}>
                  Переглянути каталог
                </Button>
              ) : (
                <DemoDialog>
                  <Button>Увійти в демопрофіль</Button>
                </DemoDialog>
              )}
            </Card>
          )}
        </TabsContent>
        <TabsContent value="achievements">
          <AchievementGrid completed={user?.questsCompleted || 0} />
          {!user && (
            <p className="demo-caption">
              Увійди в демопрофіль, щоб бачити власний прогрес.
            </p>
          )}
        </TabsContent>
      </Tabs>
      <p className="demo-caption">
        Усі 14 винагород та організації вигадані. Реальних партнерських
        пропозицій і платежів немає.
      </p>
    </div>
  );
}
