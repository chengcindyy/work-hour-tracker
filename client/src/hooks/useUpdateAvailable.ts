import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

const STORAGE_KEY = "app-last-known-version";
const clientVersion = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "0";

function getStoredVersion(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeVersion(version: string) {
  try {
    localStorage.setItem(STORAGE_KEY, version);
  } catch {}
}

async function fetchServerVersion(): Promise<{ version: string }> {
  const res = await fetch("/api/version", { cache: "no-store" });
  if (!res.ok) return { version: "0" };
  return res.json();
}

/**
 * 檢查是否有應用程式更新可用。
 * 兩種偵測途徑：
 * 1. localStorage 比對：上次訪問的版本 vs 當前 __APP_VERSION__（偵測「重開 app 後」的更新）
 * 2. server 比對：當前 __APP_VERSION__ vs server version（偵測「app 開啟中」的即時更新）
 */
export function useUpdateAvailable() {
  const [updatedFromStored, setUpdatedFromStored] = useState(() => {
    if (clientVersion === "0") return false;
    const stored = getStoredVersion();
    if (stored === null) {
      storeVersion(clientVersion);
      return false;
    }
    return stored !== clientVersion;
  });

  const { data, isLoading } = useQuery({
    queryKey: ["app-version"],
    queryFn: fetchServerVersion,
    staleTime: 0,
    refetchInterval: 2 * 60 * 1000,
    retry: 1,
  });

  const serverVersion = data?.version ?? "0";
  const liveUpdate = !isLoading && serverVersion !== "0" && serverVersion !== clientVersion;
  const hasUpdate = updatedFromStored || liveUpdate;

  const markUpdateAcknowledged = () => {
    storeVersion(clientVersion);
    setUpdatedFromStored(false);
  };

  return { hasUpdate, isLoading, markUpdateAcknowledged };
}
