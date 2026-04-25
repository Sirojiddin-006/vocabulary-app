import { useAuth } from "@/_core/hooks/useAuth";
import { getCopy } from "@/lib/appCopy";
import { useAppLocale } from "@/contexts/AppLocaleContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Globe2, Home, MoonStar, SunMedium, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import { useLocation } from "wouter";

const navItems = [
  { path: "/", key: "personal", icon: Home },
  { path: "/global", key: "global", icon: Globe2 },
  { path: "/profile", key: "profile", icon: UserRound },
] as const;

export function MobileAppShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  const [location, setLocation] = useLocation();
  const { locale, toggleLocale } = useAppLocale();
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated } = useAuth();
  const copy = getCopy(locale);

  return (
    <div className="min-h-screen w-full app-bg text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-32 pt-3 sm:px-6">
        <div className="sticky top-3 z-40 mb-5">
          <div className="glass-shell rounded-[28px] px-4 py-2.5 shadow-[0_18px_60px_rgba(15,23,42,0.14)]">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h1 className="truncate font-display text-lg font-semibold text-strong">
                  {title}
                </h1>
                {subtitle ? (
                  <p className="mt-0.5 line-clamp-1 text-xs text-dim">{subtitle}</p>
                ) : null}
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  className="glass-icon-button"
                  aria-label={copy.shell.language}
                  title={copy.shell.language}
                  onClick={toggleLocale}
                >
                  <span className="text-[10px] font-semibold tracking-[0.18em]">
                    {locale.toUpperCase()}
                  </span>
                </button>

                <button
                  type="button"
                  className="glass-icon-button"
                  aria-label={copy.shell.appearance}
                  title={copy.shell.appearance}
                  onClick={() => toggleTheme?.()}
                >
                  {theme === "light" ? (
                    <SunMedium className="h-3.5 w-3.5" />
                  ) : (
                    <MoonStar className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        <main className="flex-1">{children}</main>
      </div>

      {isAuthenticated ? (
        <div
          className="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4"
          style={{ bottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <div
            className="pointer-events-auto glass-bottom-nav glass-shell relative flex w-full max-w-md items-center justify-between overflow-hidden rounded-[30px] px-3 py-2 shadow-[0_24px_70px_rgba(15,23,42,0.2)]"
          >
            {navItems.map(item => {
              const isActive =
                item.path === "/"
                  ? location === item.path
                  : location === item.path || location.startsWith(`${item.path}/`);
              const Icon = item.icon;
              const label = copy.shell[item.key];

              return (
                <button
                  key={item.path}
                  onClick={() => setLocation(item.path)}
                  className={`glass-nav-item ${isActive ? "glass-nav-item-active" : ""}`}
                  type="button"
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-[11px] font-medium">{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
