import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useWorkerSelection } from "@/_core/hooks/useWorkers";
import { useAppPreferences } from "@/contexts/AppPreferencesContext";
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

export type ShopsManagerVariant = "page" | "embedded";

export function ShopsManager({ variant = "page" }: { variant?: ShopsManagerVariant }) {
  const { t, i18n } = useTranslation();
  const { formatMoney: formatCurrency } = useAppPreferences();
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

  const settlementBadgeForShop = (shop: any) => {
    const st = shop.settlementType;
    if (st === "month_end") return t("shops.badgeMonthEnd");
    if (st === "fixed_dates" && shop.settlementDates) {
      try {
        const arr = JSON.parse(shop.settlementDates) as number[];
        const sep = i18n.language === "en" ? ", " : "、";
        return t("shops.badgeFixedDays", { days: arr?.join(sep) ?? "" });
      } catch {
        return t("shops.badgeFixedGeneric");
      }
    }
    if (st === "cycle" && shop.settlementCycleDays) {
      return t("shops.badgeCycleDays", { n: shop.settlementCycleDays });
    }
    return t("shops.badgeConfigured");
  };

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
      toast.error(t("shops.toastNameRequired"));
      return;
    }
    if (formData.payType === "commission") {
      const pct = parseFloat(formData.shopCommissionRatePct);
      if (isNaN(pct) || pct < 0 || pct > 100) {
        toast.error(t("shops.toastCommissionPct"));
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
        toast.error(t("shops.toastFixedDates"));
        return;
      }
    }
    if (formData.settlementType === "cycle") {
      if (!formData.settlementAnchorDate) {
        toast.error(t("shops.toastCycleAnchor"));
        return;
      }
      const days = parseInt(formData.settlementCycleDays, 10);
      if (isNaN(days) || days < 1 || days > 31) {
        toast.error(t("shops.toastCycleDays"));
        return;
      }
    }
    if (selectedWorkerId == null) {
      toast.error(t("shops.toastSelectWorker"));
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
        toast.success(t("shops.toastShopUpdated"));
      } else {
        await createShopMutation.mutateAsync({
          workerId: selectedWorkerId,
          ...basePayload,
        });
        toast.success(t("shops.toastShopCreated"));
      }
      utils.shops.list.invalidate();
      handleCloseDialog();
    } catch {
      toast.error(t("shops.toastFail"));
    }
  };

  const handleDelete = async (shopId: number) => {
    if (selectedWorkerId == null) return;
    if (confirm(t("shops.deleteConfirm"))) {
      try {
        await deleteShopMutation.mutateAsync({ shopId, workerId: selectedWorkerId });
        toast.success(t("shops.toastShopDeleted"));
        utils.shops.list.invalidate();
      } catch {
        toast.error(t("shops.toastDeleteFail"));
      }
    }
  };

  const handleOpenRatesDialog = (shopId: number) => {
    if (!selectedWorkerId) {
      toast.error(t("shops.toastSelectMemberRates"));
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
      toast.error(t("shops.toastSelectWorker"));
      return;
    }
    if (!ratesFormData.name.trim()) {
      toast.error(t("shops.toastServiceNameRequired"));
      return;
    }
    const hourlyPay = isRatesDialogCommission ? 0 : parseFloat(ratesFormData.hourlyPay);
    if (!isRatesDialogCommission && (isNaN(hourlyPay) || hourlyPay <= 0)) {
      toast.error(t("shops.toastHourlyInvalid"));
      return;
    }

    try {
      if (editingServiceTypeId) {
        await updateServiceTypeMutation.mutateAsync({
          serviceTypeId: editingServiceTypeId,
          name: ratesFormData.name.trim(),
          hourlyPay,
          description: ratesFormData.description.trim() || undefined,
        });
        toast.success(t("shops.toastServiceUpdated"));
      } else {
        await createServiceTypeMutation.mutateAsync({
          shopId: ratesDialogShopId,
          workerId: selectedWorkerId,
          name: ratesFormData.name.trim(),
          hourlyPay,
          description: ratesFormData.description.trim() || undefined,
        });
        toast.success(t("shops.toastServiceCreated"));
      }

      await utils.serviceTypes.listByShop.invalidate({
        shopId: ratesDialogShopId,
        workerId: selectedWorkerId,
      });

      setRatesFormData({ name: "", hourlyPay: "", description: "" });
      setEditingServiceTypeId(null);
    } catch {
      toast.error(t("shops.toastSaveFail"));
    }
  };

  return (
    <div className={variant === "embedded" ? "space-y-4" : "space-y-6"}>
      {/* 標題和按鈕 */}
      <div
        className={
          variant === "page"
            ? "flex items-center justify-between gap-3"
            : "flex items-center justify-end"
        }
      >
        {variant === "page" && (
          <h1 className="text-3xl font-bold text-foreground">{t("shops.title")}</h1>
        )}
        <Button
          onClick={() => handleOpenDialog()}
          disabled={selectedWorkerId == null}
          className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t("shops.addShop")}
        </Button>
      </div>

      {selectedWorkerId == null ? (
        <Card className="p-6">
          <p className="text-muted-foreground">{t("shops.selectMemberHint")}</p>
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
                        {(shop as any).payType === "commission"
                          ? t("shops.payTypeCommission")
                          : t("shops.payTypeHourly")}
                      </span>
                      {(shop as any).settlementType && (
                        <span className="text-xs px-2 py-0.5 rounded-full border border-blue-200 bg-blue-50 font-medium text-blue-700">
                          {settlementBadgeForShop(shop)}
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
                  {(shop as any).payType === "commission"
                    ? t("shops.btnServiceTypes")
                    : t("shops.btnRates")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenDialog(shop)}
                  className="flex-1"
                >
                  <Edit2 className="w-4 h-4 mr-1" />
                  {t("shops.edit")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(shop.id)}
                  className="flex-1 text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  {t("shops.delete")}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12">
          <div className="empty-state">
            <Store className="empty-state-icon" />
            <div className="empty-state-title">{t("shops.emptyTitle")}</div>
            <div className="empty-state-description">{t("shops.emptyDesc")}</div>
            <Button
              onClick={() => handleOpenDialog()}
              className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {t("shops.addShop")}
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
              {editingShop ? t("shops.dialogEditTitle") : t("shops.dialogAddTitle")}
            </DialogTitle>
            <DialogDescription>
              {editingShop ? t("shops.dialogEditDesc") : t("shops.dialogAddDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="form-group">
              <label className="form-label">{t("shops.shopNameLabel")}</label>
              <Input
                placeholder={t("shops.shopNamePlaceholder")}
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t("shops.descriptionLabel")}</label>
              <Textarea
                placeholder={t("shops.descriptionPlaceholder")}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
              />
            </div>

            <div className="form-group">
              <label className="form-label">{t("shops.payTypeLabel")}</label>
              <RadioGroup
                value={formData.payType}
                onValueChange={(v) =>
                  setFormData({ ...formData, payType: v as "hourly" | "commission", shopCommissionRatePct: v === "commission" ? formData.shopCommissionRatePct : "" })
                }
                className="flex gap-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="hourly" id="payType-hourly" />
                  <Label htmlFor="payType-hourly" className="cursor-pointer">{t("shops.payHourly")}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="commission" id="payType-commission" />
                  <Label htmlFor="payType-commission" className="cursor-pointer">{t("shops.payCommission")}</Label>
                </div>
              </RadioGroup>
            </div>

            {formData.payType === "commission" && (
              <div className="form-group">
                <label className="form-label">{t("shops.commissionRateLabel")}</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    placeholder={t("shops.commissionPlaceholder")}
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
              <label className="form-label">{t("shops.settlementLabel")}</label>
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
                  <Label htmlFor="settlement-none" className="cursor-pointer">{t("shops.settlementNone")}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fixed_dates" id="settlement-fixed" />
                  <Label htmlFor="settlement-fixed" className="cursor-pointer">{t("shops.settlementFixedOption")}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="month_end" id="settlement-month-end" />
                  <Label htmlFor="settlement-month-end" className="cursor-pointer">{t("shops.settlementMonthEndOption")}</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="cycle" id="settlement-cycle" />
                  <Label htmlFor="settlement-cycle" className="cursor-pointer">{t("shops.settlementCycleOption")}</Label>
                </div>
              </RadioGroup>
              {formData.settlementType === "fixed_dates" && (
                <Input
                  className="mt-2"
                  placeholder={t("shops.fixedDatesPlaceholder")}
                  value={formData.settlementDatesInput}
                  onChange={(e) =>
                    setFormData({ ...formData, settlementDatesInput: e.target.value })
                  }
                />
              )}
              {formData.settlementType === "cycle" && (
                <div className="mt-2 space-y-2">
                  <div>
                    <label className="text-sm text-muted-foreground">{t("shops.anchorDateLabel")}</label>
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
                {t("common.cancel")}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  createShopMutation.isPending || updateShopMutation.isPending
                }
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {editingShop ? t("common.update") : t("common.add")}
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
              {isRatesDialogCommission ? t("shops.ratesTitleCommission") : t("shops.ratesTitleHourly")} - {ratesDialogShop?.name ?? ""}
            </DialogTitle>
            <DialogDescription>
              {isRatesDialogCommission
                ? t("shops.ratesDescCommission")
                : t("shops.ratesDescHourly")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* 現有服務類型列表 */}
            <div className="form-group">
              <label className="form-label">{t("shops.existingListLabel")}</label>
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
                          {formatCurrency(parseFloat(st.hourlyPay as string))}
                          {t("shops.perHourShort")}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground py-2">{t("shops.noServiceTypes")}</p>
              )}
            </div>

            {/* 新增 / 編輯 服務類型表單 */}
            <div className="form-group">
              <label className="form-label">
                {editingServiceTypeId ? t("shops.labelEditService") : t("shops.labelAddService")}
              </label>
              <div className="space-y-3">
                <Input
                  placeholder={t("shops.serviceNamePh")}
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
                    placeholder={t("shops.hourlyPh")}
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
                  placeholder={t("shops.descOptionalPh")}
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
                      ? t("shops.btnUpdating")
                      : t("shops.btnUpdateService")
                    : createServiceTypeMutation.isPending
                      ? t("shops.btnAdding")
                      : t("shops.btnAddService")}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ShopsPage() {
  return <ShopsManager variant="page" />;
}