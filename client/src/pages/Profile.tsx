import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ChevronLeft, LogOut, User, BookOpen, TrendingUp, Edit2, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function Profile() {
  const { user, logout, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");

  // Initialize edit fields when user data loads
  useEffect(() => {
    if (user) {
      setEditName(user.name || "");
      setEditEmail(user.email || "");
    }
  }, [user]);

  // Fetch total statistics
  const { data: totalStats } = trpc.auth.getTotalStats.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  // Fetch folders to calculate folder count
  const { data: folders = [] } = trpc.vocabulary.getFolders.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  // Update profile mutation
  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: () => {
      setShowEditDialog(false);
      toast.success("Profile updated successfully");
      trpc.useUtils().auth.me.invalidate();
      trpc.useUtils().auth.getTotalStats.invalidate();
    },
    onError: (error) => {
      console.error("Update error:", error);
      toast.error(error.message || "Failed to update profile");
    },
  });

  // Delete account mutation
  const deleteAccountMutation = trpc.auth.deleteAccount.useMutation({
    onSuccess: () => {
      toast.success("Account deleted successfully");
      logout();
      setLocation("/");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete account");
    },
  });

  // Calculate statistics
  const totalFolders = folders.length;
  const totalWords = totalStats?.totalWords || 0;
  const knownWords = totalStats?.knownWords || 0;
  const unknownWords = totalStats?.unknownWords || 0;

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  const handleUpdateProfile = () => {
    if (!editName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    try {
      updateProfileMutation.mutate({
        name: editName.trim(),
        email: editEmail.trim() || undefined,
      });
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  const handleDeleteAccount = () => {
    deleteAccountMutation.mutate();
  };

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
        <h1 className="text-xl font-bold">Profile</h1>
        <div className="w-6" />
      </div>

      {/* Profile Section */}
      <div className="px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-[#0EA5FF] rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{user?.name || "User"}</h2>
              <p className="text-[#A6B0BE]">{user?.email || "No email"}</p>
            </div>
          </div>
          <button
            onClick={() => setShowEditDialog(true)}
            className="p-2 hover:bg-[#15202B] rounded-lg transition-colors"
            title="Edit profile"
          >
            <Edit2 className="w-5 h-5 text-[#0EA5FF]" />
          </button>
        </div>
      </div>

      {/* Statistics Section */}
      <div className="px-6 py-4">
        <h3 className="text-lg font-semibold text-white mb-4">Learning Statistics</h3>
        <div className="grid grid-cols-2 gap-4">
          <Card className="bg-[#15202B] border-0 p-4">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-5 h-5 text-[#0EA5FF]" />
              <span className="text-[#A6B0BE] text-sm">Folders</span>
            </div>
            <p className="text-3xl font-bold text-white">{totalFolders}</p>
          </Card>

          <Card className="bg-[#15202B] border-0 p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-[#10B981]" />
              <span className="text-[#A6B0BE] text-sm">Known</span>
            </div>
            <p className="text-3xl font-bold text-white">{knownWords}</p>
          </Card>

          <Card className="bg-[#15202B] border-0 p-4">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-5 h-5 text-[#0EA5FF]" />
              <span className="text-[#A6B0BE] text-sm">Unknown</span>
            </div>
            <p className="text-3xl font-bold text-white">{unknownWords}</p>
          </Card>

          <Card className="bg-[#15202B] border-0 p-4">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-5 h-5 text-[#A6B0BE]" />
              <span className="text-[#A6B0BE] text-sm">Total</span>
            </div>
            <p className="text-3xl font-bold text-white">{totalWords}</p>
          </Card>
        </div>
      </div>

      {/* Account Section */}
      <div className="px-6 py-4 flex-1">
        <h3 className="text-lg font-semibold text-white mb-4">Account</h3>
        <Card className="bg-[#15202B] border-0 p-4 mb-4">
          <div className="space-y-3">
            <div>
              <p className="text-[#A6B0BE] text-sm">Email</p>
              <p className="text-white">{user?.email || "Not provided"}</p>
            </div>
            <div>
              <p className="text-[#A6B0BE] text-sm">Login Method</p>
              <p className="text-white">{user?.loginMethod || "Manus OAuth"}</p>
            </div>
            <div>
              <p className="text-[#A6B0BE] text-sm">Member Since</p>
              <p className="text-white">
                {user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString()
                  : "Recently"}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="px-6 py-4 border-t border-[#15202B] space-y-3">
        <Button
          onClick={handleLogout}
          className="w-full bg-[#0EA5FF] hover:bg-[#0c8fd9] text-white rounded-full flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
        <Button
          onClick={() => setShowDeleteDialog(true)}
          className="w-full bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Delete Account
        </Button>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-[#15202B] border-[#1a2732] text-white">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-[#A6B0BE] text-sm mb-2 block">Name</label>
              <Input
                placeholder="Your name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="bg-[#0F1720] border-[#1a2732] text-white placeholder-[#A6B0BE]"
              />
            </div>
            <div>
              <label className="text-[#A6B0BE] text-sm mb-2 block">Email</label>
              <Input
                type="email"
                placeholder="your@email.com"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="bg-[#0F1720] border-[#1a2732] text-white placeholder-[#A6B0BE]"
              />
            </div>
            <Button
              onClick={handleUpdateProfile}
              disabled={updateProfileMutation.isPending}
              className="w-full bg-[#0EA5FF] hover:bg-[#0c8fd9] text-white rounded-full"
            >
              {updateProfileMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Account Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-[#15202B] border-[#1a2732] text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-500">
              <AlertTriangle className="w-5 h-5" />
              Delete Account
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-[#A6B0BE]">
              Are you sure you want to delete your account? This action cannot be undone. All your personal folders, words, and learning progress will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <Button
                onClick={() => setShowDeleteDialog(false)}
                className="flex-1 bg-[#1a2732] hover:bg-[#15202B] text-white rounded-full"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteAccount}
                disabled={deleteAccountMutation.isPending}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white rounded-full"
              >
                {deleteAccountMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Delete"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
