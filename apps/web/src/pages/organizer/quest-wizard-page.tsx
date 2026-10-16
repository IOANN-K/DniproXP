import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Sparkles,
  ShieldCheck,
  X,
} from "lucide-react";
import type { QuestFormValues } from "../../entities/types";
import { useOrganizer } from "../../features/organizer/use-organizer";
import {
  generationInputSchema,
  questGenerationProvider,
} from "../../features/quest-generation/provider";
import type { GenerationInput } from "../../features/quest-generation/provider";
import {
  clearWizard,
  loadWizard,
  saveWizard,
} from "../../features/quest-generation/wizard-storage";
import { questDraftSchema } from "../../features/organizer/quest-schema";
import { organizerApi } from "../../mocks/organizer-api";
import { categories } from "../../mocks/data";
import { Badge, Card, Input, Photo } from "../../shared/ui/primitives";
import { Button } from "../../shared/ui/button";
import { Dialog, DialogContent } from "../../shared/ui/dialog";
const defaults: GenerationInput = {
  goal: "",
  categoryId: "eco",
  district: "",
  capacity: 12,
  durationHours: 2,
};
export function QuestWizardPage() {
  const { user } = useOrganizer();
  return <QuestWizard key={user.id} userId={user.id} />;
}
function QuestWizard({ userId }: { userId: string }) {
  const navigate = useNavigate();
  const [restored, setRestored] = useState(() => loadWizard(userId));
  const [input, setInput] = useState<GenerationInput>(
    restored?.input || defaults,
  );
  const [values, setValues] = useState<QuestFormValues | null>(
    restored?.values || null,
  );
  const [step, setStep] = useState<1 | 2 | 3>(restored?.step || 1);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [discard, setDiscard] = useState(false);
  const [consent, setConsent] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const saved = useRef<string | null>(null);
  const saveLock = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const errorSummary = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (error) errorSummary.current?.focus();
  }, [error]);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    heading.current?.focus();
  }, [step]);
  useEffect(() => {
    if (saved.current) return;
    if (!input.goal.trim() && !values) return;
    saveWizard(userId, { version: 1, input, values, step });
  }, [input, values, step, userId]);
  const update = <K extends keyof QuestFormValues>(
    key: K,
    value: QuestFormValues[K],
  ) => setValues((v) => (v ? { ...v, [key]: value } : v));
  const generate = async () => {
    const valid = generationInputSchema.safeParse(input);
    if (!valid.success) {
      setError(valid.error.issues.map((i) => i.message).join(" · "));
      return;
    }
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setError("");
    setBusy(true);
    try {
      const result = await questGenerationProvider.generate(valid.data, {
        signal: abort.signal,
      });
      if (abort.signal.aborted) return;
      const parsed = questDraftSchema.parse(result.values);
      setValues(parsed);
      setConsent(false);
      setStep(2);
    } catch (e) {
      if (!abort.signal.aborted)
        setError(
          e instanceof Error
            ? e.message
            : "Не вдалося підготувати чернетку. Спробуй ще раз.",
        );
    } finally {
      if (controller.current === abort) setBusy(false);
    }
  };
  const next = () => {
    const result = questDraftSchema.safeParse(values);
    if (!result.success) {
      setError(result.error.issues.map((i) => i.message).join(" · "));
      return;
    }
    setValues(result.data);
    setConsent(false);
    setError("");
    setStep(3);
  };
  const save = async () => {
    if (!values || !consent || saveLock.current) return;
    saveLock.current = true;
    setSaving(true);
    setError("");
    try {
      // Exactly one save per successful wizard. No publication or reward side effect.
      saved.current =
        saved.current ||
        (await organizerApi.save(questDraftSchema.parse(values)));
      clearWizard(userId);
      navigate(`/organizer/quests/${saved.current}`);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Не вдалося зберегти чернетку.",
      );
      setSaving(false);
      saveLock.current = false;
    }
  };
  return (
    <div className="quest-wizard focused-wizard" data-step={step}>
      <Link className="back-link" to="/organizer/quests">
        <ArrowLeft size={16} /> До моїх квестів
      </Link>
      <div className="wizard-heading">
        <div>
          <p className="eyebrow">ВІД ІДЕЇ ДО ДОБРОЇ СПРАВИ</p>
          <h2 ref={heading} tabIndex={-1}>
            Майстер квестів
          </h2>
          <p>Твоя ідея. Зрозуміла чернетка. Остаточне рішення — за тобою.</p>
        </div>
        <Badge>
          <Sparkles size={16} /> Локальний шаблон · без зовнішнього AI
        </Badge>
      </div>
      <div className="wizard-progress-label">
        <span>Крок {step} із 3</span>
        <span>
          {step === 1
            ? "Почни з ідеї"
            : step === 2
              ? "Перевір деталі"
              : "Майже готово"}
        </span>
      </div>
      <ol className="wizard-steps" aria-label="Етапи майстра">
        {["Ідея", "Редагування", "Перегляд"].map((label, index) => (
          <li
            key={label}
            aria-current={step === index + 1 ? "step" : undefined}
          >
            <span>
              {step > index + 1 ? <CheckCircle2 size={18} /> : index + 1}
            </span>
            {label}
          </li>
        ))}
      </ol>
      <div className="wizard-disclaimer">
        <ShieldCheck size={22} />
        <p>
          Це rule-based генератор, не зовнішня AI-модель. Текст залишається в
          браузері. Не вводь контакти, адреси отримувачів допомоги чи інші
          приватні дані. Публікація й модерація — окремі кроки.
        </p>
      </div>
      {restored && (
        <p className="field-hint" role="status">
          Відновлено незавершену роботу цього облікового запису в цій вкладці.
        </p>
      )}
      {error && (
        <p
          ref={errorSummary}
          tabIndex={-1}
          className="error-message"
          role="alert"
        >
          {error}
        </p>
      )}
      {step === 1 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void generate();
          }}
          className="wizard-grid"
        >
          <Card className="wizard-fields">
            <p className="wizard-section-number">01 / ТВОЯ ІДЕЯ</p>
            <h3>Яку добру справу організуємо?</h3>
            <label htmlFor="wizard-goal">Опиши свою ідею</label>
            <textarea
              id="wizard-goal"
              aria-describedby="wizard-goal-hint"
              value={input.goal}
              maxLength={1000}
              rows={5}
              onChange={(e) => setInput({ ...input, goal: e.target.value })}
              placeholder="Наприклад: зібрати команду для сортування звичайних відходів у погодженому парку"
              required
              minLength={20}
              disabled={busy}
            />
            <div className="wizard-prompt-chips" aria-label="Приклади ідей">
              <span>Потрібне натхнення?</span>
              {[
                [
                  "Прибрати парк",
                  "Зібрати команду для сортування звичайних відходів у погодженому парку",
                  "eco",
                ],
                [
                  "Допомогти притулку",
                  "Організувати допомогу притулку: погодити з координатором безпечні завдання для волонтерів",
                  "animals",
                ],
                [
                  "Поділитися знаннями",
                  "Організувати зустріч для обміну книжками та читання у погодженому громадському просторі",
                  "education",
                ],
              ].map(([label, goal, categoryId]) => (
                <button
                  key={label}
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    setInput({
                      ...input,
                      goal,
                      categoryId: categoryId as GenerationInput["categoryId"],
                    })
                  }
                >
                  {label}
                </button>
              ))}
            </div>
            <span className="field-hint" id="wizard-goal-hint">
              20–1000 символів. Конкретні адреса й час додаються після
              перевірки.
            </span>
            <div className="wizard-field-pair">
              <label>
                Напрям
                <select
                  aria-label="Напрям"
                  value={input.categoryId}
                  disabled={busy}
                  onChange={(e) =>
                    setInput({
                      ...input,
                      categoryId: e.target
                        .value as GenerationInput["categoryId"],
                    })
                  }
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Район
                <Input
                  value={input.district}
                  maxLength={80}
                  minLength={3}
                  required
                  disabled={busy}
                  onChange={(e) =>
                    setInput({ ...input, district: e.target.value })
                  }
                />
              </label>
              <label>
                Учасників
                <Input
                  type="number"
                  min={1}
                  max={500}
                  required
                  disabled={busy}
                  value={Number.isNaN(input.capacity) ? "" : input.capacity}
                  onChange={(e) =>
                    setInput({ ...input, capacity: e.target.valueAsNumber })
                  }
                />
              </label>
              <label>
                Тривалість, год
                <Input
                  type="number"
                  min={0.5}
                  max={12}
                  step={0.5}
                  required
                  disabled={busy}
                  value={
                    Number.isNaN(input.durationHours) ? "" : input.durationHours
                  }
                  onChange={(e) =>
                    setInput({
                      ...input,
                      durationHours: e.target.valueAsNumber,
                    })
                  }
                />
              </label>
            </div>
            <div className="wizard-actions">
              <Button type="submit" disabled={busy}>
                <Sparkles size={18} />
                {busy ? "Готуємо чернетку…" : "Підготувати чернетку"}
              </Button>
              {busy && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    controller.current?.abort();
                    setBusy(false);
                  }}
                >
                  Скасувати
                </Button>
              )}
            </div>
          </Card>
          <Card className="wizard-aside">
            <Photo
              src="/images/community.jpg"
              alt="Ілюстрація спільної волонтерської допомоги"
            />
            <h3>Помічник, а не автопілот</h3>
            <p>
              Майстер структурує ідею, пропонує інструкції та умови. Перевір їх
              самостійно — особливо безпеку, доступність і необхідне
              спорядження.
            </p>
            <ul>
              <li>Не вигадує партнерів і локації.</li>
              <li>Не підтверджує майбутній результат.</li>
              <li>Нічого не публікує автоматично.</li>
            </ul>
            <Link to="/demo" className="text-link">
              Як працює весь сценарій <ArrowRight size={16} />
            </Link>
          </Card>
        </form>
      )}
      {step === 2 && values && (
        <Card className="wizard-fields">
          <p className="wizard-section-number">02 / РЕДАГУВАННЯ</p>
          <h3>Зроби чернетку своєю</h3>
          <p>
            Усі пропозиції можна змінити. Дату, точне місце та умови доступу
            перевір перед публікацією.
          </p>
          <label htmlFor="generated-title">Назва квесту</label>
          <Input
            id="generated-title"
            value={values.title}
            maxLength={100}
            onChange={(e) => update("title", e.target.value)}
          />
          {(
            [
              ["description", "Короткий опис", 3],
              ["fullDescription", "Повний опис", 6],
              ["requirements", "Умови участі", 3],
              ["bring", "Що взяти з собою", 3],
              ["instructions", "Інструкції та безпека", 5],
            ] as const
          ).map(([key, label, rows]) => (
            <label key={key}>
              {label}
              <textarea
                rows={rows}
                value={values[key]}
                onChange={(e) => update(key, e.target.value)}
              />
            </label>
          ))}
          <div className="wizard-field-pair">
            {(
              [
                ["xp", "Пропозиція XP", 10, 1000],
                ["rewardPoints", "Пропозиція бонусних балів", 0, 500],
              ] as const
            ).map(([key, label, min, max]) => (
              <label key={key}>
                {label}
                <Input
                  type="number"
                  min={min}
                  max={max}
                  value={Number.isNaN(values[key]) ? "" : values[key]}
                  onChange={(e) => update(key, e.target.valueAsNumber)}
                />
              </label>
            ))}
          </div>
          <p className="field-hint">
            Час і кількість учасників узято з твоєї ідеї. Решту полів, місце й
            розклад можна змінити у звичайному редакторі після збереження.
          </p>
          <div className="wizard-actions">
            <Button
              variant="outline"
              onClick={() => {
                setError("");
                setStep(1);
              }}
            >
              До ідеї
            </Button>
            <Button onClick={next}>
              Переглянути <ArrowRight size={18} />
            </Button>
          </div>
        </Card>
      )}
      {step === 3 && values && (
        <div className="wizard-grid">
          <Card className="wizard-preview">
            <Photo
              src={values.image}
              alt="Ілюстративне фото для чернетки квесту"
            />
            <Badge>ПОПЕРЕДНІЙ ПЕРЕГЛЯД · ЧЕРНЕТКА</Badge>
            <h3>{values.title}</h3>
            <p>{values.description}</p>
            <dl>
              <div>
                <dt>Район</dt>
                <dd>{values.district}</dd>
              </div>
              <div>
                <dt>Учасників</dt>
                <dd>{values.capacity}</dd>
              </div>
              <div>
                <dt>Планова тривалість</dt>
                <dd>{values.durationHours} год</dd>
              </div>
              <div>
                <dt>Запропоновані нагороди</dt>
                <dd>
                  {values.xp} XP · {values.rewardPoints} балів
                </dd>
              </div>
            </dl>
            <p className="wizard-text">{values.fullDescription}</p>
            <h4>Умови участі</h4>
            <p className="wizard-text">{values.requirements}</p>
            <h4>Що взяти</h4>
            <p className="wizard-text">{values.bring}</p>
            <h4>Інструкції</h4>
            <p className="wizard-text">{values.instructions}</p>
          </Card>
          <Card className="wizard-aside">
            <ClipboardCheck size={30} />
            <h3>Перед публікацією</h3>
            <ul>
              <li>Укажи підтверджені дату й час.</li>
              <li>Узгодь точну адресу та безпечне місце зустрічі.</li>
              <li>Перевір умови участі та нагороди.</li>
              <li>Передай публікацію на модерацію.</li>
            </ul>
            <p>
              Зараз створимо лише чернетку твоєї організації. Нарахувань XP чи
              підтверджень виконання не буде.
            </p>
            <label className="wizard-consent">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              Я перевірив(ла) чернетку й розумію, що її ще не опубліковано
            </label>
            <div className="wizard-actions">
              <Button
                variant="outline"
                disabled={saving}
                onClick={() => setStep(2)}
              >
                Редагувати
              </Button>
              <Button disabled={!consent || saving} onClick={() => void save()}>
                {saving ? "Зберігаємо…" : "Зберегти чернетку"}
              </Button>
            </div>
          </Card>
        </div>
      )}
      <div className="wizard-bottom">
        <Button
          variant="ghost"
          disabled={busy || saving}
          onClick={() => setDiscard(true)}
        >
          <X size={16} /> Очистити майстер
        </Button>
        <span className="field-hint">
          До збереження це лише робота в поточній вкладці, не квест у каталозі.
          Відновлення доступне, якщо браузер дозволяє sessionStorage; це не
          резервна копія.
        </span>
      </div>
      <Dialog open={discard} onOpenChange={setDiscard}>
        <DialogContent
          title="Очистити незбережену роботу?"
          description="Видалиться лише чернетка майстра цієї вкладки. Збережені квести та нагороди не зміняться."
        >
          <Button variant="outline" onClick={() => setDiscard(false)}>
            Залишити
          </Button>
          <Button
            onClick={() => {
              clearWizard(userId);
              setRestored(null);
              setConsent(false);
              setInput(defaults);
              setValues(null);
              setStep(1);
              setError("");
              setDiscard(false);
            }}
          >
            Очистити
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
