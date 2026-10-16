import { isApiMode } from "../../shared/api/config";
import { apiAuthAdapter } from "./api/session";
import { authAdapter as demoAuthAdapter } from "./mock-auth-adapter";
import type { Role } from "../../entities/types";
export { DEMO_CODE } from "./mock-auth-adapter";
export const authAdapter = isApiMode ? apiAuthAdapter : demoAuthAdapter;
export const roleHome = (role: Role) => isApiMode ? "/profile" : role === "ORGANIZER" ? "/organizer" : role === "ADMIN" ? "/admin" : "/dashboard";
