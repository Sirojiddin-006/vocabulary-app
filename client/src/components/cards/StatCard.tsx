import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type StatCardProps = {
  icon: ReactNode;
  label: string;
  value: number | string;
  trend?: string;
  className?: string;
};

export function StatCard({ icon, label, value, trend, className }: StatCardProps) {
  return (
    <Card className={cn("scholar-surface p-4 hover-lift", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium scholar-muted">{label}</p>
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-muted)] text-[var(--accent)]">
          {icon}
        </div>
      </div>
      <p className="mt-3 text-2xl font-semibold scholar-title">{value}</p>
      {trend ? <p className="mt-1 text-xs scholar-muted">{trend}</p> : null}
    </Card>
  );
}
