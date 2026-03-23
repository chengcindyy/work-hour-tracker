import { AuthPrefetcher } from "@/components/AuthPrefetcher";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import ShopsPage from "./pages/ShopsPage";
import WorkRecordsPage from "./pages/WorkRecordsPage";
import StatsPage from "./pages/StatsPage";
import SettingsPage from "./pages/SettingsPage";
import { WorkersProvider } from "@/_core/hooks/useWorkers";
import { AppPreferencesProvider } from "@/contexts/AppPreferencesContext";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/dashboard"}>
        {() => (
          <WorkersProvider>
            <DashboardLayout>
              <Dashboard />
            </DashboardLayout>
          </WorkersProvider>
        )}
      </Route>
      <Route path={"/shops"}>
        {() => (
          <WorkersProvider>
            <DashboardLayout>
              <ShopsPage />
            </DashboardLayout>
          </WorkersProvider>
        )}
      </Route>
      <Route path={"/records"}>
        {() => (
          <WorkersProvider>
            <DashboardLayout>
              <WorkRecordsPage />
            </DashboardLayout>
          </WorkersProvider>
        )}
      </Route>
      <Route path={"/stats"}>
        {() => (
          <WorkersProvider>
            <DashboardLayout>
              <StatsPage />
            </DashboardLayout>
          </WorkersProvider>
        )}
      </Route>
      <Route path={"/settings"}>
        {() => (
          <WorkersProvider>
            <DashboardLayout>
              <SettingsPage />
            </DashboardLayout>
          </WorkersProvider>
        )}
      </Route>
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <AppPreferencesProvider>
            <AuthPrefetcher />
            <Toaster />
            <Router />
          </AppPreferencesProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
