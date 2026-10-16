import { isApiMode } from "../shared/api/config";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, ShieldCheck, Waves } from "lucide-react";
import {
  authAdapter,
  DEMO_CODE,
  roleHome,
} from "../features/auth/auth-adapter";
import type { RegistrationInput } from "../entities/types";
import { Button } from "../shared/ui/button";
import { Input, Card, Badge } from "../shared/ui/primitives";
import { DemoSwitcher } from "../features/auth/demo-switcher";
export function AuthPage({ register = false }: { register?: boolean }) {
  const [email, setEmail] = useState(register || isApiMode ? "" : "volunteer@dniproxp.demo");
  const [code, setCode] = useState(isApiMode ? "" : DEMO_CODE);
  const [name, setName] = useState("");
  const [org, setOrg] = useState("");
  const [role, setRole] = useState<RegistrationInput["role"]>("VOLUNTEER");
  const navigate = useNavigate();
  const location = useLocation();
  const mutation = useMutation({
    mutationFn: () =>
      register
        ? authAdapter.register({
            name,
            email,
            code,
            role,
            organizationName: org,
          })
        : authAdapter.login(email, code),
    onSuccess: (user) => {
      const from = (location.state as { from?: string } | null)?.from;
      const valid =
        typeof from === "string" &&
        from.startsWith("/") &&
        !from.startsWith("//") &&
        ((user.role === "VOLUNTEER" &&
          !from.startsWith("/organizer") &&
          !from.startsWith("/admin")) ||
          (user.role === "ORGANIZER" && from.startsWith("/organizer")) ||
          (user.role === "ADMIN" && from.startsWith("/admin")));
      navigate(valid ? from : roleHome(user.role), { replace: true });
    },
  });
  return (
    <div className="container auth-page">
      <div className="auth-story">
        <Badge>
          <Waves size={15} />
          ДНІПРО ПОЧИНАЄТЬСЯ З ТЕБЕ
        </Badge>
        <h1>
          {register
            ? "У добрих справ з’являється нове ім’я."
            : "Твої добрі справи продовжуються тут."}
        </h1>
        <p>
          Знаходь команду, допомагай місту й відчувай, як твій внесок зростає.
        </p>
        <div className="auth-demo-note">
          <ShieldCheck size={25} />
          <div>
            <strong>{isApiMode ? "Захищена серверна сесія" : "Це демонстраційна авторизація"}</strong>
            <p>
              {isApiMode ? "Увійди за поштою та паролем. Доступ до організацій і ролей визначає сервер." : "Усі облікові записи локальні. Використовуй вигадану пошту та спільний демокод, а не справжній пароль."}
            </p>
          </div>
        </div>
        <DemoSwitcher />
      </div>
      <Card className="auth-card">
        <h2>
          {register ? "Долучитися до спільноти" : "Раді бачити тебе знову"}
        </h2>
        <p>
          {isApiMode ? (register ? "Створи обліковий запис волонтера." : "Увійди у свій обліковий запис DniproXP.") : register ? "Створи локальний демонстраційний профіль." : "Увійди в готовий або створений тобою демообліковий запис."}
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="profile-form"
        >
          {register && (
            <>
              <label htmlFor="auth-name">Ім’я та прізвище</label>
              <Input
                id="auth-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                minLength={2}
                maxLength={isApiMode ? 80 : 60}
              />
              {!isApiMode && <>
              <label htmlFor="auth-role">Твоя роль</label>
              <select
                id="auth-role"
                value={role}
                onChange={(e) =>
                  setRole(e.target.value as RegistrationInput["role"])
                }
              >
                <option value="VOLUNTEER">Волонтер</option>
                <option value="ORGANIZER">Організатор</option>
              </select>
              {role === "ORGANIZER" && (
                <>
                  <label htmlFor="auth-org">Назва організації</label>
                  <Input
                    id="auth-org"
                    value={org}
                    onChange={(e) => setOrg(e.target.value)}
                    minLength={3}
                    maxLength={80}
                    required
                  />
                  <p className="field-hint">
                    Організація зможе публікувати квести після схвалення
                    адміністратором демоплатформи.
                  </p>
                </>
              )}
              </>}
            </>
          )}
          <label htmlFor="auth-email">{isApiMode ? "Електронна пошта" : "Електронна пошта для демопрофілю"}</label>
          <Input
            id="auth-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            maxLength={isApiMode ? 254 : 100}
            autoComplete={isApiMode ? "username" : "off"}
          />
          <label htmlFor="auth-code">{isApiMode ? "Пароль" : "Демонстраційний код"}</label>
          <Input
            id="auth-code"
            type={isApiMode ? "password" : "text"}
            minLength={isApiMode ? 12 : undefined}
            maxLength={isApiMode ? 128 : undefined}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            autoComplete={isApiMode ? (register ? "new-password" : "current-password") : "off"}
          />
          {!isApiMode && <span className="field-hint">Спільний код: {DEMO_CODE}</span>}
          {mutation.isError && (
            <p className="error-message" role="alert">
              {mutation.error.message}
            </p>
          )}
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending
              ? "Зберігаємо…"
              : register
                ? (isApiMode ? "Створити профіль" : "Створити демопрофіль")
                : "Увійти"}
            <ArrowRight size={17} />
          </Button>
        </form>
        <p className="auth-switch">
          {register ? (isApiMode ? "Уже маєш профіль?" : "Уже маєш демопрофіль?") : "Ще не долучався?"}{" "}
          <Link to={register ? "/login" : "/register"}>
            {register ? "Увійти" : "Зареєструватися"}
          </Link>
        </p>
      </Card>
    </div>
  );
}
