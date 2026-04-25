import { useAuth } from "@/_core/hooks/useAuth";
import { MobileAppShell } from "@/components/MobileAppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppLocale } from "@/contexts/AppLocaleContext";
import { getCopy } from "@/lib/appCopy";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, BookOpen, FolderOpen } from "lucide-react";
import { useMemo } from "react";
import { useLocation, useParams } from "wouter";

export default function BookUnitsPage() {
  const { isAuthenticated } = useAuth();
  const { locale } = useAppLocale();
  const copy = getCopy(locale);
  const params = useParams();
  const [location, setLocation] = useLocation();
  const bookId = Number(params.bookId || 0);
  const isGlobal = location.startsWith("/global/");

  const { data: books = [], isLoading: booksLoading } = trpc.vocabulary.getGlobalBooks.useQuery(undefined, {
    enabled: isAuthenticated && bookId > 0,
  });
  const { data: personalFolders = [], isLoading: personalUnitsLoading } = trpc.vocabulary.getFolders.useQuery(undefined, {
    enabled: isAuthenticated && bookId > 0 && !isGlobal,
  });
  const { data: globalFolders = [], isLoading: globalUnitsLoading } = trpc.vocabulary.getGlobalFoldersWithCounts.useQuery(undefined, {
    enabled: isAuthenticated && bookId > 0 && isGlobal,
  });

  const book = useMemo(() => books.find(item => item.id === bookId), [books, bookId]);
  const units = useMemo(() => {
    if (isGlobal) {
      return globalFolders
        .filter(entry => entry.folder.bookId === bookId)
        .sort((a, b) => (a.folder.unitNumber ?? 0) - (b.folder.unitNumber ?? 0))
        .map(entry => ({
          id: entry.folder.id,
          name: entry.folder.name || `Unit ${entry.folder.unitNumber ?? "-"}`,
          unitNumber: entry.folder.unitNumber ?? null,
          wordCount: entry.wordCount,
          to: `/global/folder/${entry.folder.id}`,
        }));
    }

    return personalFolders
      .filter(folder => folder.bookId === bookId)
      .sort((a, b) => (a.unitNumber ?? 0) - (b.unitNumber ?? 0))
      .map(folder => ({
        id: folder.id,
        name: folder.name || `Unit ${folder.unitNumber ?? "-"}`,
        unitNumber: folder.unitNumber ?? null,
        wordCount: 0,
        to: `/folder/${folder.id}`,
      }));
  }, [isGlobal, globalFolders, personalFolders, bookId]);

  const isLoading = booksLoading || personalUnitsLoading || globalUnitsLoading;
  const backTo = isGlobal ? "/global" : "/";

  if (!bookId || Number.isNaN(bookId)) {
    return (
      <MobileAppShell title="Book units" subtitle="Invalid book">
        <div className="scholar-surface p-8 text-center">
          <p className="scholar-muted">Invalid book id.</p>
          <Button className="mt-4" onClick={() => setLocation(backTo)}>
            Go back
          </Button>
        </div>
      </MobileAppShell>
    );
  }

  return (
    <MobileAppShell
      title={book?.title || "Book units"}
      subtitle={book ? `${units.length} units` : "Loading book"}
      leftSlot={
        <button
          type="button"
          onClick={() => setLocation(backTo)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] scholar-title transition hover:border-[var(--accent)]"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
      }
    >
      <div className="space-y-4 pb-4">
        <div className="scholar-surface-elevated p-4">
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-muted)] text-[var(--accent)]">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-semibold scholar-title">
                {book?.title || copy.global.books}
              </h2>
              <p className="text-sm scholar-muted">{units.length} units</p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="scholar-surface p-4">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="mt-2 h-4 w-20" />
                <Skeleton className="mt-4 h-9 w-20" />
              </div>
            ))}
          </div>
        ) : !book ? (
          <div className="scholar-surface p-8 text-center">
            <p className="scholar-muted">Book not found.</p>
          </div>
        ) : units.length === 0 ? (
          <div className="scholar-surface p-8 text-center">
            <p className="scholar-muted">No units found for this book.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {units.map(unit => (
              <Card key={unit.id} className="scholar-surface p-4 hover-lift">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <FolderOpen className="h-4 w-4 text-[var(--accent)]" />
                      <h3 className="truncate text-base font-semibold scholar-title">
                        {unit.name}
                      </h3>
                    </div>
                    <p className="mt-1 text-sm scholar-muted">
                      Unit {unit.unitNumber ?? "-"}
                      {unit.wordCount > 0 ? ` • ${unit.wordCount} words` : ""}
                    </p>
                  </div>
                  <Button
                    onClick={() => setLocation(unit.to)}
                    className="h-9 rounded-[var(--radius-button)] bg-[var(--accent)] px-4 text-black hover:bg-[var(--accent-strong)] hover:text-white"
                  >
                    Open
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MobileAppShell>
  );
}
