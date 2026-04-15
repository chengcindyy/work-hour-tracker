import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";

type WorkersContextValue = {
  workers: any[]; // TRPC 型別推論自 hooks，這裡用 any 簡化前端型別依賴
  selectedWorkerId: number | null;
  setSelectedWorkerId: (id: number | null) => void;
  isLoading: boolean;
};

const WorkersContext = createContext<WorkersContextValue | undefined>(undefined);

const SELECTED_WORKER_KEY = "selected-worker-id";
let hasAppliedDefaultWorkerThisSession = false;

function readStoredWorkerId(): number | null {
  const stored = localStorage.getItem(SELECTED_WORKER_KEY);
  const parsed = stored ? parseInt(stored, 10) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

export function WorkersProvider({ children }: { children: React.ReactNode }) {
  const { data: workers = [], isLoading } = trpc.workers.list.useQuery();
  const { data: userPrefs, isLoading: userPrefsLoading } =
    trpc.userPreferences.get.useQuery();
  const [selectedWorkerId, setSelectedWorkerIdState] = useState<number | null>(() =>
    readStoredWorkerId()
  );

  // App 啟動時優先套用預設成員；同一個 SPA session 內切頁則維持手動選擇。
  useEffect(() => {
    if (isLoading || userPrefsLoading) {
      return;
    }

    if (!workers || workers.length === 0) {
      setSelectedWorkerIdState(null);
      localStorage.removeItem(SELECTED_WORKER_KEY);
      return;
    }

    const defaultWorkerId = userPrefs?.defaultWorkerId ?? null;
    const storedWorkerId = readStoredWorkerId();
    const hasSelectedWorker =
      selectedWorkerId != null && workers.some((worker) => worker.id === selectedWorkerId);
    const hasDefaultWorker =
      defaultWorkerId != null && workers.some((worker) => worker.id === defaultWorkerId);
    const hasStoredWorker =
      storedWorkerId != null && workers.some((worker) => worker.id === storedWorkerId);
    const fallbackWorkerId = hasStoredWorker
      ? storedWorkerId
      : hasDefaultWorker
        ? defaultWorkerId
        : (workers[0]?.id ?? null);

    if (!hasAppliedDefaultWorkerThisSession) {
      const initialWorkerId = hasDefaultWorker
        ? defaultWorkerId
        : hasStoredWorker
          ? storedWorkerId
          : (workers[0]?.id ?? null);
      hasAppliedDefaultWorkerThisSession = true;
      setSelectedWorkerIdState(initialWorkerId);
      if (initialWorkerId != null) {
        localStorage.setItem(SELECTED_WORKER_KEY, String(initialWorkerId));
      } else {
        localStorage.removeItem(SELECTED_WORKER_KEY);
      }
      return;
    }

    if (!hasSelectedWorker) {
      setSelectedWorkerIdState(fallbackWorkerId);
      if (fallbackWorkerId != null) {
        localStorage.setItem(SELECTED_WORKER_KEY, String(fallbackWorkerId));
      } else {
        localStorage.removeItem(SELECTED_WORKER_KEY);
      }
    }
  }, [workers, selectedWorkerId, isLoading, userPrefs, userPrefsLoading]);

  const setSelectedWorkerId = (id: number | null) => {
    setSelectedWorkerIdState(id);
    if (id == null) {
      localStorage.removeItem(SELECTED_WORKER_KEY);
    } else {
      localStorage.setItem(SELECTED_WORKER_KEY, String(id));
    }
  };

  const value: WorkersContextValue = useMemo(
    () => ({
      workers,
      selectedWorkerId,
      setSelectedWorkerId,
      isLoading,
    }),
    [workers, selectedWorkerId, isLoading]
  );

  return <WorkersContext.Provider value={value}>{children}</WorkersContext.Provider>;
}

export function useWorkerSelection() {
  const ctx = useContext(WorkersContext);
  if (!ctx) {
    throw new Error("useWorkerSelection must be used within a WorkersProvider");
  }
  return ctx;
}

