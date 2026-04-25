import { useAuth } from "@/_core/hooks/useAuth";
import { EnglishSpeakButton } from "@/components/EnglishSpeakButton";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BookmarkX, Loader2, Pencil, Plus, ChevronLeft, Play, RotateCcw, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";

export default function Folder() {
  const { user, isAuthenticated } = useAuth();
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
  const { data: folder, isLoading: folderLoading } = trpc.vocabulary.getFolderById.useQuery(
    { folderId },
    { enabled: isAuthenticated && folderId > 0 }
  );

  // Fetch words in folder
  const { data: words = [], isLoading: wordsLoading } = trpc.vocabulary.getWords.useQuery(
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
      toast.error(error.message || "Failed to add word");
    },
  });
  const updateWordMutation = trpc.vocabulary.updateWord.useMutation({
    onSuccess: () => {
      setEditingWordId(null);
      setNewWord({ english: "", uzbek: "", description: "", example: "" });
      setShowEditWordDialog(false);
      utils.vocabulary.getWords.invalidate({ folderId });
      toast.success("Word updated");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update word");
    },
  });
  // Import bulk words mutation
  const importWordsMutation = trpc.vocabulary.importWords.useMutation({
    onSuccess: () => {
      setBulkImportText("");
      setShowBulkImportDialog(false);
      toast.success("Words imported successfully");
      utils.vocabulary.getWords.invalidate({ folderId });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to import words");
    },
  });

  const deleteFolderMutation = trpc.vocabulary.deleteFolder.useMutation({
    onSuccess: () => {
      toast.success("Folder deleted");
      utils.vocabulary.getFolders.invalidate();
      utils.auth.getTotalStats.invalidate();
      setLocation("/");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete folder");
    },
  });
  const toggleSaveGlobalFolderMutation = trpc.vocabulary.toggleSaveGlobalFolder.useMutation({
    onSuccess: async (result) => {
      toast.success(result.saved ? "Saved to personal folders" : "Removed from personal folders");
      await Promise.all([
        utils.vocabulary.getFolders.invalidate(),
        utils.vocabulary.getSavedGlobalFolderIds.invalidate(),
        utils.auth.getTotalStats.invalidate(),
        utils.auth.getGlobalStats.invalidate(),
      ]);
      setLocation("/");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update saved folder");
    },
  });

  const isSavedGlobalFolder = Boolean(folder?.sourceGlobalFolderId);
  const isBookManagedFolder = folder?.bookId !== null;
  const folderActionLabel = isSavedGlobalFolder ? "Unsave Folder" : "Delete Folder";
  const folderActionDescription = isSavedGlobalFolder
    ? "This saved global folder will be removed from your personal folders."
    : "This will permanently delete this folder and all words inside it. This action cannot be undone.";
  const editingHelpText = isBookManagedFolder
    ? "Book units are read-only. Only admins can manage book words."
    : isSavedGlobalFolder
      ? "This is your personal copy. Any edits here do not affect the global version."
    : null;



  if (folderLoading) {
    return (
      <div className="min-h-screen w-full app-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0EA5FF]" />
      </div>
    );
  }

  if (!folder) {
    return (
      <div className="min-h-screen w-full app-bg text-white flex flex-col items-center justify-center">
        <p className="text-[#A6B0BE] mb-4">Folder not found</p>
        <Button
          onClick={() => setLocation("/")}
          className="bg-[#0EA5FF] hover:bg-[#0c8fd9] text-white rounded-full"
        >
          Go Back
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
                  Read only
                </Badge>
              ) : null}
              {isSavedGlobalFolder && !isBookManagedFolder ? (
                <Badge
                  variant="outline"
                  className="border-[#0EA5FF]/40 bg-[#0EA5FF]/10 text-[#0EA5FF] rounded-full"
                >
                  Personal copy
                </Badge>
              ) : null}
            </div>
            <div className="w-6" />
          </div>
        </div>
      </div>

      {/* Folder Info */}
      <div className="mx-auto w-full max-w-6xl px-6 py-5">
        <div className="rounded-2xl border border-white/10 bg-[#111827] px-6 py-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-[#A6B0BE]">{words.length} words</span>
            {editingHelpText ? (
              <p className="text-xs text-[#A6B0BE] mt-1">{editingHelpText}</p>
            ) : null}
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={() => setLocation(`/review/${folderId}`)}
              variant="outline"
              className="border-white/10 text-white hover:bg-white/5 rounded-full text-sm"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Review
            </Button>
            <Button
              onClick={() => setLocation(`/memorize/${folderId}`)}
              className="bg-[#10B981] hover:bg-[#0ea073] text-white rounded-full text-sm"
            >
              <Play className="w-4 h-4 mr-2" />
              Memorize
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
            placeholder="Search words..."
            className="bg-[#0B0E14] border-white/10 text-white placeholder-[#A6B0BE]"
          />
          <div className="flex gap-2">
            <Button
              onClick={() => setSort("az")}
              variant="outline"
              className={sort === "az"
                ? "border-[#0EA5FF] text-[#0EA5FF] bg-[#0EA5FF]/10"
                : "border-white/10 text-white hover:bg-white/5"}
            >
              A - Z
            </Button>
            <Button
              onClick={() => setSort("za")}
              variant="outline"
              className={sort === "za"
                ? "border-[#0EA5FF] text-[#0EA5FF] bg-[#0EA5FF]/10"
                : "border-white/10 text-white hover:bg-white/5"}
            >
              Z - A
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 mx-auto w-full max-w-6xl px-6 py-4 pb-28">
        {wordsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[#0EA5FF]" />
          </div>
        ) : filteredWords.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-white/10 bg-[#0F1720]">
            <p className="text-[#A6B0BE] mb-4">No words found.</p>
            {!isBookManagedFolder ? (
              <Button
                onClick={() => setShowAddWordDialog(true)}
                className="bg-[#0EA5FF] hover:bg-[#0c8fd9] text-white rounded-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Word
              </Button>
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredWords.map((word) => (
              <Card
                key={word.id}
                className="bg-[#111827] border border-white/10 p-5 card-hover-glow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-semibold">{word.english}</h3>
                      <EnglishSpeakButton text={word.english} />
                    </div>
                    <p className="text-[#A6B0BE] text-sm">{word.uzbek}</p>
                    {word.description && (
                      <p className="text-[#C9D3E0] text-xs mt-2">{word.description}</p>
                    )}
                    {word.example && (
                      <p className="text-[#A6B0BE] text-xs mt-2 italic">"{word.example}"</p>
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
                      className="border-white/10 text-white hover:bg-white/5 rounded-full text-xs px-3 py-1 ml-3"
                    >
                      <Pencil className="w-3.5 h-3.5 mr-1" />
                      Edit
                    </Button>
                  ) : null}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0B0E14]/70 backdrop-blur border-t border-white/10">
        <div className="mx-auto w-full max-w-6xl px-6 py-4 space-y-2">
          {!isBookManagedFolder ? (
            <>
              <Button
                onClick={() => setShowAddWordDialog(true)}
                className="w-full bg-[#0EA5FF] hover:bg-[#0c8fd9] text-white rounded-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Word
              </Button>
              <Button
                onClick={() => setShowBulkImportDialog(true)}
                className="w-full bg-[#8B5CF6] hover:bg-[#7c3aed] text-white rounded-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Bulk Import
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {/* Add Word Dialog */}
      <Dialog open={showAddWordDialog && !isBookManagedFolder} onOpenChange={setShowAddWordDialog}>
        <DialogContent className="bg-[#15202B] border-[#1a2732] text-white">
          <DialogHeader>
            <DialogTitle>Add New Word</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-[#A6B0BE] mb-2 block">English Word</label>
              <Input
                placeholder="e.g., beautiful"
                value={newWord.english}
                onChange={(e) => setNewWord({ ...newWord, english: e.target.value })}
                className="bg-[#0F1720] border-[#1a2732] text-white placeholder-[#A6B0BE]"
              />
            </div>
            <div>
              <label className="text-sm text-[#A6B0BE] mb-2 block">Uzbek Translation</label>
              <Input
                placeholder="e.g., go'zal"
                value={newWord.uzbek}
                onChange={(e) => setNewWord({ ...newWord, uzbek: e.target.value })}
                className="bg-[#0F1720] border-[#1a2732] text-white placeholder-[#A6B0BE]"
              />
            </div>
            <div>
              <label className="text-sm text-[#A6B0BE] mb-2 block">Description (Optional)</label>
              <Textarea
                placeholder="e.g., Used to describe something pleasant to look at."
                value={newWord.description}
                onChange={(e) => setNewWord({ ...newWord, description: e.target.value })}
                className="bg-[#0F1720] border-[#1a2732] text-white placeholder-[#A6B0BE] resize-none"
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm text-[#A6B0BE] mb-2 block">Example (Optional)</label>
              <Textarea
                placeholder="e.g., She has a beautiful smile."
                value={newWord.example}
                onChange={(e) => setNewWord({ ...newWord, example: e.target.value })}
                className="bg-[#0F1720] border-[#1a2732] text-white placeholder-[#A6B0BE] resize-none"
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
              className="w-full bg-[#0EA5FF] hover:bg-[#0c8fd9] text-white rounded-full"
            >
              {addWordMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Add Word"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Word Dialog */}
      <Dialog open={showEditWordDialog && !isBookManagedFolder} onOpenChange={setShowEditWordDialog}>
        <DialogContent className="bg-[#15202B] border-[#1a2732] text-white">
          <DialogHeader>
            <DialogTitle>Edit Word</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-[#A6B0BE] mb-2 block">English Word</label>
              <Input
                placeholder="e.g., beautiful"
                value={newWord.english}
                onChange={(e) => setNewWord({ ...newWord, english: e.target.value })}
                className="bg-[#0F1720] border-[#1a2732] text-white placeholder-[#A6B0BE]"
              />
            </div>
            <div>
              <label className="text-sm text-[#A6B0BE] mb-2 block">Uzbek Translation</label>
              <Input
                placeholder="e.g., go'zal"
                value={newWord.uzbek}
                onChange={(e) => setNewWord({ ...newWord, uzbek: e.target.value })}
                className="bg-[#0F1720] border-[#1a2732] text-white placeholder-[#A6B0BE]"
              />
            </div>
            <div>
              <label className="text-sm text-[#A6B0BE] mb-2 block">Description (Optional)</label>
              <Textarea
                placeholder="e.g., Used to describe something pleasant to look at."
                value={newWord.description}
                onChange={(e) => setNewWord({ ...newWord, description: e.target.value })}
                className="bg-[#0F1720] border-[#1a2732] text-white placeholder-[#A6B0BE] resize-none"
                rows={2}
              />
            </div>
            <div>
              <label className="text-sm text-[#A6B0BE] mb-2 block">Example (Optional)</label>
              <Textarea
                placeholder="e.g., She has a beautiful smile."
                value={newWord.example}
                onChange={(e) => setNewWord({ ...newWord, example: e.target.value })}
                className="bg-[#0F1720] border-[#1a2732] text-white placeholder-[#A6B0BE] resize-none"
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
              className="w-full bg-[#0EA5FF] hover:bg-[#0c8fd9] text-white rounded-full"
            >
              {updateWordMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Import Dialog */}
      <Dialog open={showBulkImportDialog && !isBookManagedFolder} onOpenChange={setShowBulkImportDialog}>
        <DialogContent className="bg-[#15202B] border-[#1a2732] text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Import Words</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-[#A6B0BE] mb-2 block">
                Enter words (one per line, format: English | Uzbek | Description | Example)
              </label>
              <Textarea
                placeholder="beautiful | go'zal | pleasant to look at | She has a beautiful smile."
                value={bulkImportText}
                onChange={(e) => setBulkImportText(e.target.value)}
                className="bg-[#0F1720] border-[#1a2732] text-white placeholder-[#A6B0BE] resize-none"
                rows={8}
              />
              <p className="text-xs text-[#A6B0BE] mt-2">
                Separate values with | (pipe). Description and Example are optional.
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
                  toast.error("Please enter at least one word");
                  return;
                }

                importWordsMutation.mutate({
                  folderId,
                  words,
                });
              }}
              disabled={!bulkImportText.trim() || importWordsMutation.isPending}
              className="w-full bg-[#8B5CF6] hover:bg-[#7c3aed] text-white rounded-full"
            >
              {importWordsMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Import Words"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Folder Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-[#15202B] border-[#1a2732] text-white max-w-md">
          <DialogHeader>
            <DialogTitle>{folderActionLabel}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-[#A6B0BE]">{folderActionDescription}</p>
            <Button
              onClick={() => {
                if (isSavedGlobalFolder && folder.sourceGlobalFolderId) {
                  toggleSaveGlobalFolderMutation.mutate({ folderId: folder.sourceGlobalFolderId });
                  return;
                }
                deleteFolderMutation.mutate({ folderId });
              }}
              disabled={deleteFolderMutation.isPending || toggleSaveGlobalFolderMutation.isPending}
              className="w-full bg-[#EF4444] hover:bg-[#dc2626] text-white rounded-full"
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
