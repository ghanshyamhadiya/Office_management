"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError() {
  return (
    <main className="flex min-h-[70dvh] items-center justify-center px-6 py-20">
      <div className="max-w-md rounded-lg border border-[var(--border)] bg-[var(--surface)] p-8 text-center shadow-[var(--shadow-md)]">
        <span className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-amber-50 text-amber-700"><AlertTriangle className="h-5 w-5" /></span>
        <h1 className="text-lg font-semibold">Something went wrong</h1>
        <p className="my-3 text-sm text-[var(--muted-foreground)]">We couldn’t load this page. The connection may be temporarily unavailable. Try again without signing out.</p>
        <Button onClick={() => window.location.reload()}><RefreshCw className="h-4 w-4" />Reload page</Button>
      </div>
    </main>
  );
}
