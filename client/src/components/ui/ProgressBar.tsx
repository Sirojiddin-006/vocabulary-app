import { cn } from "@/lib/utils";

type ProgressBarProps = {
  value: number;
  max?: number;
  heightClassName?: string;
  className?: string;
};

export function ProgressBar({ value, max = 100, heightClassName = "h-2.5", className }: ProgressBarProps) {
  const safeMax = max <= 0 ? 1 : max;
  const percent = Math.min(100, Math.max(0, (value / safeMax) * 100));

  return (
    <div className={cn("progress-track", heightClassName, className)}>
      <div className="progress-fill" style={{ width: `${percent}%` }} />
    </div>
  );
}
