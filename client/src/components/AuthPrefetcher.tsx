import { trpc } from "@/lib/trpc";
import { useEffect } from "react";

/**
 * Prefetch auth.me as soon as the app loads, so when the user navigates to
 * /dashboard (directly or via redirect), the auth data is already available.
 * This reduces the loading skeleton duration and ensures the sidebar renders
 * correctly on first load.
 */
export function AuthPrefetcher() {
  const utils = trpc.useUtils();

  useEffect(() => {
    void utils.auth.me.prefetch(undefined, {
      staleTime: 5000,
    });
  }, [utils]);

  return null;
}
