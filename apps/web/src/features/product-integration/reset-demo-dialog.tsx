import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { repository } from "../../mocks/repository";
import { Dialog, DialogContent, DialogTrigger } from "../../shared/ui/dialog";
import { Button } from "../../shared/ui/button";
import { Input } from "../../shared/ui/primitives";
export function ResetDemoDialog() {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setConfirmation("");
        setError("");
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">Скинути локальні демодані</Button>
      </DialogTrigger>
      <DialogContent
        title="Скинути дані цього браузера?"
        description="Буде видалено локальні квести, реєстрації, звіти, чеки, XP та обміни й відновлено початкове демо. Це не змінює сервер чи дані інших браузерів. Сесію буде завершено."
      >
        <p>
          Поточний snapshot спочатку збережемо в localStorage за ключем
          dniproxp:platform:v5:before-reset:&lt;revision&gt;. Не покладайся на
          браузер як на постійний архів.
        </p>
        <label>
          Для підтвердження введи СКИНУТИ
          <Input
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            autoComplete="off"
          />
        </label>
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        <div className="wizard-actions">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Залишити дані
          </Button>
          <Button
            disabled={confirmation !== "СКИНУТИ"}
            onClick={() => {
              try {
                repository.resetDemoData(confirmation);
                setOpen(false);
                navigate("/demo", { replace: true });
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "Не вдалося скинути дані.",
                );
              }
            }}
          >
            Підтвердити скидання
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
