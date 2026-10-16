import { Link } from "react-router-dom";
import { useSession } from "../features/session/store";
import { Button } from "../shared/ui/button";
/** Staged migration: never execute an unconverted mock page under a real API identity. */
export function ApiPendingRoute() {
  return <div className="container empty-state"><h1>Розділ ще не підключено до сервера</h1>
    <p>Інтеграція триває. Локальні демонстраційні записи не підміняють серверні дані.</p>
    <Button asChild><Link to="/profile">До мого профілю</Link></Button>
  </div>;
}
export function ApiEntryPage() {
  const user = useSession(s => s.user), status = useSession(s => s.status);
  return <div className="container page-section"><p className="eyebrow">DNIPROXP</p><h1>Твоя історія добрих справ</h1>
    <p>Керуй своїм профілем і приватністю. Інші розділи підключаються до сервера поетапно.</p>
    {status === "loading" ? <p role="status">Перевіряємо сесію…</p> : <Button asChild><Link to={user ? "/profile" : "/login"}>{user ? "Мій профіль" : "Увійти"}</Link></Button>}
  </div>;
}
