import { useEffect, useState } from "react";
import { useWorkerSelection } from "@/_core/hooks/useWorkers";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import {
  addMonthsToYmd,
  addDaysToYmd,
  formatWorkDateSlash,
  formatWorkWeekdayLong,
  formatWorkWeekdayShort,
  getCalendarPartsInZone,
  vancouverTodayYmd,
  weekRangeForYmd,
  ymdFromYearMonth,
} from "@/lib/vancouverTime";
import { useAppPreferences } from "@/contexts/AppPreferencesContext";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";

type ChartView = "week" | "month" | "year";

export default function Dashboard() {
  const { t } = useTranslation();
  const { formatMoney: formatCurrency } = useAppPreferences();
  const { selectedWorkerId } = useWorkerSelection();
  const vanNow = getCalendarPartsInZone();
  const todayYmd = vancouverTodayYmd();
  const currentMonthAnchor = ymdFromYearMonth(vanNow.year, vanNow.month, 1);
  const currentWeekRange = weekRangeForYmd(todayYmd);
  const [chartView, setChartView] = useState<ChartView>("month");
  const [selectedYear, setSelectedYear] = useState(vanNow.year.toString());
  const [selectedMonth, setSelectedMonth] = useState(vanNow.month.toString());
  const [selectedWeekAnchor, setSelectedWeekAnchor] = useState(todayYmd);
  const years = Array.from({ length: 5 }, (_, i) => vanNow.year - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  useEffect(() => {
    const year = parseInt(selectedYear, 10);
    const month = parseInt(selectedMonth, 10);
    if (year === vanNow.year && month > vanNow.month) {
      setSelectedMonth(vanNow.month.toString());
    }
  }, [selectedMonth, selectedYear, vanNow.month, vanNow.year]);

  const monthOptions =
    parseInt(selectedYear, 10) === vanNow.year
      ? months.filter((month) => month <= vanNow.month)
      : months;
  const selectedMonthAnchor = ymdFromYearMonth(
    parseInt(selectedYear, 10),
    parseInt(selectedMonth, 10),
    1
  );
  const selectedWeekRange = weekRangeForYmd(selectedWeekAnchor);
  const selectedYearRange = {
    startDate: `${selectedYear}-01-01`,
    endDate: `${selectedYear}-12-31`,
  };
  const selectedMonthRange = {
    startDate: selectedMonthAnchor,
    endDate: addDaysToYmd(addMonthsToYmd(selectedMonthAnchor, 1), -1),
  };
  const timelineAnchorDate =
    chartView === "week"
      ? selectedWeekAnchor
      : chartView === "month"
        ? selectedMonthAnchor
        : ymdFromYearMonth(parseInt(selectedYear, 10), 1, 1);

  const { data: timeline, isLoading: chartLoading } = trpc.stats.timeline.useQuery(
    {
      period: chartView,
      anchorDate: timelineAnchorDate,
      workerId: selectedWorkerId ?? undefined,
    },
    { enabled: selectedWorkerId != null }
  );

  const summaryRange =
    chartView === "week"
      ? selectedWeekRange
      : chartView === "month"
        ? selectedMonthRange
        : selectedYearRange;

  const { data: summaryStats, isLoading: summaryLoading } = trpc.stats.byDateRange.useQuery(
    {
      startDate: summaryRange.startDate,
      endDate: summaryRange.endDate,
      workerId: selectedWorkerId ?? undefined,
    },
    { enabled: selectedWorkerId != null }
  );

  const lineData =
    timeline?.points.map((point) => ({
      bucketStart: point.bucketStart,
      label:
        chartView === "year"
          ? t("stats.monthSuffix", { n: parseInt(point.bucketStart.slice(5, 7), 10) })
          : chartView === "week"
            ? formatWorkWeekdayShort(point.bucketStart)
            : point.bucketStart.slice(8, 10).replace(/^0/, ""),
      tooltipLabel:
        chartView === "year"
          ? `${point.bucketStart.slice(0, 4)} · ${t("stats.monthSuffix", {
              n: parseInt(point.bucketStart.slice(5, 7), 10),
            })}`
          : `${formatWorkDateSlash(point.bucketStart)} · ${formatWorkWeekdayLong(point.bucketStart)}`,
      earnings: point.totalEarnings,
      hours: point.totalHours,
    })) ?? [];

  const formatHours = (value: number) => value.toFixed(2);

  if (selectedWorkerId == null) {
    return (
      <div className="max-w-2xl space-y-4">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t("dashboard.title")}</h1>
        <p className="text-muted-foreground">{t("dashboard.selectMemberFirst")}</p>
      </div>
    );
  }

  const chartHasVisibleData = lineData.some((point) => (point.earnings ?? 0) > 0);
  const chartTitle =
    chartView === "week"
      ? t("dashboard.chartWeekEarnings")
      : chartView === "month"
        ? t("dashboard.chartMonthEarnings")
        : t("dashboard.chartYearEarnings");
  const chartPeriodLabel =
    chartView === "week"
      ? `${formatWorkDateSlash(selectedWeekRange.startDate)} - ${formatWorkDateSlash(selectedWeekRange.endDate)}`
      : chartView === "month"
        ? `${selectedYear} · ${t("stats.monthSuffix", { n: parseInt(selectedMonth, 10) })}`
        : selectedYear;
  const summaryTitle =
    chartView === "week"
      ? t("dashboard.summaryWeekTitle")
      : chartView === "month"
        ? t("dashboard.summaryMonthTitle")
        : t("dashboard.summaryYearTitle");
  const isCurrentWeek = selectedWeekRange.startDate >= currentWeekRange.startDate;
  const isCurrentMonth = selectedMonthAnchor >= currentMonthAnchor;
  const isEarliestMonth = selectedYear === years[years.length - 1].toString() && selectedMonth === "1";

  const handleMonthShift = (deltaMonths: number) => {
    const nextAnchor = addMonthsToYmd(selectedMonthAnchor, deltaMonths);
    setSelectedYear(nextAnchor.slice(0, 4));
    setSelectedMonth(String(parseInt(nextAnchor.slice(5, 7), 10)));
  };

  return (
    <div className="max-w-2xl space-y-4 md:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground truncate">{t("dashboard.title")}</h1>
        <Button
          asChild
          className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0 h-10 w-10 p-0 rounded-full md:rounded-lg md:w-auto md:px-3"
          aria-label={t("dashboard.addWorkAria")}
        >
          <Link href="/records?new=1">
            <Plus className="w-5 h-5 md:mr-2" />
            <span className="hidden md:inline">{t("records.addFromDashboard")}</span>
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{t("dashboard.overviewHint")}</p>
        <Button variant="link" className="p-0 h-auto text-primary" asChild>
          <Link href="/stats">{t("dashboard.linkFullStats")}</Link>
        </Button>
      </div>

      <Card className="p-4">
        <div className="space-y-4 mb-4">
          <Tabs value={chartView} onValueChange={(value) => setChartView(value as ChartView)}>
            <TabsList>
              <TabsTrigger value="week">{t("dashboard.chartViewWeek")}</TabsTrigger>
              <TabsTrigger value="month">{t("dashboard.chartViewMonth")}</TabsTrigger>
              <TabsTrigger value="year">{t("dashboard.chartViewYear")}</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{chartTitle}</h2>
              <p className="text-xs text-muted-foreground mt-1">{chartPeriodLabel}</p>
            </div>

            {chartView === "year" ? (
              <div className="form-group gap-1.5">
                <label className="form-label text-xs">{t("stats.year")}</label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={y.toString()}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : chartView === "month" ? (
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleMonthShift(-1)}
                    disabled={isEarliestMonth}
                    aria-label={t("dashboard.previousMonth")}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleMonthShift(1)}
                    disabled={isCurrentMonth}
                    aria-label={t("dashboard.nextMonth")}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                <div className="form-group gap-1.5">
                  <label className="form-label text-xs">{t("stats.year")}</label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((y) => (
                        <SelectItem key={y} value={y.toString()}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="form-group gap-1.5">
                  <label className="form-label text-xs">{t("stats.month")}</label>
                  <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {monthOptions.map((month) => (
                        <SelectItem key={month} value={month.toString()}>
                          {t("stats.monthSuffix", { n: month })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSelectedWeekAnchor((current) => addDaysToYmd(current, -7))}
                  aria-label={t("dashboard.previousWeek")}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSelectedWeekAnchor((current) => addDaysToYmd(current, 7))}
                  disabled={isCurrentWeek}
                  aria-label={t("dashboard.nextWeek")}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
        {chartLoading ? (
          <div className="flex justify-center py-12">
            <div className="loading-spinner" />
          </div>
        ) : !timeline ? (
          <p className="text-sm text-muted-foreground py-8 text-center">{t("dashboard.chartEmpty")}</p>
        ) : !chartHasVisibleData ? (
          <p className="text-sm text-muted-foreground py-8 text-center">{t("dashboard.chartEmpty")}</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={lineData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis
                dataKey="label"
                stroke="var(--muted-foreground)"
                tick={{ fontSize: 11 }}
                interval={chartView === "month" ? 4 : 0}
              />
              <YAxis
                stroke="var(--muted-foreground)"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => formatCurrency(v)}
                width={80}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "1rem",
                }}
                formatter={(value) => [
                  formatCurrency(typeof value === "number" ? value : Number(value) || 0),
                  t("stats.statTotalEarnings"),
                ]}
                labelFormatter={(_, payload) => {
                  const p = payload?.[0]?.payload as { tooltipLabel?: string } | undefined;
                  return p?.tooltipLabel ?? "";
                }}
              />
              <Line
                type="monotone"
                dataKey="earnings"
                name="earnings"
                stroke="oklch(0.35 0.08 148)"
                strokeWidth={2}
                connectNulls={false}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div>
        <h2 className="text-lg font-semibold text-foreground">{summaryTitle}</h2>
        <p className="text-xs text-muted-foreground mt-1 mb-3">{chartPeriodLabel}</p>
        {summaryLoading ? (
          <div className="flex justify-center py-12">
            <div className="loading-spinner" />
          </div>
        ) : summaryStats ? (
          <div className="grid-auto-fit">
            <div className="stat-card">
              <div className="stat-label">{t("stats.statTotalHours")}</div>
              <div className="stat-value">{formatHours(summaryStats.totalHours)}</div>
              <div className="text-xs text-muted-foreground">{t("stats.hoursUnit")}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">{t("stats.statTotalEarnings")}</div>
              <div className="stat-value">{formatCurrency(summaryStats.totalEarnings)}</div>
              <div className="text-xs text-muted-foreground">{t("stats.includesTips")}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">{t("stats.statTotalEarningsExclTips")}</div>
              <div className="stat-value">
                {formatCurrency(summaryStats.totalEarnings - summaryStats.totalTips)}
              </div>
              <div className="text-xs text-muted-foreground">{t("stats.excludesTips")}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">{t("stats.statTotalTips")}</div>
              <div className="stat-value">{formatCurrency(summaryStats.totalTips)}</div>
              <div className="text-xs text-muted-foreground">
                {t("stats.tipsBreakdown", {
                  cash: formatCurrency(summaryStats.totalCashTips ?? 0),
                  card: formatCurrency(summaryStats.totalCardTips ?? 0),
                })}
              </div>
            </div>
            {summaryStats.totalShopCommission > 0 && (
              <div className="stat-card">
                <div className="stat-label">{t("stats.statTotalCommission")}</div>
                <div className="stat-value">{formatCurrency(summaryStats.totalShopCommission)}</div>
                <div className="text-xs text-muted-foreground">
                  {chartView === "month"
                    ? t("stats.commissionHintMonthly")
                    : t("stats.commissionHintPeriod")}
                </div>
              </div>
            )}
            <div className="stat-card">
              <div className="stat-label">{t("stats.statAvgHourly")}</div>
              <div className="stat-value">
                {summaryStats.totalHours > 0
                  ? formatCurrency(summaryStats.totalEarnings / summaryStats.totalHours)
                  : "-"}
              </div>
              <div className="text-xs text-muted-foreground">{t("stats.includesTips")}</div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("dashboard.noSummaryData")}</p>
        )}
      </div>
    </div>
  );
}
