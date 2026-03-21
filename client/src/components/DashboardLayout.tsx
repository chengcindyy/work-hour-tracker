import { useAuth } from "@/_core/hooks/useAuth";
import { useWorkerSelection } from "@/_core/hooks/useWorkers";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/useMobile";
import { useUpdateAvailable } from "@/hooks/useUpdateAvailable";
import { LayoutDashboard, LogOut, Store, FileText, BarChart3, Settings } from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation, Link } from "wouter";
import { toast } from "sonner";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

const menuItems = [
  { icon: LayoutDashboard, label: "首頁", path: "/dashboard" },
  { icon: Store, label: "店家設定", path: "/shops" },
  { icon: FileText, label: "工時紀錄", path: "/records" },
  { icon: BarChart3, label: "統計", path: "/stats" },
  { icon: Settings, label: "設定", path: "/settings" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = "/";
    }
  }, [loading, user]);

  if (loading || !user) {
    return <DashboardLayoutSkeleton />;
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const { hasUpdate } = useUpdateAvailable();
  const hasShownUpdateToast = useRef(false);
  const { workers, selectedWorkerId, setSelectedWorkerId, isLoading: workersLoading } =
    useWorkerSelection();
  const [location, navigate] = useLocation();
  const { state, toggleSidebar, setOpenMobile } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find(item => item.path === location);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    if (hasUpdate && !hasShownUpdateToast.current) {
      hasShownUpdateToast.current = true;
      toast.info("應用程式有新版本", {
        description: "請到設定頁面點選「檢查更新」以取得最新版本",
        action: {
          label: "前往設定",
          onClick: () => navigate("/settings"),
        },
      });
    }
  }, [hasUpdate]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-auto justify-center py-4">
            <div className="flex flex-col items-center gap-1 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="flex flex-col items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-ring w-full"
                aria-label="切換導航"
              >
                <img
                  src="/clock-icon.png"
                  alt="工時登記系統"
                  className={`object-contain transition-all duration-200 ${
                    isCollapsed ? "w-8 h-8" : "w-20 h-20"
                  }`}
                />
                {!isCollapsed && (
                  <span className="font-bold text-sm tracking-tight text-foreground text-center leading-tight">
                    工時登記系統
                  </span>
                )}
              </button>
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              {menuItems.map(item => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                      className={`h-10 transition-all font-normal`}
                    >
                      <Link
                        href={item.path}
                        onClick={() => isMobile && setOpenMobile(false)}
                      >
                        <item.icon
                          className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                        />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onSelect={() => void logout()}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>登出</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {isMobile && (
          <div className="flex border-b min-h-14 items-center justify-between bg-background/95 px-2 pt-[env(safe-area-inset-top)] pb-2 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
              <div className="flex items-center gap-3">
                <div className="flex flex-col gap-1">
                  <span className="tracking-tight text-foreground">
                    {activeMenuItem?.label ?? "選單"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 成員選擇列 */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2 gap-3">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">
              目前成員
            </span>
            <span className="text-sm text-foreground font-medium">
              {workersLoading
                ? "載入中..."
                : workers.length === 0
                ? "尚未建立成員"
                : workers.find(w => w.id === selectedWorkerId)?.name ?? "未選擇"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={selectedWorkerId != null ? String(selectedWorkerId) : undefined}
              onValueChange={value => {
                const id = parseInt(value, 10);
                if (!Number.isNaN(id)) {
                  setSelectedWorkerId(id);
                }
              }}
              disabled={workersLoading || workers.length === 0}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder={workersLoading ? "載入中..." : "選擇成員"} />
              </SelectTrigger>
              <SelectContent>
                {workers.map(worker => (
                  <SelectItem key={worker.id} value={String(worker.id)}>
                    {worker.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" asChild>
              <Link
                href="/settings"
                onClick={() => isMobile && setOpenMobile(false)}
              >
                成員管理
              </Link>
            </Button>
          </div>
        </div>

        <main
          className={`flex-1 p-4 ${isMobile ? "pb-24" : ""}`}
        >
          {children}
        </main>
      </SidebarInset>
    </>
  );
}
