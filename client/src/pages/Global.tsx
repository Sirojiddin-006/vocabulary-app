import { useAuth } from "@/_core/hooks/useAuth";
import { BookCard } from "@/components/cards/BookCard";
import { FolderCard } from "@/components/cards/FolderCard";
import { MobileAppShell } from "@/components/MobileAppShell";
import { EnglishSpeakButton } from "@/components/EnglishSpeakButton";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppLocale } from "@/contexts/AppLocaleContext";
import { getCopy } from "@/lib/appCopy";
import { trpc } from "@/lib/trpc";
import { Bookmark, BookmarkCheck, Loader2, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const SEARCH_DEBOUNCE_MS = 250;

export default function Global() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { locale } = useAppLocale();
  const copy = getCopy(locale);
  const utils = trpc.useUtils();

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [sort, setSort] = useState<"most" | "az" | "za">("most");

  const { data: folders = [], isLoading } = trpc.vocabulary.getGlobalFoldersWithCounts.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: books = [] } = trpc.vocabulary.getGlobalBooks.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: savedGlobalFolderIds = [] } = trpc.vocabulary.getSavedGlobalFolderIds.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const trimmedQuery = debouncedQuery.trim();
  const { data: matchedFolderIds = [] } = trpc.vocabulary.searchGlobalFolders.useQuery(
    { query: trimmedQuery },
    { enabled: isAuthenticated && trimmedQuery.length > 0 }
  );
  const { data: matchedWords = [] } = trpc.vocabulary.searchGlobalWords.useQuery(
    { query: trimmedQuery },
    { enabled: isAuthenticated && trimmedQuery.length > 0 }
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  const toggleSaveGlobalFolderMutation = trpc.vocabulary.toggleSaveGlobalFolder.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.vocabulary.getSavedGlobalFolderIds.invalidate(),
        utils.vocabulary.getFolders.invalidate(),
        utils.auth.getTotalStats.invalidate(),
      ]);
    },
    onError: error => toast.error(error.message || copy.global.failedSavedFolder),
  });

  const toggleSaveGlobalBookMutation = trpc.vocabulary.toggleSaveGlobalBook.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.vocabulary.getSavedGlobalFolderIds.invalidate(),
        utils.vocabulary.getFolders.invalidate(),
        utils.auth.getTotalStats.invalidate(),
      ]);
    },
    onError: error => toast.error(error.message || copy.global.failedSavedBook),
  });

  const visibleFolders = folders.filter(entry => entry.wordCount > 0);
  const matchedFolderIdSet = useMemo(() => new Set(matchedFolderIds), [matchedFolderIds]);
  const searchFilteredFolders = useMemo(
    () => (trimmedQuery ? visibleFolders.filter(entry => matchedFolderIdSet.has(entry.folder.id)) : visibleFolders),
    [trimmedQuery, visibleFolders, matchedFolderIdSet]
  );

  const bookFolders = useMemo(() => searchFilteredFolders.filter(entry => entry.folder.bookId), [searchFilteredFolders]);
  const standaloneFolders = useMemo(() => searchFilteredFolders.filter(entry => !entry.folder.bookId), [searchFilteredFolders]);

  const sortedFolders = useMemo(() => {
    const result = [...standaloneFolders];
    result.sort((a, b) => {
      if (sort === "az") return a.folder.name.localeCompare(b.folder.name);
      if (sort === "za") return b.folder.name.localeCompare(a.folder.name);
      return b.wordCount - a.wordCount;
    });
    return result;
  }, [standaloneFolders, sort]);

  const unitsByBookId = useMemo(() => {
    const grouped = new Map<number, typeof bookFolders>();
    bookFolders.forEach(entry => {
      const id = entry.folder.bookId;
      if (!id) return;
      grouped.set(id, [...(grouped.get(id) ?? []), entry]);
    });
    return grouped;
  }, [bookFolders]);

  const bookEntries = useMemo(() => {
    return books
      .map(book => {
        const units = unitsByBookId.get(book.id) ?? [];
        return {
          book,
          units,
          unitCount: units.length,
          wordCount: units.reduce((sum, entry) => sum + entry.wordCount, 0),
        };
      })
      .filter(entry => entry.unitCount > 0);
  }, [books, unitsByBookId]);

  const savedFolderIdSet = useMemo(() => new Set(savedGlobalFolderIds), [savedGlobalFolderIds]);

  if (isLoading) {
    return (
      <div className="app-bg flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <MobileAppShell title={copy.global.title} subtitle={copy.global.subtitle}>
      <div className="space-y-6 pb-4">
        <section className="scholar-surface-elevated p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 scholar-muted" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={copy.global.searchPlaceholder}
              className="h-11 border-[var(--surface-border)] bg-[var(--surface)] pl-10 scholar-title"
            />
            {trimmedQuery.length > 0 ? (
              <div className="scholar-surface-elevated absolute top-full z-20 mt-2 max-h-64 w-full overflow-y-auto p-2">
                {matchedWords.length === 0 ? (
                  <p className="p-2 text-sm scholar-muted">{copy.global.noWords}</p>
                ) : (
                  <div className="space-y-1">
                    {matchedWords.map(word => (
                      <button
                        key={word.id}
                        onClick={() => setLocation(`/global/folder/${word.folderId}`)}
                        className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition hover:bg-[var(--accent-muted)]"
                      >
                        <div>
                          <p className="text-sm font-medium scholar-title">{word.english}</p>
                          <p className="text-xs scholar-muted">{word.folderName}</p>
                        </div>
                        <EnglishSpeakButton text={word.english} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-2xl font-semibold scholar-title">{copy.global.books}</h2>
          {bookEntries.length === 0 ? (
            <div className="scholar-surface p-8 text-center scholar-muted">{copy.global.noBooks}</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {bookEntries.map(({ book, units, unitCount, wordCount }) => {
                const isSaved = units.length > 0 && units.every(unit => savedFolderIdSet.has(unit.folder.id));
                return (
                  <BookCard
                    key={book.id}
                    title={book.title}
                    description={book.description || undefined}
                    unitCount={unitCount}
                    totalWords={wordCount}
                    knownWords={0}
                    isSaved={isSaved}
                    savePending={toggleSaveGlobalBookMutation.isPending}
                    onSave={() => toggleSaveGlobalBookMutation.mutate({ bookId: book.id })}
                    onOpen={() => setLocation(`/global/book/${book.id}/units`)}
                    actionLabel={copy.common.open}
                  />
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-2xl font-semibold scholar-title">{copy.global.folders}</h2>
            <div className="scholar-surface-elevated inline-flex items-center p-1">
              <SortButton active={sort === "most"} onClick={() => setSort("most")}>{copy.global.mostWords}</SortButton>
              <SortButton active={sort === "az"} onClick={() => setSort("az")}>{copy.global.sortAZ}</SortButton>
              <SortButton active={sort === "za"} onClick={() => setSort("za")}>{copy.global.sortZA}</SortButton>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="scholar-surface p-4">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="mt-2 h-4 w-24" />
                  <Skeleton className="mt-4 h-2 w-full" />
                  <Skeleton className="mt-4 h-9 w-20" />
                </div>
              ))}
            </div>
          ) : sortedFolders.length === 0 ? (
            <div className="scholar-surface p-8 text-center scholar-muted">{copy.global.noFolders}</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sortedFolders.map(({ folder, wordCount }) => (
                <FolderCard
                  key={folder.id}
                  name={folder.name}
                  wordCount={wordCount}
                  knownCount={0}
                  isSaved={savedFolderIdSet.has(folder.id)}
                  savePending={toggleSaveGlobalFolderMutation.isPending}
                  onSave={() => toggleSaveGlobalFolderMutation.mutate({ folderId: folder.id })}
                  onOpen={() => setLocation(`/global/folder/${folder.id}`)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </MobileAppShell>
  );
}

function SortButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "rounded-[10px] px-3 py-1.5 text-xs font-medium transition",
        active
          ? "bg-[var(--accent-muted)] text-[var(--accent)]"
          : "scholar-muted hover:bg-[var(--surface)] hover:text-[var(--text-primary)]",
      ].join(" ")}
    >
      {active ? <BookmarkCheck className="mr-1 inline h-3.5 w-3.5" /> : <Bookmark className="mr-1 inline h-3.5 w-3.5" />}
      {children}
    </button>
  );
}
