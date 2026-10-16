import { useRef } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { ArrowLeft, Save, Send, Image, MapPin } from "lucide-react";
import type { QuestFormValues } from "../../entities/types";
import {
  questDraftSchema,
  questPublishSchema,
} from "../../features/organizer/quest-schema";
import { organizerApi } from "../../mocks/organizer-api";
import { questToForm } from "../../mocks/repository";
import { useOrganizer } from "../../features/organizer/use-organizer";
import { categories } from "../../mocks/data";
import { verifiedLocations } from "../../mocks/locations";
import { Card, Input, Photo, Badge } from "../../shared/ui/primitives";
import { Button } from "../../shared/ui/button";
const empty: QuestFormValues = {
  title: "",
  description: "",
  fullDescription: "",
  categoryId: "",
  district: "",
  address: "",
  date: "",
  time: "10:00",
  capacity: 12,
  difficulty: "Легкий",
  xp: 150,
  rewardPoints: 75,
  image: "/images/community.jpg",
  requirements: "Від 16 років; до 18 років — разом із дорослим.",
  bring: "Вода\nЗручний одяг",
  instructions: "",
  durationHours: 2,
  locationId: "",
};
export function QuestFormPage() {
  const { id } = useParams();
  const { quests, participations } = useOrganizer();
  const quest = quests.find((q) => q.id === id);
  if (
    id &&
    (!quest ||
      !["draft", "published"].includes(quest.lifecycle || "") ||
      participations.some((p) => p.questId === id))
  )
    return (
      <Card className="empty-state">
        <h2>Редагування недоступне</h2>
        <p>
          Квест не належить організації, вже розпочався або має заявки. Умови
          участі після першої заявки зафіксовані.
        </p>
        <Button asChild>
          <Link to="/organizer/quests">До своїх квестів</Link>
        </Button>
      </Card>
    );
  return (
    <QuestForm
      key={id || "new"}
      initial={quest ? questToForm(quest) : empty}
      id={id}
    />
  );
}
function QuestForm({ initial, id }: { initial: QuestFormValues; id?: string }) {
  const navigate = useNavigate();
  const savedId = useRef(id);
  const { organization } = useOrganizer();
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<QuestFormValues>({
    resolver: zodResolver(questDraftSchema),
    defaultValues: initial,
    shouldFocusError: true,
  });
  const image = watch("image");
  const location = watch("locationId");
  const mutation = useMutation({
    mutationFn: async ({
      values,
      publish,
    }: {
      values: QuestFormValues;
      publish: boolean;
    }) => {
      const next = await organizerApi.save(values, savedId.current);
      savedId.current = next;
      if (publish) await organizerApi.transition(next, "published");
      return next;
    },
    onSuccess: (next) => navigate(`/organizer/quests/${next}`),
  });
  const submit = (publish: boolean) =>
    handleSubmit((values) => {
      if (publish) {
        const result = questPublishSchema.safeParse(values);
        if (!result.success) {
          result.error.issues.forEach((issue, index) =>
            setError(
              issue.path[0] as keyof QuestFormValues,
              { message: issue.message },
              { shouldFocus: index === 0 },
            ),
          );
          return;
        }
      }
      mutation.mutate({ values, publish });
    });
  const error = (name: keyof QuestFormValues) =>
    errors[name] ? (
      <span id={`error-${name}`} className="form-error" role="alert">
        {errors[name]?.message}
      </span>
    ) : null;
  const input = (name: keyof QuestFormValues, type = "text") => (
    <Input
      id={`field-${name}`}
      type={type}
      aria-invalid={!!errors[name]}
      aria-describedby={errors[name] ? `error-${name}` : undefined}
      {...register(
        name,
        ["capacity", "xp", "rewardPoints", "durationHours"].includes(name)
          ? { valueAsNumber: true }
          : {},
      )}
    />
  );
  const area = (name: keyof QuestFormValues, rows = 4) => (
    <textarea
      id={`field-${name}`}
      rows={rows}
      aria-invalid={!!errors[name]}
      aria-describedby={errors[name] ? `error-${name}` : undefined}
      {...register(name)}
    />
  );
  return (
    <>
      <Link className="back-link" to="/organizer/quests">
        <ArrowLeft size={16} />
        До моїх квестів
      </Link>
      <div className="workspace-page-heading">
        <div>
          <p className="eyebrow">ЗБЕРИ ЛЮДЕЙ НАВКОЛО ДОБРОЇ СПРАВИ</p>
          <h2>{id ? "Редагувати квест" : "Нова міська ініціатива"}</h2>
          <p>Спочатку збережи чернетку або заповни всі дані для публікації.</p>
        </div>
        <Badge>{isDirty ? "Є незбережені зміни" : "Чернетка"}</Badge>
      </div>
      <form className="quest-editor" onSubmit={submit(false)} noValidate>
        <div className="quest-editor-main">
          <Card className="editor-section">
            <h3>Про добру справу</h3>
            <label htmlFor="field-title">Назва квесту</label>
            {input("title")}
            {error("title")}
            <label htmlFor="field-description">Короткий опис</label>
            {area("description", 2)}
            {error("description")}
            <label htmlFor="field-fullDescription">Повний опис</label>
            {area("fullDescription", 6)}
            {error("fullDescription")}
            <div className="editor-fields-grid">
              <div>
                <label htmlFor="field-categoryId">Категорія</label>
                <select
                  id="field-categoryId"
                  {...register("categoryId")}
                  aria-invalid={!!errors.categoryId}
                >
                  <option value="">Обери напрям</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {error("categoryId")}
              </div>
              <div>
                <label htmlFor="field-difficulty">Складність</label>
                <select id="field-difficulty" {...register("difficulty")}>
                  <option>Легкий</option>
                  <option>Середній</option>
                  <option>Складний</option>
                </select>
                {error("difficulty")}
              </div>
            </div>
          </Card>
          <Card className="editor-section">
            <h3>
              <MapPin size={20} />
              Місце й час
            </h3>
            <label htmlFor="field-locationId">
              Перевірена територія для мапи
            </label>
            <select
              id="field-locationId"
              {...register("locationId", {
                onChange: (e) => {
                  const loc = verifiedLocations[e.target.value];
                  if (loc)
                    setValue("address", loc.locationLabel, {
                      shouldDirty: true,
                    });
                },
              })}
            >
              <option value="">Інша адреса — без маркера на мапі</option>
              {Object.entries(verifiedLocations).map(([key, v]) => (
                <option value={key} key={key}>
                  {v.locationLabel}
                </option>
              ))}
            </select>
            <p className="field-hint">
              Не генеруємо координати з адреси. Маркер доступний лише для
              перевіреної території; точку збору повідомляє організатор.
            </p>
            <label htmlFor="field-address">Адреса або місце зустрічі</label>
            <Input
              id="field-address"
              readOnly={!!location}
              {...register("address")}
              aria-invalid={!!errors.address}
            />
            {error("address")}
            <label htmlFor="field-district">Район</label>
            {input("district")}
            {error("district")}
            <div className="editor-fields-grid">
              <div>
                <label htmlFor="field-date">Дата</label>
                {input("date", "date")}
                {error("date")}
              </div>
              <div>
                <label htmlFor="field-time">Час за Києвом</label>
                {input("time", "time")}
                {error("time")}
              </div>
              <div>
                <label htmlFor="field-durationHours">Тривалість, годин</label>
                <Input
                  id="field-durationHours"
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="12"
                  {...register("durationHours", { valueAsNumber: true })}
                />
                {error("durationHours")}
              </div>
              <div>
                <label htmlFor="field-capacity">Кількість місць</label>
                {input("capacity", "number")}
                {error("capacity")}
              </div>
            </div>
          </Card>
          <Card className="editor-section">
            <h3>Умови та результат</h3>
            <label htmlFor="field-requirements">
              Вимоги до учасників — по одній у рядку
            </label>
            {area("requirements")}
            {error("requirements")}
            <label htmlFor="field-bring">
              Що взяти із собою — по одному в рядку
            </label>
            {area("bring")}
            {error("bring")}
            <label htmlFor="field-instructions">Інструкція виконання</label>
            {area("instructions", 5)}
            {error("instructions")}
          </Card>
        </div>
        <aside className="quest-editor-aside">
          <Card className="editor-section">
            <h3>Відзнач внесок</h3>
            <label htmlFor="field-xp">Накопичуваний досвід, XP</label>
            {input("xp", "number")}
            {error("xp")}
            <label htmlFor="field-rewardPoints">Бонусні бали</label>
            {input("rewardPoints", "number")}
            {error("rewardPoints")}
            <p className="field-hint">
              Обидва ресурси нараховуються лише після перевірки звіту. Значення
              фіксуються після першої заявки.
            </p>
          </Card>
          <Card className="editor-section">
            <h3>
              <Image size={20} />
              Фото ініціативи
            </h3>
            <Photo
              className="editor-photo"
              src={image}
              alt="Тематичне фото майбутнього квесту"
            />
            <label htmlFor="field-image">Локальна бібліотека фотографій</label>
            <select id="field-image" {...register("image")}>
              <option value="/images/community.jpg">Спільна допомога</option>
              <option value="/images/nature.jpg">Природа та екологія</option>
              <option value="/images/dogs.jpg">Турбота про тварин</option>
              <option value="/images/books.jpg">Освіта й культура</option>
            </select>
            {error("image")}
            <p className="field-hint">
              Ілюстративні фотографії. Особисті файли не завантажуються.
            </p>
          </Card>
          <Card className="editor-section editor-save">
            <Badge>ДЕМОНСТРАЦІЙНА ПУБЛІКАЦІЯ</Badge>
            <p>
              Квест з’явиться у каталозі після схвалення адміністратором.
              Редагування опублікованого квесту поверне його в чернетки.
            </p>
            {organization.moderation !== "approved" && (
              <p className="form-error">
                Поки організація на модерації, доступне лише збереження
                чернеток.
              </p>
            )}
            {mutation.isError && (
              <p role="alert" className="error-message">
                {mutation.error.message}
              </p>
            )}
            <Button
              type="submit"
              variant="outline"
              disabled={mutation.isPending}
            >
              <Save size={17} />
              {mutation.isPending ? "Зберігаємо…" : "Зберегти чернетку"}
            </Button>
            <Button
              type="button"
              disabled={
                mutation.isPending || organization.moderation !== "approved"
              }
              onClick={() => void submit(true)()}
            >
              <Send size={17} />
              Подати на публікацію
            </Button>
            <Link to="/organizer/quests" className="text-link">
              Повернутися без збереження
            </Link>
          </Card>
        </aside>
      </form>
    </>
  );
}
