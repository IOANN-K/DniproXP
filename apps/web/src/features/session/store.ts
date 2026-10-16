import { isApiMode } from "../../shared/api/config";
import { useApiSession } from "../auth/api/session";
import { useDemoSession } from "./demo-store";
export const useSession = isApiMode ? useApiSession : useDemoSession;
