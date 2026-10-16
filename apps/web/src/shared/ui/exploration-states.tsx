import { Compass, RotateCcw } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "./button";
import { Card, Skeleton } from "./primitives";
export function ExplorationSkeleton() {
  return (
    <div className="story-grid" aria-label="Завантаження історій" role="status">
      {[1, 2, 3].map((id) => (
        <Card key={id} className="story-skeleton">
          <Skeleton className="skeleton-photo" />
          <div>
            <Skeleton className="skeleton-title" />
            <Skeleton className="skeleton-line" />
            <Skeleton className="skeleton-line" />
          </div>
        </Card>
      ))}
    </div>
  );
}
export function ExplorationError({ retry }: { retry: () => void }) {
  return (
    <Card className="empty-state">
      <Compass size={40} />
      <h2>Не вдалося відкрити історії міста</h2>
      <p>Спробуй ще раз — твої збережені добрі справи залишаються з тобою.</p>
      <Button onClick={retry}>
        <RotateCcw size={17} />
        Повторити
      </Button>
    </Card>
  );
}
export function ExplorationMissing({
  kind,
}: {
  kind: "mission" | "challenge";
}) {
  return (
    <div className="container empty-state">
      <Compass size={45} />
      <h1>{kind === "mission" ? "Місію не знайдено" : "Виклик не знайдено"}</h1>
      <p>Можливо, ця історія ще готується до публікації.</p>
      <Button asChild>
        <Link to={kind === "mission" ? "/missions" : "/challenges"}>
          До каталогу
        </Link>
      </Button>
    </div>
  );
}
