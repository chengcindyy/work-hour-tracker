import { useState } from "react";
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
import { toast } from "sonner";
import { Edit2, Trash2, Plus, Store, DollarSign } from "lucide-react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function ShopsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingShop, setEditingShop] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    payType: "hourly" as "hourly" | "commission",
    shopCommissionRatePct: "",
    settlementType: null as null | "fixed_dates" | "month_end" | "cycle",
    settlementDatesInput: "",
    settlementAnchorDate: "",
    settlementCycleDays: "",
  });

  const [ratesDialogShopId, setRatesDialogShopId] = useState<number | null>(null);
  const [ratesFormData, setRatesFormData] = useState({
    name: "",
    hourlyPay: "",
    description: "",
  });
  const [editingServiceTypeId, setEditingServiceTypeId] = useState<number | null>(null);

  const { selectedWorkerId } = useWorkerSelection();
  const { data: shops, isLoading } = trpc.shops.list.useQuery(
    { workerId: selectedWorkerId! },
    { enabled: selectedWorkerId != null }
  );
  const createShopMutation = trpc.shops.create.useMutation();
  const updateShopMutation = trpc.shops.update.useMutation();
  const deleteShopMutation = trpc.shops.delete.useMutation();
  const utils = trpc.useUtils();

  const ratesDialogShop = ratesDialogShopId ? shops?.find((s) => s.id === ratesDialogShopId) : null;
  const isRatesDialogCommission = (ratesDialogShop as any)?.payType === "commission";

  const { data: serviceTypes } = trpc.serviceTypes.listByShop.useQuery(
    ratesDialogShopId && selectedWorkerId != null
      ? {
          shopId: ratesDialogShopId,
          workerId: selectedWorkerId,
        }
      : (undefined as any),
    { enabled: !!ratesDialogShopId && selectedWorkerId != null }
  );
  const createServiceTypeMutation = trpc.serviceTypes.create.useMutation();
  const updateServiceTypeMutation = trpc.serviceTypes.update.useMutation();

  const handleOpenDialog = (shop?: any) => {
    if (shop) {
      setEditingShop(shop);
      const payType = (shop.payType as string) === "commission" ? "commission" : "hourly";
      const rate = shop.shopCommissionRate != null ? parseFloat(shop.shopCommissionRate as string) : 0;
      const st = shop.settlementType as string | null;
      let settlementDatesInput = "";
      if (shop.settlementDates) {
        try {
          const arr = JSON.parse(shop.settlementDates) as number[];
          if (Array.isArray(arr)) settlementDatesInput = arr.sort((a, b) => a - b).join(", ");
        } catch {}
      }
      setFormData({
        name: shop.name,
        description: shop.description || "",
        payType,
        shopCommissionRatePct: payType === "commission" && rate > 0 ? (rate * 100).toString() : "",
        settlementType: st === "fixed_dates" || st === "month_end" || st === "cycle" ? st : null,
        settlementDatesInput,
        settlementAnchorDate: (shop.settlementAnchorDate as string) || "",
        settlementCycleDays: shop.settlementCycleDays != null ? String(shop.settlementCycleDays) : "",
      });
    } else {
      setEditingShop(null);
      setFormData({
        name: "",
        description: "",
        payType: "hourly",
        shopCommissionRatePct: "",
        settlementType: null,
        settlementDatesInput: "",
        settlementAnchorDate: "",
        settlementCycleDays: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingShop(null);
    setFormData({
      name: "",
      description: "",
      payType: "hourly",
      shopCommissionRatePct: "",
      settlementType: null,
      settlementDatesInput: "",
      settlementAnchorDate: "",
      settlementCycleDays: "",
    });
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error("請輸入店家名稱");
      return;
    }
    if (formData.payType === "commission") {
      const pct = parseFloat(formData.shopCommissionRatePct);
      if (isNaN(pct) || pct < 0 || pct > 100) {
        toast.error("抽成制請輸入店家抽成比例（0～100）");
        return;
      }
    }
    if (formData.settlementType === "fixed_dates") {
      const dates = formData.settlementDatesInput
        .split(/[,，\s]+/)
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !isNaN(n) && n >= 1 && n <= 31);
      const unique = Array.from(new Set(dates)).sort((a, b) => a - b);
      if (unique.length === 0) {
        toast.error("固定日期模式請輸入結算日（1～31，可多個以逗號分隔）");
        return;
      }
    }
    if (formData.settlementType === "cycle") {
      if (!formData.settlementAnchorDate) {
        toast.error("週期制請選擇錨點結算日");
        return;
      }
      const days = parseInt(formData.settlementCycleDays, 10);
      if (isNaN(days) || days < 1 || days > 31) {
        toast.error("週期天數請輸入 1～31");
        return;
      }
    }
    if (selectedWorkerId == null) {
      toast.error("請先選擇成員");
      return;
    }
    const shopCommissionRate =
      formData.payType === "commission"
        ? parseFloat(formData.shopCommissionRatePct) / 100
        : undefined;

    const uniqueDates =
      formData.settlementType === "fixed_dates"
        ? Array.from(new Set(
            formData.settlementDatesInput
              .split(/[,，\s]+/)
              .map((s) => parseInt(s.trim(), 10))
              .filter((n) => !isNaN(n) && n >= 1 && n <= 31)
          )).sort((a, b) => a - b)
        : undefined;

    const settlementPayload: Record<string, unknown> = {
      settlementType: formData.settlementType,
    };
    if (formData.settlementType === "fixed_dates") {
      settlementPayload.settlementDates = uniqueDates;
      settlementPayload.settlementAnchorDate = null;
      settlementPayload.settlementCycleDays = null;
    } else if (formData.settlementType === "month_end") {
      settlementPayload.settlementAnchorDate = null;
      settlementPayload.settlementCycleDays = null;
    } else if (formData.settlementType === "cycle") {
      settlementPayload.settlementAnchorDate = formData.settlementAnchorDate;
      settlementPayload.settlementCycleDays = parseInt(formData.settlementCycleDays, 10);
    } else {
      settlementPayload.settlementAnchorDate = null;
      settlementPayload.settlementCycleDays = null;
    }

    const basePayload = {
      name: formData.name,
      description: formData.description,
      payType: formData.payType,
      shopCommissionRate,
      ...settlementPayload,
    };

    try {
      if (editingShop) {
        await updateShopMutation.mutateAsync({
          shopId: editingShop.id,
          workerId: selectedWorkerId,
          ...basePayload,
        });
        toast.success("店家已更新");
      } else {
        await createShopMutation.mutateAsync({
          workerId: selectedWorkerId,
          ...basePayload,
        });
        toast.success("店家已新增");
      }
      utils.shops.list.invalidate();
      handleCloseDialog();
    } catch (error) {
      toast.error("操作失敗，請重試");
    }
  };

  const handleDelete = async (shopId: number) => {
    if (selectedWorkerId == null) return;
    if (confirm("確定要刪除此店家嗎？")) {
      try {
        await deleteShopMutation.mutateAsync({ shopId, workerId: selectedWorkerId });
        toast.success("店家已刪除");
        utils.shops.list.invalidate();
      } catch (error) {
        toast.error("刪除失敗，請重試");
      }
    }
  };

  const handleOpenRatesDialog = (shopId: number) => {
    if (!selectedWorkerId) {
      toast.error("請先在右上角選擇要設定時薪的成員");
      return;
    }
    setRatesDialogShopId(shopId);
    setRatesFormData({ name: "", hourlyPay: "", description: "" });
    setEditingServiceTypeId(null);
  };

  const handleCloseRatesDialog = () => {
    setRatesDialogShopId(null);
    setRatesFormData({ name: "", hourlyPay: "", description: "" });
    setEditingServiceTypeId(null);
  };

  const handleSaveServiceType = async () => {
    if (!ratesDialogShopId) return;
    if (!selectedWorkerId) {
      toast.error("請先在右上角選擇成員");
      return;
    }
    if (!ratesFormData.name.trim()) {
      toast.error("請輸入服務類型名稱");
      return;
    }
    const hourlyPay = isRatesDialogCommission ? 0 : parseFloat(ratesFormData.hourlyPay);
    if (!isRatesDialogCommission && (isNaN(hourlyPay) || hourlyPay <= 0)) {
      toast.error("請輸入有效的時薪（大於 0）");
      return;
    }

    try {
      if (editingServiceTypeId) {
        // 更新既有服務類型
        await updateServiceTypeMutation.mutateAsync({
          serviceTypeId: editingServiceTypeId,
          name: ratesFormData.name.trim(),
          hourlyPay,
          description: ratesFormData.description.trim() || undefined,
        });
        toast.success("服務類型已更新");
      } else {
        // 新增新的服務類型
        await createServiceTypeMutation.mutateAsync({
          shopId: ratesDialogShopId,
          workerId: selectedWorkerId,
          name: ratesFormData.name.trim(),
          hourlyPay,
          description: ratesFormData.description.trim() || undefined,
        });
        toast.success("服務類型已新增");
      }

      await utils.serviceTypes.listByShop.invalidate({
        shopId: ratesDialogShopId,
        workerId: selectedWorkerId,
      });

      setRatesFormData({ name: "", hourlyPay: "", description: "" });
      setEditingServiceTypeId(null);
    } catch {
      toast.error("儲存失敗，請重試");
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("zh-TW", {
      style: "currency",
      currency: "TWD",
      minimumFractionDigits: 0,
    }).format(value);

  return (
    <div className="space-y-6">
      {/* 標題和按鈕 */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">店家管理</h1>
        <Button
          onClick={() => handleOpenDialog()}
          disabled={selectedWorkerId == null}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          新增店家
        </Button>
      </div>

      {selectedWorkerId == null ? (
        <Card className="p-6">
          <p className="text-muted-foreground">請先在右上角選擇成員，才能管理該成員的店家。</p>
        </Card>
      ) : (
      <>
      {/* 店家列表 */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="loading-spinner" />
        </div>
      ) : shops && shops.length > 0 ? (
        <div className="grid-auto-fit">
          {shops.map((shop) => (
            <Card key={shop.id} className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Store className="w-8 h-8 text-primary opacity-60" />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground">{shop.name}</h3>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-500 text-white">
                        {(shop as any).payType === "commission" ? "抽成制" : "時薪制"}
                      </span>
                      {(shop as any).settlementType && (
                        <span className="text-xs px-2 py-0.5 rounded-full border border-blue-200 bg-blue-50 font-medium text-blue-700">
                          {(() => {
                            const st = (shop as any).settlementType;
                            if (st === "month_end") return "結算：月底";
                            if (st === "fixed_dates" && (shop as any).settlementDates) {
                              try {
                                const arr = JSON.parse((shop as any).settlementDates) as number[];
                                return `結算：每月 ${arr?.join("、") ?? ""} 號`;
                              } catch {}
                              return "結算：固定日";
                            }
                            if (st === "cycle" && (shop as any).settlementCycleDays)
                              return `結算：每 ${(shop as any).settlementCycleDays} 天`;
                            return "結算已設定";
                          })()}
                        </span>
                      )}
                    </div>
                    {shop.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {shop.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenRatesDialog(shop.id)}
                  className="flex-1"
                >
                  <DollarSign className="w-4 h-4 mr-1" />
                  {(shop as any).payType === "commission" ? "服務類型" : "時薪設定"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenDialog(shop)}
                  className="flex-1"
                >
                  <Edit2 className="w-4 h-4 mr-1" />
                  編輯
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(shop.id)}
                  className="flex-1 text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  刪除
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12">
          <div className="empty-state">
            <Store className="empty-state-icon" />
            <div className="empty-state-title">暫無店家</div>
            <div className="empty-state-description">
              開始新增店家，管理您的工作地點
            </div>
            <Button
              onClick={() => handleOpenDialog()}
              className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              新增店家
            </Button>
          </div>
        </Card>
      )}

      </>
      )}

      {/* 新增/編輯對話框 */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingShop ? "編輯店家" : "新增店家"}
            </DialogTitle>
            <DialogDescription>
              {editingShop ? "更新店家信息" : "添加新的工作地點"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="form-group">
              <label className="form-label">店家名稱 *</label>
              <Input
                placeholder="例如：美容中心 A"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label className="form-label">描述</label>
              <Textarea
                placeholder="例如：位置、工作時間等"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
              />
            </div>

            <div className="form-group">
              <label className="form-label">計薪方式</label>
              <RadioGroup
                value={formData.payType}
                onValueChange={(v) =>
                  setFormData({ ...formData, payType: v as "hourly" | "commission", shopCommissionRatePct: v === "commission" ? formData.shopCommissionRatePct : "" })
                }
                className="flex gap-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="hourly" id="payType-hourly" />
                  <Label htmlFor="payType-hourly" className="cursor-pointer">時薪制</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="commission" id="payType-commission" />
                  <Label htmlFor="payType-commission" className="cursor-pointer">抽成制</Label>
                </div>
              </RadioGroup>
            </div>

            {formData.payType === "commission" && (
              <div className="form-group">
                <label className="form-label">店家抽成比例</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    placeholder="例如：30 表示 30%"
                    value={formData.shopCommissionRatePct}
                    onChange={(e) =>
                      setFormData({ ...formData, shopCommissionRatePct: e.target.value })
                    }
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">結算設定</label>
              <RadioGroup
                value={formData.settlementType ?? "none"}
                onValueChange={(v) =>
                  setFormData({
                    ...formData,
                    settlementType: v === "none" ? null : (v as "fixed_dates" | "month_end" | "cycle"),
                    settlementDatesInput: v === "fixed_dates" ? formData.settlementDatesInput : "",
                    settlementAnchorDate: v === "cycle" ? formData.settlementAnchorDate : "",
                    settlementCycleDays: v === "cycle" ? formData.settlementCycleDays : "",
                  })
                }
                className="flex flex-col gap-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="none" id="settlement-none" />
                  <Label htmlFor="settlement-none" className="cursor-pointer">無</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fixed_dates" id="settlement-fixed" />
                  <Label htmlFor="settlement-fixed" className="cursor-pointer">固定每月幾號</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="month_end" id="settlement-month-end" />
                  <Label htmlFor="settlement-month-end" className="cursor-pointer">每月月底</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cycle" id="settlement-cycle" />
                  <Label htmlFor="settlement-cycle" className="cursor-pointer">週期制（每 N 天）</Label>
                </div>
              </RadioGroup>
              {formData.settlementType === "fixed_dates" && (
                <Input
                  className="mt-2"
                  placeholder="例如：8, 23（每月 8 號、23 號結算）"
                  value={formData.settlementDatesInput}
                  onChange={(e) =>
                    setFormData({ ...formData, settlementDatesInput: e.target.value })
                  }
                />
              )}
              {formData.settlementType === "cycle" && (
                <div className="mt-2 space-y-2">
                  <div>
                    <label className="text-sm text-muted-foreground">錨點結算日</label>
                    <Input
                      type="date"
                      className="mt-1"
                      value={formData.settlementAnchorDate}
                      onChange={(e) =>
                        setFormData({ ...formData, settlementAnchorDate: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">週期天數</label>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      placeholder="例如：14（每兩週）"
                      className="mt-1"
                      value={formData.settlementCycleDays}
                      onChange={(e) =>
                        setFormData({ ...formData, settlementCycleDays: e.target.value })
                      }
                    />
                  </div>
                </div>
              )}
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
                  createShopMutation.isPending || updateShopMutation.isPending
                }
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {editingShop ? "更新" : "新增"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 時薪設定 / 服務類型對話框 */}
      <Dialog
        open={!!ratesDialogShopId}
        onOpenChange={(open) => !open && handleCloseRatesDialog()}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isRatesDialogCommission ? "服務類型" : "時薪設定"} - {ratesDialogShop?.name ?? ""}
            </DialogTitle>
            <DialogDescription>
              {isRatesDialogCommission
                ? "管理此店家的服務類型（用於分類）"
                : "管理此店家的服務類型與時薪"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 現有服務類型列表 */}
            <div className="form-group">
              <label className="form-label">現有服務類型</label>
              {serviceTypes && serviceTypes.length > 0 ? (
                <ul className="rounded-md border border-input bg-muted/30 p-3 space-y-2">
                  {serviceTypes.map((st) => (
                    <li
                      key={st.id}
                      className="flex justify-between items-center text-sm cursor-pointer hover:bg-muted/60 rounded px-2 py-1"
                      onClick={() => {
                        setEditingServiceTypeId(st.id);
                        setRatesFormData({
                          name: st.name,
                          hourlyPay: st.hourlyPay != null ? parseFloat(st.hourlyPay as any).toString() : "0",
                          description: st.description || "",
                        });
                      }}
                    >
                      <span className="font-medium text-foreground">
                        {st.name}
                      </span>
                      {!isRatesDialogCommission && (
                        <span className="text-muted-foreground">
                          {formatCurrency(parseFloat(st.hourlyPay as string))}/小時
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground py-2">尚無服務類型</p>
              )}
            </div>

            {/* 新增 / 編輯 服務類型表單 */}
            <div className="form-group">
              <label className="form-label">
                {editingServiceTypeId ? "編輯服務類型" : "新增服務類型"}
              </label>
              <div className="space-y-3">
                <Input
                  placeholder="服務類型名稱 *"
                  value={ratesFormData.name}
                  onChange={(e) =>
                    setRatesFormData({ ...ratesFormData, name: e.target.value })
                  }
                />
                {!isRatesDialogCommission && (
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="時薪 *"
                    value={ratesFormData.hourlyPay}
                    onChange={(e) =>
                      setRatesFormData({
                        ...ratesFormData,
                        hourlyPay: e.target.value,
                      })
                    }
                  />
                )}
                <Textarea
                  placeholder="描述（選填）"
                  value={ratesFormData.description}
                  onChange={(e) =>
                    setRatesFormData({
                      ...ratesFormData,
                      description: e.target.value,
                    })
                  }
                  rows={2}
                />
                <Button
                  onClick={handleSaveServiceType}
                  disabled={
                    createServiceTypeMutation.isPending ||
                    updateServiceTypeMutation.isPending
                  }
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {editingServiceTypeId
                    ? updateServiceTypeMutation.isPending
                      ? "更新中..."
                      : "更新服務類型"
                    : createServiceTypeMutation.isPending
                    ? "新增中..."
                    : "新增服務類型"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}