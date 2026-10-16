import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import type { Team, TeamFormValues } from "../../entities/team/types";
import { teamFormSchema } from "../../entities/team/form-schema";
import { TeamCard } from "../../entities/team/components";
import { useTeamMutation } from "./hooks";
import { categories } from "../../mocks/data";
import { Card, Input } from "../../shared/ui/primitives";
import { Button } from "../../shared/ui/button";
export function TeamForm({ team }: { team?: Team }) {
  const navigate = useNavigate();
  const mutation = useTeamMutation();
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<TeamFormValues>({
    resolver: zodResolver(teamFormSchema),
    defaultValues: team || {
      name: "",
      description: "",
      category: "eco",
      city: "Дніпро",
      avatar: "leaf",
      coverImage: "/images/nature.jpg",
      visibility: "PUBLIC",
      maxMembers: 12,
    },
  });
  const values = useWatch({ control });
  const preview: Team = {
    id: team?.id || "preview",
    slug: team?.slug || "",
    name: values.name || "",
    description: values.description || "",
    category: values.category || "eco",
    city: values.city || "Дніпро",
    avatar: values.avatar || "leaf",
    coverImage: values.coverImage || "/images/nature.jpg",
    visibility: values.visibility || "PUBLIC",
    maxMembers: values.maxMembers || 12,
    createdAt: team?.createdAt || "",
    ownerId: team?.ownerId || "",
    status: "ACTIVE",
  };
  return (
    <form
      className="team-form-layout"
      onSubmit={handleSubmit((v) =>
        mutation.mutate(
          { type: "SAVE_TEAM", teamId: team?.id, values: v },
          {
            onSuccess: (slug) => {
              if (slug) navigate(`/teams/${slug}`);
            },
          },
        ),
      )}
      noValidate
    >
      <Card className="team-form">
        <h2>
          {team ? "Налаштування команди" : "Створи місце для спільних справ"}
        </h2>
        <label>
          Назва
          <Input {...register("name")} aria-invalid={!!errors.name} />
        </label>
        <label>
          Про вашу команду
          <textarea
            rows={5}
            {...register("description")}
            aria-invalid={!!errors.description}
          />
        </label>
        <label>
          Напрям
          <select {...register("category")}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Місто
          <select {...register("city")}>
            <option>Дніпро</option>
          </select>
        </label>
        <label>
          Символ
          <select {...register("avatar")}>
            <option value="leaf">Листок</option>
            <option value="heart">Серце</option>
            <option value="flag">Прапорець</option>
            <option value="sun">Сонце</option>
          </select>
        </label>
        <label>
          Обкладинка
          <select {...register("coverImage")}>
            <option value="/images/nature.jpg">Зелене місто</option>
            <option value="/images/community.jpg">Спільна допомога</option>
            <option value="/images/books.jpg">Знання й культура</option>
            <option value="/images/dogs.jpg">Турбота про тварин</option>
          </select>
        </label>
        <label>
          Видимість
          <select {...register("visibility")}>
            <option value="PUBLIC">
              Публічна · можна долучитися самостійно
            </option>
            <option value="PRIVATE">Приватна · тільки за запрошенням</option>
          </select>
        </label>
        <label>
          Максимум учасників
          <Input
            type="number"
            min={2}
            max={50}
            {...register("maxMembers", { valueAsNumber: true })}
          />
        </label>
        {Object.entries(errors).map(([key, error]) => (
          <p className="form-error" role="alert" key={key}>
            {error.message}
          </p>
        ))}
        {mutation.isError && (
          <p className="error-message" role="alert">
            {mutation.error.message}
          </p>
        )}
        <Button disabled={mutation.isPending} type="submit">
          {mutation.isPending
            ? "Зберігаємо…"
            : team
              ? "Зберегти зміни"
              : "Створити команду"}
        </Button>
      </Card>
      <aside>
        <p className="eyebrow">ТАК ВАС ПОБАЧАТЬ ІНШІ</p>
        <TeamCard team={preview} names={["Ти"]} preview />
        <p className="field-hint">
          Демонстраційна спільнота. Тут немає справжніх платежів або серверної
          перевірки особи.
        </p>
      </aside>
    </form>
  );
}
