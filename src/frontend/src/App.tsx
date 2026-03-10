import { Toaster } from "@/components/ui/sonner";
import { LogIn, LogOut } from "lucide-react";
import { useState } from "react";
import { BottomNav } from "./components/BottomNav";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { AdminPage } from "./pages/AdminPage";
import { HomePage } from "./pages/HomePage";
import { MyTokensPage } from "./pages/MyTokensPage";
import { ServiceDetailPage } from "./pages/ServiceDetailPage";

export type Tab = "home" | "tokens" | "admin";
export type Page =
  | { tab: "home"; view: "list" }
  | { tab: "home"; view: "service"; serviceId: bigint }
  | { tab: "tokens"; view: "list" }
  | { tab: "admin"; view: "panel" };

export default function App() {
  const [page, setPage] = useState<Page>({ tab: "home", view: "list" });
  const { identity, login, clear, isLoggingIn } = useInternetIdentity();
  const isLoggedIn = !!identity;

  const currentTab = page.tab;

  function navigate(p: Page) {
    setPage(p);
  }

  function goToService(serviceId: bigint) {
    setPage({ tab: "home", view: "service", serviceId });
  }

  function goHome() {
    setPage({ tab: "home", view: "list" });
  }

  function setTab(tab: Tab) {
    if (tab === "home") setPage({ tab: "home", view: "list" });
    else if (tab === "tokens") setPage({ tab: "tokens", view: "list" });
    else setPage({ tab: "admin", view: "panel" });
  }

  const pageLabel =
    page.view === "service" && page.tab === "home"
      ? "Service"
      : currentTab === "tokens"
        ? "My Tokens"
        : currentTab === "admin"
          ? "Admin"
          : "Nearby";

  return (
    <div className="min-h-screen bg-background flex justify-center">
      <div className="w-full max-w-[430px] min-h-screen flex flex-col relative bg-background">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-sm font-bold">
                LF
              </span>
            </div>
            <div>
              <h1 className="text-base font-bold text-foreground leading-none tracking-tight">
                LineFree
              </h1>
              <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
                Skip the wait
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs text-muted-foreground bg-secondary px-2.5 py-1 rounded-full font-medium">
              {pageLabel}
            </div>
            {isLoggedIn ? (
              <button
                type="button"
                data-ocid="header.logout.button"
                onClick={clear}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2.5 py-1 rounded-full border border-border hover:border-primary/30 transition-all bg-white"
                title="Log out"
              >
                <LogOut size={13} />
                <span>Logout</span>
              </button>
            ) : (
              <button
                type="button"
                data-ocid="header.login.button"
                onClick={login}
                disabled={isLoggingIn}
                className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 px-2.5 py-1 rounded-full border border-primary/30 hover:border-primary/60 transition-all bg-primary/5 font-medium"
              >
                <LogIn size={13} />
                <span>{isLoggingIn ? "Logging in..." : "Login"}</span>
              </button>
            )}
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto pb-20">
          {page.tab === "home" && page.view === "list" && (
            <HomePage onSelectService={goToService} />
          )}
          {page.tab === "home" && page.view === "service" && (
            <ServiceDetailPage
              serviceId={page.serviceId}
              onBack={goHome}
              navigate={navigate}
            />
          )}
          {page.tab === "tokens" && (
            <MyTokensPage onSelectService={goToService} />
          )}
          {page.tab === "admin" && <AdminPage />}
        </main>

        {/* Bottom nav */}
        <BottomNav currentTab={currentTab} onTabChange={setTab} />
        <Toaster position="top-center" richColors />
      </div>
    </div>
  );
}
