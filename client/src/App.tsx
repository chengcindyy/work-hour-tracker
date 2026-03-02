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

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/dashboard"}>
        {() => (
          <DashboardLayout>
            <Dashboard />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/shops"}>
        {() => (
          <DashboardLayout>
            <ShopsPage />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/records"}>
        {() => (
          <DashboardLayout>
            <WorkRecordsPage />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/stats"}>
        {() => (
          <DashboardLayout>
            <StatsPage />
          </DashboardLayout>
        )}
      </Route>
      <Route path={"/settings"}>
        {() => (
          <DashboardLayout>
            <SettingsPage />
          </DashboardLayout>
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
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
