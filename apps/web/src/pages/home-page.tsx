import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Check,
  Compass,
  Heart,
  Leaf,
  MapPin,
  Medal,
  Sparkles,
  Sprout,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { Button } from "../shared/ui/button";
import { Badge, Card, Photo } from "../shared/ui/primitives";
import { SectionHeading } from "../shared/ui/section-heading";
import { categories, organizations, achievements } from "../mocks/data";
import { questApi } from "../mocks/api";
import { QuestCard, QuestSkeleton } from "../entities/quest/quest-card";
import { CategoryIcon } from "../entities/quest/category-icon";
import { DemoDialog } from "../features/session/demo-dialog";
const steps = [
  {
    icon: Compass,
    title: "Знайди свою справу",
    text: "Обирай квест за інтересами, часом і настроєм. Поруч точно є щось твоє.",
  },
  {
    icon: Users,
    title: "Долучайся до команди",
    text: "Записуйся на квест та знайомся з людьми, яким теж не байдуже.",
  },
  {
    icon: Heart,
    title: "Зроби місто кращим",
    text: "Приходь, допомагай і відчуй, як маленька дія змінює щось велике.",
  },
  {
    icon: Trophy,
    title: "Зростай разом із містом",
    text: "Отримуй XP, відкривай досягнення й обмінюй досвід на приємності.",
  },
];
export function HomePage() {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["quests"],
    queryFn: () => questApi.list(),
  });
  return (
    <>
      <section className="hero-section">
        <div className="container hero-grid">
          <div className="hero-copy">
            <Badge className="hero-label">
              <span className="live-dot" />
              ДНІПРО — МІСТО СПІЛЬНИХ ДІЙ
            </Badge>
            <h1>
              Змінюй Дніпро.
              <br />
              <span>Отримуй досвід.</span>
            </h1>
            <p className="hero-description">
              Твої добрі справи мають силу. Знаходь міські квести, допомагай
              там, де ти потрібен, і перетворюй свою енергію на зміни.
            </p>
            <div className="hero-buttons">
              <Button asChild>
                <Link to="/quests">
                  Знайти квест <ArrowUpRight size={19} />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <a href="#how-it-works">
                  Як це працює <ArrowRight size={18} />
                </a>
              </Button>
            </div>
            <div className="hero-social">
              <div className="avatar-stack">
                <span>ОК</span>
                <span>МБ</span>
                <span>ІМ</span>
                <span>
                  <Heart size={16} />
                </span>
              </div>
              <p>
                <strong>Добрі справи об’єднують.</strong>
                <br />
                Долучайся до спільноти небайдужих
              </p>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-photo">
              <Photo
                src="/images/community.jpg"
                alt="Волонтери разом передають коробки з допомогою — ілюстративне фото"
                fetchPriority="high"
              />
              <span className="photo-caption">
                <MapPin size={14} /> Спільна дія починається поруч
              </span>
            </div>
            <div className="floating-xp">
              <span className="xp-icon">
                <Zap size={25} fill="currentColor" />
              </span>
              <div>
                <strong>+250 XP</strong>
                <span>За добру справу</span>
              </div>
              <Sparkles size={18} />
            </div>
            <div className="floating-achievement">
              <span className="medal-icon">
                <Medal size={31} />
              </span>
              <div>
                <small>НОВЕ ДОСЯГНЕННЯ</small>
                <strong>Місто дякує тобі!</strong>
                <span>Кожна дія має значення</span>
              </div>
              <BadgeCheck size={19} />
            </div>
            <span className="hero-spark spark-one">
              <Sparkles size={33} />
            </span>
            <span className="hero-spark spark-two">
              <Sparkles size={24} />
            </span>
            <div className="hero-round">
              <Leaf size={24} />
              <span>БІЛЬШЕ ДОБРИХ СПРАВ</span>
            </div>
          </div>
        </div>
        <div className="container">
          <div className="stats-strip">
            <div className="stats-intro">
              <span className="eyebrow">РАЗОМ МОЖЕМО БІЛЬШЕ</span>
              <span>Так може виглядати наш спільний вплив</span>
              <small>Демонстраційні показники</small>
            </div>
            {[
              ["1 240+", "небайдужих містян"],
              ["86", "добрих ініціатив"],
              ["320+", "виконаних квестів"],
            ].map(([n, t]) => (
              <div className="stat" key={t}>
                <strong>
                  {n}
                  <span />
                </strong>
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="section container">
        <SectionHeading
          eyebrow="ЗНАЙДИ ТЕ, ЩО ВІДГУКУЄТЬСЯ"
          title="У кожного своя суперсила"
          description="Обирай напрям, який близький саме тобі."
          action={
            <Link className="text-link" to="/quests">
              Усі квести <ArrowUpRight size={18} />
            </Link>
          }
        />
        <div className="categories-grid">
          {categories.map((c) => (
            <Link
              to={`/quests?category=${c.id}`}
              className={`category-card ${c.color}`}
              key={c.id}
            >
              <span className="category-icon">
                <CategoryIcon category={c} />
              </span>
              <h3>{c.name}</h3>
              <p>{c.description}</p>
              <ArrowUpRight size={18} className="category-arrow" />
            </Link>
          ))}
        </div>
      </section>
      <section className="section container popular-section">
        <SectionHeading
          eyebrow="МАЛЕНЬКИЙ КРОК — ВЕЛИКА РІЗНИЦЯ"
          title="Твій наступний добрий квест"
          description="Живі зустрічі, нові знайомства та користь для міста."
          action={
            <Button asChild variant="outline">
              <Link to="/quests">
                Усі квести <ArrowRight size={17} />
              </Link>
            </Button>
          }
        />
        <div className="quest-grid">
          {isPending
            ? [1, 2, 3].map((i) => <QuestSkeleton key={i} />)
            : data?.slice(0, 3).map((q) => <QuestCard key={q.id} quest={q} />)}
        </div>
        {isError && (
          <div className="empty-state">
            <p>Не вдалося завантажити квести.</p>
            <Button onClick={() => void refetch()}>Спробувати ще раз</Button>
          </div>
        )}
        <p className="demo-caption">
          Це демонстраційні квести. Реальні події та організації поки не
          підключені.
        </p>
      </section>
      <section className="how-section section" id="how-it-works">
        <div className="container">
          <SectionHeading
            eyebrow="ВІД БАЖАННЯ ДО ДІЇ"
            title="Добрі справи — це просто"
            description="Чотири кроки до міста, у якому хочеться жити."
          />
          <div className="steps-grid">
            {steps.map((step, i) => (
              <div className="step" key={step.title}>
                <div className="step-top">
                  <span className="step-icon">
                    <step.icon size={26} />
                  </span>
                  <span className="step-number">0{i + 1}</span>
                </div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="section container impact-grid">
        <div className="impact-art">
          <div className="level-card">
            <span className="eyebrow">ТВІЙ ВПЛИВ ЗРОСТАЄ</span>
            <span className="large-medal">
              <Sprout size={58} />
            </span>
            <h3>Творець змін</h3>
            <Badge>Рівень 3</Badge>
            <div className="xp-progress">
              <span />
            </div>
            <p>650 / 1 000 XP до наступного рівня</p>
            <div className="level-metrics">
              <span>
                <strong>4</strong>добрі справи
              </span>
              <span>
                <strong>1</strong>досягнення
              </span>
            </div>
          </div>
          <span className="art-dot dot-one" />
          <span className="art-dot dot-two" />
          <Sparkles className="art-spark" size={45} />
        </div>
        <div>
          <p className="eyebrow">ДОБРО ПОВЕРТАЄТЬСЯ</p>
          <h2>
            Не просто допомагай.
            <br />
            Відчувай свій прогрес.
          </h2>
          <p className="muted">
            Кожен квест — це новий досвід. Ми робимо твій внесок видимим, щоб
            натхнення діяти ставало ще більше.
          </p>
          <div className="benefit-list">
            {[
              [
                "Досвід, що має значення",
                "Заробляй XP за підтверджені добрі справи.",
              ],
              [
                "Маленькі перемоги щодня",
                "Відкривай рівні та збирай особливі досягнення.",
              ],
              [
                "Вдячність від спільноти",
                "Обмінюй XP на винагороди від локальних партнерів.",
              ],
            ].map(([a, b]) => (
              <div key={a}>
                <span>
                  <Check size={18} />
                </span>
                <div>
                  <h3>{a}</h3>
                  <p>{b}</p>
                </div>
              </div>
            ))}
          </div>
          <Link to="/rewards" className="text-link">
            Дізнатися про нагороди <ArrowUpRight size={18} />
          </Link>
        </div>
      </section>
      <section className="section container">
        <SectionHeading
          eyebrow="ТВОЯ КОЛЕКЦІЯ ДОБРИХ СПРАВ"
          title="Досягнення, якими пишаються"
          description="Кожна відзнака — історія твого внеску."
          action={
            <Link className="text-link" to="/rewards">
              Усі нагороди <ArrowUpRight size={18} />
            </Link>
          }
        />
        <div className="achievement-grid">
          {achievements.map((a, i) => (
            <Card className={`achievement-card achievement-${i}`} key={a.id}>
              <span className="achievement-medallion">
                {i === 0 ? (
                  <Sprout size={35} />
                ) : i === 1 ? (
                  <Zap size={35} />
                ) : (
                  <Trophy size={35} />
                )}
              </span>
              <div>
                <h3>{a.name}</h3>
                <p>{a.description}</p>
              </div>
              <Badge>
                {a.target} {a.target === 1 ? "квест" : "квестів"}
              </Badge>
            </Card>
          ))}
        </div>
      </section>
      <section className="container section">
        <div className="organizer-banner">
          <div className="organizer-icon">
            <Users size={44} />
            <Sparkles size={22} />
          </div>
          <div>
            <p className="eyebrow">Є ІДЕЯ ДЛЯ МІСТА?</p>
            <h2>Збирай людей навколо добрих справ</h2>
            <p>
              Твоя ініціатива + енергія спільноти = більше можливостей для
              Дніпра.
            </p>
          </div>
          <Button asChild variant="secondary">
            <Link to="/organizers">
              Для організаторів <ArrowUpRight size={18} />
            </Link>
          </Button>
        </div>
      </section>
      <section className="container partners-section">
        <p className="eyebrow">ТАК МОЖЕ ВИГЛЯДАТИ НАША СПІЛЬНОТА ПАРТНЕРІВ</p>
        <div className="partner-list">
          {organizations.map((o) => (
            <Link to="/organizers" key={o.id}>
              <span className="partner-symbol">{o.initials}</span>
              {o.name}
            </Link>
          ))}
        </div>
        <p className="demo-caption">
          Демонстраційні організації, без заяви про реальне партнерство.
        </p>
      </section>
      <section className="container section">
        <div className="final-cta">
          <span className="cta-decoration">
            <WavesIcon />
          </span>
          <Badge>
            <Sparkles size={14} /> МІСТО ПОЧИНАЄТЬСЯ З ТЕБЕ
          </Badge>
          <h2>
            Дніпру потрібні
            <br />
            саме твої суперсили.
          </h2>
          <p>Не чекай особливого моменту. Створи його доброю справою.</p>
          <DemoDialog>
            <Button variant="secondary">
              Долучитися до спільноти <ArrowUpRight size={18} />
            </Button>
          </DemoDialog>
          <span className="cta-small">
            Почни з одного квесту. Відчуй, як багато можеш.
          </span>
        </div>
      </section>
    </>
  );
}
function WavesIcon() {
  return (
    <>
      <Leaf size={150} strokeWidth={0.7} />
      <Heart size={100} strokeWidth={0.7} />
    </>
  );
}
