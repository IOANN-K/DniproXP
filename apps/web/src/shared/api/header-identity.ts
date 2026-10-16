import { useSession } from "../../features/session/store";
import { useVolunteer } from "../lib/use-volunteer";
import { isApiMode } from "./config";
function useApiHeaderIdentity() {
  const user = useSession(s => s.user);
  return user ? { name: user.name, initials: user.initials, avatar: user.avatar ?? "initials" } : null;
}
export const useHeaderIdentity = isApiMode ? useApiHeaderIdentity : useVolunteer;
