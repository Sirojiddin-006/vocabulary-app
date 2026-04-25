import { useAuth } from "@/_core/hooks/useAuth";
import { EnglishSpeakButton } from "@/components/EnglishSpeakButton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, ChevronLeft, Play, RotateCcw } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";

export default function GlobalFolder() {
  const { isAuthenticated } = useAuth();
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
        <Loader2 className="w-8 h-8 animate-spin text-[#0EA5FF]" />
      </div>
    );
  }

  if (!folder) {
    return (
      <div className="min-h-screen w-full app-bg text-white flex flex-col items-center justify-center">
        <p className="text-[#A6B0BE] mb-4">Folder not found</p>
        <Button
          onClick={() => setLocation("/global")}
          className="bg-[#0EA5FF] hover:bg-[#0c8fd9] text-white rounded-full"
        >
          Go Back
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
        <div className="rounded-2xl border border-white/10 bg-[#111827] px-6 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-[#A6B0BE]">{words.length} words</span>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              onClick={() => setLocation(`/global/review/${folderId}`)}
              variant="outline"
              className="border-white/10 text-white hover:bg-white/5 rounded-full text-sm"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Review
            </Button>
            <Button
              onClick={() => setLocation(`/global/memorize/${folderId}`)}
              className="bg-[#10B981] hover:bg-[#0ea073] text-white rounded-full text-sm"
            >
              <Play className="w-4 h-4 mr-2" />
              Memorize
            </Button>
          </div>
        </div>
      </div>

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
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredWords.map(word => (
              <Card
                key={word.id}
                className="bg-[#111827] border border-white/10 p-4 card-hover-glow"
              >
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
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
