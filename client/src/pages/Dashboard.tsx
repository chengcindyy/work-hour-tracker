import { useAuth } from "@/_core/hooks/useAuth";
import { useWorkerSelection } from "@/_core/hooks/useWorkers";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";
import { Clock, TrendingUp, DollarSign, Gift } from "lucide-react";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";

export default function Dashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { selectedWorkerId } = useWorkerSelection();

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const { data: monthlyStats, isLoading: statsLoading } = trpc.stats.monthlyStats.useQuery(
    {
      year: currentYear,
      month: currentMonth,
      workerId: selectedWorkerId ?? undefined,
    }
  );

  const { data: recentRecords, isLoading: recordsLoading } = trpc.workRecords.list.useQuery(
    {
      workerId: selectedWorkerId ?? undefined,
      startDate: new Date(currentYear, currentMonth - 1, 1),
      endDate: new Date(currentYear, currentMonth, 0),
    }
  );

  const { data: shops } = trpc.shops.list.useQuery();

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

  return (
    <div className="space-y-6">
      {/* 標題 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">歡迎回來，{user?.name}！</h1>
          <p className="text-muted-foreground mt-1">
            {format(now, "MMMM yyyy", { locale: zhTW })}
          </p>
        </div>
        <Button
          onClick={() => navigate("/records")}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          + 新增工時
        </Button>
      </div>

      {/* 統計卡片 */}
      <div className="grid-auto-fit">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <div className="stat-label">總工時</div>
              <div className="stat-value">
                {statsLoading ? "-" : formatHours(monthlyStats?.totalHours || 0)}
              </div>
              <div className="text-xs text-muted-foreground mt-2">小時</div>
            </div>
            <Clock className="w-12 h-12 text-primary opacity-20" />
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <div className="stat-label">總收入</div>
              <div className="stat-value">
                {statsLoading ? "-" : formatCurrency(monthlyStats?.totalEarnings || 0)}
              </div>
              <div className="text-xs text-muted-foreground mt-2">含小費</div>
            </div>
            <DollarSign className="w-12 h-12 text-secondary opacity-20" />
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <div className="stat-label">總小費</div>
              <div className="stat-value">
                {statsLoading ? "-" : formatCurrency(monthlyStats?.totalTips || 0)}
              </div>
              <div className="text-xs text-muted-foreground mt-2">本月累計</div>
            </div>
            <Gift className="w-12 h-12 text-accent opacity-20" />
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <div className="stat-label">平均時薪</div>
              <div className="stat-value">
                {statsLoading || !monthlyStats?.totalHours
                  ? "-"
                  : formatCurrency(
                      (monthlyStats.totalEarnings - monthlyStats.totalTips) /
                        monthlyStats.totalHours
                    )}
              </div>
              <div className="text-xs text-muted-foreground mt-2">不含小費</div>
            </div>
            <TrendingUp className="w-12 h-12 text-primary opacity-20" />
          </div>
        </div>
      </div>

      {/* 按店家分類統計 */}
      {monthlyStats && Object.keys(monthlyStats.byShop).length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">按店家統計</h2>
          <div className="space-y-4">
            {Object.entries(monthlyStats.byShop).map(([shopId, stats]) => (
              <div key={shopId} className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div>
                  <div className="font-semibold text-foreground">{stats.shopName}</div>
                  <div className="text-sm text-muted-foreground">
                    {formatHours(stats.hours)} 小時
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-primary">
                    {formatCurrency(stats.earnings)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    小費：{formatCurrency(stats.tips)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 最近工時紀錄 */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-foreground">最近工時紀錄</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/records")}
          >
            查看全部
          </Button>
        </div>

        {recordsLoading ? (
          <div className="flex justify-center py-8">
            <div className="loading-spinner" />
          </div>
        ) : recentRecords && recentRecords.length > 0 ? (
          <div className="space-y-3">
            {recentRecords.slice(0, 5).map((record) => {
              const shop = shops?.find((s) => s.id === record.shopId);
              return (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 bg-muted/20 rounded-lg hover:bg-muted/40 transition-colors"
                >
                  <div>
                    <div className="font-medium text-foreground">{shop?.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(record.workDate), "yyyy-MM-dd")}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-primary">
                      {formatCurrency(parseFloat(record.totalEarnings as any))}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatHours(parseFloat(record.hours as any))} 小時
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <Clock className="empty-state-icon" />
            <div className="empty-state-title">暫無工時紀錄</div>
            <div className="empty-state-description">
              開始新增工時紀錄，追蹤您的工作時間
            </div>
            <Button
              onClick={() => navigate("/records")}
              className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              新增工時
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
