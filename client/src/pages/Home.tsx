import { useAuth } from "@/_core/hooks/useAuth";
import { BookCard } from "@/components/cards/BookCard";
import { FolderCard } from "@/components/cards/FolderCard";
import { StatCard } from "@/components/cards/StatCard";
import { MobileAppShell } from "@/components/MobileAppShell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { Skeleton } from "@/components/ui/skeleton";
import { APP_TITLE, AUTH_SIGNIN_PATH, AUTH_SIGNUP_PATH } from "@/const";
import { useAppLocale } from "@/contexts/AppLocaleContext";
import { getCopy } from "@/lib/appCopy";
import { trpc } from "@/lib/trpc";
import { BookOpen, CheckCircle2, FolderOpen, Loader2, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

function useCountUp(target: number) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const duration = 700;
    const stepMs = 28;
    const steps = Math.max(1, Math.floor(duration / stepMs));
    const increment = target / steps;
    let current = 0;
    let index = 0;

    const timer = window.setInterval(() => {
      index += 1;
      current += increment;
      if (index >= steps) {
        setValue(target);
        window.clearInterval(timer);
        return;
      }
      setValue(Math.round(current));
    }, stepMs);

    return () => window.clearInterval(timer);
  }, [target]);

  return value;
}

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { locale } = useAppLocale();
  const copy = getCopy(locale);
  const utils = trpc.useUtils();

  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const { data: folders = [], isLoading: foldersLoading, isError: foldersError } = trpc.vocabulary.getFolders.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: globalBooks = [], isError: globalBooksError } = trpc.vocabulary.getGlobalBooks.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: totalStats, isError: totalStatsError } = trpc.auth.getTotalStats.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const createFolderMutation = trpc.vocabulary.createFolder.useMutation({
    onSuccess: async () => {
      setNewFolderName("");
      setShowNewFolderDialog(false);
      await Promise.all([
        utils.vocabulary.getFolders.invalidate(),
        utils.auth.getTotalStats.invalidate(),
      ]);
    },
    onError: error => {
      toast.error(error.message || copy.home.failedCreateFolder);
    },
  });

  const toggleSaveGlobalBookMutation = trpc.vocabulary.toggleSaveGlobalBook.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.vocabulary.getFolders.invalidate(),
        utils.vocabulary.getSavedGlobalFolderIds.invalidate(),
        utils.auth.getTotalStats.invalidate(),
      ]);
    },
    onError: error => {
      toast.error(error.message || copy.global.failedSavedBook);
    },
  });

  const totalWords = totalStats?.totalWords || 0;
  const knownWords = totalStats?.knownWords || 0;
  const masteredPct = totalWords > 0 ? Math.round((knownWords / totalWords) * 100) : 0;

  const savedBookUnits = useMemo(() => folders.filter(folder => folder.sourceGlobalFolderId && folder.bookId), [folders]);
  const standaloneFolders = useMemo(() => folders.filter(folder => !(folder.sourceGlobalFolderId && folder.bookId)), [folders]);
  const bookTitleById = useMemo(() => new Map(globalBooks.map(book => [book.id, book])), [globalBooks]);

  const savedBooks = useMemo(() => {
    const grouped = new Map<number, typeof savedBookUnits>();
    savedBookUnits.forEach(folder => {
      if (!folder.bookId) return;
      const existing = grouped.get(folder.bookId) ?? [];
      existing.push(folder);
      grouped.set(folder.bookId, existing);
    });

    return Array.from(grouped.entries()).map(([bookId, units]) => ({
      bookId,
      book: bookTitleById.get(bookId),
      units,
    }));
  }, [savedBookUnits, bookTitleById]);

  const recommendedFolder = useMemo(
    () => standaloneFolders.find(f => f.name.toLowerCase().includes("tech")) ?? standaloneFolders[0],
    [standaloneFolders]
  );

  const foldersCounter = useCountUp(folders.length);
  const wordsCounter = useCountUp(totalWords);
  const knownCounter = useCountUp(knownWords);

  if (loading) {
    return (
      <div className="app-bg flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="app-bg flex min-h-screen items-center justify-center px-6">
        <div className="scholar-surface-elevated mx-auto w-full max-w-4xl p-8">
          <div className="flex flex-col gap-7 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <p className="text-xs uppercase tracking-[0.28em] scholar-muted">{copy.home.heroEyebrow}</p>
              <h1 className="mt-2 font-display text-5xl font-semibold scholar-title">{APP_TITLE}</h1>
              <p className="mt-4 text-base scholar-muted">{copy.home.heroDescription}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  className="h-11 rounded-[var(--radius-button)] bg-[var(--accent)] px-6 text-black hover:bg-[var(--accent-strong)] hover:text-white"
                  onClick={() => setLocation(AUTH_SIGNIN_PATH)}
                >
                  {copy.home.signIn}
                </Button>
                <Button
                  variant="outline"
                  className="h-11 rounded-[var(--radius-button)] border-[var(--surface-border)] bg-transparent px-6 scholar-title hover:bg-[var(--accent-muted)]"
                  onClick={() => setLocation(AUTH_SIGNUP_PATH)}
                >
                  {copy.home.createAccount}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (foldersError || globalBooksError || totalStatsError) {
    return (
      <div className="flex items-center justify-center min-h-[200px] text-destructive">
        Failed to load. Please refresh and try again.
      </div>
    );
  }

  return (
    <MobileAppShell
      title={copy.home.title}
      subtitle={`${copy.home.welcome}, ${user?.name || copy.profile.defaultName}`}
      avatar={(user?.name || "A").slice(0, 1).toUpperCase()}
    >
      <div className="space-y-6">
        <section className="grid gap-3 md:grid-cols-3">
          <StatCard
            icon={<FolderOpen className="h-4 w-4" />}
            label={copy.home.folders}
            value={foldersCounter}
            trend={folders.length > 0 ? copy.home.foldersTrend : copy.home.foldersTrendEmpty}
          />
          <StatCard
            icon={<BookOpen className="h-4 w-4" />}
            label={copy.home.totalWords}
            value={wordsCounter}
            trend={`${masteredPct}% ${copy.home.mastered}`}
          />
          <StatCard
            icon={<CheckCircle2 className="h-4 w-4" />}
            label={copy.home.known}
            value={knownCounter}
            trend={knownWords === 0 ? copy.home.keepGoing : copy.home.greatMomentum}
          />
        </section>

        <section className="scholar-surface-elevated p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-2xl font-semibold scholar-title">{copy.home.progress}</h2>
            <p className="text-sm scholar-muted">{knownWords} / {totalWords} {copy.home.wordsMastered}</p>
          </div>
          <ProgressBar value={knownWords} max={Math.max(1, totalWords)} heightClassName="h-3" />
          <p className="mt-3 text-sm scholar-muted">
            {masteredPct}% {copy.home.known.toLowerCase()}.
            {recommendedFolder
              ? ` ${copy.home.startWithFolder.replace("{name}", recommendedFolder.name)}`
              : ` ${copy.home.addFirstFolder}`}
          </p>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-2xl font-semibold scholar-title">{copy.global.books}</h2>
            <Button
              onClick={() => setShowNewFolderDialog(true)}
              className="h-10 rounded-[var(--radius-button)] bg-[var(--accent)] px-4 text-black hover:bg-[var(--accent-strong)] hover:text-white"
            >
              <Plus className="mr-1 h-4 w-4" />
              {copy.home.newFolder}
            </Button>
          </div>

          {foldersLoading ? (
            <div className="grid gap-3">
              {Array.from({ length: 2 }).map((_, idx) => (
                <div key={idx} className="scholar-surface p-5">
                  <Skeleton className="h-6 w-56" />
                  <Skeleton className="mt-2 h-4 w-full" />
                  <Skeleton className="mt-4 h-2 w-full" />
                  <Skeleton className="mt-4 h-9 w-24" />
                </div>
              ))}
            </div>
          ) : savedBooks.length === 0 ? (
            <div className="scholar-surface p-8 text-center scholar-muted">{copy.home.noSavedBooks}</div>
          ) : (
            <div className="space-y-3">
              {savedBooks.map(({ bookId, book, units }) => (
                <BookCard
                  key={bookId}
                  title={book?.title ?? `${copy.home.bookFallback} ${bookId}`}
                  description={book?.description || copy.home.defaultBookDescription}
                  unitCount={units.length}
                  totalWords={units.length * 20}
                  knownWords={0}
                  isSaved
                  savePending={toggleSaveGlobalBookMutation.isPending}
                  onSave={() => toggleSaveGlobalBookMutation.mutate({ bookId })}
                  onOpen={() => setLocation(`/book/${bookId}/units`)}
                  actionLabel={copy.common.open}
                />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3 pb-4">
          <h2 className="font-display text-2xl font-semibold scholar-title">{copy.home.folders}</h2>
          {foldersLoading ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
              {Array.from({ length: 4 }).map((_, idx) => (
                <div key={idx} className="scholar-surface p-4">
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="mt-2 h-4 w-20" />
                  <Skeleton className="mt-4 h-2 w-full" />
                  <Skeleton className="mt-4 h-9 w-24" />
                </div>
              ))}
            </div>
          ) : standaloneFolders.length === 0 ? (
            <div className="scholar-surface p-8 text-center scholar-muted">{copy.home.noFolders}</div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
              {standaloneFolders.map(folder => (
                <FolderProgressCard
                  key={folder.id}
                  folder={folder}
                  onOpen={() => setLocation(`/folder/${folder.id}`)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent className="scholar-surface-elevated border-[var(--surface-border)]">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{copy.home.createNewFolder}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder={copy.home.folderNamePlaceholder}
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              className="border-[var(--surface-border)] bg-[var(--surface)] scholar-title"
            />
            <Button
              onClick={() => {
                if (!newFolderName.trim()) return;
                createFolderMutation.mutate({
                  name: newFolderName,
                  description: null,
                });
              }}
              disabled={!newFolderName.trim() || createFolderMutation.isPending}
              className="h-10 w-full rounded-[var(--radius-button)] bg-[var(--accent)] text-black hover:bg-[var(--accent-strong)] hover:text-white"
            >
              {createFolderMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : copy.home.createFolder}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </MobileAppShell>
  );
}

function FolderProgressCard({ folder, onOpen }: { folder: any; onOpen: () => void }) {
  const { data: progress } = trpc.vocabulary.getProgress.useQuery({ folderId: folder.id });

  return (
    <FolderCard
      name={folder.name}
      wordCount={progress?.totalWords || 0}
      knownCount={progress?.knownWords || 0}
      isSaved={Boolean(folder.sourceGlobalFolderId)}
      onOpen={onOpen}
    />
  );
}
