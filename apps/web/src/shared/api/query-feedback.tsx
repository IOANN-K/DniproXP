import { Link } from "react-router-dom";
import { Button } from "../ui/button";
import { ApiError } from "./errors";
export function ApiQueryError({ error, retry }: { error: Error; retry?: () => void }) {
  const status = error instanceof ApiError ? error.status : undefined;
  return <div className="empty-state" role="alert">
    <h2>{status === 401 ? "Потрібно увійти" : status === 403 ? "Доступ обмежено" : status === 404 ? "Запис не знайдено" : status === 429 ? "Забагато запитів" : "Не вдалося отримати дані"}</h2>
    <p>{error.message}</p>
    {error instanceof ApiError && error.retryAfterSeconds !== undefined && <p>Спробуйте через {error.retryAfterSeconds} с.</p>}
    {error instanceof ApiError && error.requestId && <small>Номер звернення: {error.requestId}</small>}
    {status === 401 ? <Button asChild><Link to="/login">Увійти</Link></Button> : retry && status !== 403 && status !== 404 && status !== 429 ? <Button onClick={retry}>Спробувати ще раз</Button> : null}
  </div>;
}
