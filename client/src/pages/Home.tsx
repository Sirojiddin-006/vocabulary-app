import { useAuth } from "@/_core/hooks/useAuth";
import { MobileAppShell } from "@/components/MobileAppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAppLocale } from "@/contexts/AppLocaleContext";
import { getCopy } from "@/lib/appCopy";
import { BookmarkX, Loader2, Plus, BookOpen } from "lucide-react";
import { APP_TITLE, AUTH_SIGNIN_PATH, AUTH_SIGNUP_PATH } from "@/const";
import { trpc } from "@/lib/trpc";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { locale } = useAppLocale();
  const copy = getCopy(locale);
  const utils = trpc.useUtils();
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [openBookId, setOpenBookId] = useState<number | null>(null);

  // Fetch folders
  const { data: folders = [], isLoading: foldersLoading } = trpc.vocabulary.getFolders.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );
  const { data: globalBooks = [] } = trpc.vocabulary.getGlobalBooks.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  // Fetch total statistics
  const { data: totalStats } = trpc.auth.getTotalStats.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  // Create folder mutation
  const createFolderMutation = trpc.vocabulary.createFolder.useMutation({
    onSuccess: () => {
      setNewFolderName("");
      setShowNewFolderDialog(false);
      // Invalidate folders query to refresh
      utils.vocabulary.getFolders.invalidate();
      utils.auth.getTotalStats.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create folder");
    },
  });
  const toggleSaveGlobalBookMutation = trpc.vocabulary.toggleSaveGlobalBook.useMutation({
    onSuccess: async (result) => {
      toast.success(result.saved ? "Book saved to personal folders" : "Book removed from personal folders");
      await Promise.all([
        utils.vocabulary.getFolders.invalidate(),
        utils.vocabulary.getSavedGlobalFolderIds.invalidate(),
        utils.auth.getTotalStats.invalidate(),
        utils.auth.getGlobalStats.invalidate(),
      ]);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update saved book");
    },
  });

  const totalWords = totalStats?.totalWords || 0;
  const knownWords = totalStats?.knownWords || 0;
  const unknownWords = totalStats?.unknownWords || 0;
  const knownPercentage = totalWords > 0 ? (knownWords / totalWords) * 100 : 0;
  const unknownPercentage = totalWords > 0 ? (unknownWords / totalWords) * 100 : 0;
  const savedBookUnits = useMemo(
    () => folders.filter(folder => folder.sourceGlobalFolderId && folder.bookId),
    [folders]
  );
  const standaloneFolders = useMemo(
    () => folders.filter(folder => !(folder.sourceGlobalFolderId && folder.bookId)),
    [folders]
  );
  const bookTitleById = useMemo(
    () => new Map(globalBooks.map(book => [book.id, book])),
    [globalBooks]
  );
  const savedBooks = useMemo(() => {
    const grouped = new Map<number, typeof savedBookUnits>();
    savedBookUnits.forEach(folder => {
      if (!folder.bookId) return;
      const existing = grouped.get(folder.bookId) ?? [];
      existing.push(folder);
      grouped.set(folder.bookId, existing);
    });

    return Array.from(grouped.entries())
      .map(([bookId, units]) => ({
        bookId,
        book: bookTitleById.get(bookId),
        units: [...units].sort((a, b) => (a.unitNumber ?? 0) - (b.unitNumber ?? 0)),
      }))
      .sort((a, b) => a.bookId - b.bookId);
  }, [bookTitleById, savedBookUnits]);

  if (loading) {
    return (
      <div className="min-h-screen w-full app-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0EA5FF]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-full app-bg text-foreground flex items-center justify-center px-6">
        <div className="w-full max-w-4xl mx-auto">
          <div className="surface-panel rounded-3xl p-8 md:p-12">
            <div className="flex flex-col md:flex-row gap-10 items-center">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-12 w-12 rounded-2xl bg-[#0EA5FF]/20 flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-[#0EA5FF]" />
                  </div>
                  <span className="text-sm uppercase tracking-[0.35em] text-[#A6B0BE]">
                    Vocabulary
                  </span>
                </div>
                <h1 className="font-display text-4xl md:text-5xl font-semibold mb-4">
                  {APP_TITLE}
                </h1>
                <p className="text-dim text-lg mb-8">
                  Learn English vocabulary with focused flashcards and clear progress.
                  Practice daily and see your growth.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={() => setLocation(AUTH_SIGNIN_PATH)}
                    className="bg-[#0EA5FF] hover:bg-[#0c8fd9] text-white py-6 rounded-full font-semibold"
                  >
                    {copy.home.signIn}
                  </Button>
                  <Button
                    onClick={() => setLocation(AUTH_SIGNUP_PATH)}
                    variant="outline"
                    className="border-[#0EA5FF] text-[#0EA5FF] hover:bg-[#0EA5FF]/10 py-6 rounded-full font-semibold"
                  >
                    {copy.home.createAccount}
                  </Button>
                </div>
              </div>
              <div className="flex-1 w-full">
                <div className="grid grid-cols-2 gap-4">
                  <Card className="surface-card p-5 card-fade-in card-hover-glow" style={{ animationDelay: "40ms" }}>
                    <p className="text-sm text-dim">{copy.home.dailyStreak}</p>
                    <p className="text-2xl font-semibold mt-2 text-strong">7 days</p>
                  </Card>
                  <Card className="surface-card p-5 card-fade-in card-hover-glow" style={{ animationDelay: "120ms" }}>
                    <p className="text-sm text-dim">{copy.home.wordsToday}</p>
                    <p className="text-2xl font-semibold mt-2 text-strong">20+</p>
                  </Card>
                  <Card className="surface-card p-5 col-span-2 card-fade-in card-hover-glow" style={{ animationDelay: "200ms" }}>
                    <p className="text-sm text-dim">{copy.home.keepSimple}</p>
                    <p className="text-lg mt-2 text-strong">
                      {copy.home.simpleText}
                    </p>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <MobileAppShell title={copy.home.title} subtitle={copy.home.eyebrow}>
      <div className="mx-auto w-full max-w-6xl">
        <div className="surface-panel rounded-[28px] px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-dim">{copy.home.welcome}</p>
              <p className="text-xl font-semibold text-strong">{user?.name || "Learner"}</p>
            </div>
            <Button
              onClick={() => setShowNewFolderDialog(true)}
              className="bg-[#0EA5FF] hover:bg-[#0c8fd9] text-white rounded-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              {copy.home.newFolder}
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl pt-6">
        <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
          <Card className="surface-card p-5 card-hover-glow">
            <p className="text-xs uppercase tracking-[0.2em] text-dim">{copy.home.folders}</p>
            <p className="text-2xl font-semibold mt-2 text-strong">{folders.length}</p>
          </Card>
          <Card className="surface-card p-5 card-hover-glow">
            <p className="text-xs uppercase tracking-[0.2em] text-dim">{copy.home.totalWords}</p>
            <p className="text-2xl font-semibold mt-2 text-strong">{totalWords}</p>
          </Card>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl py-6">
        <div className="surface-panel rounded-[28px] p-6">
          <div className="flex items-center justify-between mb-4 gap-3">
            <p className="text-sm text-dim">{copy.home.progress}</p>
            <p className="text-sm text-dim">
              {knownWords} {copy.home.known.toLowerCase()} • {unknownWords} {copy.home.unknown.toLowerCase()}
            </p>
          </div>
          <div className="h-2 rounded-full overflow-hidden flex bg-white/20 dark:bg-black/20">
            <div
              className="bg-[#10B981] h-full transition-all"
              style={{ width: `${knownPercentage}%` }}
            />
            <div
              className="bg-[#0EA5FF] h-full transition-all"
              style={{ width: `${unknownPercentage}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex-1 mx-auto w-full max-w-6xl pb-6">
        {foldersLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[#0EA5FF]" />
          </div>
        ) : folders.length === 0 ? (
          <div className="surface-panel text-center py-12 rounded-[28px]">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-dim" />
            <p className="text-dim mb-4">{copy.home.noFolders}</p>
            <Button
              onClick={() => setShowNewFolderDialog(true)}
              className="bg-[#0EA5FF] hover:bg-[#0c8fd9] text-white rounded-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              {copy.home.createFolder}
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {savedBooks.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-strong">{copy.global.books}</h2>
                  <p className="text-sm text-dim">{savedBooks.length}</p>
                </div>
                <div className="space-y-4">
                  {savedBooks.map(({ bookId, book, units }) => {
                    return (
                      <SavedBookCard
                        key={bookId}
                        bookId={bookId}
                        book={book}
                        units={units}
                        isOpen={openBookId === bookId}
                        onToggleOpen={() => setOpenBookId(openBookId === bookId ? null : bookId)}
                        onOpenUnit={(unitId) => setLocation(`/folder/${unitId}`)}
                        onUnsave={() => toggleSaveGlobalBookMutation.mutate({ bookId })}
                        unsavePending={toggleSaveGlobalBookMutation.isPending}
                        copy={copy}
                      />
                    );
                  })}
                </div>
              </div>
            ) : null}

            {standaloneFolders.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-strong">{copy.home.folders}</h2>
                  <p className="text-sm text-dim">{standaloneFolders.length}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {standaloneFolders.map((folder) => (
                    <FolderCard key={folder.id} folder={folder} onSelect={() => setLocation(`/folder/${folder.id}`)} />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* New Folder Dialog */}
      <Dialog open={showNewFolderDialog} onOpenChange={setShowNewFolderDialog}>
        <DialogContent className="bg-[#15202B] border-[#1a2732] text-white">
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="bg-[#0F1720] border-[#1a2732] text-white placeholder-[#A6B0BE]"
            />
            <Button
              onClick={() => {
                if (newFolderName.trim()) {
                  createFolderMutation.mutate({
                    name: newFolderName,
                    description: null,
                  });
                }
              }}
              disabled={!newFolderName.trim() || createFolderMutation.isPending}
              className="w-full bg-[#0EA5FF] hover:bg-[#0c8fd9] text-white rounded-full"
            >
              {createFolderMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                copy.home.createFolder
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </MobileAppShell>
  );
}

function SavedBookCard({
  bookId,
  book,
  units,
  isOpen,
  onToggleOpen,
  onOpenUnit,
  onUnsave,
  unsavePending,
  copy,
}: {
  bookId: number;
  book: any;
  units: any[];
  isOpen: boolean;
  onToggleOpen: () => void;
  onOpenUnit: (unitId: number) => void;
  onUnsave: () => void;
  unsavePending: boolean;
  copy: any;
}) {
  const [showUnsaveDialog, setShowUnsaveDialog] = useState(false);
  const progressQueries = trpc.useQueries((t) =>
    units.map((unit) => t.vocabulary.getProgress({ folderId: unit.id }))
  );

  const totalWords = progressQueries.reduce((sum, query) => sum + (query.data?.totalWords ?? 0), 0);
  const knownWords = progressQueries.reduce((sum, query) => sum + (query.data?.knownWords ?? 0), 0);
  const progressPercent = totalWords > 0 ? (knownWords / totalWords) * 100 : 0;

  return (
    <Card className="surface-card p-5 card-hover-glow">
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onToggleOpen}
          className="min-w-0 flex-1 text-left"
        >
          <div className="flex items-center gap-2">
            <h3 className="text-strong font-semibold truncate">
              {book?.title ?? `Book ${bookId}`}
            </h3>
            <Badge
              variant="outline"
              className="border-[#0EA5FF]/40 bg-[#0EA5FF]/10 text-[#0EA5FF] rounded-full"
            >
              Saved
            </Badge>
          </div>
          {book?.description ? (
            <p className="text-dim text-xs mt-1">{book.description}</p>
          ) : null}
          <div className="flex items-center gap-4 text-dim text-sm mt-3">
            <span>{units.length} {copy.global.units}</span>
            <span>{knownWords}/{totalWords} {copy.home.known.toLowerCase()}</span>
          </div>
          <div className="mt-3 h-1.5 bg-white/20 dark:bg-[#0F1720] rounded-full overflow-hidden max-w-xs">
            <div
              className="h-full bg-[#10B981] rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </button>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowUnsaveDialog(true)}
            disabled={unsavePending}
            className="border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444]/10 rounded-full text-xs px-3 py-1"
          >
            <BookmarkX className="w-3.5 h-3.5 mr-1" />
            Unsave
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={onToggleOpen}
            className="border-[var(--app-surface-border)] text-strong hover:bg-white/20 dark:hover:bg-white/5 rounded-full text-xs px-3 py-1"
          >
            {isOpen ? copy.global.hide : copy.global.open}
          </Button>
        </div>
      </div>

      {isOpen ? (
        <div className="mt-5 rounded-2xl border border-[var(--app-surface-border)] bg-white/20 dark:bg-[#0F1720] p-4">
          <div className="space-y-2">
            {units.map(unit => (
              <div
                key={unit.id}
                className="flex items-center justify-between rounded-xl border border-[var(--app-surface-border)] px-3 py-2 text-sm bg-white/20 dark:bg-[#111827] text-dim"
              >
                <span>Unit {unit.unitNumber ?? "-"}</span>
                <Button
                  onClick={() => onOpenUnit(unit.id)}
                  className="bg-[#0EA5FF] hover:bg-[#0c8fd9] text-white rounded-full text-xs px-3 py-1"
                >
                  {copy.global.open}
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <Dialog open={showUnsaveDialog} onOpenChange={setShowUnsaveDialog}>
        <DialogContent className="bg-[#15202B] border-[#1a2732] text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Unsave Book</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-[#A6B0BE]">
              This will remove the saved book and all of its units from your personal folders.
            </p>
            <Button
              onClick={() => {
                onUnsave();
                setShowUnsaveDialog(false);
              }}
              disabled={unsavePending}
              className="w-full bg-[#EF4444] hover:bg-[#dc2626] text-white rounded-full"
            >
              {unsavePending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Unsave Book"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// Separate component for each folder card to handle individual queries
function FolderCard({ folder, onSelect }: { folder: any; onSelect: () => void }) {
  const { data: progress, isLoading } = trpc.vocabulary.getProgress.useQuery({
    folderId: folder.id,
  });

  const wordCount = progress?.totalWords || 0;
  const knownCount = progress?.knownWords || 0;
  const percentage = wordCount > 0 ? (knownCount / wordCount) * 100 : 0;

  return (
    <Card
      onClick={onSelect}
      className="surface-card p-5 cursor-pointer hover:bg-white/20 dark:hover:bg-[#0F1720] transition-colors card-hover-glow"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <h3 className="text-strong font-semibold truncate">{folder.name}</h3>
          {folder.sourceGlobalFolderId ? (
            <Badge
              variant="outline"
              className="border-[#0EA5FF]/40 bg-[#0EA5FF]/10 text-[#0EA5FF] rounded-full"
            >
              Saved
            </Badge>
          ) : null}
        </div>
        <span className="text-dim text-sm">
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : `${wordCount} words`}
        </span>
      </div>
      <div className="h-1.5 bg-white/20 dark:bg-[#0F1720] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#10B981] rounded-full transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </Card>
  );
}
