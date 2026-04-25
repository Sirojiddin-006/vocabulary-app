import { useAuth } from "@/_core/hooks/useAuth";
import { ThemePaletteCard } from "@/components/cards/ThemePaletteCard";
import { MobileAppShell } from "@/components/MobileAppShell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAppLocale } from "@/contexts/AppLocaleContext";
import { useTheme, type ThemeMode } from "@/contexts/ThemeContext";
import { getCopy } from "@/lib/appCopy";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Edit2, Loader2, LogOut, Settings, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
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

  useEffect(() => {
    if (!user) return;
    setEditName(user.name || "");
    setEditEmail(user.email || "");
  }, [user]);

  useEffect(() => {
    setPaletteMode(theme);
  }, [theme]);

  const { data: totalStats } = trpc.auth.getTotalStats.useQuery(undefined, { enabled: isAuthenticated });
  const { data: folders = [] } = trpc.vocabulary.getFolders.useQuery(undefined, { enabled: isAuthenticated });

  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: async () => {
      setShowEditDialog(false);
      await Promise.all([
        utils.auth.me.invalidate(),
        utils.auth.getTotalStats.invalidate(),
      ]);
      toast.success("Profile updated");
    },
    onError: error => toast.error(error.message || "Failed to update profile"),
  });

  const deleteAccountMutation = trpc.auth.deleteAccount.useMutation({
    onSuccess: async () => {
      toast.success("Account deleted");
      await logout();
      setLocation("/");
    },
    onError: error => toast.error(error.message || "Failed to delete account"),
  });

  const totalFolders = folders.length;
  const totalWords = totalStats?.totalWords || 0;
  const knownWords = totalStats?.knownWords || 0;
  const unknownWords = totalStats?.unknownWords || 0;

  const visiblePalettes = paletteMode === "light" ? lightPalettes : darkPalettes;

  return (
    <MobileAppShell
      title={copy.profile.title}
      subtitle={user?.email || undefined}
      centeredHeader
      leftSlot={
        <button
          type="button"
          onClick={() => setLocation("/")}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] scholar-title transition hover:border-[var(--accent)]"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
      }
      rightActions={
        <button
          type="button"
          onClick={() => setShowEditDialog(true)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--surface-border)] bg-[var(--surface)] scholar-title transition hover:border-[var(--accent)]"
          aria-label="Settings"
        >
          <Settings className="h-4 w-4" />
        </button>
      }
    >
      <div className="space-y-6 pb-4">
        <section className="scholar-surface-elevated p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--accent-muted)] text-2xl font-bold scholar-title">
                {(user?.name || "A").slice(0, 1).toUpperCase()}
              </div>
              <div>
                <h2 className="text-2xl font-semibold scholar-title">{user?.name || "Admin"}</h2>
                <p className="scholar-muted">{user?.email || "name@gmail.com"}</p>
              </div>
            </div>
            <Button
              onClick={() => setShowEditDialog(true)}
              variant="outline"
              className="h-10 rounded-[var(--radius-button)] border-[var(--surface-border)] bg-transparent scholar-title hover:bg-[var(--accent-muted)]"
            >
              <Edit2 className="mr-1 h-4 w-4" />
              Edit Profile
            </Button>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-4">
          <RingStat label="Folders" value={totalFolders} progress={Math.min(100, totalFolders * 4)} />
          <RingStat label="Known" value={knownWords} progress={totalWords > 0 ? (knownWords / totalWords) * 100 : 0} />
          <RingStat label="Unknown" value={unknownWords} progress={totalWords > 0 ? (unknownWords / totalWords) * 100 : 0} />
          <RingStat label={copy.profile.total} value={totalWords} progress={100} />
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-display text-2xl font-semibold scholar-title">{copy.profile.themeSettings}</h3>
            <div className="scholar-surface-elevated inline-flex items-center p-1">
              <button
                type="button"
                onClick={() => {
                  setPaletteMode("dark");
                  setTheme?.("dark");
                }}
                className={`rounded-[10px] px-3 py-1.5 text-xs ${paletteMode === "dark" ? "bg-[var(--accent-muted)] text-[var(--accent)]" : "scholar-muted"}`}
              >
                {copy.profile.nightPalettes}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPaletteMode("light");
                  setTheme?.("light");
                }}
                className={`rounded-[10px] px-3 py-1.5 text-xs ${paletteMode === "light" ? "bg-[var(--accent-muted)] text-[var(--accent)]" : "scholar-muted"}`}
              >
                {copy.profile.dayPalettes}
              </button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {visiblePalettes.map(p => (
              <ThemePaletteCard
                key={p.id}
                name={p.name}
                description={p.description}
                colors={p.preview}
                isActive={p.id === palette}
                onClick={() => setPalette?.(p.id)}
              />
            ))}
          </div>
        </section>

        <section className="scholar-surface p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Button
              onClick={async () => {
                await logout();
                setLocation("/");
              }}
              className="h-10 rounded-[var(--radius-button)] bg-[var(--accent)] text-black hover:bg-[var(--accent-strong)] hover:text-white"
            >
              <LogOut className="mr-1 h-4 w-4" />
              {copy.profile.logout}
            </Button>
            <Button
              onClick={() => setShowDeleteDialog(true)}
              className="h-10 rounded-[var(--radius-button)] bg-red-600 text-white hover:bg-red-700"
            >
              <Trash2 className="mr-1 h-4 w-4" />
              {copy.profile.deleteAccount}
            </Button>
          </div>
        </section>
      </div>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="scholar-surface-elevated border-[var(--surface-border)]">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              placeholder="Name"
              className="border-[var(--surface-border)] bg-[var(--surface)] scholar-title"
            />
            <Input
              value={editEmail}
              onChange={e => setEditEmail(e.target.value)}
              placeholder="Email"
              className="border-[var(--surface-border)] bg-[var(--surface)] scholar-title"
            />
            <Button
              onClick={() => {
                if (!editName.trim()) {
                  toast.error("Name cannot be empty");
                  return;
                }
                updateProfileMutation.mutate({ name: editName.trim(), email: editEmail.trim() || undefined });
              }}
              disabled={updateProfileMutation.isPending}
              className="h-10 w-full rounded-[var(--radius-button)] bg-[var(--accent)] text-black hover:bg-[var(--accent-strong)] hover:text-white"
            >
              {updateProfileMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="scholar-surface-elevated border-[var(--surface-border)]">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Delete Account</DialogTitle>
          </DialogHeader>
          <p className="text-sm scholar-muted">This action cannot be undone.</p>
          <Button
            onClick={() => deleteAccountMutation.mutate()}
            disabled={deleteAccountMutation.isPending}
            className="h-10 w-full rounded-[var(--radius-button)] bg-red-600 text-white hover:bg-red-700"
          >
            {deleteAccountMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
          </Button>
        </DialogContent>
      </Dialog>
    </MobileAppShell>
  );
}

function RingStat({ label, value, progress }: { label: string; value: number; progress: number }) {
  const pct = Math.min(100, Math.max(0, progress));

  return (
    <Card className="scholar-surface p-4 text-center hover-lift">
      <div
        className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full"
        style={{
          background: `conic-gradient(var(--accent) ${pct}%, color-mix(in srgb, var(--text-primary) 14%, transparent) ${pct}% 100%)`,
        }}
      >
        <div className="grid h-12 w-12 place-items-center rounded-full bg-[var(--surface-elevated)]">
          <span className="text-xs font-semibold scholar-title">{Math.round(pct)}%</span>
        </div>
      </div>
      <p className="text-sm scholar-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold scholar-title">{value}</p>
    </Card>
  );
}
