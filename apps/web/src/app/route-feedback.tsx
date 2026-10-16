import { Link, useRouteError, isRouteErrorResponse } from "react-router-dom";
import { Button } from "../shared/ui/button";

export function NotFound() {
  return (
    <div className="container empty-state">
      <p className="eyebrow">404</p>
      <h1>Тут поки немає квесту</h1>
      <p>Але в місті є багато добрих справ, які чекають на тебе.</p>
      <Button asChild>
        <Link to="/quests">Знайти квест</Link>
      </Button>
    </div>
  );
}
export function RouteError() {
  const error = useRouteError();
  return (
    <div className="container empty-state">
      <h1>
        {isRouteErrorResponse(error) && error.status === 404
          ? "Сторінку не знайдено"
          : "Щось пішло не так"}
      </h1>
      <p>Спробуй відкрити сторінку ще раз.</p>
      <Button asChild>
        <a href="/">На головну</a>
      </Button>
    </div>
  );
}
