import { useAuth } from "@/_core/hooks/useAuth";
import { ThemePaletteCard } from "@/components/cards/ThemePaletteCard";
import { MobileAppShell } from "@/components/MobileAppShell";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAppLocale } from "@/contexts/AppLocaleContext";
import { useTheme, type ThemeMode, type ThemePaletteId } from "@/contexts/ThemeContext";
import { getCopy } from "@/lib/appCopy";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Edit2, Loader2, LogOut, Settings, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const PALETTE_COPY: Record<ThemePaletteId, { en: { name: string; description: string }; uz: { name: string; description: string } }> = {
  "day-ocean": {
    en: { name: "Ocean Mist", description: "Cool blue and aqua" },
    uz: { name: "Okean nafasi", description: "Sokin ko'k va akva" },
  },
  "day-forest": {
    en: { name: "Forest Mint", description: "Green and clean" },
    uz: { name: "O'rmon minti", description: "Yashil va toza" },
  },
  "day-sand": {
    en: { name: "Sand Dune", description: "Warm beige and amber" },
    uz: { name: "Qumtepalar", description: "Iliq bej va qahrabo" },
  },
  "day-rose": {
    en: { name: "Rose Blush", description: "Soft pink accents" },
    uz: { name: "Atirgul jilosi", description: "Yumshoq pushti akslar" },
  },
  "day-slate": {
    en: { name: "Slate Sky", description: "Neutral blue-gray" },
    uz: { name: "Shifer osmon", description: "Neytral ko'k-kulrang" },
  },
  "night-aurora": {
    en: { name: "Aurora", description: "Teal neon on deep navy" },
    uz: { name: "Shafaq", description: "To'q dengiz rangida turkuaz neon" },
  },
  "night-midnight": {
    en: { name: "Midnight Blue", description: "Blue and indigo" },
    uz: { name: "Yarim tun moviyi", description: "Ko'k va indigo" },
  },
  "night-graphite": {
    en: { name: "Graphite", description: "Muted mono contrast" },
    uz: { name: "Grafit", description: "Yumshoq monoxrom kontrast" },
  },
};

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

  const { data: totalStats, isError: totalStatsError } = trpc.auth.getTotalStats.useQuery(undefined, { enabled: isAuthenticated });
  const { data: folders = [], isError: foldersError } = trpc.vocabulary.getFolders.useQuery(undefined, { enabled: isAuthenticated });

  const updateProfileMutation = trpc.auth.updateProfile.useMutation({
    onSuccess: async () => {
      setShowEditDialog(false);
      await Promise.all([
        utils.auth.me.invalidate(),
        utils.auth.getTotalStats.invalidate(),
      ]);
      toast.success(copy.profile.updated);
    },
    onError: error => toast.error(error.message || copy.profile.updateFailed),
  });

  const deleteAccountMutation = trpc.auth.deleteAccount.useMutation({
    onSuccess: async () => {
      toast.success(copy.profile.deleted);
      await logout();
      setLocation("/");
    },
    onError: error => toast.error(error.message || copy.profile.deleteFailed),
  });

  const totalFolders = folders.length;
  const totalWords = totalStats?.totalWords || 0;
  const knownWords = totalStats?.knownWords || 0;
  const unknownWords = totalStats?.unknownWords || 0;
  const donutCx = 110;
  const donutCy = 110;
  const donutRadius = 82;
  const donutStrokeWidth = 9;
  const donutDasharray = 2 * Math.PI * donutRadius;
  const knownRatio = totalWords > 0 ? knownWords / totalWords : 0;
  const targetDashoffset = donutDasharray * (1 - knownRatio);
  const [animatedKnownDashoffset, setAnimatedKnownDashoffset] = useState(donutDasharray);
  const [animatedTotalWords, setAnimatedTotalWords] = useState(0);
  const hasStatsAnimatedRef = useRef(false);

  useEffect(() => {
    if (!totalStats || hasStatsAnimatedRef.current) return;
    hasStatsAnimatedRef.current = true;

    const durationMs = 700;
    const start = performance.now();
    const startDashoffset = donutDasharray;

    let rafId = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out

      setAnimatedKnownDashoffset(
        startDashoffset + (targetDashoffset - startDashoffset) * eased
      );
      setAnimatedTotalWords(Math.round(totalWords * eased));

      if (t < 1) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [totalStats, totalWords, donutDasharray, targetDashoffset]);

  const visiblePalettes = paletteMode === "light" ? lightPalettes : darkPalettes;
  const paletteLocale = locale === "uz" ? "uz" : "en";

  if (totalStatsError || foldersError) {
    return (
      <div className="flex items-center justify-center min-h-[200px] text-destructive">
        Failed to load. Please refresh and try again.
      </div>
    );
  }

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
                <h2 className="text-2xl font-semibold scholar-title">{user?.name || copy.profile.defaultName}</h2>
                <p className="scholar-muted">{user?.email || copy.profile.defaultEmail}</p>
              </div>
            </div>
            <Button
              onClick={() => setShowEditDialog(true)}
              variant="outline"
              className="h-10 rounded-[var(--radius-button)] border-[var(--surface-border)] bg-transparent scholar-title hover:bg-[var(--accent-muted)]"
            >
              <Edit2 className="mr-1 h-4 w-4" />
              {copy.profile.editProfile}
            </Button>
          </div>
        </section>

        <section className="scholar-surface p-5 md:p-6">
          <div className="space-y-5">
            <div className="relative mx-auto h-52 w-52">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 220 220" aria-hidden="true">
                <circle
                  cx={donutCx}
                  cy={donutCy}
                  r={donutRadius}
                  fill="none"
                  stroke="color-mix(in srgb, var(--text-primary) 16%, transparent)"
                  strokeWidth={donutStrokeWidth}
                  opacity="0.18"
                />
                <circle
                  cx={donutCx}
                  cy={donutCy}
                  r={donutRadius}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth={donutStrokeWidth}
                  opacity="0.9"
                />
                <circle
                  cx={donutCx}
                  cy={donutCy}
                  r={donutRadius}
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth={donutStrokeWidth}
                  strokeLinecap="round"
                  strokeDasharray={donutDasharray}
                  strokeDashoffset={animatedKnownDashoffset}
                />
              </svg>
              <div className="absolute inset-0 grid place-items-center text-center">
                <div>
                  <div className="text-3xl font-semibold leading-none scholar-title">
                    {knownWords} / {animatedTotalWords}
                  </div>
                  <div className="mt-2 text-xs uppercase tracking-[0.2em] scholar-muted">
                    {copy.profile.knownOfTotal}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-6 text-sm">
              <div className="scholar-title">
                <span className="mr-1 text-[#22c55e]">●</span>
                {copy.profile.known}: {knownWords}
              </div>
              <div className="scholar-title">
                <span className="mr-1 text-[#3b82f6]">●</span>
                {copy.profile.unknown}: {unknownWords}
              </div>
            </div>

            <div className="h-px w-full bg-[color-mix(in_srgb,var(--text-primary)_12%,transparent)]" />
            <div className="text-right text-xs scholar-muted">{copy.profile.folders}: {totalFolders}</div>
          </div>
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
                name={PALETTE_COPY[p.id][paletteLocale].name}
                description={PALETTE_COPY[p.id][paletteLocale].description}
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
            <DialogTitle className="font-display text-2xl">{copy.profile.editProfile}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              placeholder={copy.profile.namePlaceholder}
              className="border-[var(--surface-border)] bg-[var(--surface)] scholar-title"
            />
            <Input
              value={editEmail}
              onChange={e => setEditEmail(e.target.value)}
              placeholder={copy.profile.emailPlaceholder}
              className="border-[var(--surface-border)] bg-[var(--surface)] scholar-title"
            />
            <Button
              onClick={() => {
                if (!editName.trim()) {
                  toast.error(copy.profile.emptyName);
                  return;
                }
                updateProfileMutation.mutate({ name: editName.trim(), email: editEmail.trim() || undefined });
              }}
              disabled={updateProfileMutation.isPending}
              className="h-10 w-full rounded-[var(--radius-button)] bg-[var(--accent)] text-black hover:bg-[var(--accent-strong)] hover:text-white"
            >
              {updateProfileMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : copy.profile.save}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="scholar-surface-elevated border-[var(--surface-border)]">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{copy.profile.deleteConfirmTitle}</DialogTitle>
          </DialogHeader>
          <p className="text-sm scholar-muted">{copy.profile.deleteConfirmBody}</p>
          <Button
            onClick={() => deleteAccountMutation.mutate()}
            disabled={deleteAccountMutation.isPending}
            className="h-10 w-full rounded-[var(--radius-button)] bg-red-600 text-white hover:bg-red-700"
          >
            {deleteAccountMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : copy.profile.delete}
          </Button>
        </DialogContent>
      </Dialog>
    </MobileAppShell>
  );
}
