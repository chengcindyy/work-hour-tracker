import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Bell, Download, Save } from "lucide-react";

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
  const { data: notificationSettings } = trpc.notifications.getSettings.useQuery();
  const updateNotificationsMutation = trpc.notifications.updateSettings.useMutation();
  const { data: workRecords } = trpc.workRecords.list.useQuery({});
  const utils = trpc.useUtils();

  const [isEnabled, setIsEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("09:00");
  const [reminderDays, setReminderDays] = useState<number[]>([1, 2, 3, 4, 5]);

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

  const handleExportAllData = () => {
    if (!workRecords || workRecords.length === 0) {
      toast.error("無數據可匯出");
      return;
    }

    try {
      let csv = "工時紀錄完整備份\n\n";
      csv += "日期,店家,服務類型,時數,時薪,小費,總收入,備註\n";

      workRecords.forEach((record) => {
        const workDate = new Date(record.workDate).toLocaleDateString("zh-TW");
        csv += `${workDate},"${record.shopId}","${record.serviceTypeId}",${parseFloat(record.hours as any)},${parseFloat(record.hourlyPay as any)},${parseFloat(record.tips as any)},${parseFloat(record.totalEarnings as any)},"${record.notes || ""}"\n`;
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
