import { useAuth } from "@/_core/hooks/useAuth";
import { EnglishSpeakButton } from "@/components/EnglishSpeakButton";
import { MobileAppShell } from "@/components/MobileAppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAppLocale } from "@/contexts/AppLocaleContext";
import { getCopy } from "@/lib/appCopy";
import { Loader2, Globe, Bookmark, BookmarkCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";
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
  const [openBookId, setOpenBookId] = useState<number | null>(null);

  const { data: folders = [], isLoading } =
    trpc.vocabulary.getGlobalFoldersWithCounts.useQuery(undefined, {
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
  const bookTitleById = new Map(books.map(book => [book.id, book.title]));
  const savedFolderIdSet = useMemo(
    () => new Set(savedGlobalFolderIds),
    [savedGlobalFolderIds]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [query]);

  const toggleSaveGlobalFolderMutation = trpc.vocabulary.toggleSaveGlobalFolder.useMutation({
    onSuccess: async (result) => {
      await Promise.all([
        utils.vocabulary.getSavedGlobalFolderIds.invalidate(),
        utils.vocabulary.getFolders.invalidate(),
        utils.auth.getTotalStats.invalidate(),
      ]);
      toast.success(result.saved ? "Saved to personal folders" : "Removed from personal folders");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update saved folder");
    },
  });

  const toggleSaveGlobalBookMutation = trpc.vocabulary.toggleSaveGlobalBook.useMutation({
    onSuccess: async (result) => {
      await Promise.all([
        utils.vocabulary.getSavedGlobalFolderIds.invalidate(),
        utils.vocabulary.getFolders.invalidate(),
        utils.auth.getTotalStats.invalidate(),
      ]);
      toast.success(result.saved ? "Book saved to personal folders" : "Book removed from personal folders");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update saved book");
    },
  });

  const visibleFolders = folders.filter(entry => entry.wordCount > 0);
  const matchedFolderIdSet = useMemo(
    () => new Set(matchedFolderIds),
    [matchedFolderIds]
  );
  const searchFilteredFolders = useMemo(() => {
    if (!trimmedQuery) return visibleFolders;
    return visibleFolders.filter(entry => matchedFolderIdSet.has(entry.folder.id));
  }, [trimmedQuery, visibleFolders, matchedFolderIdSet]);
  const bookFolders = useMemo(
    () => searchFilteredFolders.filter(entry => entry.folder.bookId),
    [searchFilteredFolders]
  );
  const standaloneFolders = useMemo(
    () => searchFilteredFolders.filter(entry => !entry.folder.bookId),
    [searchFilteredFolders]
  );
  const bookEntries = useMemo(() => {
    const stats = new Map<number, { book: (typeof books)[number]; unitCount: number; wordCount: number }>();
    books.forEach(book => {
      stats.set(book.id, { book, unitCount: 0, wordCount: 0 });
    });
    bookFolders.forEach(entry => {
      const bookId = entry.folder.bookId;
      if (!bookId) return;
      const current = stats.get(bookId);
      if (!current) return;
      current.unitCount += 1;
      current.wordCount += entry.wordCount;
    });
    return Array.from(stats.values()).filter(entry => entry.unitCount > 0);
  }, [books, bookFolders]);
  const unitsByBookId = useMemo(() => {
    const grouped = new Map<number, typeof bookFolders>();
    bookFolders.forEach(entry => {
      const bookId = entry.folder.bookId;
      if (!bookId) return;
      const existing = grouped.get(bookId) ?? [];
      existing.push(entry);
      grouped.set(bookId, existing);
    });

    grouped.forEach((entries, bookId) => {
      grouped.set(
        bookId,
        [...entries].sort((a, b) => (a.folder.unitNumber ?? 0) - (b.folder.unitNumber ?? 0))
      );
    });

    return grouped;
  }, [bookFolders]);
  const filteredFolders = useMemo(() => {
    const sorted = [...standaloneFolders].sort((a, b) => {
      if (sort === "az") {
        return a.folder.name.localeCompare(b.folder.name);
      }
      if (sort === "za") {
        return b.folder.name.localeCompare(a.folder.name);
      }
      return b.wordCount - a.wordCount;
    });
    return sorted;
  }, [sort, standaloneFolders]);

  const totalWords = searchFilteredFolders.reduce((sum, entry) => sum + entry.wordCount, 0);

  const isBookSaved = (bookId: number) => {
    const units = bookFolders.filter(entry => entry.folder.bookId === bookId);
    return units.length > 0 && units.every(entry => savedFolderIdSet.has(entry.folder.id));
  };

  const SaveButton = ({
    saved,
    onClick,
    pending,
  }: {
    saved: boolean;
    onClick: () => void;
    pending?: boolean;
  }) => (
    <Button
      type="button"
      variant="outline"
      disabled={pending}
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      className={saved
        ? "border-[#10B981] bg-[#10B981]/10 text-[#10B981] hover:bg-[#10B981]/15 rounded-full text-xs px-3 py-1"
        : "border-[var(--app-surface-border)] text-strong hover:bg-white/20 dark:hover:bg-white/5 rounded-full text-xs px-3 py-1"}
    >
      {saved ? <BookmarkCheck className="mr-1 h-3.5 w-3.5" /> : <Bookmark className="mr-1 h-3.5 w-3.5" />}
      {saved ? "Saved" : "Save"}
    </Button>
  );


  if (isLoading) {
    return (
      <div className="min-h-screen w-full app-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0EA5FF]" />
      </div>
    );
  }

  return (
    <MobileAppShell title={copy.global.title} subtitle={copy.global.subtitle}>
      <div className="mx-auto w-full max-w-6xl">
        <div className="surface-panel rounded-[28px] px-6 py-5 flex items-center gap-3">
          <Globe className="w-5 h-5 text-[#0EA5FF]" />
          <div>
            <p className="text-sm text-dim">{copy.global.title}</p>
            <p className="text-base text-strong">{copy.global.subtitle}</p>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl pt-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h2 className="text-lg font-semibold text-strong">{copy.global.overview}</h2>
          <div className="relative w-full md:max-w-md">
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={copy.global.searchPlaceholder}
              className="surface-card text-strong placeholder:text-dim"
            />
            {trimmedQuery.length > 0 ? (
              <div className="absolute top-full left-0 right-0 mt-2 surface-panel rounded-2xl shadow-xl z-20 max-h-64 overflow-y-auto">
                {matchedWords.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-dim">{copy.global.noWords}</div>
                ) : (
                  <div className="divide-y divide-white/5 dark:divide-white/5">
                    {matchedWords.map(word => (
                      <div
                        key={word.id}
                        className="flex items-center gap-2 px-4 py-3 hover:bg-white/30 dark:hover:bg-white/5 transition-colors"
                      >
                        <button
                          onClick={() => setLocation(`/global/folder/${word.folderId}`)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <p className="text-strong text-sm font-medium">{word.english}</p>
                          <p className="text-dim text-xs">
                            {word.folderName}
                            {word.bookId
                              ? ` • ${bookTitleById.get(word.bookId) ?? "Book"} • Unit ${word.unitNumber ?? "-"}`
                              : ""}
                          </p>
                        </button>
                        <EnglishSpeakButton text={word.english} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl pt-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="surface-card p-5 card-fade-in card-hover-glow" style={{ animationDelay: "40ms" }}>
            <p className="text-xs uppercase tracking-[0.2em] text-dim">{copy.global.folders}</p>
            <p className="text-2xl font-semibold mt-2 text-strong">{visibleFolders.length}</p>
          </Card>
          <Card className="surface-card p-5 card-fade-in card-hover-glow" style={{ animationDelay: "120ms" }}>
            <p className="text-xs uppercase tracking-[0.2em] text-dim">{copy.global.totalWords}</p>
            <p className="text-2xl font-semibold mt-2 text-strong">{totalWords}</p>
          </Card>
          <Card className="surface-card p-5 card-fade-in card-hover-glow" style={{ animationDelay: "200ms" }}>
            <p className="text-xs uppercase tracking-[0.2em] text-dim">{copy.global.activeTopics}</p>
            <p className="text-2xl font-semibold mt-2 text-strong">{filteredFolders.length}</p>
          </Card>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl pt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-strong">{copy.global.books}</h2>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl pt-4">
        {bookEntries.length === 0 ? (
          <div className="surface-panel text-center py-12 rounded-[28px]">
            <p className="text-dim">{copy.global.noBooks}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookEntries.map(({ book, unitCount, wordCount }) => {
              const isOpen = openBookId === book.id;
              const units = unitsByBookId.get(book.id) ?? [];

              return (
                <Card
                  key={book.id}
                  className="surface-card p-5 card-hover-glow"
                >
                  <div className="flex items-center justify-between gap-3">
                    <button
                      onClick={() => {
                        setOpenBookId(isOpen ? null : book.id);
                      }}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div>
                        <h3 className="text-strong font-semibold">{book.title}</h3>
                        {book.description && (
                          <p className="text-dim text-xs mt-1">{book.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-dim text-sm mt-3">
                          <span>{unitCount} {copy.global.units}</span>
                          <span>{wordCount} {copy.global.words}</span>
                        </div>
                      </div>
                    </button>
                    <div className="flex items-center gap-2">
                      <SaveButton
                        saved={isBookSaved(book.id)}
                        pending={toggleSaveGlobalBookMutation.isPending}
                        onClick={() => toggleSaveGlobalBookMutation.mutate({ bookId: book.id })}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setOpenBookId(isOpen ? null : book.id);
                        }}
                        className="border-[var(--app-surface-border)] text-strong hover:bg-white/20 dark:hover:bg-white/5 rounded-full text-xs px-3 py-1"
                      >
                        {isOpen ? copy.global.hide : copy.global.open}
                      </Button>
                    </div>
                  </div>

                  {isOpen ? (
                    <div className="mt-5 rounded-2xl border border-[var(--app-surface-border)] bg-white/20 dark:bg-[#0F1720] p-4">
                      <div className="space-y-2">
                        {units.map(entry => (
                          <div
                            key={entry.folder.id}
                            className="flex items-center justify-between rounded-xl border border-[var(--app-surface-border)] px-3 py-2 text-sm bg-white/20 dark:bg-[#111827] text-dim"
                          >
                            <span>Unit {entry.folder.unitNumber ?? "-"}</span>
                            <div className="flex items-center gap-2">
                              <SaveButton
                                saved={savedFolderIdSet.has(entry.folder.id)}
                                pending={toggleSaveGlobalFolderMutation.isPending}
                                onClick={() => toggleSaveGlobalFolderMutation.mutate({ folderId: entry.folder.id })}
                              />
                              <Button
                                onClick={() => setLocation(`/global/folder/${entry.folder.id}`)}
                                className="bg-[#0EA5FF] hover:bg-[#0c8fd9] text-white rounded-full text-xs px-3 py-1"
                              >
                                {copy.global.open}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <div className="mx-auto w-full max-w-6xl pt-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h2 className="text-lg font-semibold text-strong">{copy.global.folders}</h2>
          <div className="flex gap-2">
            <Button
              onClick={() => setSort("most")}
              variant="outline"
              className={sort === "most"
                ? "border-[#0EA5FF] text-[#0EA5FF] bg-[#0EA5FF]/10"
                : "border-[var(--app-surface-border)] text-strong hover:bg-white/20 dark:hover:bg-white/5"}
            >
              {copy.global.mostWords}
            </Button>
            <Button
              onClick={() => setSort("az")}
              variant="outline"
              className={sort === "az"
                ? "border-[#0EA5FF] text-[#0EA5FF] bg-[#0EA5FF]/10"
                : "border-[var(--app-surface-border)] text-strong hover:bg-white/20 dark:hover:bg-white/5"}
            >
              A - Z
            </Button>
            <Button
              onClick={() => setSort("za")}
              variant="outline"
              className={sort === "za"
                ? "border-[#0EA5FF] text-[#0EA5FF] bg-[#0EA5FF]/10"
                : "border-[var(--app-surface-border)] text-strong hover:bg-white/20 dark:hover:bg-white/5"}
            >
              Z - A
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 mx-auto w-full max-w-6xl py-8">
        {filteredFolders.length === 0 ? (
          <div className="surface-panel text-center py-16 rounded-[28px]">
            <Globe className="w-12 h-12 mx-auto mb-4 text-dim" />
            <p className="text-dim">{copy.global.noFolders}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredFolders.map(({ folder, wordCount }) => (
              <Card
                key={folder.id}
                className="surface-card p-5 card-hover-glow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-strong font-semibold">{folder.name}</h3>
                    <p className="text-dim text-sm">
                      {wordCount} {copy.global.words}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <SaveButton
                      saved={savedFolderIdSet.has(folder.id)}
                      pending={toggleSaveGlobalFolderMutation.isPending}
                      onClick={() => toggleSaveGlobalFolderMutation.mutate({ folderId: folder.id })}
                    />
                    <Button
                      onClick={() => setLocation(`/global/folder/${folder.id}`)}
                      className="bg-[#0EA5FF] hover:bg-[#0c8fd9] text-white rounded-full text-sm"
                    >
                      {copy.global.open}
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </MobileAppShell>
  );
}
