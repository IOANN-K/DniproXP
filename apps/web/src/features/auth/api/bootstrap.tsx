import { useEffect } from "react";
import { useApiSession } from "./session";
import { Button } from "../../../shared/ui/button";
export function ApiSessionBootstrap() {
  const initialize = useApiSession(s => s.initialize);
  const error = useApiSession(s => s.error);
  const logout = useApiSession(s => s.logout);
  const status = useApiSession(s => s.status);
  useEffect(() => { void initialize(); }, [initialize]);
  return error ? <div className="container error-message" role="alert">
    <p>{error.message}</p>
    {status === "error" && <Button variant="outline" onClick={() => void initialize()}>Відновити з’єднання</Button>}
    {status === "anonymous" && <Button variant="outline" onClick={() => void logout()}>Повторити вихід на сервері</Button>}
  </div> : null;
}
