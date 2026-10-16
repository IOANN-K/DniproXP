import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Pencil, Leaf, Heart, Sun, UserRound } from "lucide-react";
import type { VolunteerStats } from "../../entities/types";
import { profileApi } from "../../mocks/api";
import { Dialog, DialogContent, DialogTrigger } from "../../shared/ui/dialog";
import { Button } from "../../shared/ui/button";
import { Input } from "../../shared/ui/primitives";
export function EditProfileDialog({ user }: { user: VolunteerStats }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(user.name);
  const [bio, setBio] = useState(user.bio);
  const [avatar, setAvatar] = useState<string | null>(
    user.avatar === "initials" ? null : user.avatar,
  );
  const mutation = useMutation({
    mutationFn: () => profileApi.update(user.id, { name, bio, avatar }),
    onSuccess: () => setOpen(false),
  });
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (mutation.isPending) return;
        if (value) {
          setName(user.name);
          setBio(user.bio);
          setAvatar(user.avatar === "initials" ? null : user.avatar);
          mutation.reset();
        }
        setOpen(value);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil size={16} />
          Редагувати профіль
        </Button>
      </DialogTrigger>
      <DialogContent
        title="Твій профіль у спільноті"
        description="Зміни збережуться локально в цьому браузері."
      >
        <form
          className="profile-form"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <label htmlFor="profile-name">Ім’я та прізвище</label>
          <Input
            id="profile-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            minLength={2}
            maxLength={60}
            required
            autoComplete="name"
          />
          <label htmlFor="profile-bio">Кілька слів про себе</label>
          <textarea
            id="profile-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={500}
            rows={4}
          />
          <span className="field-hint">{bio.length}/500 символів</span>
          <fieldset className="avatar-options">
            <legend>Обери аватар</legend>
            {[
              { id: null, label: "Ініціали", icon: UserRound },
              { id: "leaf", label: "Листок", icon: Leaf },
              { id: "heart", label: "Серце", icon: Heart },
              { id: "sun", label: "Сонце", icon: Sun },
            ].map((a) => (
              <label
                key={a.label}
                className={avatar === a.id ? "selected" : ""}
              >
                <input
                  type="radio"
                  name="avatar"
                  value={a.id || "initials"}
                  checked={avatar === a.id}
                  onChange={() => setAvatar(a.id)}
                />
                <a.icon size={24} />
                <span>{a.label}</span>
              </label>
            ))}
          </fieldset>
          {mutation.isError && (
            <p className="error-message" role="alert">
              {mutation.error.message}
            </p>
          )}
          <Button
            type="submit"
            disabled={mutation.isPending || name.trim().length < 2}
          >
            {mutation.isPending ? "Зберігаємо…" : "Зберегти зміни"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
