import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  MapPin,
  Clock3,
  Check,
  ShieldCheck,
  Backpack,
  ListChecks,
  ArrowUpRight,
} from "lucide-react";
import { questApi } from "../mocks/api";
import { categories, organizations } from "../mocks/data";
import { Badge, Card, Photo, Skeleton } from "../shared/ui/primitives";
import { Button } from "../shared/ui/button";
import { formatDate } from "../shared/lib/utils";
import { QuestCard } from "../entities/quest/quest-card";
import { ParticipationPanel } from "../features/participation/participation-panel";
import { SectionHeading } from "../shared/ui/section-heading";
export function QuestDetailPage() {
  const { id = "" } = useParams();
  const {
    data: quest,
    isPending,
    isError,
    refetch,
  } = useQuery({ queryKey: ["quest", id], queryFn: () => questApi.get(id) });
  const { data: all = [] } = useQuery({
    queryKey: ["quests"],
    queryFn: () => questApi.list(),
  });
  if (isPending)
    return (
      <div className="container page-section" aria-label="Завантаження квесту">
        <Skeleton className="detail-skeleton" />
        <Skeleton className="skeleton-title" />
        <Skeleton className="skeleton-line" />
      </div>
    );
  if (isError)
    return (
      <div className="container empty-state">
        <h1>Не вдалося завантажити квест</h1>
        <Button onClick={() => void refetch()}>Спробувати ще раз</Button>
      </div>
    );
  if (!quest)
    return (
      <div className="container empty-state">
        <h1>Квест не знайдено</h1>
        <p>Обери іншу добру справу в каталозі.</p>
        <Button asChild>
          <Link to="/quests">До квестів</Link>
        </Button>
      </div>
    );
  const category = categories.find((c) => c.id === quest.categoryId)!;
  const org = organizations.find((o) => o.id === quest.organizationId)!;
  return (
    <div className="container page-section">
      <Link to="/quests" className="back-link">
        <ArrowLeft size={17} /> До всіх квестів
      </Link>
      <div className="detail-hero">
        <Photo src={quest.image} alt={quest.imageAlt} />
        <div>
          <Badge className={category.color}>{category.name}</Badge>
          <Badge>{quest.difficulty}</Badge>
          <span>Ілюстративне фото · Демонстраційний квест</span>
        </div>
      </div>
      <div className="detail-layout">
        <article>
          <div className="detail-title">
            <p className="eyebrow">ДОБРІ СПРАВИ ПОЧИНАЮТЬСЯ ПОРУЧ</p>
            <h1>{quest.title}</h1>
          </div>
          <div className="detail-facts">
            <div>
              <CalendarDays />
              <span>
                <small>Коли</small>
                <strong>{formatDate(quest.date)}</strong>
              </span>
            </div>
            <div>
              <Clock3 />
              <span>
                <small>Тривалість</small>
                <strong>{quest.duration}</strong>
              </span>
            </div>
            <div>
              <MapPin />
              <span>
                <small>{quest.district} район</small>
                <strong>{quest.address}</strong>
              </span>
            </div>
          </div>
          <section className="detail-section">
            <h2>Про цей квест</h2>
            <p>{quest.description}</p>
            <p>
              Зустрінемося на локації, познайомимося з командою й розподілимо
              завдання. Координатор пояснить процес і допоможе на кожному кроці.
              Попередній досвід не потрібен: достатньо бажання долучитися й
              готовності працювати разом.
            </p>
            <p>
              Точне місце збору — {quest.address}. Приходь за 10 хвилин до
              початку. У разі повітряної тривоги роботу припиняємо та прямуємо
              до укриття за вказівкою координатора.
            </p>
          </section>
          <div className="requirements-grid">
            <Card>
              <h3>
                <ListChecks size={21} /> Що потрібно знати
              </h3>
              <ul>
                {quest.requirements.map((r) => (
                  <li key={r}>
                    <Check size={16} />
                    {r}
                  </li>
                ))}
              </ul>
            </Card>
            <Card>
              <h3>
                <Backpack size={21} /> Візьми із собою
              </h3>
              <ul>
                {quest.bring.map((r) => (
                  <li key={r}>
                    <Check size={16} />
                    {r}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
          <section className="detail-section">
            <h2>Як долучитися</h2>
            <ol className="participation-steps">
              <li>
                <span>1</span>
                <div>
                  <strong>Забронюй місце</strong>
                  <p>Увійди в демопрофіль і натисни «Долучитися».</p>
                </div>
              </li>
              <li>
                <span>2</span>
                <div>
                  <strong>Зустрінься з командою</strong>
                  <p>Приходь вчасно й відміться в координатора.</p>
                </div>
              </li>
              <li>
                <span>3</span>
                <div>
                  <strong>Зроби добру справу</strong>
                  <p>
                    Виконай погоджене завдання та дочекайся підтвердження
                    участі.
                  </p>
                </div>
              </li>
            </ol>
          </section>
          <Card className="confirmation-note">
            <ShieldCheck size={28} />
            <div>
              <h3>Як підтверджується виконання?</h3>
              <p>
                На реальній платформі координатор перевірятиме присутність та
                виконану роботу й підтверджуватиме XP. У цій демоверсії можна
                записатися та скасувати запис; підтвердження й нарахування XP ще
                не підключені.
              </p>
            </div>
          </Card>
          <section className="detail-section organizer-detail">
            <span className="organization-avatar">{org.initials}</span>
            <div>
              <small>ОРГАНІЗАТОР</small>
              <h3>{org.name}</h3>
              <p>{org.description}</p>
              <Link to="/organizers" className="text-link">
                Про організаторів <ArrowUpRight size={16} />
              </Link>
            </div>
          </section>
        </article>
        <aside>
          <ParticipationPanel quest={quest} />
        </aside>
      </div>
      <section className="section">
        <SectionHeading
          title="Ще трохи добрих можливостей"
          description="Схожі квести, які можуть тобі сподобатися."
        />
        <div className="quest-grid">
          {all
            .filter(
              (q) => q.categoryId === quest.categoryId && q.id !== quest.id,
            )
            .slice(0, 3)
            .map((q) => (
              <QuestCard key={q.id} quest={q} />
            ))}
        </div>
      </section>
    </div>
  );
}
