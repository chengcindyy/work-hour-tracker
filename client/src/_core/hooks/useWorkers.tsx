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

export function WorkersProvider({ children }: { children: React.ReactNode }) {
  const { data: workers = [], isLoading } = trpc.workers.list.useQuery();
  const [selectedWorkerId, setSelectedWorkerIdState] = useState<number | null>(() => {
    const stored = localStorage.getItem(SELECTED_WORKER_KEY);
    const parsed = stored ? parseInt(stored, 10) : NaN;
    return Number.isFinite(parsed) ? parsed : null;
  });

  // 當 workers 清單或目前選中的 worker 改變時，確保 selectedWorkerId 合法
  useEffect(() => {
    if (!workers || workers.length === 0) {
      setSelectedWorkerIdState(null);
      localStorage.removeItem(SELECTED_WORKER_KEY);
      return;
    }

    const exists = workers.some(w => w.id === selectedWorkerId);
    if (!exists) {
      const firstId = workers[0]?.id ?? null;
      setSelectedWorkerIdState(firstId ?? null);
      if (firstId != null) {
        localStorage.setItem(SELECTED_WORKER_KEY, String(firstId));
      } else {
        localStorage.removeItem(SELECTED_WORKER_KEY);
      }
    }
  }, [workers, selectedWorkerId]);

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

