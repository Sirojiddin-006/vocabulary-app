import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, BookOpen, LogOut, User } from "lucide-react";
import { APP_TITLE, AUTH_SIGNIN_PATH, AUTH_SIGNUP_PATH } from "@/const";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Home() {
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const [showNewFolderDialog, setShowNewFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // Fetch folders
  const { data: folders = [], isLoading: foldersLoading } = trpc.vocabulary.getFolders.useQuery(
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

  const totalWords = totalStats?.totalWords || 0;
  const knownWords = totalStats?.knownWords || 0;
  const unknownWords = totalStats?.unknownWords || 0;
  const knownPercentage = totalWords > 0 ? (knownWords / totalWords) * 100 : 0;
  const unknownPercentage = totalWords > 0 ? (unknownWords / totalWords) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen w-full app-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0EA5FF]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen w-full app-bg text-white flex items-center justify-center px-6">
        <div className="w-full max-w-4xl mx-auto">
          <div className="rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 md:p-12 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
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
                <p className="text-[#A6B0BE] text-lg mb-8">
                  Learn English vocabulary with focused flashcards and clear progress.
                  Practice daily and see your growth.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={() => setLocation(AUTH_SIGNIN_PATH)}
                    className="bg-[#0EA5FF] hover:bg-[#0c8fd9] text-white py-6 rounded-full font-semibold"
                  >
                    Sign In
                  </Button>
                  <Button
                    onClick={() => setLocation(AUTH_SIGNUP_PATH)}
                    variant="outline"
                    className="border-[#0EA5FF] text-[#0EA5FF] hover:bg-[#0EA5FF]/10 py-6 rounded-full font-semibold"
                  >
                    Create Account
                  </Button>
                </div>
              </div>
              <div className="flex-1 w-full">
                <div className="grid grid-cols-2 gap-4">
                  <Card className="bg-[#111827] border-white/10 p-5 card-fade-in card-hover-glow" style={{ animationDelay: "40ms" }}>
                    <p className="text-sm text-[#A6B0BE]">Daily streak</p>
                    <p className="text-2xl font-semibold mt-2">7 days</p>
                  </Card>
                  <Card className="bg-[#111827] border-white/10 p-5 card-fade-in card-hover-glow" style={{ animationDelay: "120ms" }}>
                    <p className="text-sm text-[#A6B0BE]">Words today</p>
                    <p className="text-2xl font-semibold mt-2">20+</p>
                  </Card>
                  <Card className="bg-[#111827] border-white/10 p-5 col-span-2 card-fade-in card-hover-glow" style={{ animationDelay: "200ms" }}>
                    <p className="text-sm text-[#A6B0BE]">Keep it simple</p>
                    <p className="text-lg mt-2">
                      Focus on one topic at a time and memorize faster.
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
    <div className="min-h-screen w-full app-bg text-white flex flex-col">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#0B0E14]/70 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="flex items-center justify-between py-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-[#A6B0BE]">
                Dashboard
              </p>
              <h1 className="font-display text-2xl font-semibold">{APP_TITLE}</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setLocation("/global")}
                variant="outline"
                className="border-white/10 text-white hover:bg-white/5"
              >
                Global
              </Button>
              <button
                onClick={() => setLocation("/profile")}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                title="Profile"
              >
                <User className="w-5 h-5 text-[#A6B0BE]" />
              </button>
              <button
                onClick={() => logout()}
                className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                title="Logout"
              >
                <LogOut className="w-5 h-5 text-[#A6B0BE]" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Welcome Message */}
      <div className="mx-auto w-full max-w-6xl px-6 pt-6">
        <div className="rounded-2xl bg-[#111827] border border-white/10 px-6 py-5">
          <p className="text-[#A6B0BE]">Welcome back</p>
          <p className="text-xl font-semibold">{user?.name || "Learner"}</p>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-6 pt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-[#111827] border border-white/10 p-5 card-hover-glow">
            <p className="text-xs uppercase tracking-[0.2em] text-[#A6B0BE]">Folders</p>
            <p className="text-2xl font-semibold mt-2">{folders.length}</p>
          </Card>
          <Card className="bg-[#111827] border border-white/10 p-5 card-hover-glow">
            <p className="text-xs uppercase tracking-[0.2em] text-[#A6B0BE]">Total Words</p>
            <p className="text-2xl font-semibold mt-2">{totalWords}</p>
          </Card>
          <Card className="bg-[#111827] border border-white/10 p-5 card-hover-glow">
            <p className="text-xs uppercase tracking-[0.2em] text-[#A6B0BE]">Known</p>
            <p className="text-2xl font-semibold mt-2">{knownWords}</p>
          </Card>
          <Card className="bg-[#111827] border border-white/10 p-5 card-hover-glow">
            <p className="text-xs uppercase tracking-[0.2em] text-[#A6B0BE]">Unknown</p>
            <p className="text-2xl font-semibold mt-2">{unknownWords}</p>
          </Card>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mx-auto w-full max-w-6xl px-6 py-6">
        <div className="rounded-2xl border border-white/10 bg-[#0F1720] p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-[#A6B0BE]">Learning progress</p>
            <p className="text-sm text-[#A6B0BE]">
              {knownWords} known • {unknownWords} unknown
            </p>
          </div>
          <div className="h-2 rounded-full overflow-hidden flex">
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

      {/* Folders List */}
      <div className="flex-1 mx-auto w-full max-w-6xl px-6 pb-28">
        {foldersLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[#0EA5FF]" />
          </div>
        ) : folders.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-white/10 bg-[#0F1720]">
            <BookOpen className="w-12 h-12 mx-auto mb-4 text-[#A6B0BE]" />
            <p className="text-[#A6B0BE] mb-4">No folders yet. Create one to get started!</p>
            <Button
              onClick={() => setShowNewFolderDialog(true)}
              className="bg-[#0EA5FF] hover:bg-[#0c8fd9] text-white rounded-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Folder
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {folders.map((folder) => (
              <FolderCard key={folder.id} folder={folder} onSelect={() => setLocation(`/folder/${folder.id}`)} />
            ))}
          </div>
        )}
      </div>

      {/* Bottom Action Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0B0E14]/70 backdrop-blur border-t border-white/10">
        <div className="mx-auto w-full max-w-6xl px-6 py-4">
          <Button
            onClick={() => setShowNewFolderDialog(true)}
            className="w-full bg-[#0EA5FF] hover:bg-[#0c8fd9] text-white rounded-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Folder
          </Button>
        </div>
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
                "Create"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
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
      className="bg-[#111827] border border-white/10 p-5 cursor-pointer hover:bg-[#0F1720] transition-colors card-hover-glow"
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-white font-semibold">{folder.name}</h3>
        <span className="text-[#A6B0BE] text-sm">
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin inline" /> : `${wordCount} words`}
        </span>
      </div>
      <div className="h-1.5 bg-[#0F1720] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#10B981] rounded-full transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </Card>
  );
}
