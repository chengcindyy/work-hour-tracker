import { useEffect, useMemo, useState } from "react";
import { useWorkerSelection } from "@/_core/hooks/useWorkers";
import { useAppPreferences } from "@/contexts/AppPreferencesContext";
import type { AppLocale } from "@/i18n/config";
import { SUPPORTED_LOCALES } from "@/i18n/config";
import { SUPPORTED_DISPLAY_CURRENCIES } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useUpdateAvailable } from "@/hooks/useUpdateAvailable";
import { formatWorkDateSlash } from "@/lib/vancouverTime";
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import {
  Bell,
  ChevronDown,
  Download,
  Globe,
  Info,
  RefreshCw,
  Save,
  Smartphone,
  Store,
  UserPlus,
} from "lucide-react";
import { ShopsManager } from "@/pages/ShopsPage";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { applyFromServer, currencyCode: displayCurrencyCode } = useAppPreferences();
  const daysOfWeek = useMemo(
    () =>
      [0, 1, 2, 3, 4, 5, 6].map((value) => ({
        value,
        label: t(`day.${value}`),
      })),
    [t]
  );

  const { selectedWorkerId, workers, setSelectedWorkerId } = useWorkerSelection();
  const { hasUpdate, markUpdateAcknowledged } = useUpdateAvailable();
  const { data: notificationSettings } = trpc.notifications.getSettings.useQuery();
  const updateNotificationsMutation = trpc.notifications.updateSettings.useMutation();
  const savePushSubscriptionMutation = trpc.notifications.savePushSubscription.useMutation();
  const { data: vapidData } = trpc.notifications.getVapidPublicKey.useQuery();
  const { data: workRecords } = trpc.workRecords.list.useQuery(
    {
      workerId: selectedWorkerId ?? undefined,
    },
    {
      enabled: selectedWorkerId != null,
    }
  );
  const utils = trpc.useUtils();

  const { data: userPrefs, isLoading: userPrefsLoading } =
    trpc.userPreferences.get.useQuery();
  const updateUserPrefsMutation = trpc.userPreferences.update.useMutation({
    onSuccess: (data) => {
      applyFromServer({
        uiLocale: (data.uiLocale === "en" ? "en" : "zh-TW") as AppLocale,
        currencyCode: data.currencyCode,
      });
      void utils.userPreferences.get.invalidate();
      toast.success(t("settings.toastPreferencesSaved"));
    },
    onError: () => {
      toast.error(t("settings.toastSaveFailed"));
    },
  });

  const createWorkerMutation = trpc.workers.create.useMutation();
  const updateWorkerMutation = trpc.workers.update.useMutation();
  const archiveWorkerMutation = trpc.workers.archive.useMutation();

  const [isEnabled, setIsEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("09:00");
  const [reminderDays, setReminderDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [newWorkerName, setNewWorkerName] = useState("");
  const [editingWorkerId, setEditingWorkerId] = useState<number | null>(null);
  const [editingWorkerName, setEditingWorkerName] = useState("");
  const [shopsSectionOpen, setShopsSectionOpen] = useState(
    () => typeof window !== "undefined" && window.location.hash === "#shops"
  );

  useEffect(() => {
    const syncShopsHash = () => {
      if (window.location.hash === "#shops") {
        setShopsSectionOpen(true);
      }
    };
    syncShopsHash();
    window.addEventListener("hashchange", syncShopsHash);
    return () => window.removeEventListener("hashchange", syncShopsHash);
  }, []);

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

  const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    const outputArray = new Uint8Array(new ArrayBuffer(rawData.length));
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribeToPush = async (): Promise<boolean> => {
    if (!vapidData?.publicKey) {
      toast.error(t("settings.toastPushNotConfigured"));
      return false;
    }
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      toast.error(t("settings.toastPushUnsupported"));
      return false;
    }
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      toast.error(t("settings.toastPushDenied"));
      return false;
    }
    try {
      const reg = await navigator.serviceWorker.ready;
      const applicationServerKey =
        urlBase64ToUint8Array(vapidData.publicKey) as BufferSource;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey,
      });
      const subscription = sub.toJSON();
      const p256dh = subscription.keys?.p256dh;
      const auth = subscription.keys?.auth;
      if (subscription.endpoint && p256dh && auth) {
        await savePushSubscriptionMutation.mutateAsync({
          endpoint: subscription.endpoint,
          keys: { p256dh: p256dh, auth },
        });
        return true;
      }
      toast.error(t("settings.toastPushBadPayload"));
      return false;
    } catch (err) {
      console.error("[Push] Subscribe failed:", err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(t("settings.toastPushSubscribeFail", { msg }));
      return false;
    }
  };

  const handleSaveNotifications = async () => {
    try {
      await updateNotificationsMutation.mutateAsync({
        isEnabled,
        reminderTime,
        reminderDays,
      });
      utils.notifications.getSettings.invalidate();
      if (isEnabled) {
        const ok = await subscribeToPush();
        if (ok) {
          toast.success(t("settings.toastNotificationsSaved"));
        } else {
          toast.warning(t("settings.toastNotificationsSavedNoSub"));
        }
      } else {
        toast.success(t("settings.toastNotificationsSaved"));
      }
    } catch {
      toast.error(t("settings.toastSaveFailed"));
    }
  };

  const handleSaveRename = async (workerId: number) => {
    const name = editingWorkerName.trim();
    if (!name) {
      toast.error(t("settings.toastWorkerNameRequired"));
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
      toast.success(t("settings.toastWorkerRenamed"));
    } catch (err: unknown) {
      const msg =
        err instanceof TRPCClientError
          ? err.message
          : err && typeof err === "object" && "message" in err
            ? String((err as { message: unknown }).message)
            : "";
      toast.error(msg || t("settings.toastWorkerRenameFail"));
    }
  };

  const handleExportAllData = () => {
    if (!selectedWorkerId) {
      toast.error(t("settings.toastExportNeedWorker"));
      return;
    }

    if (!workRecords || workRecords.length === 0) {
      toast.error(t("settings.toastExportNoData"));
      return;
    }

    try {
      let csv = `${t("settings.exportCsvTitle")}\n\n`;
      csv += `${t("settings.exportCsvHeader")}\n`;

      workRecords.forEach((record) => {
        const workDate = formatWorkDateSlash(record.workDate as string);
        const cashTips = parseFloat((record as any).cashTips as any) || 0;
        const cardTips = parseFloat((record as any).cardTips as any) || 0;
        const rec = record as typeof record & {
          lineItems?: {
            serviceTypeId: number;
            hours: number;
            hourlyPay: number;
            serviceTypeName?: string;
          }[];
        };
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
      toast.success(t("settings.toastExported"));
    } catch {
      toast.error(t("settings.toastExportFail"));
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-foreground">{t("settings.title")}</h1>

      <Collapsible defaultOpen={false} className="group">
        <Card
          className={
            hasUpdate
              ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
              : ""
          }
        >
          <CollapsibleTrigger asChild>
            <button type="button" className="flex w-full items-center justify-between px-4 py-4 text-left">
              <div className="flex items-center gap-3 min-w-0">
                <RefreshCw className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <h2 className="font-semibold text-foreground">{t("settings.checkUpdateTitle")}</h2>
                  <p className="text-sm text-muted-foreground">
                    {hasUpdate ? t("settings.checkUpdateHasNew") : t("settings.checkUpdateUpToDate")}
                  </p>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180 shrink-0" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-t px-4 pt-3 pb-4">
              <p className="text-sm text-muted-foreground mb-3">{t("settings.checkUpdateHelp")}</p>
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    markUpdateAcknowledged();
                    const reg = await navigator.serviceWorker.getRegistration();
                    if (reg) {
                      await reg.unregister();
                    }
                    window.location.reload();
                  } catch {
                    window.location.reload();
                  }
                }}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                {t("settings.checkUpdateButton")}
              </Button>
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Collapsible defaultOpen={false} className="group">
        <Card>
          <CollapsibleTrigger asChild>
            <button type="button" className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left">
              <div className="flex items-center gap-3 min-w-0">
                <UserPlus className="h-5 w-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <h2 className="font-semibold text-foreground">{t("settings.workersTitle")}</h2>
                  <p className="text-sm text-muted-foreground">{t("settings.workersCollapsibleHint")}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {workers.length > 0 && selectedWorkerId != null && (
                  <span className="text-xs text-muted-foreground max-w-[140px] truncate hidden sm:inline">
                    {workers.find((w) => w.id === selectedWorkerId)?.name ?? "-"}
                  </span>
                )}
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180 shrink-0" />
              </div>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-t px-4 pt-4 pb-4 space-y-4">
          <div className="space-y-2">
            <div className="font-medium text-foreground">{t("settings.workersListLabel")}</div>
            {workers.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("settings.workersEmpty")}</p>
            ) : (
              <div className="space-y-2">
                {workers.map((worker) => {
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
                            onChange={(e) => setEditingWorkerName(e.target.value)}
                            placeholder={t("settings.workerNamePlaceholder")}
                            onKeyDown={(e) => {
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
                              {t("common.save")}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingWorkerId(null);
                                setEditingWorkerName("");
                              }}
                            >
                              {t("common.cancel")}
                            </Button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="min-w-0">
                            <div className="font-medium text-foreground truncate">{worker.name}</div>
                            {selectedWorkerId === worker.id && (
                              <div className="text-xs text-primary mt-1">{t("settings.workerSelectedBadge")}</div>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-2 shrink-0">
                            <Button
                              size="sm"
                              variant={selectedWorkerId === worker.id ? "default" : "outline"}
                              onClick={() => setSelectedWorkerId(worker.id)}
                            >
                              {t("settings.selectThisWorker")}
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
                              {t("settings.rename")}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={async () => {
                                if (!window.confirm(t("settings.archiveConfirm"))) {
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
                                  toast.success(t("settings.toastWorkerRemoved"));
                                } catch {
                                  toast.error(t("settings.toastWorkerRemoveFail"));
                                }
                              }}
                            >
                              {t("settings.removeWorker")}
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
            <div className="font-medium text-foreground">{t("settings.addWorkerSection")}</div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                placeholder={t("settings.addWorkerPlaceholder")}
                value={newWorkerName}
                onChange={(e) => setNewWorkerName(e.target.value)}
              />
              <Button
                onClick={async () => {
                  const name = newWorkerName.trim();
                  if (!name) {
                    toast.error(t("settings.toastWorkerNameRequired"));
                    return;
                  }
                  try {
                    const created = await createWorkerMutation.mutateAsync({ name });
                    setNewWorkerName("");
                    await utils.workers.list.invalidate();
                    if (!selectedWorkerId) {
                      setSelectedWorkerId(created.id);
                    }
                    toast.success(t("settings.toastWorkerAdded"));
                  } catch {
                    toast.error(t("settings.toastWorkerAddFail"));
                  }
                }}
                disabled={createWorkerMutation.isPending}
                className="sm:w-auto w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {t("settings.addWorkerButton")}
              </Button>
            </div>
          </div>
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Collapsible open={shopsSectionOpen} onOpenChange={setShopsSectionOpen} className="group">
        <Card>
          <CollapsibleTrigger asChild>
            <button type="button" className="flex w-full items-center justify-between px-4 py-4 text-left">
              <div className="flex items-center gap-3 min-w-0">
                <Store className="h-5 w-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <h2 className="font-semibold text-foreground">{t("settings.shopsSectionTitle")}</h2>
                  <p className="text-sm text-muted-foreground">{t("settings.shopsSectionHint")}</p>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180 shrink-0" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-t px-4 pt-4 pb-4">
              <ShopsManager variant="embedded" />
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Collapsible defaultOpen={false} className="group">
        <Card>
          <CollapsibleTrigger asChild>
            <button type="button" className="flex w-full items-center justify-between px-4 py-4 text-left">
              <div className="flex items-center gap-3 min-w-0">
                <Globe className="h-5 w-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <h2 className="font-semibold text-foreground">{t("settings.languageSection")}</h2>
                  <p className="text-sm text-muted-foreground">{t("settings.languageCollapsibleHint")}</p>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180 shrink-0" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-t px-4 pt-4 pb-4 space-y-5">
              <p className="text-sm text-muted-foreground">{t("settings.languageHint")}</p>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <Label htmlFor="settings-lang" className="text-sm text-muted-foreground shrink-0">
                  {t("language.label")}
                </Label>
                <Select
                  value={
                    userPrefs?.uiLocale ??
                    (i18n.language === "en" ? "en" : "zh-TW")
                  }
                  disabled={userPrefsLoading || updateUserPrefsMutation.isPending}
                  onValueChange={(v) => {
                    void updateUserPrefsMutation.mutateAsync({
                      uiLocale: v as AppLocale,
                    });
                  }}
                >
                  <SelectTrigger id="settings-lang" className="w-full sm:w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_LOCALES.map((code) => (
                      <SelectItem key={code} value={code}>
                        {code === "zh-TW" ? t("language.zhTW") : t("language.en")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-1 border-t border-border/60">
                <Label htmlFor="settings-currency" className="text-sm text-muted-foreground shrink-0">
                  {t("settings.currencyLabel")}
                </Label>
                <Select
                  value={userPrefs?.currencyCode ?? displayCurrencyCode}
                  disabled={userPrefsLoading || updateUserPrefsMutation.isPending}
                  onValueChange={(v) => {
                    void updateUserPrefsMutation.mutateAsync({
                      currencyCode: v as (typeof SUPPORTED_DISPLAY_CURRENCIES)[number],
                    });
                  }}
                >
                  <SelectTrigger id="settings-currency" className="w-full sm:w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUPPORTED_DISPLAY_CURRENCIES.map((code) => (
                      <SelectItem key={code} value={code}>
                        {t(`settings.currency.${code}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-muted-foreground">{t("settings.currencyHint")}</p>
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Collapsible defaultOpen={false} className="group">
        <Card>
          <CollapsibleTrigger asChild>
            <button type="button" className="flex w-full items-center justify-between px-4 py-4 text-left">
              <div className="flex items-center gap-3 min-w-0">
                <Bell className="h-5 w-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <h2 className="font-semibold text-foreground">{t("settings.pushTitle")}</h2>
                  <p className="text-sm text-muted-foreground">{t("settings.pushCollapsibleHint")}</p>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180 shrink-0" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-t px-4 pt-4 pb-4 space-y-6">
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
          <div className="font-medium mb-1">{t("settings.pushIosTitle")}</div>
          <p className="text-muted-foreground dark:text-amber-200/90">{t("settings.pushIosBody")}</p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-foreground">{t("settings.pushEnable")}</div>
              <div className="text-sm text-muted-foreground">{t("settings.pushEnableDesc")}</div>
            </div>
            <Switch checked={isEnabled} onCheckedChange={setIsEnabled} />
          </div>

          {isEnabled && (
            <>
              <div className="form-group">
                <label className="form-label">{t("settings.reminderTime")}</label>
                <Input type="time" value={reminderTime} onChange={(e) => setReminderTime(e.target.value)} />
              </div>

              <div className="form-group">
                <label className="form-label">{t("settings.reminderDays")}</label>
                <div className="grid grid-cols-7 gap-2">
                  {daysOfWeek.map((day) => (
                    <button
                      key={day.value}
                      type="button"
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

              {!vapidData?.publicKey && (
                <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
                  <strong>{t("settings.pushVapidHintTitle")}</strong>
                  <p className="mt-1">{t("settings.pushVapidHintBody")}</p>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
                <Button
                  onClick={handleSaveNotifications}
                  disabled={updateNotificationsMutation.isPending}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {t("settings.saveSettings")}
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    const ok = await subscribeToPush();
                    if (ok) toast.success(t("settings.toastSubscribeOk"));
                  }}
                  disabled={savePushSubscriptionMutation.isPending || !vapidData?.publicKey}
                >
                  {savePushSubscriptionMutation.isPending
                    ? t("settings.subscribing")
                    : t("settings.subscribePush")}
                </Button>
              </div>
            </>
          )}
        </div>
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Collapsible defaultOpen={false} className="group">
        <Card>
          <CollapsibleTrigger asChild>
            <button type="button" className="flex w-full items-center justify-between px-4 py-4 text-left">
              <div className="flex items-center gap-3 min-w-0">
                <Download className="h-5 w-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <h2 className="font-semibold text-foreground">{t("settings.exportTitle")}</h2>
                  <p className="text-sm text-muted-foreground">{t("settings.exportCollapsibleHint")}</p>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180 shrink-0" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-t px-4 pt-4 pb-4 space-y-4">
              <div>
                <div className="font-medium text-foreground">{t("settings.exportHeading")}</div>
                <div className="text-sm text-muted-foreground">{t("settings.exportDesc")}</div>
              </div>
              <Button onClick={handleExportAllData} variant="outline" className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                {t("settings.exportCsv")}
              </Button>
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Collapsible defaultOpen={false} className="group">
        <Card className="bg-muted/30">
          <CollapsibleTrigger asChild>
            <button type="button" className="flex w-full items-center justify-between px-4 py-4 text-left">
              <div className="flex items-center gap-3 min-w-0">
                <Info className="h-5 w-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <h2 className="font-semibold text-foreground">{t("settings.aboutTitle")}</h2>
                  <p className="text-sm text-muted-foreground">{t("settings.aboutCollapsibleHint")}</p>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180 shrink-0" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-t px-4 pt-4 pb-4 space-y-2 text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">{t("settings.aboutNameLabel")}</span>
                {t("settings.aboutName")}
              </p>
              <p>
                <span className="font-medium text-foreground">{t("settings.aboutVersionLabel")}</span>
                1.0.0
              </p>
              <p>
                <span className="font-medium text-foreground">{t("settings.aboutFeaturesLabel")}</span>
                {t("settings.aboutFeatures")}
              </p>
              <p className="pt-2">{t("settings.aboutPwa")}</p>
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Collapsible defaultOpen={false} className="group">
        <Card className="bg-secondary/10 border-secondary/30">
          <CollapsibleTrigger asChild>
            <button type="button" className="flex w-full items-center justify-between px-4 py-4 text-left">
              <div className="flex items-center gap-3 min-w-0">
                <Smartphone className="h-5 w-5 text-primary shrink-0" />
                <div className="min-w-0">
                  <h2 className="font-semibold text-foreground">{t("settings.installTitle")}</h2>
                  <p className="text-sm text-muted-foreground">{t("settings.installCollapsibleHint")}</p>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180 shrink-0" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="border-t px-4 pt-4 pb-4 space-y-2 text-sm text-muted-foreground">
              <p>{t("settings.installIntro")}</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>
                  <span className="font-medium text-foreground">{t("settings.installIos")}</span>{" "}
                  {t("settings.installIosSteps")}
                </li>
                <li>
                  <span className="font-medium text-foreground">{t("settings.installAndroid")}</span>{" "}
                  {t("settings.installAndroidSteps")}
                </li>
              </ul>
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
