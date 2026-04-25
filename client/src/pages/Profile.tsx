import { useAuth } from "@/_core/hooks/useAuth";
import { MobileAppShell } from "@/components/MobileAppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAppLocale } from "@/contexts/AppLocaleContext";
import { useTheme, type ThemeMode } from "@/contexts/ThemeContext";
import { getCopy } from "@/lib/appCopy";
import { LogOut, User, BookOpen, TrendingUp, Edit2, Trash2, AlertTriangle, Loader2, Palette } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function Profile() {
  const { user, logout, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { locale } = useAppLocale();
  const { theme, setTheme, palette, setPalette, lightPalettes, darkPalettes } = useTheme();
  const copy = getCopy(locale);
  const utils = trpc.useUtils();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [paletteMode, setPaletteMode] = useState<ThemeMode>(theme);

  // Initialize edit fields when user data loads
  useEffect(() => {
    if (user) {
      setEditName(user.name || "");
      setEditEmail(user.email || "");
    }
  }, [user]);

  useEffect(() => {
    setPaletteMode(theme);
  }, [theme]);

  // Fetch total statistics
  const { data: totalStats } = trpc.auth.getTotalStats.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );
  const { data: globalStats } = trpc.auth.getGlobalStats.useQuery(
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
      // Invalidate queries to refresh data
      utils.auth.me.invalidate();
      utils.auth.getTotalStats.invalidate();
      // Refresh the page after a short delay to show updated data
      setTimeout(() => {
        window.location.reload();
      }, 500);
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
  const globalTotalWords = globalStats?.totalWords || 0;
  const globalKnownWords = globalStats?.knownWords || 0;
  const globalUnknownWords = globalStats?.unknownWords || 0;

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  const handleUpdateProfile = () => {
    if (!editName.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    updateProfileMutation.mutate({
      name: editName.trim(),
      email: editEmail.trim() || undefined,
    });
  };

  const handleDeleteAccount = () => {
    deleteAccountMutation.mutate();
  };

  const visiblePalettes = paletteMode === "light" ? lightPalettes : darkPalettes;

  return (
    <MobileAppShell title={copy.profile.title} subtitle={user?.email || undefined}>
      <div className="mx-auto w-full max-w-6xl py-2">
        <div className="surface-panel rounded-[28px] px-6 py-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-[#0EA5FF] rounded-2xl flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-strong">{user?.name || "User"}</h2>
              <p className="text-dim">{user?.email || "No email"}</p>
            </div>
          </div>
          <Button
            onClick={() => setShowEditDialog(true)}
            className="bg-white/40 dark:bg-white/10 hover:bg-white/55 dark:hover:bg-white/15 text-strong dark:text-white rounded-full"
          >
            <Edit2 className="w-4 h-4 mr-2" />
            {copy.profile.edit}
          </Button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl py-4">
        <h3 className="text-lg font-semibold text-strong mb-4">{copy.profile.statistics}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="surface-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-5 h-5 text-[#0EA5FF]" />
              <span className="text-dim text-sm">Folders</span>
            </div>
            <p className="text-3xl font-bold text-strong">{totalFolders}</p>
          </Card>

          <Card className="surface-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-[#10B981]" />
              <span className="text-dim text-sm">Known</span>
            </div>
            <p className="text-3xl font-bold text-strong">{knownWords}</p>
          </Card>

          <Card className="surface-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-5 h-5 text-[#0EA5FF]" />
              <span className="text-dim text-sm">Unknown</span>
            </div>
            <p className="text-3xl font-bold text-strong">{unknownWords}</p>
          </Card>

          <Card className="surface-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-5 h-5 text-dim" />
              <span className="text-dim text-sm">{copy.profile.total}</span>
            </div>
            <p className="text-3xl font-bold text-strong">{totalWords}</p>
          </Card>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl py-4 flex-1">
        <h3 className="text-lg font-semibold text-strong mb-4">{copy.profile.themeSettings}</h3>
        <Card className="surface-card p-4 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="w-4 h-4 text-strong" />
            <p className="text-sm text-dim">
              {copy.profile.activeMode}: {theme === "light" ? copy.shell.light : copy.shell.dark}
            </p>
          </div>

          <div className="flex gap-2 mb-4">
            <Button
              type="button"
              onClick={() => {
                setPaletteMode("light");
                setTheme?.("light");
              }}
              className={`rounded-full px-4 py-2 text-sm ${paletteMode === "light" ? "bg-white/70 dark:bg-white/15 text-strong" : "bg-white/35 dark:bg-white/8 text-dim"}`}
            >
              {copy.profile.dayPalettes}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setPaletteMode("dark");
                setTheme?.("dark");
              }}
              className={`rounded-full px-4 py-2 text-sm ${paletteMode === "dark" ? "bg-white/70 dark:bg-white/15 text-strong" : "bg-white/35 dark:bg-white/8 text-dim"}`}
            >
              {copy.profile.nightPalettes}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {visiblePalettes.map(p => {
              const isActive = p.id === palette;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPalette?.(p.id)}
                  className={`w-full rounded-2xl border p-3 text-left transition ${isActive ? "border-cyan-400/70 bg-white/65 dark:bg-white/10" : "border-white/20 bg-white/35 dark:bg-white/5 hover:bg-white/45 dark:hover:bg-white/10"}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-strong">{p.name}</p>
                      <p className="text-xs text-dim">{p.description}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {p.preview.map(color => (
                        <span
                          key={`${p.id}-${color}`}
                          className="h-4 w-4 rounded-full border border-white/40"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        <h3 className="text-lg font-semibold text-strong mb-4">{copy.profile.account}</h3>
        <Card className="surface-card p-4 mb-6">
          <div className="space-y-3">
            <div>
              <p className="text-dim text-sm">{copy.profile.username}</p>
              <p className="text-strong">{user?.openId || "Not provided"}</p>
            </div>
            <div>
              <p className="text-dim text-sm">{copy.profile.email}</p>
              <p className="text-strong">{user?.email || "Not provided"}</p>
            </div>
            <div>
              <p className="text-dim text-sm">{copy.profile.loginMethod}</p>
              <p className="text-strong">Password</p>
            </div>
            <div>
              <p className="text-dim text-sm">{copy.profile.memberSince}</p>
              <p className="text-strong">
                {user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString()
                  : "Recently"}
              </p>
            </div>
          </div>
        </Card>

        <h3 className="text-lg font-semibold text-strong mb-4">{copy.profile.globalProgress}</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="surface-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-5 h-5 text-[#0EA5FF]" />
              <span className="text-dim text-sm">{copy.profile.total}</span>
            </div>
            <p className="text-3xl font-bold text-strong">{globalTotalWords}</p>
          </Card>

          <Card className="surface-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-[#10B981]" />
              <span className="text-dim text-sm">Known</span>
            </div>
            <p className="text-3xl font-bold text-strong">{globalKnownWords}</p>
          </Card>

          <Card className="surface-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-5 h-5 text-[#0EA5FF]" />
              <span className="text-dim text-sm">Unknown</span>
            </div>
            <p className="text-3xl font-bold text-strong">{globalUnknownWords}</p>
          </Card>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl pb-6">
        <div className="surface-panel rounded-[28px] p-4 space-y-3">
          <Button
            onClick={handleLogout}
            className="w-full bg-[#0EA5FF] hover:bg-[#0c8fd9] text-white rounded-full flex items-center justify-center gap-2"
          >
            <LogOut className="w-4 h-4" />
            {copy.profile.logout}
          </Button>
          <Button
            onClick={() => setShowDeleteDialog(true)}
            className="w-full bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            {copy.profile.deleteAccount}
          </Button>
        </div>
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
    </MobileAppShell>
  );
}
