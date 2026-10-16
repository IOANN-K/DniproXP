import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { repository } from "../mocks/repository";
const client = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false },
  },
});
export function Providers({ children }: { children: ReactNode }) {
  useEffect(
    () =>
      repository.subscribe(() => {
        void client.invalidateQueries();
      }),
    [],
  );
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
