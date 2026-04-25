import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type HeaderProps = {
  title: string;
  subtitle?: string;
  avatar?: string;
  rightActions?: ReactNode;
  leftSlot?: ReactNode;
  centered?: boolean;
  className?: string;
};

export function Header({
  title,
  subtitle,
  avatar,
  rightActions,
  leftSlot,
  centered = false,
  className,
}: HeaderProps) {
  return (
    <header className={cn("app-header scholar-surface-elevated px-4 py-3 page-enter", className)}>
      <div className={cn("flex items-center gap-3", centered ? "justify-between" : "justify-between")}> 
        {leftSlot ?? (avatar ? (
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-muted)] text-sm font-semibold scholar-title">
            {avatar}
          </div>
        ) : <div className="h-10 w-10" />)}

        <div className={cn("min-w-0 flex-1", centered ? "text-center" : "") }>
          <h1 className="truncate font-display text-2xl font-semibold scholar-title">{title}</h1>
          {subtitle ? <p className="truncate text-sm scholar-muted">{subtitle}</p> : null}
        </div>

        <div className="flex min-w-[88px] items-center justify-end gap-2">{rightActions}</div>
      </div>
    </header>
  );
}
