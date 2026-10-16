import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Download, Share2, ShieldCheck, ArrowUpRight } from "lucide-react";
import { selectImpact, metricCatalog } from "../entities/impact/domain";
import type { ImpactRecord } from "../entities/impact/types";
import { receiptPng, saveReceipt } from "../features/impact/receipt-export";
import { VolunteerShell } from "../features/session/volunteer-shell";
import { useVolunteer, useVolunteerState } from "../shared/lib/use-volunteer";
import { Card, Badge } from "../shared/ui/primitives";
import { Button } from "../shared/ui/button";
export function ImpactReceiptsPage() {
  return (
    <VolunteerShell>
      <Receipts />
    </VolunteerShell>
  );
}
function Receipts() {
  const user = useVolunteer()!;
  const state = useVolunteerState();
  const { id } = useParams();
  const records = selectImpact(state.impactRecords, {
    userId: user.id,
    scope: "individual",
  });
  const selected = id ? records.find((r) => r.id === id) : records[0];
  return (
    <section className="impact-receipts">
      <div className="impact-section-heading">
        <div>
          <p className="eyebrow">ТВОЯ ІСТОРІЯ ДОБРИХ СПРАВ</p>
          <h1>Чеки допомоги</h1>
          <p>Особистий підсумок після підтвердження організатором.</p>
        </div>
        <Link to="/impact" className="text-link">
          Вплив міста <ArrowUpRight size={17} />
        </Link>
      </div>
      {selected ? (
        <Receipt
          key={`${selected.id}:${user.id}`}
          record={selected}
          name={user.name}
        />
      ) : (
        <Card className="empty-state">
          <h2>{id ? "Чек недоступний" : "Твоя історія тільки починається"}</h2>
          <p>
            {id
              ? "Тут доступні лише власні підтверджені чеки. Увійди у відповідний профіль або обери чек зі своєї історії."
              : "Виконай квест і дочекайся підтвердження організатора."}
          </p>
          <Link className="text-link" to={id ? "/impact/receipts" : "/quests"}>
            {id ? "Мої чеки" : "Знайти квест"}
          </Link>
        </Card>
      )}
      <h2>Історія · {records.length}</h2>
      <div className="impact-receipt-history">
        {records.map((r) => (
          <Link
            key={r.id}
            to={`/impact/receipts/${encodeURIComponent(r.id)}`}
            className="impact-history-row"
            aria-current={r.id === selected?.id ? "page" : undefined}
          >
            <span>
              <strong>{r.questTitle}</strong>
              <small>
                {r.organizationName} ·{" "}
                {new Intl.DateTimeFormat("uk-UA", {
                  timeZone: "Europe/Kyiv",
                  dateStyle: "medium",
                }).format(new Date(r.verifiedAt!))}
              </small>
            </span>
            <Badge>+{r.awardedXp} XP</Badge>
            <ArrowUpRight size={18} />
          </Link>
        ))}
      </div>
    </section>
  );
}
function Receipt({ record, name }: { record: ImpactRecord; name: string }) {
  const [includeName, setIncludeName] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  async function exportReceipt(share: boolean) {
    setBusy(true);
    setNotice("");
    setError("");
    try {
      const blob = await receiptPng(record, includeName ? name : undefined);
      const file = new File([blob], "dniproxp-impact-receipt.png", {
        type: "image/png",
      });
      if (share && navigator.canShare?.({ files: [file] }) && navigator.share) {
        await navigator.share({
          files: [file],
          title: "Моя добра справа · DniproXP",
        });
        setNotice("Чек передано для поширення.");
      } else {
        saveReceipt(blob);
        setNotice(
          share
            ? "Поширення файлів недоступне: PNG завантажено, його можна надіслати вручну."
            : "PNG завантажено.",
        );
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError"))
        setError(
          e instanceof Error
            ? e.message
            : "Не вдалося експортувати чек. Спробуй ще раз.",
        );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="impact-receipt-layout">
      <Card className="impact-receipt" data-testid="impact-receipt">
        <div className="impact-receipt-brand">
          Dnipro<span>XP</span>
          <ShieldCheck size={28} />
        </div>
        <Badge>ДЕМОНСТРАЦІЙНИЙ ЧЕК</Badge>
        <h2>
          Добра справа —<br />
          відчутний внесок.
        </h2>
        <h3>{record.questTitle}</h3>
        <p>{record.organizationName}</p>
        {includeName && <p>Волонтер: {name}</p>}
        <hr />
        <dl>
          <div>
            <dt>Дата підтвердження</dt>
            <dd>
              {new Intl.DateTimeFormat("uk-UA", {
                timeZone: "Europe/Kyiv",
                dateStyle: "medium",
              }).format(new Date(record.verifiedAt!))}
            </dd>
          </div>
          {record.metrics.map((m) => (
            <div key={m.id}>
              <dt>{metricCatalog[m.type].label}</dt>
              <dd>
                {m.value.toLocaleString("uk-UA")}{" "}
                {metricCatalog[m.type].unitLabel}
              </dd>
            </div>
          ))}
          <div>
            <dt>Досвід</dt>
            <dd>+{record.awardedXp} XP</dd>
          </div>
          <div>
            <dt>Бонусні бали</dt>
            <dd>+{record.awardedPoints}</dd>
          </div>
        </dl>
        {!record.metrics.length && (
          <p className="impact-note">
            Фактичні години та кількісні показники не зафіксовані.
          </p>
        )}
        <hr />
        <p className="impact-note">
          {record.provenance === "legacy-import"
            ? "Імпортоване демопідтвердження. Дані перевіряльника в архіві відсутні."
            : "Підтверджено організатором у демопрототипі."}{" "}
          Не є офіційним сертифікатом чи незалежним доказом реальної допомоги.
        </p>
      </Card>
      <div className="impact-receipt-actions">
        <h2>Поділися натхненням</h2>
        <p>
          Чек містить лише підсумок твоєї участі. Приватний звіт, контакти та
          внутрішні ідентифікатори не потрапляють у PNG.
        </p>
        <label className="check-filter">
          <input
            type="checkbox"
            checked={includeName}
            onChange={(e) => setIncludeName(e.target.checked)}
          />
          Додати моє ім’я до чека та PNG
        </label>
        <Button disabled={busy} onClick={() => void exportReceipt(false)}>
          <Download size={18} />
          {busy ? "Готуємо PNG…" : "Завантажити PNG"}
        </Button>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => void exportReceipt(true)}
        >
          <Share2 size={18} />
          Поділитися PNG
        </Button>
        <p className="impact-note">
          Ім’я приховане за замовчуванням. Посилання на приватний чек не
          публікується. Спільний результат команди — на мапі, він не
          приписується одному волонтеру.
        </p>
        {notice && (
          <p role="status" className="impact-verified">
            {notice}
          </p>
        )}
        {error && (
          <p role="alert" className="error-message">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
