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
import { Edit2, Trash2, Plus, Clock, Minus, ChevronDown } from "lucide-react";
import { format } from "date-fns";
import { useLocation } from "wouter";
import { useIsMobile } from "@/hooks/useMobile";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export default function WorkRecordsPage() {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [selectedShopId, setSelectedShopId] = useState<string>("");
  const [selectedServiceTypeId, setSelectedServiceTypeId] = useState<string>("");
  const [lineItems, setLineItems] = useState<{ serviceTypeId: string; hours: string }[]>([{ serviceTypeId: "", hours: "" }]);
  const [filterShopId, setFilterShopId] = useState<string>("");
  const [filterStartDate, setFilterStartDate] = useState(() =>
    format(new Date(currentYear, currentMonth - 1, 1), "yyyy-MM-dd")
  );
  const [filterEndDate, setFilterEndDate] = useState(() =>
    format(new Date(currentYear, currentMonth, 0), "yyyy-MM-dd")
  );
  const [formData, setFormData] = useState({
    workDate: format(new Date(), "yyyy-MM-dd"),
    hours: "",
    serviceAmount: "",
    cashTips: "",
    cardTips: "",
    notes: "",
  });

  const { selectedWorkerId } = useWorkerSelection();
  const [, navigate] = useLocation();
  const isMobile = useIsMobile();

  const { data: shops } = trpc.shops.list.useQuery(
    { workerId: selectedWorkerId! },
    { enabled: selectedWorkerId != null }
  );
  const { data: workRecords, isLoading } = trpc.workRecords.list.useQuery(
    {
      workerId: selectedWorkerId ?? undefined,
      startDate: new Date(filterStartDate + "T00:00:00"),
      endDate: new Date(filterEndDate + "T23:59:59"),
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

  const parseDateFromInput = (value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day, 12, 0, 0);
  };

  const createRecordMutation = trpc.workRecords.create.useMutation();
  const updateRecordMutation = trpc.workRecords.update.useMutation();
  const deleteRecordMutation = trpc.workRecords.delete.useMutation();
  const utils = trpc.useUtils();

  const selectedShop = selectedShopId ? shops?.find((s) => s.id === parseInt(selectedShopId)) : null;
  const isCommissionShop = (selectedShop as any)?.payType === "commission";

  const setDateRangeThisYear = () => {
    const y = currentYear;
    setFilterStartDate(`${y}-01-01`);
    setFilterEndDate(`${y}-12-31`);
  };
  const setDateRangeLastMonth = () => {
    const [y, m] = filterStartDate.split("-").map(Number);
    const d = new Date(y, m - 1 - 1, 1);
    const ny = d.getFullYear();
    const nm = d.getMonth() + 1;
    setFilterStartDate(format(new Date(ny, nm - 1, 1), "yyyy-MM-dd"));
    setFilterEndDate(format(new Date(ny, nm, 0), "yyyy-MM-dd"));
  };
  const setDateRangeNextMonth = () => {
    const [y, m] = filterStartDate.split("-").map(Number);
    const d = new Date(y, m - 1 + 1, 1);
    const ny = d.getFullYear();
    const nm = d.getMonth() + 1;
    setFilterStartDate(format(new Date(ny, nm - 1, 1), "yyyy-MM-dd"));
    setFilterEndDate(format(new Date(ny, nm, 0), "yyyy-MM-dd"));
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
        workDate: (record.workDate as string) || format(new Date(), "yyyy-MM-dd"),
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
        workDate: format(new Date(), "yyyy-MM-dd"),
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
      toast.error("請先在右上角選擇成員後再新增工時");
      return;
    }
    if (!selectedShopId) {
      toast.error("請填寫所有必填項目");
      return;
    }
    if (hasNoServiceTypes) {
      toast.error("所選店家尚無服務類型，無法新增工時");
      return;
    }
    if (isCommissionShop) {
      if (!selectedServiceTypeId) {
        toast.error("請選擇服務類型");
        return;
      }
      const amt = parseFloat(formData.serviceAmount);
      if (isNaN(amt) || amt <= 0) {
        toast.error("請輸入服務總金額");
        return;
      }
    } else {
      const validLineItems = lineItems.filter(
        (li) => li.serviceTypeId && li.hours && parseFloat(li.hours) > 0
      );
      if (validLineItems.length === 0) {
        toast.error("時薪制請至少新增一筆項目（服務類型與時數）");
        return;
      }
    }

    const cashTips = parseFloat(formData.cashTips) || 0;
    const cardTips = parseFloat(formData.cardTips) || 0;

    try {
      const baseInput = {
        workerId: selectedWorkerId,
        shopId: parseInt(selectedShopId),
        workDate: parseDateFromInput(formData.workDate),
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
        toast.success("工時紀錄已更新");
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
        toast.success("工時紀錄已新增");
      }
      utils.workRecords.list.invalidate();
      utils.stats.monthlyStats.invalidate();
      handleCloseDialog();
    } catch (error) {
      toast.error("操作失敗，請重試");
    }
  };

  const handleDelete = async (recordId: number) => {
    if (confirm("確定要刪除此工時紀錄嗎？")) {
      try {
        await deleteRecordMutation.mutateAsync({ recordId });
        toast.success("工時紀錄已刪除");
        utils.workRecords.list.invalidate();
        utils.stats.monthlyStats.invalidate();
      } catch (error) {
        toast.error("刪除失敗，請重試");
      }
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("zh-TW", {
      style: "currency",
      currency: "TWD",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const filterContent = (
    <div className="flex flex-col md:flex-row md:flex-wrap gap-4 md:items-end">
      <div className="form-group flex-1 min-w-0">
        <label className="form-label">店家</label>
        <Select
          value={filterShopId || "all"}
          onValueChange={(v) => setFilterShopId(v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="全部店家" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部店家</SelectItem>
            {shops?.map((shop) => (
              <SelectItem key={shop.id} value={shop.id.toString()}>
                {shop.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="form-group flex-1 min-w-0">
        <label className="form-label">開始日期</label>
        <Input
          type="date"
          value={filterStartDate}
          onChange={(e) => setFilterStartDate(e.target.value)}
          className="w-full md:w-[150px]"
        />
      </div>
      <div className="form-group flex-1 min-w-0">
        <label className="form-label">結束日期</label>
        <Input
          type="date"
          value={filterEndDate}
          onChange={(e) => setFilterEndDate(e.target.value)}
          className="w-full md:w-[150px]"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={setDateRangeThisYear}>
          今年
        </Button>
        <Button variant="outline" size="sm" onClick={setDateRangeLastMonth}>
          上個月
        </Button>
        <Button variant="outline" size="sm" onClick={setDateRangeNextMonth}>
          下個月
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setFilterShopId("");
            setFilterStartDate(format(new Date(currentYear, currentMonth - 1, 1), "yyyy-MM-dd"));
            setFilterEndDate(format(new Date(currentYear, currentMonth, 0), "yyyy-MM-dd"));
          }}
        >
          清除篩選
        </Button>
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

      {/* 篩選區：手機版收合，桌面版展開 */}
      {isMobile ? (
        <Collapsible>
          <Card className="p-3">
            <CollapsibleTrigger asChild>
              <button className="flex items-center justify-between w-full text-left">
                <span className="font-medium text-foreground">
                  篩選
                  {filteredRecords.length > 0 && (
                    <span className="text-muted-foreground font-normal ml-2">
                      （共 {filteredRecords.length} 筆）
                    </span>
                  )}
                </span>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="pt-4 space-y-4">{filterContent}</div>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      ) : (
        <Card className="p-4">
          {filterContent}
          {filteredRecords.length > 0 && (
            <p className="text-sm text-muted-foreground mt-3">
              共 {filteredRecords.length} 筆紀錄
            </p>
          )}
        </Card>
      )}

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
                {rec.lineItems
                  .map((li) => `${li.serviceTypeName ?? "項目"} ${li.hours}h × ${formatCurrency(li.hourlyPay)}`)
                  .join("、")}
              </>
            ) : (
              <>{(record.hours != null ? parseFloat(record.hours as any) : 0).toFixed(1)} 小時 × {formatCurrency(record.hourlyPay != null ? parseFloat(record.hourlyPay as any) : 0)}</>
            );
            const serviceLabel =
              isCommissionRecord || !rec.lineItems?.length
                ? (serviceTypes?.find((st) => st.id === record.serviceTypeId)?.name ?? "服務")
                : rec.lineItems.map((li) => li.serviceTypeName ?? "項目").join("、");
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
                      {(record.workDate as string) || ""} · {serviceLabel}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {detailText}
                    </div>
                    {hasTips && (
                      <div className="text-sm text-accent">
                        小費：現金 {formatCurrency(cash)} / 刷卡 {formatCurrency(cardTips)}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0 sm:pt-1">
                    <Button
                      variant="outline"
                      size={isMobile ? "default" : "sm"}
                      className="min-h-10 min-w-10 sm:min-w-0"
                      onClick={() => handleOpenDialog(record)}
                      aria-label="編輯"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size={isMobile ? "default" : "sm"}
                      className="min-h-10 min-w-10 sm:min-w-0 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(record.id)}
                      aria-label="刪除"
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
                ? "此篩選條件下無紀錄"
                : "暫無工時紀錄"}
            </div>
            <div className="empty-state-description">
              {workRecords && workRecords.length > 0
                ? "試試調整店家或日期範圍"
                : "開始新增工時紀錄，追蹤您的工作時間"}
            </div>
            <Button
              onClick={() =>
                workRecords && workRecords.length > 0
                  ? (setFilterShopId(""),
                    setFilterStartDate(format(new Date(currentYear, currentMonth - 1, 1), "yyyy-MM-dd")),
                    setFilterEndDate(format(new Date(currentYear, currentMonth, 0), "yyyy-MM-dd")))
                  : navigate("/dashboard")
              }
              className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {workRecords && workRecords.length > 0 ? "清除篩選" : "新增工時"}
            </Button>
          </div>
        </Card>
      )}

      {/* 新增/編輯對話框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRecord ? "編輯工時紀錄" : "新增工時紀錄"}
            </DialogTitle>
            <DialogDescription>
              {editingRecord ? "更新工時信息" : "記錄您的工作時間和收入"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="form-group">
              <label className="form-label">店家 *</label>
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
                  <SelectValue placeholder="選擇店家" />
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
                <label className="form-label">服務類型 *</label>
                {hasNoServiceTypes && (
                  <p className="text-sm text-destructive mt-1">所選店家尚無服務類型，無法新增工時</p>
                )}
                {hasOneServiceType && serviceTypes && (
                  <p className="text-sm text-muted-foreground py-2 px-3 rounded-md border border-input bg-muted/30">
                    {serviceTypes[0].name}
                  </p>
                )}
                {hasMultipleServiceTypes && (
                  <Select value={selectedServiceTypeId} onValueChange={setSelectedServiceTypeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="選擇服務類型" />
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
                <label className="form-label">項目明細 *</label>
                {hasNoServiceTypes && (
                  <p className="text-sm text-destructive mt-1">所選店家尚無服務類型，無法新增工時</p>
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
                          <SelectValue placeholder="服務類型" />
                        </SelectTrigger>
                        <SelectContent>
                          {serviceTypes?.map((st) => (
                            <SelectItem key={st.id} value={st.id.toString()}>
                              {st.name} - {formatCurrency(parseFloat(st.hourlyPay as any))}/時
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        step="0.5"
                        min="0"
                        placeholder="時數"
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
                    新增項目
                  </Button>
                  {lineItems.some((li) => li.serviceTypeId && li.hours && parseFloat(li.hours) > 0) && (
                    <p className="text-xs text-muted-foreground">
                      預估收入：{formatCurrency(
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
              <label className="form-label">工作日期 *</label>
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
                    <label className="form-label">服務總金額 *</label>
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
                        收入：{formatCurrency(
                          parseFloat(formData.serviceAmount) * (1 - parseFloat((selectedShop as any).shopCommissionRate as string || "0")) +
                            (parseFloat(formData.cashTips) || 0) + (parseFloat(formData.cardTips) || 0)
                        )}
                        {" · "}
                        抽成：{formatCurrency(
                          parseFloat(formData.serviceAmount) * parseFloat((selectedShop as any).shopCommissionRate as string || "0")
                        )}
                      </p>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">時數（選填）</label>
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
                      填寫後可計算總工時與平均時薪
                    </p>
                  </div>
                </>
              )}

              <div className="form-group">
                <label className="form-label">現金小費</label>
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
                <label className="form-label">刷卡小費</label>
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
              <label className="form-label">備註</label>
              <Textarea
                placeholder="例如：特殊情況、額外說明"
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
                取消
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
                {editingRecord ? "更新" : "新增"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
