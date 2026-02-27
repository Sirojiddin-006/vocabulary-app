import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, ChevronLeft, Play } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useLocation, useParams } from "wouter";

export default function Folder() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams();
  const folderId = parseInt(params.id || "0");
  const utils = trpc.useUtils();

  const [showAddWordDialog, setShowAddWordDialog] = useState(false);
  const [showBulkImportDialog, setShowBulkImportDialog] = useState(false);
  const [bulkImportText, setBulkImportText] = useState("");
  const [newWord, setNewWord] = useState({ english: "", uzbek: "", example: "" });

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

  // Add word mutation
  const addWordMutation = trpc.vocabulary.addWord.useMutation({
    onSuccess: () => {
      setNewWord({ english: "", uzbek: "", example: "" });
      setShowAddWordDialog(false);
      utils.vocabulary.getWords.invalidate({ folderId });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add word");
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



  if (folderLoading) {
    return (
      <div className="min-h-screen bg-[#0F1720] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0EA5FF]" />
      </div>
    );
  }

  if (!folder) {
    return (
      <div className="min-h-screen bg-[#0F1720] text-white flex flex-col items-center justify-center">
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
    <div className="min-h-screen bg-[#0F1720] text-white flex flex-col max-w-[390px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-4 pb-3 border-b border-[#15202B]">
        <button
          onClick={() => setLocation("/")}
          className="p-2 -ml-2 hover:bg-[#15202B] rounded-lg transition-colors"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        <h1 className="text-xl font-bold">{folder.name}</h1>
        <div className="w-6" />
      </div>

      {/* Folder Info */}
      <div className="px-6 py-4 border-b border-[#15202B]">
        <div className="flex items-center justify-between">
          <span className="text-[#A6B0BE]">{words.length} words</span>
          <Button
            onClick={() => setLocation(`/memorize/${folderId}`)}
            className="bg-[#10B981] hover:bg-[#0ea073] text-white rounded-full text-sm"
          >
            <Play className="w-4 h-4 mr-2" />
            Start
          </Button>
        </div>
      </div>

      {/* Words List */}
      <div className="flex-1 overflow-y-auto px-6 py-4 pb-24">
        {wordsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[#0EA5FF]" />
          </div>
        ) : words.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[#A6B0BE] mb-4">No words yet. Add one to get started!</p>
            <Button
              onClick={() => setShowAddWordDialog(true)}
              className="bg-[#0EA5FF] hover:bg-[#0c8fd9] text-white rounded-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Word
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {words.map((word) => (
              <Card
                key={word.id}
                className="bg-[#15202B] border-0 p-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-white font-semibold">{word.english}</h3>
                    <p className="text-[#A6B0BE] text-sm">{word.uzbek}</p>
                    {word.example && (
                      <p className="text-[#A6B0BE] text-xs mt-2 italic">"{word.example}"</p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Action Buttons */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[390px] mx-auto px-6 py-4 bg-[#0F1720] border-t border-[#15202B] space-y-2">
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
      </div>

      {/* Add Word Dialog */}
      <Dialog open={showAddWordDialog} onOpenChange={setShowAddWordDialog}>
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

      {/* Bulk Import Dialog */}
      <Dialog open={showBulkImportDialog} onOpenChange={setShowBulkImportDialog}>
        <DialogContent className="bg-[#15202B] border-[#1a2732] text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Import Words</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-[#A6B0BE] mb-2 block">
                Enter words (one per line, format: English | Uzbek | Example)
              </label>
              <Textarea
                placeholder="beautiful | go'zal&#10;happy | baxtli&#10;sad | g'amgin"
                value={bulkImportText}
                onChange={(e) => setBulkImportText(e.target.value)}
                className="bg-[#0F1720] border-[#1a2732] text-white placeholder-[#A6B0BE] resize-none"
                rows={8}
              />
              <p className="text-xs text-[#A6B0BE] mt-2">
                Separate English and Uzbek with | (pipe). Example is optional.
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
                    example: parts[2] || undefined,
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

    </div>
  );
}
