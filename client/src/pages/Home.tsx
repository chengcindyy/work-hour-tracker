import { useAuth } from "@/_core/hooks/useAuth";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { BarChart3, Bell, Clock, Download, Smartphone, TrendingUp } from "lucide-react";

export default function Home() {
  const { t } = useTranslation();
  const { loading, isAuthenticated } = useAuth();
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
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-5"
          style={{ background: "oklch(0.35 0.08 148)" }}
        />
        <div
          className="absolute bottom-0 left-0 w-80 h-80 rounded-full opacity-5"
          style={{ background: "oklch(0.62 0.1 25)" }}
        />
      </div>

      <nav className="relative border-b border-border bg-card/60 backdrop-blur-sm">
        <div className="container flex flex-wrap items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            <img src="/clock-icon.png" alt="" className="w-9 h-9 object-contain" />
            <h1 className="text-2xl font-bold text-foreground">{t("home.title")}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="home-lang" className="text-sm text-muted-foreground sr-only sm:not-sr-only sm:inline">
              {t("language.label")}
            </Label>
            <LanguageSwitcher id="home-lang" className="w-[min(100%,200px)]" />
          </div>
        </div>
      </nav>

      <main className="relative">
        <section className="container py-16 md:py-24">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <div className="space-y-3">
                <h2 className="text-4xl md:text-5xl font-bold text-foreground">{t("home.heroTitle")}</h2>
                <p className="text-lg text-muted-foreground">{t("home.heroSubtitle")}</p>
              </div>
              <div className="flex gap-4 flex-wrap">
                <Button
                  size="lg"
                  onClick={() => {
                    const loginUrl = new URL(window.location.href);
                    loginUrl.pathname = "/api/oauth/login";
                    window.location.href = loginUrl.toString();
                  }}
                  className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 px-8"
                >
                  {t("home.ctaStart")}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
                >
                  {t("home.ctaLearnMore")}
                </Button>
              </div>
            </div>

            <div className="flex flex-col items-center gap-6">
              <img
                src="/clock-icon.png"
                alt={t("home.clockAlt")}
                className="w-44 h-44 md:w-56 md:h-56 object-contain drop-shadow-lg"
              />
              <div className="grid grid-cols-2 gap-3 w-full">
                <div className="stat-card items-center text-center py-4">
                  <Clock className="w-6 h-6 text-primary mx-auto" />
                  <div className="font-semibold text-foreground text-sm">{t("home.cardQuickLog")}</div>
                  <div className="text-xs text-muted-foreground">{t("home.cardQuickLogDesc")}</div>
                </div>
                <div className="stat-card items-center text-center py-4">
                  <TrendingUp className="w-6 h-6 text-secondary mx-auto" />
                  <div className="font-semibold text-foreground text-sm">{t("home.cardStats")}</div>
                  <div className="text-xs text-muted-foreground">{t("home.cardStatsDesc")}</div>
                </div>
                <div className="stat-card items-center text-center py-4">
                  <Download className="w-6 h-6 text-primary mx-auto" />
                  <div className="font-semibold text-foreground text-sm">{t("home.cardExport")}</div>
                  <div className="text-xs text-muted-foreground">{t("home.cardExportDesc")}</div>
                </div>
                <div className="stat-card items-center text-center py-4">
                  <Smartphone className="w-6 h-6 text-secondary mx-auto" />
                  <div className="font-semibold text-foreground text-sm">{t("home.cardPwa")}</div>
                  <div className="text-xs text-muted-foreground">{t("home.cardPwaDesc")}</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="container py-16 md:py-24 space-y-12">
          <div className="text-center space-y-2">
            <h3 className="text-3xl font-bold text-foreground">{t("home.sectionFeatures")}</h3>
            <p className="text-muted-foreground">{t("home.sectionFeaturesSubtitle")}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-card rounded-3xl border border-border p-8 space-y-4 shadow-sm hover:shadow-md transition-shadow">
              <Clock className="w-10 h-10 text-primary" />
              <h4 className="text-xl font-semibold text-foreground">{t("home.featShopTitle")}</h4>
              <p className="text-sm text-muted-foreground">{t("home.featShopDesc")}</p>
            </div>

            <div className="bg-card rounded-3xl border border-border p-8 space-y-4 shadow-sm hover:shadow-md transition-shadow">
              <TrendingUp className="w-10 h-10 text-secondary" />
              <h4 className="text-xl font-semibold text-foreground">{t("home.featWorkTitle")}</h4>
              <p className="text-sm text-muted-foreground">{t("home.featWorkDesc")}</p>
            </div>

            <div className="bg-card rounded-3xl border border-border p-8 space-y-4 shadow-sm hover:shadow-md transition-shadow">
              <BarChart3 className="w-10 h-10 text-primary" />
              <h4 className="text-xl font-semibold text-foreground">{t("home.featReportTitle")}</h4>
              <p className="text-sm text-muted-foreground">{t("home.featReportDesc")}</p>
            </div>

            <div className="bg-card rounded-3xl border border-border p-8 space-y-4 shadow-sm hover:shadow-md transition-shadow">
              <Download className="w-10 h-10 text-primary" />
              <h4 className="text-xl font-semibold text-foreground">{t("home.featExportTitle")}</h4>
              <p className="text-sm text-muted-foreground">{t("home.featExportDesc")}</p>
            </div>

            <div className="bg-card rounded-3xl border border-border p-8 space-y-4 shadow-sm hover:shadow-md transition-shadow">
              <Bell className="w-10 h-10 text-secondary" />
              <h4 className="text-xl font-semibold text-foreground">{t("home.featPushTitle")}</h4>
              <p className="text-sm text-muted-foreground">{t("home.featPushDesc")}</p>
            </div>

            <div className="bg-card rounded-3xl border border-border p-8 space-y-4 shadow-sm hover:shadow-md transition-shadow">
              <Smartphone className="w-10 h-10 text-primary" />
              <h4 className="text-xl font-semibold text-foreground">{t("home.featPwaTitle")}</h4>
              <p className="text-sm text-muted-foreground">{t("home.featPwaDesc")}</p>
            </div>
          </div>
        </section>

        <section className="container py-16 md:py-24">
          <div className="bg-card rounded-3xl border border-border bg-gradient-to-br from-primary/10 to-secondary/10 p-12 text-center space-y-6 shadow-sm">
            <h3 className="text-3xl font-bold text-foreground">{t("home.ctaReadyTitle")}</h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t("home.ctaReadySubtitle")}</p>
            <Button
              size="lg"
              onClick={() => {
                const loginUrl = new URL(window.location.href);
                loginUrl.pathname = "/api/oauth/login";
                window.location.href = loginUrl.toString();
              }}
              className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 px-10"
            >
              {t("home.ctaLogin")}
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card/50 backdrop-blur-sm mt-16">
        <div className="container py-8 text-center text-sm text-muted-foreground">
          <p>{t("home.footerCopyright")}</p>
        </div>
      </footer>
    </div>
  );
}
