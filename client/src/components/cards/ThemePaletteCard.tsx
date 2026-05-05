import { cn } from "@/lib/utils";
import { useAppLocale } from "@/contexts/AppLocaleContext";
import { getCopy } from "@/lib/appCopy";

type ThemePaletteCardProps = {
  name: string;
  description: string;
  colors: string[];
  isActive: boolean;
  onClick: () => void;
};

export function ThemePaletteCard({ name, description, colors, isActive, onClick }: ThemePaletteCardProps) {
  const { locale } = useAppLocale();
  const copy = getCopy(locale);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "scholar-surface w-full p-4 text-left transition hover-lift",
        isActive && "border-[var(--accent)] bg-[var(--accent-muted)]"
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-base font-semibold scholar-title">{name}</p>
          <p className="text-sm scholar-muted">{description}</p>
        </div>
        {isActive ? <span className="rounded-[var(--radius-badge)] bg-[var(--accent)] px-2 py-1 text-xs font-semibold text-black">{copy.common.active}</span> : null}
      </div>
      <div className="flex items-center gap-2">
        {colors.map(color => (
          <span
            key={`${name}-${color}`}
            className="h-8 w-8 rounded-lg border border-white/20"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
    </button>
  );
}
