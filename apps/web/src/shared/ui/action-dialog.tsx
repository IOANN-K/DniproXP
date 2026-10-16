import { useState, type ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogTrigger } from "./dialog";
import { Button } from "./button";
export function ActionDialog({
  trigger,
  title,
  description,
  confirmLabel,
  action,
  reasonRequired = false,
  children,
}: {
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel: string;
  action: (reason: string) => Promise<unknown>;
  reasonRequired?: boolean;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const mutation = useMutation({
    mutationFn: () => action(reason),
    onSuccess: () => setOpen(false),
  });
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (mutation.isPending) return;
        setOpen(value);
        if (value) {
          setReason("");
          mutation.reset();
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title={title} description={description}>
        {children}
        {reasonRequired && (
          <label className="action-reason">
            Причина (5–1000 символів)
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              minLength={5}
              maxLength={1000}
              rows={4}
            />
          </label>
        )}
        {mutation.isError && (
          <p className="error-message" role="alert">
            {mutation.error.message}
          </p>
        )}
        <Button
          disabled={
            mutation.isPending || (reasonRequired && reason.trim().length < 5)
          }
          onClick={() => mutation.mutate()}
        >
          {mutation.isPending ? "Зберігаємо…" : confirmLabel}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
