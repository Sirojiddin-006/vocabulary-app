import { useAuth } from "@/_core/hooks/useAuth";
import { EnglishSpeakButton } from "@/components/EnglishSpeakButton";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAppLocale } from "@/contexts/AppLocaleContext";
import { getCopy } from "@/lib/appCopy";
import { BookmarkX, Loader2, Pencil, Plus, ChevronLeft, Play, RotateCcw, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";

export default function Folder() {
  const { user, isAuthenticated } = useAuth();
  const { locale } = useAppLocale();
  const copy = getCopy(locale);
  const [, setLocation] = useLocation();
  const params = useParams();
  const folderId = parseInt(params.id || "0");
  const utils = trpc.useUtils();

  const [showAddWordDialog, setShowAddWordDialog] = useState(false);
  const [showEditWordDialog, setShowEditWordDialog] = useState(false);
  const [showBulkImportDialog, setShowBulkImportDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [bulkImportText, setBulkImportText] = useState("");
  const [editingWordId, setEditingWordId] = useState<number | null>(null);
  const [newWord, setNewWord] = useState({
    english: "",
    uzbek: "",
    description: "",
    example: "",
  });
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"az" | "za">("az");

  // Fetch folder
  const { data: folder, isLoading: folderLoading, isError: folderError } = trpc.vocabulary.getFolderById.useQuery(
    { folderId },
    { enabled: isAuthenticated && folderId > 0 }
  );

  // Fetch words in folder
  const { data: words = [], isLoading: wordsLoading, isError: wordsError } = trpc.vocabulary.getWords.useQuery(
    { folderId },
    { enabled: isAuthenticated && folderId > 0 }
  );

  const filteredWords = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = normalized.length === 0
      ? words
      : words.filter(word =>
          word.english.toLowerCase().includes(normalized) ||
          word.uzbek.toLowerCase().includes(normalized) ||
          (word.description ?? "").toLowerCase().includes(normalized) ||
          (word.example ?? "").toLowerCase().includes(normalized)
        );
    const sorted = [...filtered].sort((a, b) => {
      if (sort === "az") return a.english.localeCompare(b.english);
      return b.english.localeCompare(a.english);
    });
    return sorted;
  }, [query, sort, words]);

  // Add word mutation
  const addWordMutation = trpc.vocabulary.addWord.useMutation({
    onSuccess: () => {
      setNewWord({ english: "", uzbek: "", description: "", example: "" });
      setShowAddWordDialog(false);
      utils.vocabulary.getWords.invalidate({ folderId });
    },
    onError: (error) => {
      toast.error(error.message || copy.folder.failedAddWord);
    },
  });
  const updateWordMutation = trpc.vocabulary.updateWord.useMutation({
    onSuccess: () => {
      setEditingWordId(null);
      setNewWord({ english: "", uzbek: "", description: "", example: "" });
      setShowEditWordDialog(false);
      utils.vocabulary.getWords.invalidate({ folderId });
      toast.success(copy.folder.wordUpdated);
    },
    onError: (error) => {
      toast.error(error.message || copy.folder.failedUpdateWord);
    },
  });
  // Import bulk words mutation
  const importWordsMutation = trpc.vocabulary.importWords.useMutation({
    onSuccess: () => {
      setBulkImportText("");
      setShowBulkImportDialog(false);
      toast.success(copy.folder.wordsImported);
      utils.vocabulary.getWords.invalidate({ folderId });
    },
    onError: (error) => {
      toast.error(error.message || copy.folder.failedImportWords);
    },
  });

  const deleteFolderMutation = trpc.vocabulary.deleteFolder.useMutation({
    onSuccess: () => {
      toast.success(copy.folder.folderDeleted);
      utils.vocabulary.getFolders.invalidate();
      utils.auth.getTotalStats.invalidate();
      setLocation("/");
    },
    onError: (error) => {
      toast.error(error.message || copy.folder.failedDeleteFolder);
    },
  });
  const toggleSaveGlobalFolderMutation = trpc.vocabulary.toggleSaveGlobalFolder.useMutation({
    onSuccess: async (result) => {
      toast.success(result.saved ? copy.folder.savedFolderAdded : copy.folder.savedFolderRemoved);
      await Promise.all([
        utils.vocabulary.getFolders.invalidate(),
        utils.vocabulary.getSavedGlobalFolderIds.invalidate(),
        utils.auth.getTotalStats.invalidate(),
        utils.auth.getGlobalStats.invalidate(),
      ]);
      setLocation("/");
    },
    onError: (error) => {
      toast.error(error.message || copy.folder.failedSavedFolder);
    },
  });

  const isSavedGlobalFolder = Boolean(folder?.sourceGlobalFolderId);
  const isBookManagedFolder = folder?.bookId !== null;
  const folderActionLabel = isSavedGlobalFolder ? copy.folder.unsaveFolder : copy.folder.deleteFolder;
  const folderActionDescription = isSavedGlobalFolder
    ? copy.folder.unsaveDescription
    : copy.folder.deleteDescription;
  const editingHelpText = isBookManagedFolder
    ? copy.folder.bookReadOnly
    : isSavedGlobalFolder
      ? copy.folder.personalCopyNote
    : null;



  if (folderLoading) {
    return (
      <div className="min-h-screen w-full app-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  if (folderError || wordsError) {
    return (
      <div className="flex items-center justify-center min-h-[200px] text-destructive">
        Failed to load. Please refresh and try again.
      </div>
    );
  }

  if (!folder) {
    return (
      <div className="min-h-screen w-full app-bg scholar-title flex flex-col items-center justify-center">
        <p className="scholar-muted mb-4">{copy.folder.folderNotFound}</p>
        <Button
          onClick={() => setLocation("/")}
          className="bg-[var(--accent)] hover:bg-[var(--accent-strong)] scholar-title rounded-full"
        >
          {copy.common.back}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full app-bg text-foreground flex flex-col">
      {/* Header */}
      <div className="page-navbar sticky top-0 z-40">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="flex items-center justify-between py-4">
            <button
              onClick={() => setLocation("/")}
              className="page-navbar-back -ml-2 rounded-lg p-2"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="font-display text-xl font-semibold truncate">{folder.name}</h1>
              {isBookManagedFolder ? (
                <Badge
                  variant="outline"
                  className="border-[#F59E0B]/40 bg-[#F59E0B]/10 text-[#F59E0B] rounded-full"
                >
                  {copy.folder.readOnly}
                </Badge>
              ) : null}
              {isSavedGlobalFolder && !isBookManagedFolder ? (
                <Badge
                  variant="outline"
                  className="border-[var(--accent)]/40 bg-[var(--accent)]/10 text-[var(--accent)] rounded-full"
                >
                  {copy.folder.personalCopy}
                </Badge>
              ) : null}
            </div>
            <div className="w-6" />
          </div>
        </div>
      </div>

      {/* Folder Info */}
      <div className="mx-auto w-full max-w-6xl px-6 py-5">
        <div className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] px-6 py-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="scholar-muted">{words.length} {copy.common.words}</span>
            {editingHelpText ? (
              <p className="text-xs scholar-muted mt-1">{editingHelpText}</p>
            ) : null}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={() => setLocation(`/review/${folderId}`)}
              variant="outline"
              className="border-[var(--surface-border)] scholar-title hover:bg-[var(--accent-muted)] rounded-full text-sm"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              {copy.review.title}
            </Button>
            <Button
              onClick={() => setLocation(`/memorize/${folderId}`)}
              className="bg-[color-mix(in_srgb,_var(--accent)_55%,_#10B981)] hover:bg-[color-mix(in_srgb,_var(--accent-strong)_45%,_#0b7a57)] scholar-title rounded-full text-sm"
            >
              <Play className="w-4 h-4 mr-2" />
              {copy.memorize.title}
            </Button>
            <Button
              onClick={() => setShowDeleteDialog(true)}
              variant="outline"
              className="border-[#EF4444] text-[#EF4444] hover:bg-[#EF4444]/10 rounded-full text-sm"
            >
              {isSavedGlobalFolder ? (
                <BookmarkX className="w-4 h-4 mr-2" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              {folderActionLabel}
            </Button>
          </div>
        </div>
      </div>

      {/* Words List */}
      <div className="mx-auto w-full max-w-6xl px-6 pb-2">
        <div className="flex flex-col md:flex-row gap-3">
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={copy.common.searchWords}
            className="bg-[var(--surface)] border-[var(--surface-border)] scholar-title placeholder:text-[var(--text-secondary)]"
          />
          <div className="flex gap-2">
            <Button
              onClick={() => setSort("az")}
              variant="outline"
              className={sort === "az"
                ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10"
                : "border-[var(--surface-border)] scholar-title hover:bg-[var(--accent-muted)]"}
            >
              {copy.globalFolder.sortAZ}
            </Button>
            <Button
              onClick={() => setSort("za")}
              variant="outline"
              className={sort === "za"
                ? "border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/10"
                : "border-[var(--surface-border)] scholar-title hover:bg-[var(--accent-muted)]"}
            >
              {copy.globalFolder.sortZA}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 mx-auto w-full max-w-6xl px-6 py-4 pb-28">
        {wordsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[var(--accent)]" />
          </div>
        ) : filteredWords.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)]">
            <p className="scholar-muted mb-4">{copy.globalFolder.noWords}</p>
            {!isBookManagedFolder ? (
              <Button
                onClick={() => setShowAddWordDialog(true)}
                className="bg-[var(--accent)] hover:bg-[var(--accent-strong)] scholar-title rounded-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                {copy.folder.addWord}
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredWords.map((word) => (
              <Card
                key={word.id}
                className="bg-[var(--surface)] border border-[var(--surface-border)] p-5 card-hover-glow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="scholar-title font-semibold">{word.english}</h3>
                      <EnglishSpeakButton text={word.english} />
                    </div>
                    <p className="scholar-muted text-sm">{word.uzbek}</p>
                    {word.description && (
                      <p className="scholar-muted text-xs mt-2">{word.description}</p>
                    )}
                    {word.example && (
                      <p className="scholar-muted text-xs mt-2 italic">"{word.example}"</p>
                    )}
                  </div>
                  {!isBookManagedFolder ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditingWordId(word.id);
                        setNewWord({
                          english: word.english,
                          uzbek: word.uzbek,
                          description: word.description ?? "",
                          example: word.example ?? "",
                        });
                        setShowEditWordDialog(true);
                      }}
                      className="border-[var(--surface-border)] scholar-title hover:bg-[var(--accent-muted)] rounded-full text-xs px-3 py-1 ml-3"
                    >
                      <Pencil className="w-3.5 h-3.5 mr-1" />
                      {copy.folder.editWord}
                    </Button>
                  ) : null}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-[var(--surface)]/70 backdrop-blur border-t border-[var(--surface-border)]">
        <div className="mx-auto w-full max-w-6xl px-6 py-4 space-y-2">
          {!isBookManagedFolder ? (
            <>
              <Button
                onClick={() => setShowAddWordDialog(true)}
                className="w-full bg-[var(--accent)] hover:bg-[var(--accent-strong)] scholar-title rounded-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                {copy.folder.addWord}
              </Button>
              <Button
                onClick={() => setShowBulkImportDialog(true)}
                className="w-full bg-[#8B5CF6] hover:bg-[#7c3aed] scholar-title rounded-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                {copy.folder.bulkImport}
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {/* Add Word Dialog */}
      <Dialog open={showAddWordDialog && !isBookManagedFolder} onOpenChange={setShowAddWordDialog}>
        <DialogContent className="scholar-surface-elevated border-[var(--surface-border)] scholar-title">
          <DialogHeader>
            <DialogTitle>{copy.folder.addNewWord}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm scholar-muted mb-2 block">{copy.folder.englishWord}</label>
              <Input
                placeholder={copy.folder.englishPlaceholder}
                value={newWord.english}
                onChange={(e) => setNewWord({ ...newWord, english: e.target.value })}
                className="bg-[var(--surface)] border-[var(--surface-border)] scholar-title placeholder:text-[var(--text-secondary)]"
              />
            </div>
            <div>
              <label className="text-sm scholar-muted mb-2 block">{copy.folder.uzbekTranslation}</label>
              <Input
                placeholder={copy.folder.uzbekPlaceholder}
                value={newWord.uzbek}
                onChange={(e) => setNewWord({ ...newWord, uzbek: e.target.value })}
                className="bg-[var(--surface)] border-[var(--surface-border)] scholar-title placeholder:text-[var(--text-secondary)]"
              />
            </div>
            <div>
              <label className="text-sm scholar-muted mb-2 block">{copy.folder.descriptionOptional}</label>
              <Textarea
                placeholder={copy.folder.descriptionPlaceholder}
                value={newWord.description}
                onChange={(e) => setNewWord({ ...newWord, description: e.target.value })}
                className="bg-[var(--surface)] border-[var(--surface-border)] scholar-title placeholder:text-[var(--text-secondary)] resize-none"
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm scholar-muted mb-2 block">{copy.folder.exampleOptional}</label>
              <Textarea
                placeholder={copy.folder.examplePlaceholder}
                value={newWord.example}
                onChange={(e) => setNewWord({ ...newWord, example: e.target.value })}
                className="bg-[var(--surface)] border-[var(--surface-border)] scholar-title placeholder:text-[var(--text-secondary)] resize-none"
                rows={3}
              />
            </div>
            <Button
              onClick={() => {
                if (newWord.english.trim() && newWord.uzbek.trim()) {
                  addWordMutation.mutate({
                    folderId,
                    english: newWord.english,
                    uzbek: newWord.uzbek,
                    description: newWord.description || null,
                    example: newWord.example || null,
                  });
                }
              }}
              disabled={!newWord.english.trim() || !newWord.uzbek.trim() || addWordMutation.isPending}
              className="w-full bg-[var(--accent)] hover:bg-[var(--accent-strong)] scholar-title rounded-full"
            >
              {addWordMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                copy.folder.addWord
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Word Dialog */}
      <Dialog open={showEditWordDialog && !isBookManagedFolder} onOpenChange={setShowEditWordDialog}>
        <DialogContent className="scholar-surface-elevated border-[var(--surface-border)] scholar-title">
          <DialogHeader>
            <DialogTitle>{copy.folder.editWord}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm scholar-muted mb-2 block">{copy.folder.englishWord}</label>
              <Input
                placeholder={copy.folder.englishPlaceholder}
                value={newWord.english}
                onChange={(e) => setNewWord({ ...newWord, english: e.target.value })}
                className="bg-[var(--surface)] border-[var(--surface-border)] scholar-title placeholder:text-[var(--text-secondary)]"
              />
            </div>
            <div>
              <label className="text-sm scholar-muted mb-2 block">{copy.folder.uzbekTranslation}</label>
              <Input
                placeholder={copy.folder.uzbekPlaceholder}
                value={newWord.uzbek}
                onChange={(e) => setNewWord({ ...newWord, uzbek: e.target.value })}
                className="bg-[var(--surface)] border-[var(--surface-border)] scholar-title placeholder:text-[var(--text-secondary)]"
              />
            </div>
            <div>
              <label className="text-sm scholar-muted mb-2 block">{copy.folder.descriptionOptional}</label>
              <Textarea
                placeholder={copy.folder.descriptionPlaceholder}
                value={newWord.description}
                onChange={(e) => setNewWord({ ...newWord, description: e.target.value })}
                className="bg-[var(--surface)] border-[var(--surface-border)] scholar-title placeholder:text-[var(--text-secondary)] resize-none"
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm scholar-muted mb-2 block">{copy.folder.exampleOptional}</label>
              <Textarea
                placeholder={copy.folder.examplePlaceholder}
                value={newWord.example}
                onChange={(e) => setNewWord({ ...newWord, example: e.target.value })}
                className="bg-[var(--surface)] border-[var(--surface-border)] scholar-title placeholder:text-[var(--text-secondary)] resize-none"
                rows={3}
              />
            </div>
            <Button
              onClick={() => {
                if (editingWordId && newWord.english.trim() && newWord.uzbek.trim()) {
                  updateWordMutation.mutate({
                    wordId: editingWordId,
                    english: newWord.english,
                    uzbek: newWord.uzbek,
                    description: newWord.description || null,
                    example: newWord.example || null,
                  });
                }
              }}
              disabled={!editingWordId || !newWord.english.trim() || !newWord.uzbek.trim() || updateWordMutation.isPending}
              className="w-full bg-[var(--accent)] hover:bg-[var(--accent-strong)] scholar-title rounded-full"
            >
              {updateWordMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                copy.folder.saveChanges
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Dialog */}
      <Dialog open={showBulkImportDialog && !isBookManagedFolder} onOpenChange={setShowBulkImportDialog}>
        <DialogContent className="scholar-surface-elevated border-[var(--surface-border)] scholar-title max-w-md">
          <DialogHeader>
            <DialogTitle>{copy.folder.bulkImportTitle}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm scholar-muted mb-2 block">
                {copy.folder.bulkImportLabel}
              </label>
              <Textarea
                placeholder={copy.folder.bulkImportPlaceholder}
                value={bulkImportText}
                onChange={(e) => setBulkImportText(e.target.value)}
                className="bg-[var(--surface)] border-[var(--surface-border)] scholar-title placeholder:text-[var(--text-secondary)] resize-none"
                rows={8}
              />
              <p className="text-xs scholar-muted mt-2">
                {copy.folder.bulkImportHint}
              </p>
            </div>
            <Button
              onClick={() => {
                const lines = bulkImportText.trim().split('\n').filter(l => l.trim());
                const words = lines.map(line => {
                  const parts = line.split('|').map(p => p.trim());
                  return {
                    english: parts[0] || '',
                    uzbek: parts[1] || '',
                    description: parts[2] || undefined,
                    example: parts[3] || undefined,
                  };
                }).filter(w => w.english && w.uzbek);

                if (words.length === 0) {
                  toast.error(copy.folder.enterAtLeastOneWord);
                  return;
                }

                importWordsMutation.mutate({
                  folderId,
                  words,
                });
              }}
              disabled={!bulkImportText.trim() || importWordsMutation.isPending}
              className="w-full bg-[#8B5CF6] hover:bg-[#7c3aed] scholar-title rounded-full"
            >
              {importWordsMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                copy.folder.importWords
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Folder Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="scholar-surface-elevated border-[var(--surface-border)] scholar-title max-w-md">
          <DialogHeader>
            <DialogTitle>{folderActionLabel}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm scholar-muted">{folderActionDescription}</p>
            <Button
              onClick={() => {
                if (isSavedGlobalFolder && folder.sourceGlobalFolderId) {
                  toggleSaveGlobalFolderMutation.mutate({ folderId: folder.sourceGlobalFolderId });
                  return;
                }
                deleteFolderMutation.mutate({ folderId });
              }}
              disabled={deleteFolderMutation.isPending || toggleSaveGlobalFolderMutation.isPending}
              className="w-full bg-[#EF4444] hover:bg-[#dc2626] scholar-title rounded-full"
            >
              {deleteFolderMutation.isPending || toggleSaveGlobalFolderMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                folderActionLabel
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}
