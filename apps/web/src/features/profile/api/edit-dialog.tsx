import { useState } from "react";
import { Pencil } from "lucide-react";
import { z } from "zod";
import type { ApiUser } from "../../../shared/api/contracts";
import { roleSchema } from "../../../shared/api/contracts";
import { ApiError } from "../../../shared/api/errors";
import { Dialog, DialogContent, DialogTrigger } from "../../../shared/ui/dialog";
import { Input } from "../../../shared/ui/primitives";
import { Button } from "../../../shared/ui/button";
import { useUpdateApiProfile } from "./hooks";
const formSchema = z.object({ displayName: z.string().trim().min(2).max(80), bio: z.string().trim().max(1000),
  avatarUrl: z.union([z.literal(""), z.url().max(2048).refine(url => url.startsWith("https://"))]), primaryRole: roleSchema });
const roleLabels = { VOLUNTEER: "Волонтер", ORGANIZER: "Організатор", ADMIN: "Адміністратор" };
export function ApiEditProfileDialog({ user }: { user: ApiUser }) {
  const [open, setOpen] = useState(false), [name, setName] = useState(user.displayName), [bio, setBio] = useState(user.bio ?? "");
  const [avatar, setAvatar] = useState(user.avatarUrl ?? ""), [role, setRole] = useState(user.primaryRole), [validation, setValidation] = useState("");
  const mutation = useUpdateApiProfile();
  const fields = mutation.error instanceof ApiError ? mutation.error.fields : undefined;
  return <Dialog open={open} onOpenChange={value => {
    if (mutation.isPending) return;
    if (value) { setName(user.displayName); setBio(user.bio ?? ""); setAvatar(user.avatarUrl ?? ""); setRole(user.primaryRole); setValidation(""); mutation.reset(); }
    setOpen(value);
  }}>
    <DialogTrigger asChild><Button variant="outline" size="sm"><Pencil size={16} />Редагувати профіль</Button></DialogTrigger>
    <DialogContent title="Твій профіль у спільноті" description="Зміни зберігаються у вашому обліковому записі на сервері.">
      <form className="profile-form" onSubmit={event => {
        event.preventDefault(); const parsed = formSchema.safeParse({ displayName: name, bio, avatarUrl: avatar, primaryRole: role });
        if (!parsed.success) { setValidation("Перевірте ім’я, довжину біографії та HTTPS-посилання на аватар."); return; }
        setValidation(""); mutation.mutate({ ...parsed.data, avatarUrl: parsed.data.avatarUrl || null }, { onSuccess: () => setOpen(false) });
      }}>
        <label htmlFor="api-profile-name">Ім’я та прізвище</label><Input id="api-profile-name" value={name} onChange={e => setName(e.target.value)} required minLength={2} maxLength={80} autoComplete="name" aria-invalid={!!fields?.displayName} />
        <label htmlFor="api-profile-bio">Кілька слів про себе</label><textarea id="api-profile-bio" value={bio} onChange={e => setBio(e.target.value)} maxLength={1000} rows={4} aria-invalid={!!fields?.bio} />
        <span className="field-hint">{bio.length}/1000 символів</span>
        <label htmlFor="api-profile-avatar">Посилання на аватар (HTTPS)</label><Input id="api-profile-avatar" type="url" value={avatar} onChange={e => setAvatar(e.target.value)} maxLength={2048} aria-invalid={!!fields?.avatarUrl} />
        <span className="field-hint">Залиште порожнім, щоб використовувати ініціали.</span>
        {user.roles.length > 1 && <><label htmlFor="api-primary-role">Основний простір</label><select id="api-primary-role" value={role} onChange={e => {
          const parsed = roleSchema.safeParse(e.target.value); if (parsed.success && user.roles.includes(parsed.data)) setRole(parsed.data);
        }}>{user.roles.map(r => <option key={r} value={r}>{roleLabels[r]}</option>)}</select></>}
        {(validation || mutation.isError) && <p className="error-message" role="alert">{validation || mutation.error?.message}</p>}
        <Button disabled={mutation.isPending} type="submit">{mutation.isPending ? "Зберігаємо…" : "Зберегти зміни"}</Button>
      </form>
    </DialogContent>
  </Dialog>;
}
