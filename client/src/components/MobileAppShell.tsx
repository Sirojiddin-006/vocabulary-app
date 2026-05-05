import { useAuth } from "@/_core/hooks/useAuth";
import { BottomNav } from "@/components/layout/BottomNav";
import { Header } from "@/components/layout/Header";
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
  avatar,
  leftSlot,
  rightActions,
  centeredHeader,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  avatar?: string;
  leftSlot?: ReactNode;
  rightActions?: ReactNode;
  centeredHeader?: boolean;
}) {
  const [location, setLocation] = useLocation();
  const { locale, toggleLocale } = useAppLocale();
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated } = useAuth();
  const copy = getCopy(locale);

  const defaultRightActions = (
    <>
      <button
        type="button"
        className="flex h-10 min-w-10 items-center justify-center rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] px-2 text-xs font-semibold tracking-[0.12em] scholar-title transition hover:border-[var(--accent)]"
        aria-label={copy.shell.language}
        title={copy.shell.language}
        onClick={toggleLocale}
      >
        {locale.toUpperCase()}
      </button>
      <button
        type="button"
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] scholar-title transition hover:border-[var(--accent)]"
        aria-label={copy.shell.appearance}
        title={copy.shell.appearance}
        onClick={() => toggleTheme?.()}
      >
        {theme === "light" ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
      </button>
    </>
  );

  return (
    <div className="app-bg w-full">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pb-32 pt-4 sm:px-6">
        <div className="sticky top-3 z-40 mb-5">
          <Header
            title={title}
            subtitle={subtitle}
            avatar={avatar}
            leftSlot={leftSlot}
            centered={centeredHeader}
            rightActions={rightActions ?? defaultRightActions}
          />
        </div>

        <main className="page-enter flex-1">{children}</main>
      </div>

      {isAuthenticated ? (
        <BottomNav
          items={navItems.map(item => ({
            ...item,
            label: copy.shell[item.key],
          }))}
          activePath={location}
          onNavigate={setLocation}
        />
      ) : null}
    </div>
  );
}
