import { createElement } from "react";
import { ApiPendingRoute, ApiEntryPage } from "./api-route-feedback";
import type { RouteObject } from "react-router-dom";
import { ApiProfilePage } from "../features/profile/api/profile-page";
import { isApiMode } from "../shared/api/config";
/** Copies route configuration, leaving layouts, responsive markup and PWA ownership intact. */
export function integrationRoutes(routes: RouteObject[]): RouteObject[] {
  if (!isApiMode) return routes;
  return routes.map(route => {
    if (route.path === "organizer") return { ...route, element: createElement(ApiPendingRoute) };
    if (route.children) return { ...route, children: integrationRoutes(route.children) };
    if (route.path === "login" || route.path === "register" || route.path === "*") return route;
    if (route.path === "profile" || route.path === "profile/:id") return { ...route, element: createElement(ApiProfilePage) };
    if (route.path === "passport" || route.path === "passport/:userId") return { ...route, element: createElement(ApiProfilePage, { passport: true }) };
    return { ...route, element: route.index ? createElement(ApiEntryPage) : createElement(ApiPendingRoute) };
  });
}
