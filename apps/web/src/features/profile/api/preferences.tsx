import type { Preferences } from "../../../shared/api/contracts";
import { Card } from "../../../shared/ui/primitives";
import { ApiQueryError } from "../../../shared/api/query-feedback";
import { useApiPreferences, useUpdateApiPreferences } from "./hooks";
const labels: Record<keyof Preferences, string> = {
  publicProfile: "Публічний профіль", showDisplayName: "Ім’я, аватар і біографія", showActivityHistory: "Історія підтверджених справ",
  showTeams: "Команди", showVerifiedHours: "Підтверджені години", showAchievements: "Досягнення", showSkillProgress: "Прогрес навичок", showOrganizations: "Досвід в організаціях",
};
export function ApiPrivacySettings() {
  const query = useApiPreferences(), mutation = useUpdateApiPreferences();
  if (query.isPending) return <p role="status">Завантажуємо налаштування приватності…</p>;
  if (query.isError) return <ApiQueryError error={query.error} retry={() => void query.refetch()} />;
  return <Card><h2>Приватність профілю й паспорта</h2><p>Публічні сторінки показують лише дозволені сервером дані.</p>
    <fieldset className="profile-form" disabled={mutation.isPending}>
      {(Object.keys(labels) as (keyof Preferences)[]).map(key => <label className="team-allow-toggle" key={key}>
        <input type="checkbox" checked={query.data[key]} onChange={e => mutation.mutate({ [key]: e.target.checked })} />{labels[key]}
      </label>)}
    </fieldset>
    {mutation.isPending && <p role="status">Зберігаємо налаштування…</p>}
    {mutation.isSuccess && <p role="status">Налаштування збережено.</p>}
    {mutation.isError && <p role="alert" className="error-message">{mutation.error.message}</p>}
  </Card>;
}
