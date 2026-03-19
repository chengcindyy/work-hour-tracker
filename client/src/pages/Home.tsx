import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Clock, TrendingUp, Download, Bell, Smartphone } from "lucide-react";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (isAuthenticated && !loading) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 背景幾何圖案 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-5" style={{ background: "oklch(0.623 0.214 259.815)" }} />
        <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-5" style={{ background: "oklch(0.7 0.15 350)" }} />
      </div>

      {/* 導航欄 */}
      <nav className="relative border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <img src="/favicon-32x32.png" alt="" className="w-6 h-6 object-contain" />
            <h1 className="text-2xl font-bold text-foreground">工時登記系統</h1>
          </div>
        </div>
      </nav>

      {/* 主內容 */}
      <main className="relative">
        {/* Hero 區段 */}
        <section className="container py-16 md:py-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="space-y-3">
                <h2 className="text-4xl md:text-5xl font-bold text-foreground">
                  輕鬆管理您的工時
                </h2>
                <p className="text-lg text-muted-foreground">
                  為按摩師和兼職工作者設計的工時登記系統。快速記錄工時、自動計算收入、隨時查看統計報表。
                </p>
              </div>
              <div className="flex gap-4">
                <Button
                  size="lg"
                  onClick={() => {
                    const loginUrl = new URL(window.location.href);
                    loginUrl.pathname = "/api/oauth/login";
                    window.location.href = loginUrl.toString();
                  }}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  立即開始
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
                >
                  了解更多
                </Button>
              </div>
            </div>

            {/* 功能預覽 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="stat-card">
                <Clock className="w-8 h-8 text-primary" />
                <div className="font-semibold text-foreground">快速登記</div>
                <div className="text-xs text-muted-foreground">一鍵記錄工時和收入</div>
              </div>
              <div className="stat-card">
                <TrendingUp className="w-8 h-8 text-secondary" />
                <div className="font-semibold text-foreground">統計分析</div>
                <div className="text-xs text-muted-foreground">按月份和店家統計</div>
              </div>
              <div className="stat-card">
                <Download className="w-8 h-8 text-accent" />
                <div className="font-semibold text-foreground">數據匯出</div>
                <div className="text-xs text-muted-foreground">CSV 格式備份</div>
              </div>
              <div className="stat-card">
                <Smartphone className="w-8 h-8 text-primary" />
                <div className="font-semibold text-foreground">PWA 應用</div>
                <div className="text-xs text-muted-foreground">離線使用支援</div>
              </div>
            </div>
          </div>
        </section>

        {/* 功能介紹區段 */}
        <section id="features" className="container py-16 md:py-24 space-y-12">
          <div className="text-center space-y-2">
            <h3 className="text-3xl font-bold text-foreground">核心功能</h3>
            <p className="text-muted-foreground">一切都為了讓您的工作更高效</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* 功能 1 */}
            <div className="card p-8 space-y-4">
              <Clock className="w-10 h-10 text-primary" />
              <h4 className="text-xl font-semibold text-foreground">店家管理</h4>
              <p className="text-sm text-muted-foreground">
                管理多家店舖，為每家店設定不同的服務類型和時薪。支援新增、編輯和刪除。
              </p>
            </div>

            {/* 功能 2 */}
            <div className="card p-8 space-y-4">
              <TrendingUp className="w-10 h-10 text-secondary" />
              <h4 className="text-xl font-semibold text-foreground">工時登記</h4>
              <p className="text-sm text-muted-foreground">
                選擇店家和服務類型，系統自動帶入時薪。支援填寫小費，自動計算總收入。
              </p>
            </div>

            {/* 功能 3 */}
            <div className="card p-8 space-y-4">
              <TrendingUp className="w-10 h-10 text-accent" />
              <h4 className="text-xl font-semibold text-foreground">統計報表</h4>
              <p className="text-sm text-muted-foreground">
                每月總結頁面，按店家分別統計總工時、總收入和總小費。
              </p>
            </div>

            {/* 功能 4 */}
            <div className="card p-8 space-y-4">
              <Download className="w-10 h-10 text-primary" />
              <h4 className="text-xl font-semibold text-foreground">數據匯出</h4>
              <p className="text-sm text-muted-foreground">
                將工時紀錄匯出成 CSV 檔案，方便備份和進一步分析。
              </p>
            </div>

            {/* 功能 5 */}
            <div className="card p-8 space-y-4">
              <Bell className="w-10 h-10 text-secondary" />
              <h4 className="text-xl font-semibold text-foreground">推播提醒</h4>
              <p className="text-sm text-muted-foreground">
                設定每日固定時間提醒，確保不會遺漏工時登記。
              </p>
            </div>

            {/* 功能 6 */}
            <div className="card p-8 space-y-4">
              <Smartphone className="w-10 h-10 text-accent" />
              <h4 className="text-xl font-semibold text-foreground">PWA 應用</h4>
              <p className="text-sm text-muted-foreground">
                支援離線使用、可加到 iOS 主畫面，隨時隨地記錄工時。
              </p>
            </div>
          </div>
        </section>

        {/* CTA 區段 */}
        <section className="container py-16 md:py-24">
          <div className="card bg-gradient-to-br from-primary/10 to-secondary/10 p-12 text-center space-y-6">
            <h3 className="text-3xl font-bold text-foreground">準備好開始了嗎？</h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              立即登入，開始使用工時登記系統。輕鬆管理您的工作時間和收入。
            </p>
            <Button
              size="lg"
              onClick={() => {
                const loginUrl = new URL(window.location.href);
                loginUrl.pathname = "/api/oauth/login";
                window.location.href = loginUrl.toString();
              }}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              立即登入
            </Button>
          </div>
        </section>
      </main>

      {/* 頁腳 */}
      <footer className="border-t border-border bg-card/50 backdrop-blur-sm mt-16">
        <div className="container py-8 text-center text-sm text-muted-foreground">
          <p>© 2026 工時登記系統。保護您的隱私和數據安全。</p>
        </div>
      </footer>
    </div>
  );
}
