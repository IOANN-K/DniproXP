import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { repository } from "../mocks/repository";
import { isApiMode } from "../shared/api/config";
import { apiQueryClient } from "../shared/api/query-client";
import { ApiSessionBootstrap } from "../features/auth/api/bootstrap";
const demoClient = new QueryClient({ defaultOptions: { queries: { staleTime: 60000, retry: 1, refetchOnWindowFocus: false } } });
export function Providers({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (isApiMode) return;
    return repository.subscribe(() => { void demoClient.invalidateQueries(); });
  }, []);
  return <QueryClientProvider client={isApiMode ? apiQueryClient : demoClient}>
    {isApiMode && <ApiSessionBootstrap />}{children}
  </QueryClientProvider>;
}
