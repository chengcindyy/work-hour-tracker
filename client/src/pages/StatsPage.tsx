import { useState, useEffect } from "react";
import { useWorkerSelection } from "@/_core/hooks/useWorkers";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Download, ChevronDown, CalendarIcon } from "lucide-react";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/useMobile";
import {
  dateToYmdInVancouver,
  formatPickerDateSlash,
  getCalendarPartsInZone,
  vancouverCurrentMonthPickerRange,
} from "@/lib/vancouverTime";
import type { DateRange } from "react-day-picker";
import { dateFnsLocaleForLng } from "@/i18n/dateLocale";
import { useAppPreferences } from "@/contexts/AppPreferencesContext";
import { useTranslation } from "react-i18next";

export default function StatsPage() {
  const vanNow = getCalendarPartsInZone();
  const [viewMode, setViewMode] = useState<"monthly" | "settlement" | "dateRange">("monthly");
  const [selectedYear, setSelectedYear] = useState(vanNow.year.toString());
  const [selectedMonth, setSelectedMonth] = useState(vanNow.month.toString());
  const [selectedShopIds, setSelectedShopIds] = useState<number[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<{ startDate: string; endDate: string; label: string } | null>(null);
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
  const { selectedWorkerId } = useWorkerSelection();
  const isMobile = useIsMobile();
  const { t, i18n } = useTranslation();
  const { formatMoney: formatCurrency } = useAppPreferences();

  // 切換成員時重置店家篩選與結算區間
  useEffect(() => {
    setSelectedShopIds([]);
    setSelectedPeriod(null);
  }, [selectedWorkerId]);

  const { data: shops } = trpc.shops.list.useQuery(
    { workerId: selectedWorkerId! },
    { enabled: !!selectedWorkerId }
  );
  const shopsWithSettlement = shops?.filter((s: any) => s.settlementType) ?? [];
  const shopListForFilter = viewMode === "settlement" ? shopsWithSettlement : (shops ?? []);

  const { data: monthlyStats } = trpc.stats.monthlyStats.useQuery(
    {
      year: parseInt(selectedYear),
      month: parseInt(selectedMonth),
      workerId: selectedWorkerId ?? undefined,
      shopIds: selectedShopIds.length > 0 ? selectedShopIds : undefined,
    },
    { enabled: viewMode === "monthly" && !!selectedWorkerId }
  );

  const { data: settlementPeriods } = trpc.stats.settlementPeriods.useQuery(
    {
      shopId: selectedShopIds[0]!,
      workerId: selectedWorkerId!,
      year: parseInt(selectedYear),
    },
    { enabled: viewMode === "settlement" && selectedShopIds.length > 0 && !!selectedWorkerId }
  );

  const { data: settlementStats } = trpc.stats.byDateRange.useQuery(
    {
      workerId: selectedWorkerId ?? undefined,
      startDate: selectedPeriod?.startDate ?? "",
      endDate: selectedPeriod?.endDate ?? "",
      shopIds: selectedShopIds.length > 0 ? selectedShopIds : undefined,
    },
    { enabled: viewMode === "settlement" && !!selectedPeriod && !!selectedWorkerId }
  );

  const dateRangeStartDate = dateRange?.from
    ? dateToYmdInVancouver(dateRange.from)
    : "";
  const dateRangeEndDate = dateRange?.to
    ? dateToYmdInVancouver(dateRange.to)
    : dateRange?.from
      ? dateToYmdInVancouver(dateRange.from)
      : "";

  const { data: dateRangeStats } = trpc.stats.byDateRange.useQuery(
    {
      workerId: selectedWorkerId ?? undefined,
      startDate: dateRangeStartDate,
      endDate: dateRangeEndDate,
      shopIds: selectedShopIds.length > 0 ? selectedShopIds : undefined,
    },
    { enabled: viewMode === "dateRange" && !!dateRange?.from && !!selectedWorkerId }
  );

  const stats = viewMode === "monthly"
    ? monthlyStats
    : viewMode === "settlement"
      ? settlementStats
      : dateRangeStats;

  const formatHours = (value: number) => {
    return value.toFixed(2);
  };

  // 準備圖表數據
  const chartData = stats
    ? Object.entries(stats.byShop).map(([shopId, data]) => ({
        name: data.shopName,
        earnings: parseFloat(data.earnings.toString()),
        hours: parseFloat(data.hours.toString()),
      }))
    : [];

  const COLORS = [
    "oklch(0.35 0.08 148)",   /* 橄欖綠 */
    "oklch(0.60 0.1 148)",    /* 淺綠 */
    "oklch(0.62 0.1 25)",     /* 珊瑚紅 */
    "oklch(0.72 0.08 65)",    /* 暖金 */
    "oklch(0.55 0.07 50)",    /* 棕褐 */
  ];

  const handleExportCSV = () => {
    if (!stats) {
      toast.error(t("stats.toastNoData"));
      return;
    }

    try {
      const monthlyPeriod =
        i18n.language === "en"
          ? `${selectedYear}-${selectedMonth.padStart(2, "0")}`
          : `${selectedYear}年${selectedMonth}月`;
      const title =
        viewMode === "monthly"
          ? t("stats.csvMonthlyTitle", { period: monthlyPeriod })
          : viewMode === "settlement"
            ? t("stats.csvSettlementTitle", {
                label: selectedPeriod?.label ?? "",
                start: selectedPeriod?.startDate ?? "",
                end: selectedPeriod?.endDate ?? "",
              })
            : t("stats.csvRangeTitle", {
                start: dateRangeStartDate,
                end: dateRangeEndDate,
              });
      let csv = title + "\n\n";
      csv += `${t("stats.csvTotals")}\n`;
      csv += `${t("stats.csvTotalHours")},${formatHours(stats.totalHours)}\n`;
      csv += `${t("stats.csvTotalEarnings")},${formatCurrency(stats.totalEarnings)}\n`;
      csv += `${t("stats.csvTotalTips")},${formatCurrency(stats.totalTips)}\n`;
      csv += `${t("stats.csvCashTips")},${formatCurrency((stats as any).totalCashTips ?? 0)}\n`;
      csv += `${t("stats.csvCardTips")},${formatCurrency((stats as any).totalCardTips ?? 0)}\n`;
      if ((stats as any).totalShopCommission > 0) {
        csv += `${t("stats.csvTotalCommission")},${formatCurrency((stats as any).totalShopCommission)}\n`;
      }
      csv += "\n";

      csv += `${t("stats.csvByShop")}\n`;
      csv += `${t("stats.csvHeaderRow")}\n`;
      Object.entries(stats.byShop).forEach(([, data]) => {
        const shopCommission = (data as any).shopCommission ?? 0;
        const cashTips = (data as any).cashTips ?? 0;
        const cardTips = (data as any).cardTips ?? 0;
        csv += `${data.shopName},${formatHours(data.hours)},${formatCurrency(data.earnings)},${formatCurrency(cashTips)},${formatCurrency(cardTips)},${formatCurrency(data.tips)},${formatCurrency(shopCommission)}\n`;
      });

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        viewMode === "monthly"
          ? `stats-${selectedYear}-${selectedMonth.padStart(2, "0")}.csv`
          : viewMode === "settlement"
            ? `stats-settlement-${selectedPeriod?.startDate ?? ""}-${selectedPeriod?.endDate ?? ""}.csv`
            : `stats-range-${dateRangeStartDate}-${dateRangeEndDate}.csv`
      );
      link.click();
      toast.success(t("stats.toastExported"));
    } catch {
      toast.error(t("stats.toastExportFail"));
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => vanNow.year - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      {/* 標題 */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">{t("stats.title")}</h1>
        <Button
          onClick={handleExportCSV}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          {t("stats.exportCsv")}
        </Button>
      </div>

      {/* 檢視模式切換 */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "monthly" | "settlement" | "dateRange")}>
        <TabsList>
          <TabsTrigger value="monthly">{t("stats.tabMonthly")}</TabsTrigger>
          <TabsTrigger value="settlement">{t("stats.tabSettlement")}</TabsTrigger>
          <TabsTrigger value="dateRange">{t("stats.tabDateRange")}</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* 時間選擇 */}
      <Card className="p-4">
        <div className="flex gap-4 items-end flex-wrap">
          {viewMode !== "dateRange" && (
            <div className="form-group">
              <label className="form-label">{t("stats.year")}</label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {viewMode === "monthly" && (
            <div className="form-group">
              <label className="form-label">{t("stats.month")}</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month} value={month.toString()}>
                      {t("stats.monthSuffix", { n: month })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {viewMode === "dateRange" && (
            <div className="form-group">
              <label className="form-label">{t("stats.dateRange")}</label>
              <div className="flex gap-2 items-center">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-64 justify-start font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="truncate">
                        {dateRange?.from ? (
                          dateRange.to && dateRange.from.getTime() !== dateRange.to.getTime() ? (
                            `${formatPickerDateSlash(dateRange.from)} - ${formatPickerDateSlash(dateRange.to)}`
                          ) : (
                            formatPickerDateSlash(dateRange.from)
                          )
                        ) : (
                          t("stats.pickDateRange")
                        )}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      captionLayout="dropdown"
                      selected={dateRange}
                      onSelect={setDateRange}
                      defaultMonth={dateRange?.from ?? new Date()}
                      numberOfMonths={isMobile ? 1 : 2}
                      startMonth={new Date(vanNow.year - 4, 0)}
                      endMonth={new Date(vanNow.year + 1, 11)}
                      locale={dateFnsLocaleForLng(i18n.language)}
                    />
                    <div className="px-3 pb-3 pt-1 text-center text-sm text-muted-foreground">
                      {!dateRange?.from || (dateRange.from && dateRange.to)
                        ? t("stats.rangeHintStart")
                        : t("stats.rangeHintEnd", {
                            date: formatPickerDateSlash(dateRange.from),
                          })}
                    </div>
                  </PopoverContent>
                </Popover>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDateRange(vancouverCurrentMonthPickerRange())}
                >
                  重置
                </Button>
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">{t("stats.shops")}</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-48 justify-between font-normal"
                >
                  <span className="truncate">
                    {selectedShopIds.length === 0
                      ? viewMode === "settlement"
                        ? t("stats.shopsSettlementOnly")
                        : t("stats.allShops")
                      : selectedShopIds.length === 1
                        ? shopListForFilter.find((s: any) => s.id === selectedShopIds[0])?.name ?? t("stats.selectedOne")
                        : t("stats.selectedN", { n: selectedShopIds.length })}
                  </span>
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48 p-2" align="start">
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {shopListForFilter.map((shop: any) => (
                    <label
                      key={shop.id}
                      className="flex items-center gap-2 cursor-pointer rounded-md px-2 py-1.5 hover:bg-accent"
                    >
                      <Checkbox
                        checked={selectedShopIds.includes(shop.id)}
                        onCheckedChange={(checked) => {
                          setSelectedPeriod(null);
                          setSelectedShopIds((prev) =>
                            checked
                              ? [...prev, shop.id]
                              : prev.filter((id) => id !== shop.id)
                          );
                        }}
                      />
                      <span className="text-sm truncate">{shop.name}</span>
                    </label>
                  ))}
                </div>
                {selectedShopIds.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => {
                      setSelectedShopIds([]);
                      setSelectedPeriod(null);
                    }}
                  >
                    清除選擇
                  </Button>
                )}
              </PopoverContent>
            </Popover>
          </div>

          {viewMode === "settlement" && (
            <div className="form-group">
              <label className="form-label">{t("stats.settlementPeriod")}</label>
              <Select
                value={selectedPeriod ? `${selectedPeriod.startDate}_${selectedPeriod.endDate}` : ""}
                onValueChange={(v) => {
                  const p = settlementPeriods?.find(
                    (x) => `${x.startDate}_${x.endDate}` === v
                  );
                  setSelectedPeriod(p ?? null);
                }}
                disabled={selectedShopIds.length === 0}
              >
                <SelectTrigger className="w-56">
                  <SelectValue
                    placeholder={
                      selectedShopIds.length === 0
                        ? t("stats.pickShopFirst")
                        : t("stats.pickPeriod")
                    }
                  />
                </SelectTrigger>
                <SelectContent
                  collisionPadding={{ top: 60, right: 10, bottom: 10, left: 10 }}
                >
                  {settlementPeriods?.map((p) => (
                    <SelectItem
                      key={`${p.startDate}_${p.endDate}`}
                      value={`${p.startDate}_${p.endDate}`}
                    >
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        {viewMode === "settlement" && selectedWorkerId && (shopsWithSettlement.length === 0 || selectedShopIds.length === 0) && (
          <p className="text-sm text-muted-foreground mt-2">
            {shopsWithSettlement.length === 0
              ? t("stats.hintNoSettlement")
              : t("stats.hintPickShop")}
          </p>
        )}
      </Card>

      {/* 統計卡片 */}
      {stats && (
        <>
          <div className="grid-auto-fit">
            <div className="stat-card">
              <div className="stat-label">{t("stats.statTotalHours")}</div>
              <div className="stat-value">{formatHours(stats.totalHours)}</div>
              <div className="text-xs text-muted-foreground">{t("stats.hoursUnit")}</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">{t("stats.statTotalEarnings")}</div>
              <div className="stat-value">
                {formatCurrency(stats.totalEarnings)}
              </div>
              <div className="text-xs text-muted-foreground">{t("stats.includesTips")}</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">{t("stats.statTotalTips")}</div>
              <div className="stat-value">
                {formatCurrency(stats.totalTips)}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("stats.tipsBreakdown", {
                  cash: formatCurrency((stats as any).totalCashTips ?? 0),
                  card: formatCurrency((stats as any).totalCardTips ?? 0),
                })}
              </div>
            </div>

            {(stats as any).totalShopCommission > 0 && (
              <div className="stat-card">
                <div className="stat-label">{t("stats.statTotalCommission")}</div>
                <div className="stat-value">
                  {formatCurrency((stats as any).totalShopCommission)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {viewMode === "monthly"
                    ? t("stats.commissionHintMonthly")
                    : t("stats.commissionHintPeriod")}
                </div>
              </div>
            )}

            <div className="stat-card">
              <div className="stat-label">{t("stats.statAvgHourly")}</div>
              <div className="stat-value">
                {stats.totalHours > 0
                  ? formatCurrency(stats.totalEarnings / stats.totalHours)
                  : "-"}
              </div>
              <div className="text-xs text-muted-foreground">{t("stats.includesTips")}</div>
            </div>
          </div>

          {/* 圖表 */}
          {chartData.length > 0 && (
            <>
              {/* 收入柱狀圖 */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  {t("stats.chartEarningsByShop")}
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" stroke="var(--muted-foreground)" />
                    <YAxis stroke="var(--muted-foreground)" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: "1rem",
                      }}
                      formatter={(value) => formatCurrency(value as number)}
                    />
                    <Bar dataKey="earnings" fill="oklch(0.35 0.08 148)" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* 工時圓餅圖 */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  {t("stats.chartHoursByShop")}
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="hours"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {chartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) =>
                        t("stats.hoursTooltip", { n: formatHours(value as number) })
                      }
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Card>

              {/* 詳細統計表 */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  {t("stats.detailByShop")}
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-4 py-3 font-semibold text-foreground">
                          {t("stats.thShop")}
                        </th>
                        <th className="text-right px-4 py-3 font-semibold text-foreground">
                          {t("stats.thHours")}
                        </th>
                        <th className="text-right px-4 py-3 font-semibold text-foreground">
                          {t("stats.thEarnings")}
                        </th>
                        <th className="text-right px-4 py-3 font-semibold text-foreground">
                          {t("stats.thCashTips")}
                        </th>
                        <th className="text-right px-4 py-3 font-semibold text-foreground">
                          {t("stats.thCardTips")}
                        </th>
                        <th className="text-right px-4 py-3 font-semibold text-foreground">
                          {t("stats.thCommission")}
                        </th>
                        <th className="text-right px-4 py-3 font-semibold text-foreground">
                          {t("stats.thAvgHourly")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(stats.byShop).map(([, data]) => {
                        const avgHourly =
                          data.hours > 0 ? data.earnings / data.hours : 0;
                        const shopCommission = (data as any).shopCommission ?? 0;
                        return (
                          <tr key={data.shopName} className="border-b border-border hover:bg-muted/10">
                            <td className="px-4 py-3 text-foreground">
                              {data.shopName}
                            </td>
                            <td className="text-right px-4 py-3 text-muted-foreground">
                              {formatHours(data.hours)}
                            </td>
                            <td className="text-right px-4 py-3 font-semibold text-primary">
                              {formatCurrency(data.earnings)}
                            </td>
                            <td className="text-right px-4 py-3 text-accent">
                              {formatCurrency((data as any).cashTips ?? 0)}
                            </td>
                            <td className="text-right px-4 py-3 text-accent">
                              {formatCurrency((data as any).cardTips ?? 0)}
                            </td>
                            <td className="text-right px-4 py-3 text-muted-foreground">
                              {formatCurrency(shopCommission)}
                            </td>
                            <td className="text-right px-4 py-3 text-muted-foreground">
                              {formatCurrency(avgHourly)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
