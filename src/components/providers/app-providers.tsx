"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { MotionConfig } from "framer-motion";
import { useState } from "react";
import { Toaster } from "sonner";
import { useTheme } from "@/components/theme/theme";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 20_000,
            retry: 1
          }
        }
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
      <Toaster closeButton position="top-right" richColors theme={theme} toastOptions={{ className: "rounded-lg" }} />
      {process.env.NEXT_PUBLIC_QUERY_DEVTOOLS === "true" ? <ReactQueryDevtools initialIsOpen={false} /> : null}
    </QueryClientProvider>
  );
}
