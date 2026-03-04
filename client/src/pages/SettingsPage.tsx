import { useState, useEffect } from "react";
import { useWorkerSelection } from "@/_core/hooks/useWorkers";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { TRPCClientError } from "@trpc/client";
import { Bell, Download, Save, UserPlus } from "lucide-react";

const DAYS_OF_WEEK = [
  { value: 0, label: "周日" },
  { value: 1, label: "周一" },
  { value: 2, label: "周二" },
  { value: 3, label: "周三" },
  { value: 4, label: "周四" },
  { value: 5, label: "周五" },
  { value: 6, label: "周六" },
];

export default function SettingsPage() {
  const { selectedWorkerId, workers, setSelectedWorkerId } = useWorkerSelection();
  const { data: notificationSettings } = trpc.notifications.getSettings.useQuery();
  const updateNotificationsMutation = trpc.notifications.updateSettings.useMutation();
  const { data: workRecords } = trpc.workRecords.list.useQuery(
    {
      workerId: selectedWorkerId ?? undefined,
    },
    {
      enabled: selectedWorkerId != null,
    }
  );
  const utils = trpc.useUtils();

  const createWorkerMutation = trpc.workers.create.useMutation();
  const updateWorkerMutation = trpc.workers.update.useMutation();
  const archiveWorkerMutation = trpc.workers.archive.useMutation();

  const [isEnabled, setIsEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("09:00");
  const [reminderDays, setReminderDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [newWorkerName, setNewWorkerName] = useState("");
  /** 正在重新命名的成員 id，非 null 時該列顯示輸入框 */
  const [editingWorkerId, setEditingWorkerId] = useState<number | null>(null);
  const [editingWorkerName, setEditingWorkerName] = useState("");

  useEffect(() => {
    if (notificationSettings) {
      setIsEnabled(notificationSettings.isEnabled);
      setReminderTime(notificationSettings.reminderTime);
      try {
        setReminderDays(JSON.parse(notificationSettings.reminderDays));
      } catch {
        setReminderDays([1, 2, 3, 4, 5]);
      }
    }
  }, [notificationSettings]);

  const handleToggleDay = (day: number) => {
    setReminderDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const handleSaveNotifications = async () => {
    try {
      await updateNotificationsMutation.mutateAsync({
        isEnabled,
        reminderTime,
        reminderDays,
      });
      utils.notifications.getSettings.invalidate();
      toast.success("推播設定已保存");
    } catch (error) {
      toast.error("保存失敗，請重試");
    }
  };

  const handleSaveRename = async (workerId: number) => {
    const name = editingWorkerName.trim();
    if (!name) {
      toast.error("請輸入成員名稱");
      return;
    }
    try {
      await updateWorkerMutation.mutateAsync({
        workerId: Number(workerId),
        name,
      });
      await utils.workers.list.invalidate();
      setEditingWorkerId(null);
      setEditingWorkerName("");
      toast.success("成員名稱已更新");
    } catch (err: unknown) {
      const msg =
        err instanceof TRPCClientError
          ? err.message
          : err && typeof err === "object" && "message" in err
            ? String((err as { message: unknown }).message)
            : "";
      toast.error(msg || "更新成員名稱失敗");
    }
  };

  const handleExportAllData = () => {
    if (!selectedWorkerId) {
      toast.error("請先選擇成員再匯出資料");
      return;
    }

    if (!workRecords || workRecords.length === 0) {
      toast.error("此成員目前無數據可匯出");
      return;
    }

    try {
      let csv = "工時紀錄完整備份\n\n";
      csv += "日期,店家,服務類型,時數,時薪,現金小費,刷卡小費,項目收入,備註\n";

      workRecords.forEach((record) => {
        const workDate = new Date(record.workDate).toLocaleDateString("zh-TW");
        const cashTips = parseFloat((record as any).cashTips as any) || 0;
        const cardTips = parseFloat((record as any).cardTips as any) || 0;
        const rec = record as typeof record & { lineItems?: { serviceTypeId: number; hours: number; hourlyPay: number; serviceTypeName?: string }[] };
        if (rec.lineItems && rec.lineItems.length > 0) {
          rec.lineItems.forEach((li, i) => {
            const itemEarnings = li.hours * li.hourlyPay;
            csv += `${workDate},"${record.shopId}","${li.serviceTypeName ?? li.serviceTypeId}",${li.hours},${li.hourlyPay},${i === 0 ? cashTips : 0},${i === 0 ? cardTips : 0},${itemEarnings},"${i === 0 ? (record.notes || "") : ""}"\n`;
          });
        } else {
          const hours = record.hours != null ? parseFloat(record.hours as any) : 0;
          const hourlyPay = record.hourlyPay != null ? parseFloat(record.hourlyPay as any) : 0;
          csv += `${workDate},"${record.shopId}","${record.serviceTypeId}",${hours},${hourlyPay},${cashTips},${cardTips},${hours * hourlyPay},"${record.notes || ""}"\n`;
        }
      });

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `work-records-${new Date().toISOString().split("T")[0]}.csv`);
      link.click();
      toast.success("數據已匯出");
    } catch (error) {
      toast.error("匯出失敗");
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">設定</h1>

      {/* 成員管理 */}
      <Card className="p-4 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <UserPlus className="w-6 h-6 text-primary shrink-0" />
            <h2 className="text-2xl font-semibold text-foreground">成員管理</h2>
          </div>
          {workers.length > 0 && selectedWorkerId != null && (
            <div className="text-sm text-muted-foreground truncate">
              目前選擇：{" "}
              <span className="font-medium text-foreground">
                {workers.find(w => w.id === selectedWorkerId)?.name ?? "-"}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="font-medium text-foreground">已建立的成員</div>
            {workers.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                尚未建立任何成員，建議先建立兩個成員，例如「自己」與「先生」，之後即可在右上角切換。
              </p>
            ) : (
              <div className="space-y-2">
                {workers.map(worker => {
                  const isEditing = editingWorkerId === worker.id;
                  return (
                    <div
                      key={worker.id}
                      className="flex flex-col gap-3 p-3 rounded-md border border-border/60 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                    >
                      {isEditing ? (
                        <>
                          <Input
                            className="w-full sm:max-w-[200px]"
                            value={editingWorkerName}
                            onChange={e => setEditingWorkerName(e.target.value)}
                            placeholder="成員名稱"
                            onKeyDown={e => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                void handleSaveRename(worker.id);
                              }
                              if (e.key === "Escape") {
                                setEditingWorkerId(null);
                                setEditingWorkerName("");
                              }
                            }}
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              disabled={
                                !editingWorkerName.trim() ||
                                editingWorkerName.trim() === worker.name ||
                                updateWorkerMutation.isPending
                              }
                              onClick={() => handleSaveRename(worker.id)}
                            >
                              儲存
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingWorkerId(null);
                                setEditingWorkerName("");
                              }}
                            >
                              取消
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="min-w-0">
                            <div className="font-medium text-foreground truncate">{worker.name}</div>
                            {selectedWorkerId === worker.id && (
                              <div className="text-xs text-primary mt-1">目前選擇的成員</div>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 shrink-0">
                            <Button
                              size="sm"
                              variant={selectedWorkerId === worker.id ? "default" : "outline"}
                              onClick={() => setSelectedWorkerId(worker.id)}
                            >
                              設為目前成員
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-muted-foreground"
                              onClick={() => {
                                setEditingWorkerId(worker.id);
                                setEditingWorkerName(worker.name);
                              }}
                            >
                              重新命名
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={async () => {
                                if (
                                  !window.confirm(
                                    "確定要停用此成員嗎？相關工時仍會保留，但無法再選擇為目前成員。"
                                  )
                                ) {
                                  return;
                                }
                                try {
                                  await archiveWorkerMutation.mutateAsync({
                                    workerId: worker.id,
                                  });
                                  if (selectedWorkerId === worker.id) {
                                    setSelectedWorkerId(null);
                                  }
                                  await utils.workers.list.invalidate();
                                  toast.success("成員已停用");
                                } catch {
                                  toast.error("停用成員失敗");
                                }
                              }}
                            >
                              停用
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-border/60 pt-4 space-y-3">
            <div className="font-medium text-foreground">新增成員</div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder="例如：自己、先生、小幫手 A"
                value={newWorkerName}
                onChange={e => setNewWorkerName(e.target.value)}
              />
              <Button
                onClick={async () => {
                  const name = newWorkerName.trim();
                  if (!name) {
                    toast.error("請輸入成員名稱");
                    return;
                  }
                  try {
                    const created = await createWorkerMutation.mutateAsync({ name });
                    setNewWorkerName("");
                    await utils.workers.list.invalidate();
                    // 若尚未選擇成員，新增後預設選中
                    if (!selectedWorkerId) {
                      setSelectedWorkerId(created.id);
                    }
                    toast.success("已新增成員");
                  } catch {
                    toast.error("新增成員失敗，請重試");
                  }
                }}
                disabled={createWorkerMutation.isPending}
                className="sm:w-auto w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                新增成員
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* 推播通知設定 */}
      <Card className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-semibold text-foreground">推播通知</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-foreground">啟用推播通知</div>
              <div className="text-sm text-muted-foreground">
                接收每日工時登記提醒
              </div>
            </div>
            <Switch
              checked={isEnabled}
              onCheckedChange={setIsEnabled}
            />
          </div>

          {isEnabled && (
            <>
              <div className="form-group">
                <label className="form-label">提醒時間</label>
                <Input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">提醒日期</label>
                <div className="grid grid-cols-7 gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <button
                      key={day.value}
                      onClick={() => handleToggleDay(day.value)}
                      className={`p-2 rounded text-sm font-medium transition-colors ${
                        reminderDays.includes(day.value)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleSaveNotifications}
                disabled={updateNotificationsMutation.isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Save className="w-4 h-4 mr-2" />
                保存設定
              </Button>
            </>
          )}
        </div>
      </Card>

      {/* 數據匯出 */}
      <Card className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Download className="w-6 h-6 text-secondary" />
          <h2 className="text-2xl font-semibold text-foreground">數據匯出</h2>
        </div>

        <div className="space-y-4">
          <div>
            <div className="font-medium text-foreground">匯出所有工時紀錄</div>
            <div className="text-sm text-muted-foreground">
              將所有工時紀錄匯出為 CSV 檔案，用於備份或進一步分析
            </div>
          </div>

          <Button
            onClick={handleExportAllData}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            匯出 CSV
          </Button>
        </div>
      </Card>

      {/* 關於應用 */}
      <Card className="p-6 space-y-4 bg-muted/30">
        <h2 className="text-xl font-semibold text-foreground">關於應用</h2>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">應用名稱：</span>
            工時登記系統
          </p>
          <p>
            <span className="font-medium text-foreground">版本：</span>
            1.0.0
          </p>
          <p>
            <span className="font-medium text-foreground">功能：</span>
            為按摩師和兼職工作者設計的工時登記和統計系統
          </p>
          <p className="pt-2">
            本應用支持 PWA 技術，可在離線狀態下使用。您的所有數據都安全地存儲在服務器上。
          </p>
        </div>
      </Card>

      {/* PWA 安裝提示 */}
      <Card className="p-6 space-y-4 bg-secondary/10 border-secondary/30">
        <h2 className="text-xl font-semibold text-foreground">安裝應用</h2>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            您可以將此應用安裝到您的設備上，以便隨時隨地快速訪問。
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>
              <span className="font-medium text-foreground">iOS：</span>
              打開 Safari，點擊分享按鈕，選擇「加入主畫面」
            </li>
            <li>
              <span className="font-medium text-foreground">Android：</span>
              打開 Chrome，點擊菜單，選擇「安裝應用」
            </li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
