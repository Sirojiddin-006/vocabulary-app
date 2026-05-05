import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type NavItem = {
  path: string;
  label: string;
  icon: LucideIcon;
};

type BottomNavProps = {
  items: NavItem[];
  activePath: string;
  onNavigate: (path: string) => void;
};

export function BottomNav({ items, activePath, onNavigate }: BottomNavProps) {
  const activeIndex = Math.max(
    0,
    items.findIndex(item => item.path === "/" ? activePath === "/" : activePath === item.path || activePath.startsWith(`${item.path}/`))
  );

  return (
    <nav className="bottom-nav">
      <div className="relative flex w-full items-center gap-2">
        <div
          className="pointer-events-none absolute bottom-0 top-0 rounded-[20px] border border-[var(--accent-muted)] bg-[var(--accent-muted)] transition-transform duration-300"
          style={{
            width: `calc((100% - ${(items.length - 1) * 8}px) / ${items.length})`,
            transform: `translateX(calc(${activeIndex} * (100% + 8px)))`,
          }}
        />
        {items.map(item => {
          const isActive = item.path === "/" ? activePath === "/" : activePath === item.path || activePath.startsWith(`${item.path}/`);
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              type="button"
              onClick={() => onNavigate(item.path)}
              className={cn(
                "relative z-10 flex flex-1 flex-col items-center gap-1 rounded-[20px] px-3 py-2 text-xs transition-colors",
                isActive ? "text-[var(--accent)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="leading-none">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
