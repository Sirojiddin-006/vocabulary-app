import { useAuth } from "@/_core/hooks/useAuth";
import { EnglishSpeakButton } from "@/components/EnglishSpeakButton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, ChevronLeft, Play, RotateCcw } from "lucide-react";
import { useAppLocale } from "@/contexts/AppLocaleContext";
import { getCopy } from "@/lib/appCopy";
import { trpc } from "@/lib/trpc";
import { useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";

export default function GlobalFolder() {
  const { isAuthenticated } = useAuth();
  const { locale } = useAppLocale();
  const copy = getCopy(locale);
  const [, setLocation] = useLocation();
  const params = useParams();
  const folderId = parseInt(params.id || "0");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"az" | "za">("az");

  const { data: folder, isLoading: folderLoading } = trpc.vocabulary.getGlobalFolderById.useQuery(
    { folderId },
    { enabled: isAuthenticated && folderId > 0 }
  );
  const { data: words = [], isLoading: wordsLoading } = trpc.vocabulary.getGlobalWords.useQuery(
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

  if (folderLoading) {
    return (
      <div className="min-h-screen w-full app-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  if (!folder) {
    return (
      <div className="min-h-screen w-full app-bg scholar-title flex flex-col items-center justify-center">
        <p className="scholar-muted mb-4">{copy.globalFolder.folderNotFound}</p>
        <Button
          onClick={() => setLocation("/global")}
          className="bg-[var(--accent)] hover:bg-[var(--accent-strong)] scholar-title rounded-full"
        >
          {copy.common.back}
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full app-bg text-foreground flex flex-col">
      <div className="page-navbar sticky top-0 z-40">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="flex items-center justify-between py-4">
            <button
              onClick={() => setLocation("/global")}
              className="page-navbar-back -ml-2 rounded-lg p-2"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h1 className="font-display text-xl font-semibold">{folder.name}</h1>
            <div className="w-6" />
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-6 py-5">
        <div className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="scholar-muted">{words.length} {copy.common.words}</span>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={() => setLocation(`/global/review/${folderId}`)}
              variant="outline"
              className="border-[var(--surface-border)] scholar-title hover:bg-[var(--accent-muted)] rounded-full text-sm"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              {copy.globalFolder.review}
            </Button>
            <Button
              onClick={() => setLocation(`/global/memorize/${folderId}`)}
              className="bg-[color-mix(in_srgb,_var(--accent)_55%,_#10B981)] hover:bg-[color-mix(in_srgb,_var(--accent-strong)_45%,_#0b7a57)] scholar-title rounded-full text-sm"
            >
              <Play className="w-4 h-4 mr-2" />
              {copy.globalFolder.memorize}
            </Button>
          </div>
        </div>
      </div>

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
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredWords.map(word => (
              <Card
                key={word.id}
                className="bg-[var(--surface)] border border-[var(--surface-border)] p-4 card-hover-glow"
              >
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
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
