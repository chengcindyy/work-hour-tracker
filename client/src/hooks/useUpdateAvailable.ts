import { useQuery } from "@tanstack/react-query";

const clientVersion = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "0";

async function fetchServerVersion(): Promise<{ version: string }> {
  const res = await fetch("/api/version", { cache: "no-store" });
  if (!res.ok) return { version: "0" };
  return res.json();
}

/**
 * 檢查是否有應用程式更新可用。
 * 比對客戶端版本（build 時注入）與伺服器版本。
 */
export function useUpdateAvailable() {
  const { data, isLoading } = useQuery({
    queryKey: ["app-version"],
    queryFn: fetchServerVersion,
    staleTime: 0, // 每次 mount / focus 都檢查
    refetchInterval: 2 * 60 * 1000, // 每 2 分鐘背景檢查
    retry: 1,
  });

  const serverVersion = data?.version ?? "0";
  const hasUpdate = !isLoading && serverVersion !== "0" && serverVersion !== clientVersion;

  return { hasUpdate, isLoading };
}
