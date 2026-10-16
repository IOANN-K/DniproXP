import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Camera, Check, FileCheck2, X } from "lucide-react";
import type { Quest, Participation } from "../../entities/types";
import { questApi } from "../../mocks/api";
import { Dialog, DialogContent, DialogTrigger } from "../../shared/ui/dialog";
import { Button } from "../../shared/ui/button";
import { Photo } from "../../shared/ui/primitives";
export function ReportDialog({
  quest,
  participation,
}: {
  quest: Quest;
  participation: Participation;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState(false);
  const mutation = useMutation({
    mutationFn: () =>
      questApi.submitReport(quest.id, participation.userId, {
        text,
        photo: photo ? quest.image : null,
        photoName: photo ? "Демонстраційне фото участі" : null,
      }),
    onSuccess: () => {
      setOpen(false);
      setText("");
      setPhoto(false);
    },
  });
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!mutation.isPending) {
          setOpen(value);
          mutation.reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <FileCheck2 size={16} />
          Завершити й подати звіт
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Розкажи про свою добру справу"
        description={`${quest.title}. Після подання звіту участь очікуватиме перевірки.`}
      >
        <form
          className="report-form"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <label htmlFor={`report-${quest.id}`}>Що вдалося зробити?</label>
          <textarea
            id={`report-${quest.id}`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            minLength={30}
            maxLength={2000}
            required
            placeholder="Опиши свою роль, виконані завдання та результат…"
            rows={5}
          />
          <span className="field-hint">
            Від 30 до 2000 символів · {text.length}/2000
          </span>
          <div className="report-photo-box">
            {photo ? (
              <>
                <Photo
                  src={quest.image}
                  alt="Демонстраційне прикріплення до звіту"
                />
                <div>
                  <span>
                    <Check size={15} />
                    Демофото прикріплено
                  </span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Прибрати фото"
                    onClick={() => setPhoto(false)}
                  >
                    <X size={18} />
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Camera size={30} />
                <p>Спробуй прикріплення на готовому прикладі</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setPhoto(true)}
                >
                  Додати демонстраційне фото
                </Button>
              </>
            )}
          </div>
          <p className="field-hint">
            Особисті файли не завантажуються. Фото необов’язкове й не є доказом
            реальної участі.
          </p>
          {mutation.isError && (
            <p className="error-message" role="alert">
              {mutation.error.message}
            </p>
          )}
          <Button
            disabled={mutation.isPending || text.trim().length < 30}
            type="submit"
          >
            {mutation.isPending ? "Надсилаємо…" : "Надіслати на підтвердження"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
export function ReportPreview({
  participation,
}: {
  participation: Participation;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost">
          Переглянути звіт
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Твій звіт про участь"
        description="Поданий опис та демонстраційне прикріплення."
      >
        <p className="report-text">
          {participation.report?.text ||
            "Це архівний підтверджений запис без звіту."}
        </p>
        {participation.report?.photo && (
          <Photo
            className="report-preview-image"
            src={participation.report.photo}
            alt="Демонстраційне прикріплення до звіту"
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
