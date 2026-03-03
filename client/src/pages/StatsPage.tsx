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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Download, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export default function StatsPage() {
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState(now.getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState((now.getMonth() + 1).toString());
  const { selectedWorkerId } = useWorkerSelection();

  const { data: stats } = trpc.stats.monthlyStats.useQuery({
    year: parseInt(selectedYear),
    month: parseInt(selectedMonth),
    workerId: selectedWorkerId ?? undefined,
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("zh-TW", {
      style: "currency",
      currency: "TWD",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatHours = (value: number) => {
    return value.toFixed(1);
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
    "oklch(0.623 0.214 259.815)",
    "oklch(0.7 0.15 280)",
    "oklch(0.7 0.15 350)",
    "oklch(0.623 0.214 259.815)",
  ];

  const handleExportCSV = () => {
    if (!stats) {
      toast.error("無數據可匯出");
      return;
    }

    try {
      let csv = "月份統計報表\n";
      csv += `${selectedYear}年${selectedMonth}月\n\n`;
      csv += "總計\n";
      csv += `總工時,${formatHours(stats.totalHours)}\n`;
      csv += `總收入,${formatCurrency(stats.totalEarnings)}\n`;
      csv += `總小費,${formatCurrency(stats.totalTips)}\n`;
      csv += `現金小費,${formatCurrency((stats as any).totalCashTips ?? 0)}\n`;
      csv += `刷卡小費,${formatCurrency((stats as any).totalCardTips ?? 0)}\n`;
      if ((stats as any).totalShopCommission > 0) {
        csv += `總抽成,${formatCurrency((stats as any).totalShopCommission)}\n`;
      }
      csv += "\n";

      csv += "按店家統計\n";
      csv += "店家名稱,工時,收入,現金小費,刷卡小費,總小費,抽成\n";
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
        `stats-${selectedYear}-${selectedMonth.padStart(2, "0")}.csv`
      );
      link.click();
      toast.success("報表已匯出");
    } catch (error) {
      toast.error("匯出失敗");
    }
  };

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="space-y-6">
      {/* 標題 */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-foreground">統計報表</h1>
        <Button
          onClick={handleExportCSV}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          匯出 CSV
        </Button>
      </div>

      {/* 時間選擇 */}
      <Card className="p-4">
        <div className="flex gap-4 items-end flex-wrap">
          <div className="form-group">
            <label className="form-label">年份</label>
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

          <div className="form-group">
            <label className="form-label">月份</label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month} value={month.toString()}>
                    {month}月
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* 統計卡片 */}
      {stats && (
        <>
          <div className="grid-auto-fit">
            <div className="stat-card">
              <div className="stat-label">總工時</div>
              <div className="stat-value">{formatHours(stats.totalHours)}</div>
              <div className="text-xs text-muted-foreground">小時</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">總收入</div>
              <div className="stat-value">
                {formatCurrency(stats.totalEarnings)}
              </div>
              <div className="text-xs text-muted-foreground">含小費</div>
            </div>

            <div className="stat-card">
              <div className="stat-label">總小費</div>
              <div className="stat-value">
                {formatCurrency(stats.totalTips)}
              </div>
              <div className="text-xs text-muted-foreground">
                現金 {formatCurrency((stats as any).totalCashTips ?? 0)} / 刷卡 {formatCurrency((stats as any).totalCardTips ?? 0)}
              </div>
            </div>

            {(stats as any).totalShopCommission > 0 && (
              <div className="stat-card">
                <div className="stat-label">總抽成</div>
                <div className="stat-value">
                  {formatCurrency((stats as any).totalShopCommission)}
                </div>
                <div className="text-xs text-muted-foreground">本月應繳</div>
              </div>
            )}

            <div className="stat-card">
              <div className="stat-label">平均時薪</div>
              <div className="stat-value">
                {stats.totalHours > 0
                  ? formatCurrency(stats.totalEarnings / stats.totalHours)
                  : "-"}
              </div>
              <div className="text-xs text-muted-foreground">含小費</div>
            </div>
          </div>

          {/* 圖表 */}
          {chartData.length > 0 && (
            <>
              {/* 收入柱狀圖 */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  按店家收入分布
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
                        borderRadius: "0.5rem",
                      }}
                      formatter={(value) => formatCurrency(value as number)}
                    />
                    <Bar dataKey="earnings" fill="oklch(0.623 0.214 259.815)" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>

              {/* 工時圓餅圖 */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  按店家工時分布
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
                      formatter={(value) => `${formatHours(value as number)} 小時`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Card>

              {/* 詳細統計表 */}
              <Card className="p-6">
                <h2 className="text-xl font-semibold text-foreground mb-4">
                  按店家詳細統計
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left px-4 py-3 font-semibold text-foreground">
                          店家名稱
                        </th>
                        <th className="text-right px-4 py-3 font-semibold text-foreground">
                          工時
                        </th>
                        <th className="text-right px-4 py-3 font-semibold text-foreground">
                          收入
                        </th>
                        <th className="text-right px-4 py-3 font-semibold text-foreground">
                          現金小費
                        </th>
                        <th className="text-right px-4 py-3 font-semibold text-foreground">
                          刷卡小費
                        </th>
                        <th className="text-right px-4 py-3 font-semibold text-foreground">
                          抽成
                        </th>
                        <th className="text-right px-4 py-3 font-semibold text-foreground">
                          平均時薪 (含小費)
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
