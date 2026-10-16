import {
  useVolunteerState,
  useVolunteer,
} from "../../shared/lib/use-volunteer";
import { getQuestSnapshot } from "../../mocks/repository";
import { participationLabels } from "./participation-status";
import { Link } from "react-router-dom";
import { ArrowUpRight, CalendarDays, MapPin, Users, Zap } from "lucide-react";
import type { Quest } from "../types";
import { categories, organizations } from "../../mocks/data";
import { Badge, Card, Photo, Skeleton } from "../../shared/ui/primitives";
import { formatDate } from "../../shared/lib/utils";
export function QuestCard({ quest: suppliedQuest }: { quest: Quest }) {
  const state = useVolunteerState();
  const user = useVolunteer();
  const quest = getQuestSnapshot(suppliedQuest.id, state) || suppliedQuest;
  const participation = state.participations.find(
    (p) =>
      p.questId === quest.id &&
      p.userId === user?.id &&
      p.status !== "cancelled",
  );
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
          {participation && (
            <Badge className={`status-${participation.status}`}>
              {participationLabels[participation.status]}
            </Badge>
          )}
          {quest.status === "completed" && !participation ? (
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
