import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { useAppLocale } from "@/contexts/AppLocaleContext";
import { getCopy } from "@/lib/appCopy";

type BookCardProps = {
  title: string;
  description?: string;
  unitCount: number;
  totalWords: number;
  knownWords: number;
  isSaved?: boolean;
  onOpen: () => void;
  onSave?: () => void;
  savePending?: boolean;
  actionLabel?: string;
};

export function BookCard({
  title,
  description,
  unitCount,
  totalWords,
  knownWords,
  isSaved,
  onOpen,
  onSave,
  savePending,
  actionLabel,
}: BookCardProps) {
  const { locale } = useAppLocale();
  const copy = getCopy(locale);
  const progress = totalWords > 0 ? (knownWords / totalWords) * 100 : 0;

  return (
    <Card className="scholar-surface p-5 hover-lift">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-lg font-semibold scholar-title">{title}</h3>
            {isSaved ? (
              <Badge className="rounded-[var(--radius-badge)] border-transparent bg-[var(--accent-muted)] text-[var(--accent)]">{copy.common.saved}</Badge>
            ) : null}
          </div>
          {description ? <p className="mt-1 text-sm scholar-muted line-clamp-2">{description}</p> : null}
        </div>

        {typeof isSaved === "boolean" ? (
          <button
            type="button"
            disabled={savePending}
            onClick={event => {
              event.stopPropagation();
              onSave?.();
            }}
            className="rounded-[var(--radius-badge)] border border-[var(--surface-border)] bg-[var(--surface-elevated)] px-2 py-1 text-xs scholar-muted transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            {isSaved ? copy.common.saved : copy.common.save}
          </button>
        ) : null}
      </div>

      <div className="mt-4 flex items-center justify-between text-sm scholar-muted">
        <span>{unitCount} {copy.common.units}</span>
        <span>{knownWords}/{totalWords} {copy.common.known}</span>
      </div>
      <div className="mt-2">
        <ProgressBar value={progress} max={100} />
      </div>

      <div className="mt-4 flex justify-end">
        <Button
          onClick={onOpen}
          className="h-9 rounded-[var(--radius-button)] bg-[var(--accent)] px-4 text-sm font-medium text-black hover:bg-[var(--accent-strong)] hover:text-white"
        >
          {actionLabel || copy.common.open}
        </Button>
      </div>
    </Card>
  );
}
