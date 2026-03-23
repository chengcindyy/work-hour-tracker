import { useState, useEffect } from "react";
import { useWorkerSelection } from "@/_core/hooks/useWorkers";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Edit2, Trash2, Plus, Clock, Minus, ChevronDown, CalendarIcon } from "lucide-react";
import { dateFnsLocaleForLng } from "@/i18n/dateLocale";
import { useAppPreferences } from "@/contexts/AppPreferencesContext";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import {
  dateToYmdInVancouver,
  formatPickerDateSlash,
  formatWorkDateSlash,
  formatWorkWeekdayLong,
  getCalendarPartsInZone,
  vancouverCurrentMonthPickerRange,
  vancouverMonthPickerRangeOffset,
  vancouverTodayYmd,
  ymdToPickerDate,
} from "@/lib/vancouverTime";
import { useIsMobile } from "@/hooks/useMobile";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import type { DateRange } from "react-day-picker";

export default function WorkRecordsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [selectedShopId, setSelectedShopId] = useState<string>("");
  const [selectedServiceTypeId, setSelectedServiceTypeId] = useState<string>("");
  const [lineItems, setLineItems] = useState<{ serviceTypeId: string; hours: string }[]>([{ serviceTypeId: "", hours: "" }]);
  const [filterShopId, setFilterShopId] = useState<string>("");
  const [dateRange, setDateRangeRaw] = useState<DateRange | undefined>(() =>
    vancouverCurrentMonthPickerRange()
  );
  const setDateRange = (val: DateRange | undefined) => {
    const hadComplete = !!(dateRange?.from && dateRange?.to);
    const sameFrom = dateRange?.from?.getTime() === val?.from?.getTime();
    const diffTo = dateRange?.to?.getTime() !== val?.to?.getTime();
    if (hadComplete && sameFrom && diffTo && val?.to) {
      setDateRangeRaw({ from: val.to, to: undefined });
    } else {
      setDateRangeRaw(val);
    }
  };
  const vanMonthDefault = vancouverCurrentMonthPickerRange();
  const filterStartDate = dateRange?.from
    ? dateToYmdInVancouver(dateRange.from)
    : dateToYmdInVancouver(vanMonthDefault.from);
  const filterEndDate = dateRange?.to
    ? dateToYmdInVancouver(dateRange.to)
    : dateRange?.from
      ? dateToYmdInVancouver(dateRange.from)
      : dateToYmdInVancouver(vanMonthDefault.to);

  const [formData, setFormData] = useState({
    workDate: vancouverTodayYmd(),
    hours: "",
    serviceAmount: "",
    cashTips: "",
    cardTips: "",
    notes: "",
  });

  const { selectedWorkerId } = useWorkerSelection();
  const [, navigate] = useLocation();
  const isMobile = useIsMobile();
  const { t, i18n } = useTranslation();
  const { formatMoney: formatCurrency } = useAppPreferences();

  const { data: shops } = trpc.shops.list.useQuery(
    { workerId: selectedWorkerId! },
    { enabled: selectedWorkerId != null }
  );
  const { data: workRecords, isLoading } = trpc.workRecords.list.useQuery(
    {
      workerId: selectedWorkerId ?? undefined,
      startDate: filterStartDate,
      endDate: filterEndDate,
    },
    {
      enabled: selectedWorkerId != null,
    }
  );

  const filteredRecords =
    workRecords && filterShopId
      ? workRecords.filter((r) => r.shopId === parseInt(filterShopId))
      : workRecords ?? [];
  const { data: serviceTypes } = trpc.serviceTypes.listByShop.useQuery(
    selectedShopId && selectedWorkerId != null
      ? {
          shopId: parseInt(selectedShopId),
          workerId: selectedWorkerId,
        }
      : // skipToken 由 tRPC 型別推導提供，用於條件式查詢
        (undefined as any),
    {
      enabled: !!selectedShopId && selectedWorkerId != null,
    }
  );

  const createRecordMutation = trpc.workRecords.create.useMutation();
  const updateRecordMutation = trpc.workRecords.update.useMutation();
  const deleteRecordMutation = trpc.workRecords.delete.useMutation();
  const utils = trpc.useUtils();

  const selectedShop = selectedShopId ? shops?.find((s) => s.id === parseInt(selectedShopId)) : null;
  const isCommissionShop = (selectedShop as any)?.payType === "commission";

  const setDateRangeThisYear = () => {
    const y = getCalendarPartsInZone().year;
    setDateRange({
      from: ymdToPickerDate(`${y}-01-01`),
      to: ymdToPickerDate(`${y}-12-31`),
    });
  };
  const setDateRangeLastMonth = () => {
    const baseYmd = dateRange?.from
      ? dateToYmdInVancouver(dateRange.from)
      : vancouverTodayYmd();
    const { from, to } = vancouverMonthPickerRangeOffset(baseYmd, -1);
    setDateRange({ from, to });
  };
  const setDateRangeNextMonth = () => {
    const baseYmd = dateRange?.from
      ? dateToYmdInVancouver(dateRange.from)
      : vancouverTodayYmd();
    const { from, to } = vancouverMonthPickerRangeOffset(baseYmd, 1);
    setDateRange({ from, to });
  };

  const handleOpenDialog = (record?: any) => {
    if (record) {
      setEditingRecord(record);
      setSelectedShopId(record.shopId.toString());
      const hasServiceAmount = record.serviceAmount != null && parseFloat(record.serviceAmount as string) > 0;
      if (record.lineItems && record.lineItems.length > 0) {
        setLineItems(
          record.lineItems.map((li: { serviceTypeId: number; hours: number }) => ({
            serviceTypeId: li.serviceTypeId.toString(),
            hours: li.hours.toString(),
          }))
        );
        setSelectedServiceTypeId("");
      } else {
        setSelectedServiceTypeId(record.serviceTypeId != null ? record.serviceTypeId.toString() : "");
        setLineItems([
          {
            serviceTypeId: record.serviceTypeId != null ? record.serviceTypeId.toString() : "",
            hours: record.hours != null ? parseFloat(record.hours as any).toString() : "",
          },
        ]);
      }
      setFormData({
        workDate: (record.workDate as string) || vancouverTodayYmd(),
        hours: record.hours != null ? parseFloat(record.hours as any).toString() : "",
        serviceAmount: hasServiceAmount ? parseFloat(record.serviceAmount as any).toString() : "",
        cashTips: parseFloat((record as any).cashTips as any)?.toString() ?? "0",
        cardTips: parseFloat((record as any).cardTips as any)?.toString() ?? "0",
        notes: record.notes || "",
      });
    } else {
      setEditingRecord(null);
      const defaultShopId = shops && shops.length > 0 ? shops[0].id.toString() : "";
      setSelectedShopId(defaultShopId);
      setSelectedServiceTypeId("");
      setLineItems([{ serviceTypeId: "", hours: "" }]);
      setFormData({
        workDate: vancouverTodayYmd(),
        hours: "",
        serviceAmount: "",
        cashTips: "",
        cardTips: "",
        notes: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingRecord(null);
    setSelectedShopId("");
    setSelectedServiceTypeId("");
    setLineItems([{ serviceTypeId: "", hours: "" }]);
  };

  useEffect(() => {
    if (serviceTypes?.length === 1) {
      setSelectedServiceTypeId(serviceTypes[0].id.toString());
      setLineItems((prev) =>
        prev.map((li, i) =>
          i === 0 && (!li.serviceTypeId || li.serviceTypeId === "")
            ? { ...li, serviceTypeId: serviceTypes[0].id.toString() }
            : li
        )
      );
    }
  }, [serviceTypes]);

  const hasNoServiceTypes =
    !!selectedShopId && serviceTypes && serviceTypes.length === 0;
  const hasOneServiceType = serviceTypes?.length === 1;
  const hasMultipleServiceTypes = (serviceTypes?.length ?? 0) >= 2;

  const handleSubmit = async () => {
    if (!selectedWorkerId) {
      toast.error(t("records.toastSelectWorker"));
      return;
    }
    if (!selectedShopId) {
      toast.error(t("records.toastRequired"));
      return;
    }
    if (hasNoServiceTypes) {
      toast.error(t("records.toastNoServiceTypes"));
      return;
    }
    if (isCommissionShop) {
      if (!selectedServiceTypeId) {
        toast.error(t("records.toastSelectServiceType"));
        return;
      }
      const amt = parseFloat(formData.serviceAmount);
      if (isNaN(amt) || amt <= 0) {
        toast.error(t("records.toastEnterAmount"));
        return;
      }
    } else {
      const validLineItems = lineItems.filter(
        (li) => li.serviceTypeId && li.hours && parseFloat(li.hours) > 0
      );
      if (validLineItems.length === 0) {
        toast.error(t("records.toastLineItems"));
        return;
      }
    }

    const cashTips = parseFloat(formData.cashTips) || 0;
    const cardTips = parseFloat(formData.cardTips) || 0;

    try {
      const baseInput = {
        workerId: selectedWorkerId,
        shopId: parseInt(selectedShopId),
        workDate: formData.workDate,
        cashTips,
        cardTips,
        notes: formData.notes,
      };

      if (editingRecord) {
        await updateRecordMutation.mutateAsync({
          recordId: editingRecord.id,
          ...baseInput,
          ...(isCommissionShop
            ? {
                serviceTypeId: parseInt(selectedServiceTypeId),
                serviceAmount: parseFloat(formData.serviceAmount),
                hours: formData.hours ? parseFloat(formData.hours) : undefined,
              }
            : {
                lineItems: lineItems
                  .filter((li) => li.serviceTypeId && li.hours && parseFloat(li.hours) > 0)
                  .map((li) => ({ serviceTypeId: parseInt(li.serviceTypeId), hours: parseFloat(li.hours) })),
              }),
        });
        toast.success(t("records.toastUpdated"));
      } else {
        await createRecordMutation.mutateAsync({
          ...baseInput,
          ...(isCommissionShop
            ? {
                serviceTypeId: parseInt(selectedServiceTypeId),
                serviceAmount: parseFloat(formData.serviceAmount),
                hours: formData.hours ? parseFloat(formData.hours) : undefined,
              }
            : {
                lineItems: lineItems
                  .filter((li) => li.serviceTypeId && li.hours && parseFloat(li.hours) > 0)
                  .map((li) => ({ serviceTypeId: parseInt(li.serviceTypeId), hours: parseFloat(li.hours) })),
              }),
        });
        toast.success(t("records.toastCreated"));
      }
      utils.workRecords.list.invalidate();
      utils.stats.monthlyStats.invalidate();
      handleCloseDialog();
    } catch {
      toast.error(t("records.toastFail"));
    }
  };

  const handleDelete = async (recordId: number) => {
    if (confirm(t("records.deleteConfirm"))) {
      try {
        await deleteRecordMutation.mutateAsync({ recordId });
        toast.success(t("records.toastDeleted"));
        utils.workRecords.list.invalidate();
        utils.stats.monthlyStats.invalidate();
      } catch {
        toast.error(t("records.toastDeleteFail"));
      }
    }
  };

  const filterContent = (
    <div className="space-y-3 min-w-0">
      {/* 第一行：店家 + 日期範圍（桌面版並排） */}
      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-3 md:items-end">
        <div className="form-group min-w-0 gap-1.5">
          <label className="form-label text-xs">{t("records.shopFilter")}</label>
          <Select
            value={filterShopId || "all"}
            onValueChange={(v) => setFilterShopId(v === "all" ? "" : v)}
          >
            <SelectTrigger className="h-9 w-full md:w-[160px]">
              <SelectValue placeholder={t("records.allShops")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("records.allShops")}</SelectItem>
              {shops?.map((shop) => (
                <SelectItem key={shop.id} value={shop.id.toString()}>
                  {shop.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="form-group min-w-0 gap-1.5">
          <label className="form-label text-xs">{t("records.dateRange")}</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="h-9 w-full md:w-[240px] justify-start font-normal text-sm"
              >
                <CalendarIcon className="mr-2 h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="truncate">
                  {dateRange?.from ? (
                    dateRange.to ? (
                      dateRange.from.getTime() === dateRange.to.getTime() ? (
                        formatPickerDateSlash(dateRange.from)
                      ) : (
                        `${formatPickerDateSlash(dateRange.from)} - ${formatPickerDateSlash(dateRange.to)}`
                      )
                    ) : (
                      formatPickerDateSlash(dateRange.from)
                    )
                  ) : (
                    t("records.pickDateRange")
                  )}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={isMobile ? 1 : 2}
                locale={dateFnsLocaleForLng(i18n.language)}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
      {/* 第二行：快速按鈕 + 記錄數 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          <Button variant="outline" size="sm" onClick={setDateRangeThisYear} className="h-8 text-xs px-2.5">
            {t("records.thisYear")}
          </Button>
          <Button variant="outline" size="sm" onClick={setDateRangeLastMonth} className="h-8 text-xs px-2.5">
            {t("records.lastMonth")}
          </Button>
          <Button variant="outline" size="sm" onClick={setDateRangeNextMonth} className="h-8 text-xs px-2.5">
            {t("records.nextMonth")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs px-2.5"
            onClick={() => {
              setFilterShopId("");
              setDateRange(vancouverCurrentMonthPickerRange());
            }}
          >
            {t("records.clearFilters")}
          </Button>
        </div>
        {filteredRecords.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {t("records.recordCount", { count: filteredRecords.length })}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4 md:space-y-6 max-w-2xl">
      {/* 標題和按鈕 */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground truncate">
          工時登記
        </h1>
        <Button
          onClick={() => navigate("/dashboard")}
          className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
        >
          <Plus className="w-4 h-4 md:mr-2" />
          <span className="hidden md:inline">新增工時</span>
        </Button>
      </div>

      {/* 篩選區：toggle 收合，預設打開（手機、電腦版一致） */}
      <Collapsible defaultOpen className="group">
        <Card className="p-3">
          <CollapsibleTrigger asChild>
            <button className="flex items-center justify-between w-full text-left py-0.5 -mt-0.5">
              <span className="font-medium text-foreground">
                {t("records.filter")}
                {filteredRecords.length > 0 && (
                  <span className="text-muted-foreground font-normal ml-2">
                    {t("records.filterCount", { count: filteredRecords.length })}
                  </span>
                )}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="pt-3">{filterContent}</div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* 工時紀錄列表 */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="loading-spinner" />
        </div>
      ) : filteredRecords.length > 0 ? (
        <div className="space-y-3">
          {filteredRecords.map((record) => {
            const shop = shops?.find((s) => s.id === record.shopId);
            const rec = record as typeof record & { lineItems?: { serviceTypeId: number; hours: number; hourlyPay: number; serviceTypeName?: string }[] };
            const isCommissionRecord = record.serviceAmount != null && parseFloat(record.serviceAmount as string) > 0;
            const serviceAmount = isCommissionRecord ? parseFloat(record.serviceAmount as any) : 0;
            const shopCommissionAmount = record.shopCommissionAmount != null ? parseFloat(record.shopCommissionAmount as any) : 0;
            const detailText = isCommissionRecord ? (
              <>服務 {formatCurrency(serviceAmount)} → 收入 {formatCurrency(parseFloat(record.totalEarnings as any))}{shopCommissionAmount > 0 && `，抽成 ${formatCurrency(shopCommissionAmount)}`}</>
            ) : rec.lineItems && rec.lineItems.length > 0 ? (
              <>
                Total{" "}
                {Number(
                  rec.lineItems.reduce((sum, li) => sum + li.hours, 0).toFixed(2)
                )}{" "}
                小時
              </>
            ) : (
              <>
                Total{" "}
                {Number(
                  (record.hours != null ? parseFloat(record.hours as any) : 0).toFixed(2)
                )}{" "}
                小時
              </>
            );
            const cash = parseFloat((record as any).cashTips as any) || 0;
            const cardTips = parseFloat((record as any).cardTips as any) || 0;
            const hasTips = cash > 0 || cardTips > 0;
            return (
              <Card key={record.id} className="p-4">
                {/* 手機版：垂直堆疊；桌面版：橫向排列 */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-1">
                    {/* 店家 + 金額：手機上並排，金額突出 */}
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="font-semibold text-foreground truncate">
                        {shop?.name}
                      </div>
                      <div className="font-semibold text-primary text-lg shrink-0">
                        {formatCurrency(parseFloat(record.totalEarnings as any))}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatWorkDateSlash((record.workDate as string) || "")} ·{" "}
                      {formatWorkWeekdayLong((record.workDate as string) || "")}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {detailText}
                    </div>
                    {hasTips && (
                      <div className="text-sm text-accent">
                        {t("records.tipsLine", {
                          cash: formatCurrency(cash),
                          card: formatCurrency(cardTips),
                        })}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0 sm:pt-1">
                    <Button
                      variant="outline"
                      size={isMobile ? "default" : "sm"}
                      className="min-h-10 min-w-10 sm:min-w-0"
                      onClick={() => handleOpenDialog(record)}
                      aria-label={t("records.ariaEdit")}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size={isMobile ? "default" : "sm"}
                      className="min-h-10 min-w-10 sm:min-w-0 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(record.id)}
                      aria-label={t("records.ariaDelete")}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-8 md:p-12">
          <div className="empty-state">
            <Clock className="empty-state-icon" />
            <div className="empty-state-title">
              {workRecords && workRecords.length > 0
                ? t("records.emptyFilteredTitle")
                : t("records.emptyTitle")}
            </div>
            <div className="empty-state-description">
              {workRecords && workRecords.length > 0
                ? t("records.emptyFilteredDesc")
                : t("records.emptyDesc")}
            </div>
            <Button
              onClick={() =>
                workRecords && workRecords.length > 0
                  ? (setFilterShopId(""),
                    setDateRange(vancouverCurrentMonthPickerRange()))
                  : navigate("/dashboard")
              }
              className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {workRecords && workRecords.length > 0
                ? t("records.clearFilters")
                : t("records.addFromDashboard")}
            </Button>
          </div>
        </Card>
      )}

      {/* 新增/編輯對話框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRecord ? t("records.dialogEditTitle") : t("records.dialogAddTitle")}
            </DialogTitle>
            <DialogDescription>
              {editingRecord ? t("records.dialogEditDesc") : t("records.dialogAddDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="form-group">
              <label className="form-label">{t("records.shopRequired")}</label>
              <Select
                value={selectedShopId}
                onValueChange={(value) => {
                  setSelectedShopId(value);
                  setSelectedServiceTypeId("");
                  setLineItems([{ serviceTypeId: "", hours: "" }]);
                  setFormData((prev) => ({ ...prev, hours: "", serviceAmount: "" }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("records.selectShop")} />
                </SelectTrigger>
                <SelectContent>
                  {shops?.map((shop) => (
                    <SelectItem key={shop.id} value={shop.id.toString()}>
                      {shop.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {isCommissionShop ? (
              <div className="form-group">
                <label className="form-label">{t("records.serviceTypeRequired")}</label>
                {hasNoServiceTypes && (
                  <p className="text-sm text-destructive mt-1">{t("records.noServiceTypesWarning")}</p>
                )}
                {hasOneServiceType && serviceTypes && (
                  <p className="text-sm text-muted-foreground py-2 px-3 rounded-md border border-input bg-muted/30">
                    {serviceTypes[0].name}
                  </p>
                )}
                {hasMultipleServiceTypes && (
                  <Select value={selectedServiceTypeId} onValueChange={setSelectedServiceTypeId}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("records.selectServiceType")} />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceTypes?.map((st) => (
                        <SelectItem key={st.id} value={st.id.toString()}>
                          {st.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">{t("records.lineItemsRequired")}</label>
                {hasNoServiceTypes && (
                  <p className="text-sm text-destructive mt-1">{t("records.noServiceTypesWarning")}</p>
                )}
                <div className="space-y-2">
                  {lineItems.map((li, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <Select
                        value={li.serviceTypeId}
                        onValueChange={(v) =>
                          setLineItems((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, serviceTypeId: v } : p))
                          )
                        }
                      >
                        <SelectTrigger className="flex-1 min-w-0">
                          <SelectValue placeholder={t("dashboard.serviceType")} />
                        </SelectTrigger>
                        <SelectContent>
                          {serviceTypes?.map((st) => (
                            <SelectItem key={st.id} value={st.id.toString()}>
                              {st.name} - {formatCurrency(parseFloat(st.hourlyPay as any))}
                              {t("records.perHour")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        placeholder={t("records.hoursPh")}
                        className="w-24"
                        value={li.hours}
                        onChange={(e) =>
                          setLineItems((prev) =>
                            prev.map((p, i) => (i === idx ? { ...p, hours: e.target.value } : p))
                          )
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          setLineItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev))
                        }
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setLineItems((prev) => [...prev, { serviceTypeId: "", hours: "" }])}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    {t("records.addLine")}
                  </Button>
                  {lineItems.some((li) => li.serviceTypeId && li.hours && parseFloat(li.hours) > 0) && (
                    <p className="text-xs text-muted-foreground">
                      {t("records.estimatedIncome")}：{formatCurrency(
                        lineItems.reduce((sum, li) => {
                          if (!li.serviceTypeId || !li.hours) return sum;
                          const st = serviceTypes?.find((s) => s.id.toString() === li.serviceTypeId);
                          return sum + parseFloat(li.hours) * (st ? parseFloat(st.hourlyPay as any) : 0);
                        }, 0) +
                          (parseFloat(formData.cashTips) || 0) +
                          (parseFloat(formData.cardTips) || 0)
                      )}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">{t("records.workDateRequired")}</label>
              <Input
                type="date"
                value={formData.workDate}
                onChange={(e) =>
                  setFormData({ ...formData, workDate: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {isCommissionShop && (
                <>
                  <div className="form-group">
                    <label className="form-label">{t("records.serviceTotalRequired")}</label>
                    <Input
                      type="number"
                      step="10"
                      min="0"
                      placeholder="0"
                      value={formData.serviceAmount}
                      onChange={(e) =>
                        setFormData({ ...formData, serviceAmount: e.target.value })
                      }
                    />
                    {formData.serviceAmount && parseFloat(formData.serviceAmount) > 0 && selectedShop && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {t("records.incomeLabel")}：{formatCurrency(
                          parseFloat(formData.serviceAmount) * (1 - parseFloat((selectedShop as any).shopCommissionRate as string || "0")) +
                            (parseFloat(formData.cashTips) || 0) + (parseFloat(formData.cardTips) || 0)
                        )}
                        {" · "}
                        {t("records.commissionLabel")}：{formatCurrency(
                          parseFloat(formData.serviceAmount) * parseFloat((selectedShop as any).shopCommissionRate as string || "0")
                        )}
                      </p>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">{t("records.hoursOptional")}</label>
                    <Input
                      type="number"
                      step="0.5"
                      min="0"
                      placeholder="0"
                      value={formData.hours}
                      onChange={(e) =>
                        setFormData({ ...formData, hours: e.target.value })
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("records.hoursOptionalHint")}
                    </p>
                  </div>
                </>
              )}

              <div className="form-group">
                <label className="form-label">{t("records.cashTips")}</label>
                <Input
                  type="number"
                  step="10"
                  min="0"
                  placeholder="0"
                  value={formData.cashTips}
                  onChange={(e) =>
                    setFormData({ ...formData, cashTips: e.target.value })
                  }
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t("records.cardTips")}</label>
                <Input
                  type="number"
                  step="10"
                  min="0"
                  placeholder="0"
                  value={formData.cardTips}
                  onChange={(e) =>
                    setFormData({ ...formData, cardTips: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{t("records.notes")}</label>
              <Textarea
                placeholder={t("records.notesPlaceholder")}
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={2}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={handleCloseDialog}
                className="flex-1"
              >
                {t("common.cancel")}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  createRecordMutation.isPending ||
                  updateRecordMutation.isPending ||
                  hasNoServiceTypes ||
                  (!isCommissionShop &&
                    !lineItems.some((li) => li.serviceTypeId && li.hours && parseFloat(li.hours) > 0))
                }
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {editingRecord ? t("common.update") : t("common.add")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
