import { useState, useEffect } from "react";
import { useWorkerSelection } from "@/_core/hooks/useWorkers";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { CalendarIcon, ChevronDown, Plus, Minus } from "lucide-react";
import {
  dateToYmdInVancouver,
  formatPickerDateSlash,
  vancouverTodayYmd,
  ymdToPickerDate,
} from "@/lib/vancouverTime";
import { dateFnsLocaleForLng } from "@/i18n/dateLocale";
import { useAppPreferences } from "@/contexts/AppPreferencesContext";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const { formatMoney: formatCurrency } = useAppPreferences();
  const [workDate, setWorkDate] = useState<Date>(() =>
    ymdToPickerDate(vancouverTodayYmd())
  );
  const [selectedShopId, setSelectedShopId] = useState<string>("");
  const [selectedServiceTypeId, setSelectedServiceTypeId] = useState<string>("");
  const [lineItems, setLineItems] = useState<
    { serviceTypeId: string; hours: string }[]
  >([{ serviceTypeId: "", hours: "" }]);
  const [formData, setFormData] = useState({
    serviceAmount: "",
    hours: "",
    cashTips: "",
    cardTips: "",
    notes: "",
  });
  const [tipsOpen, setTipsOpen] = useState(false);

  const { selectedWorkerId } = useWorkerSelection();

  const { data: shops } = trpc.shops.list.useQuery(
    { workerId: selectedWorkerId! },
    { enabled: selectedWorkerId != null }
  );

  const { data: serviceTypes } = trpc.serviceTypes.listByShop.useQuery(
    selectedShopId && selectedWorkerId != null
      ? {
          shopId: parseInt(selectedShopId),
          workerId: selectedWorkerId,
        }
      : (undefined as any),
    { enabled: !!selectedShopId && selectedWorkerId != null }
  );

  const createRecordMutation = trpc.workRecords.create.useMutation();
  const utils = trpc.useUtils();

  const selectedShop = selectedShopId
    ? shops?.find((s) => s.id === parseInt(selectedShopId))
    : null;
  const isCommissionShop = (selectedShop as any)?.payType === "commission";

  const hasNoServiceTypes =
    !!selectedShopId && serviceTypes && serviceTypes.length === 0;
  const hasOneServiceType = serviceTypes?.length === 1;
  const hasMultipleServiceTypes = (serviceTypes?.length ?? 0) >= 2;

  useEffect(() => {
    if (selectedShopId) {
      setSelectedServiceTypeId("");
      setLineItems([{ serviceTypeId: "", hours: "" }]);
      setFormData((prev) => ({ ...prev, serviceAmount: "", hours: "" }));
    }
  }, [selectedShopId]);

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

  const handleSubmit = async () => {
    if (!selectedWorkerId) {
      toast.error(t("dashboard.toastSelectWorkerFirst"));
      return;
    }
    if (!selectedShopId) {
      toast.error(t("dashboard.toastSelectShop"));
      return;
    }
    if (hasNoServiceTypes) {
      toast.error(t("dashboard.toastNoServiceTypes"));
      return;
    }
    if (isCommissionShop) {
      if (!selectedServiceTypeId) {
        toast.error(t("dashboard.toastSelectServiceType"));
        return;
      }
      const amt = parseFloat(formData.serviceAmount);
      if (isNaN(amt) || amt <= 0) {
        toast.error(t("dashboard.toastEnterAmount"));
        return;
      }
    } else {
      const validLineItems = lineItems.filter(
        (li) => li.serviceTypeId && li.hours && parseFloat(li.hours) > 0
      );
      if (validLineItems.length === 0) {
        toast.error(t("dashboard.toastLineItemsRequired"));
        return;
      }
    }

    const cashTips = parseFloat(formData.cashTips) || 0;
    const cardTips = parseFloat(formData.cardTips) || 0;

    try {
      const baseInput = {
        workerId: selectedWorkerId,
        shopId: parseInt(selectedShopId),
        workDate: dateToYmdInVancouver(workDate),
        cashTips,
        cardTips,
        notes: formData.notes,
      };

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
                .filter(
                  (li) =>
                    li.serviceTypeId &&
                    li.hours &&
                    parseFloat(li.hours) > 0
                )
                .map((li) => ({
                  serviceTypeId: parseInt(li.serviceTypeId),
                  hours: parseFloat(li.hours),
                })),
            }),
      });
      toast.success(t("dashboard.toastSuccess"));
      utils.workRecords.list.invalidate();
      utils.stats.monthlyStats.invalidate();

      setWorkDate(ymdToPickerDate(vancouverTodayYmd()));
      setSelectedShopId(shops?.[0]?.id.toString() ?? "");
      setSelectedServiceTypeId("");
      setLineItems([{ serviceTypeId: "", hours: "" }]);
      setFormData({
        serviceAmount: "",
        hours: "",
        cashTips: "",
        cardTips: "",
        notes: "",
      });
    } catch {
      toast.error(t("dashboard.toastFail"));
    }
  };

  const dateDisplayText = formatPickerDateSlash(workDate);

  const estimatedEarnings = selectedShopId
    ? isCommissionShop
      ? formData.serviceAmount && parseFloat(formData.serviceAmount) > 0 && selectedShop
        ? parseFloat(formData.serviceAmount) *
            (1 -
              parseFloat(
                (selectedShop as any).shopCommissionRate as string || "0"
              )) +
          (parseFloat(formData.cashTips) || 0) +
          (parseFloat(formData.cardTips) || 0)
        : 0
      : lineItems.reduce(
          (sum, li) => {
            if (!li.serviceTypeId || !li.hours) return sum;
            const st = serviceTypes?.find(
              (s) => s.id.toString() === li.serviceTypeId
            );
            return (
              sum +
              parseFloat(li.hours) * (st ? parseFloat(st.hourlyPay as any) : 0)
            );
          },
          0
        ) +
        (parseFloat(formData.cashTips) || 0) +
        (parseFloat(formData.cardTips) || 0)
    : 0;

  const isSubmitDisabled =
    createRecordMutation.isPending ||
    hasNoServiceTypes ||
    (!isCommissionShop &&
      !lineItems.some(
        (li) => li.serviceTypeId && li.hours && parseFloat(li.hours) > 0
      )) ||
    (isCommissionShop &&
      (!selectedServiceTypeId ||
        !formData.serviceAmount ||
        parseFloat(formData.serviceAmount) <= 0));

  return (
    <div className="space-y-6 max-w-lg">
      {/* Header */}
      <h1 className="text-2xl font-semibold text-foreground">{t("dashboard.title")}</h1>

      {/* Form Card */}
      <Card className="p-5 space-y-5">
        {/* 工作日期 */}
        <div className="form-group">
          <label className="form-label text-muted-foreground">{t("dashboard.workDate")}</label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between font-normal h-11"
              >
                <span>{dateDisplayText}</span>
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={workDate}
                onSelect={(d) => d && setWorkDate(d)}
                locale={dateFnsLocaleForLng(i18n.language)}
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* 店家 */}
        <div className="form-group">
          <label className="form-label text-muted-foreground">{t("dashboard.shop")}</label>
          {!selectedWorkerId ? (
            <p className="text-sm text-muted-foreground py-2">{t("dashboard.selectMemberFirst")}</p>
          ) : shops && shops.length > 0 ? (
            <Select
              value={selectedShopId}
              onValueChange={setSelectedShopId}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder={t("dashboard.selectShopPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {shops.map((shop) => (
                  <SelectItem key={shop.id} value={shop.id.toString()}>
                    {shop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-sm text-muted-foreground py-2">
              {t("dashboard.noShopsPrefix")}
              <Link href="/shops" className="text-primary underline">
                {t("nav.shops")}
              </Link>
              {t("dashboard.noShopsSuffix")}
            </p>
          )}
        </div>

        {/* 條件式區塊：選擇店家後才顯示 */}
        {selectedShopId && (
          <>
            {hasNoServiceTypes && (
              <p className="text-sm text-destructive">{t("dashboard.noServiceTypesWarning")}</p>
            )}

            {!hasNoServiceTypes && isCommissionShop && (
              <>
                <div className="form-group">
                  <label className="form-label text-muted-foreground">{t("dashboard.serviceType")}</label>
                  {hasOneServiceType && serviceTypes && (
                    <div className="py-2.5 px-3 rounded-md border border-input bg-muted/30 text-foreground">
                      {serviceTypes[0].name}
                    </div>
                  )}
                  {hasMultipleServiceTypes && (
                    <Select
                      value={selectedServiceTypeId}
                      onValueChange={setSelectedServiceTypeId}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder={t("dashboard.selectServiceTypePlaceholder")} />
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
                <div className="form-group">
                  <label className="form-label text-muted-foreground">{t("dashboard.serviceAmount")}</label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="10"
                    min="0"
                    placeholder="0"
                    className="h-11"
                    value={formData.serviceAmount}
                    onChange={(e) =>
                      setFormData({ ...formData, serviceAmount: e.target.value })
                    }
                  />
                  {formData.serviceAmount &&
                    parseFloat(formData.serviceAmount) > 0 &&
                    selectedShop && (
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {t("dashboard.earnings")}：{formatCurrency(estimatedEarnings)}
                        {parseFloat(
                          (selectedShop as any).shopCommissionRate as string ||
                            "0"
                        ) > 0 && (
                          <>
                            {" · "}
                            {t("dashboard.commission")}：
                            {formatCurrency(
                              parseFloat(formData.serviceAmount) *
                                parseFloat(
                                  (selectedShop as any)
                                    .shopCommissionRate as string || "0"
                                )
                            )}
                          </>
                        )}
                      </p>
                    )}
                </div>
                <div className="form-group">
                  <label className="form-label text-muted-foreground">{t("dashboard.hoursOptional")}</label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.5"
                    min="0"
                    placeholder="0"
                    className="h-11"
                    value={formData.hours}
                    onChange={(e) =>
                      setFormData({ ...formData, hours: e.target.value })
                    }
                  />
                </div>
              </>
            )}

            {!hasNoServiceTypes && !isCommissionShop && (
              <div className="form-group">
                <label className="form-label text-muted-foreground">{t("dashboard.lineItems")}</label>
                <div className="space-y-2">
                  {lineItems.map((li, idx) => (
                    <div
                      key={idx}
                      className="flex gap-2 items-center"
                    >
                      <Select
                        value={li.serviceTypeId}
                        onValueChange={(v) =>
                          setLineItems((prev) =>
                            prev.map((p, i) =>
                              i === idx ? { ...p, serviceTypeId: v } : p
                            )
                          )
                        }
                      >
                        <SelectTrigger className="flex-1 min-w-0 h-11">
                          <SelectValue placeholder={t("dashboard.serviceType")} />
                        </SelectTrigger>
                        <SelectContent>
                          {serviceTypes?.map((st) => (
                            <SelectItem key={st.id} value={st.id.toString()}>
                              {st.name} - {formatCurrency(parseFloat(st.hourlyPay as any))}
                              {t("dashboard.perHour")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        inputMode="decimal"
                        step="0.5"
                        min="0"
                        placeholder={t("dashboard.hoursPlaceholder")}
                        className="w-24 h-11"
                        value={li.hours}
                        onChange={(e) =>
                          setLineItems((prev) =>
                            prev.map((p, i) =>
                              i === idx ? { ...p, hours: e.target.value } : p
                            )
                          )
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="shrink-0 h-11 w-11 text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          setLineItems((prev) =>
                            prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev
                          )
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
                    onClick={() =>
                      setLineItems((prev) => [
                        ...prev,
                        { serviceTypeId: "", hours: "" },
                      ])
                    }
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    {t("dashboard.addLineItem")}
                  </Button>
                  {lineItems.some(
                    (li) =>
                      li.serviceTypeId &&
                      li.hours &&
                      parseFloat(li.hours) > 0
                  ) && (
                    <p className="text-xs text-muted-foreground">
                      {t("dashboard.estimatedEarnings")}：{formatCurrency(estimatedEarnings)}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* 小費（收合） */}
            <Collapsible open={tipsOpen} onOpenChange={setTipsOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between text-muted-foreground font-normal"
                >
                  {t("dashboard.tipsOptional")}
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${tipsOpen ? "rotate-180" : ""}`}
                  />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="form-group">
                    <label className="form-label text-muted-foreground text-xs">
                      {t("dashboard.cashTips")}
                    </label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="10"
                      min="0"
                      placeholder="0"
                      className="h-10"
                      value={formData.cashTips}
                      onChange={(e) =>
                        setFormData({ ...formData, cashTips: e.target.value })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label text-muted-foreground text-xs">
                      {t("dashboard.cardTips")}
                    </label>
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="10"
                      min="0"
                      placeholder="0"
                      className="h-10"
                      value={formData.cardTips}
                      onChange={(e) =>
                        setFormData({ ...formData, cardTips: e.target.value })
                      }
                    />
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </>
        )}

        {/* 儲存按鈕 */}
        <Button
          onClick={handleSubmit}
          disabled={isSubmitDisabled}
          className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 mt-4"
        >
          {t("dashboard.save")}
        </Button>
      </Card>
    </div>
  );
}
