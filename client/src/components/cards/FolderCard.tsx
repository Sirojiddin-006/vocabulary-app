import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/ProgressBar";

type FolderCardProps = {
  name: string;
  wordCount: number;
  knownCount: number;
  isSaved?: boolean;
  onOpen: () => void;
  onSave?: () => void;
  savePending?: boolean;
};

export function FolderCard({
  name,
  wordCount,
  knownCount,
  isSaved,
  onOpen,
  onSave,
  savePending,
}: FolderCardProps) {
  const progress = wordCount > 0 ? (knownCount / wordCount) * 100 : 0;

  return (
    <Card className="scholar-surface p-4 hover-lift">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold scholar-title">{name}</h3>
          <p className="mt-1 text-sm scholar-muted">{wordCount} words</p>
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
            {isSaved ? "Saved" : "Save"}
          </button>
        ) : null}
      </div>

      <div className="mb-3">
        <ProgressBar value={progress} max={100} />
        <div className="mt-1 flex items-center justify-between text-xs scholar-muted">
          <span>{knownCount}/{wordCount} known</span>
          <span>{Math.round(progress)}%</span>
        </div>
      </div>

      <Button
        onClick={onOpen}
        className="h-9 rounded-[var(--radius-button)] bg-[var(--accent)] px-4 text-sm font-medium text-black hover:bg-[var(--accent-strong)] hover:text-white"
      >
        Open
      </Button>

      {isSaved ? (
        <Badge className="mt-3 rounded-[var(--radius-badge)] border-transparent bg-[var(--accent-muted)] text-[var(--accent)]">Saved</Badge>
      ) : null}
    </Card>
  );
}
