import { useState } from "react";
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
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Plus } from "lucide-react";
import { getCalendarPartsInZone } from "@/lib/vancouverTime";
import { useAppPreferences } from "@/contexts/AppPreferencesContext";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";

export default function Dashboard() {
  const { t } = useTranslation();
  const { formatMoney: formatCurrency } = useAppPreferences();
  const { selectedWorkerId } = useWorkerSelection();
  const vanNow = getCalendarPartsInZone();
  const [selectedYear, setSelectedYear] = useState(vanNow.year.toString());
  const years = Array.from({ length: 5 }, (_, i) => vanNow.year - i);

  const { data: yearMonthly, isLoading: yearLoading } = trpc.stats.yearMonthly.useQuery(
    {
      year: parseInt(selectedYear, 10),
      workerId: selectedWorkerId ?? undefined,
    },
    { enabled: selectedWorkerId != null }
  );

  const { data: monthlyStats, isLoading: monthLoading } = trpc.stats.monthlyStats.useQuery(
    {
      year: vanNow.year,
      month: vanNow.month,
      workerId: selectedWorkerId ?? undefined,
    },
    { enabled: selectedWorkerId != null }
  );

  const lineData =
    yearMonthly?.map((row) => ({
      month: row.month,
      label: t("stats.monthSuffix", { n: row.month }),
      earnings: row.totalEarnings,
      hours: row.totalHours,
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

  const chartAllZero = lineData.length > 0 && lineData.every((d) => d.earnings === 0);

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
        <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
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
        </div>
        <h2 className="text-lg font-semibold text-foreground mb-3">{t("dashboard.chartYearEarnings")}</h2>
        {yearLoading ? (
          <div className="flex justify-center py-12">
            <div className="loading-spinner" />
          </div>
        ) : !yearMonthly ? (
          <p className="text-sm text-muted-foreground py-8 text-center">{t("dashboard.chartEmpty")}</p>
        ) : chartAllZero ? (
          <p className="text-sm text-muted-foreground py-8 text-center">{t("dashboard.chartEmpty")}</p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={lineData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" stroke="var(--muted-foreground)" tick={{ fontSize: 11 }} interval={0} />
              <YAxis
                stroke="var(--muted-foreground)"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => formatCurrency(v)}
                width={72}
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
                  const p = payload?.[0]?.payload as { label?: string } | undefined;
                  return p?.label ?? "";
                }}
              />
              <Line
                type="monotone"
                dataKey="earnings"
                name="earnings"
                stroke="oklch(0.35 0.08 148)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      <div>
        <h2 className="text-lg font-semibold text-foreground">{t("dashboard.monthSummaryTitle")}</h2>
        <p className="text-xs text-muted-foreground mt-1 mb-3">
          {vanNow.year}
          {" · "}
          {t("stats.monthSuffix", { n: vanNow.month })}
        </p>
        {monthLoading ? (
          <div className="flex justify-center py-12">
            <div className="loading-spinner" />
          </div>
        ) : monthlyStats ? (
          <div className="grid-auto-fit">
            <div className="stat-card">
              <div className="stat-label">{t("stats.statTotalHours")}</div>
              <div className="stat-value">{formatHours(monthlyStats.totalHours)}</div>
              <div className="text-xs text-muted-foreground">{t("stats.hoursUnit")}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">{t("stats.statTotalEarnings")}</div>
              <div className="stat-value">{formatCurrency(monthlyStats.totalEarnings)}</div>
              <div className="text-xs text-muted-foreground">{t("stats.includesTips")}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">{t("stats.statTotalEarningsExclTips")}</div>
              <div className="stat-value">
                {formatCurrency(monthlyStats.totalEarnings - monthlyStats.totalTips)}
              </div>
              <div className="text-xs text-muted-foreground">{t("stats.excludesTips")}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">{t("stats.statTotalTips")}</div>
              <div className="stat-value">{formatCurrency(monthlyStats.totalTips)}</div>
              <div className="text-xs text-muted-foreground">
                {t("stats.tipsBreakdown", {
                  cash: formatCurrency(monthlyStats.totalCashTips ?? 0),
                  card: formatCurrency(monthlyStats.totalCardTips ?? 0),
                })}
              </div>
            </div>
            {monthlyStats.totalShopCommission > 0 && (
              <div className="stat-card">
                <div className="stat-label">{t("stats.statTotalCommission")}</div>
                <div className="stat-value">{formatCurrency(monthlyStats.totalShopCommission)}</div>
                <div className="text-xs text-muted-foreground">{t("stats.commissionHintMonthly")}</div>
              </div>
            )}
            <div className="stat-card">
              <div className="stat-label">{t("stats.statAvgHourly")}</div>
              <div className="stat-value">
                {monthlyStats.totalHours > 0
                  ? formatCurrency(monthlyStats.totalEarnings / monthlyStats.totalHours)
                  : "-"}
              </div>
              <div className="text-xs text-muted-foreground">{t("stats.includesTips")}</div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{t("dashboard.noMonthData")}</p>
        )}
      </div>
    </div>
  );
}
