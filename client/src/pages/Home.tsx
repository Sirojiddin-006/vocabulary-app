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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F1720] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0EA5FF]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0F1720] text-white flex flex-col items-center justify-center px-6">
        <div className="text-center max-w-md">
          <BookOpen className="w-16 h-16 mx-auto mb-6 text-[#0EA5FF]" />
          <h1 className="text-3xl font-bold mb-3">{APP_TITLE}</h1>
          <p className="text-[#A6B0BE] mb-8">
            Learn English vocabulary with interactive flashcards. Master new words at your own pace.
          </p>
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => setLocation(AUTH_SIGNIN_PATH)}
              className="w-full bg-[#0EA5FF] hover:bg-[#0c8fd9] text-white py-3 rounded-full font-semibold"
            >
              Sign In
            </Button>
            <Button
              onClick={() => setLocation(AUTH_SIGNUP_PATH)}
              variant="outline"
              className="w-full border-[#0EA5FF] text-[#0EA5FF] hover:bg-[#0EA5FF]/10 py-3 rounded-full font-semibold"
            >
              Create Account
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1720] text-white flex flex-col max-w-[390px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-4 pb-3 border-b border-[#15202B]">
        <h1 className="text-xl font-bold">{APP_TITLE}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLocation("/profile")}
            className="p-2 hover:bg-[#15202B] rounded-lg transition-colors"
            title="Profile"
          >
            <User className="w-5 h-5 text-[#A6B0BE]" />
          </button>
          <button
            onClick={() => logout()}
            className="p-2 hover:bg-[#15202B] rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5 text-[#A6B0BE]" />
          </button>
        </div>
      </div>

      {/* Welcome Message */}
      <div className="px-6 pt-4 pb-2">
        <p className="text-[#A6B0BE]">Welcome, {user?.name || "Learner"}!</p>
      </div>

      {/* Progress Bar */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#0EA5FF]" />
            <span className="text-[#A6B0BE] text-sm">Unknown: {unknownWords}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#A6B0BE] text-sm">Known: {knownWords}</span>
            <div className="w-2 h-2 rounded-full bg-[#10B981]" />
          </div>
        </div>
        <div className="h-2 bg-[#15202B] rounded-full overflow-hidden">
          <div
            className="bg-[#0EA5FF] h-full rounded-full transition-all"
            style={{ width: `${100 - knownPercentage}%` }}
          />
          <div
            className="bg-[#10B981] h-full rounded-full transition-all float-right"
            style={{ width: `${knownPercentage}%` }}
          />
        </div>
      </div>

      {/* Folders List */}
      <div className="flex-1 overflow-y-auto px-6 pb-24">
        {foldersLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[#0EA5FF]" />
          </div>
        ) : folders.length === 0 ? (
          <div className="text-center py-12">
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
          <div className="space-y-3">
            {folders.map((folder) => (
              <FolderCard key={folder.id} folder={folder} onSelect={() => setLocation(`/folder/${folder.id}`)} />
            ))}
          </div>
        )}
      </div>

      {/* Bottom Action Button */}
      <div className="fixed bottom-0 left-0 right-0 max-w-[390px] mx-auto px-6 py-4 bg-[#0F1720] border-t border-[#15202B]">
        <Button
          onClick={() => setShowNewFolderDialog(true)}
          className="w-full bg-[#0EA5FF] hover:bg-[#0c8fd9] text-white rounded-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Folder
        </Button>
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
      className="bg-[#15202B] border-0 p-4 cursor-pointer hover:bg-[#1a2732] transition-colors"
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
