import { Link } from "react-router-dom";
import { ArrowUpRight, CalendarDays, MapPin, Users, Zap } from "lucide-react";
import type { Quest } from "../types";
import { categories, organizations } from "../../mocks/data";
import { Badge, Card, Photo, Skeleton } from "../../shared/ui/primitives";
import { formatDate } from "../../shared/lib/utils";
export function QuestCard({ quest }: { quest: Quest }) {
  const category = categories.find((c) => c.id === quest.categoryId)!;
  const org = organizations.find((o) => o.id === quest.organizationId)!;
  return (
    <Card className="quest-card">
      <Link to={`/quests/${quest.id}`} className="quest-card-link">
        <div className="quest-image">
          <Photo src={quest.image} alt={quest.imageAlt} loading="lazy" />
          <Badge className={`category-badge ${category.color}`}>
            {category.name}
          </Badge>
          <Badge className="xp-badge">
            <Zap size={13} /> +{quest.xp} XP
          </Badge>
        </div>
        <div className="quest-body">
          <div className="quest-org">
            <span className="org-dot" />
            {org.name}
            <span className="difficulty">{quest.difficulty}</span>
          </div>
          <h3>{quest.title}</h3>
          <p className="quest-description">{quest.description}</p>
          <div className="quest-meta">
            <span>
              <CalendarDays size={15} />
              {formatDate(quest.date)}
            </span>
            <span>
              <MapPin size={15} />
              {quest.district} район
            </span>
          </div>
          <div className="quest-bottom">
            <span>
              <Users size={16} />
              {quest.participants} / {quest.capacity} учасників
            </span>
            <span className="round-arrow">
              <ArrowUpRight size={20} />
            </span>
          </div>
          {quest.status === "completed" ? (
            <Badge>Завершено</Badge>
          ) : quest.participants >= quest.capacity ? (
            <Badge>Усі місця зайняті</Badge>
          ) : null}
        </div>
      </Link>
    </Card>
  );
}
export function QuestSkeleton() {
  return (
    <Card className="quest-card" aria-label="Завантаження квесту">
      <Skeleton className="skeleton-photo" />
      <div className="quest-body">
        <Skeleton className="skeleton-line" />
        <Skeleton className="skeleton-title" />
        <Skeleton className="skeleton-line" />
        <Skeleton className="skeleton-line" />
      </div>
    </Card>
  );
}
