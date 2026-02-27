import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, ChevronLeft, Globe } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";

export default function Global() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"most" | "az">("most");

  const { data: folders = [], isLoading } =
    trpc.vocabulary.getGlobalFoldersWithCounts.useQuery(undefined, {
      enabled: isAuthenticated,
    });
  const { data: books = [] } = trpc.vocabulary.getGlobalBooks.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const bookTitleById = new Map(books.map(book => [book.id, book.title]));

  const visibleFolders = folders.filter(entry => entry.wordCount > 0);
  const filteredFolders = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const filtered = normalized.length === 0
      ? visibleFolders
      : visibleFolders.filter(entry =>
          entry.folder.name.toLowerCase().includes(normalized)
        );
    const sorted = [...filtered].sort((a, b) => {
      if (sort === "az") {
        return a.folder.name.localeCompare(b.folder.name);
      }
      return b.wordCount - a.wordCount;
    });
    return sorted;
  }, [query, sort, visibleFolders]);

  const totalWords = visibleFolders.reduce((sum, entry) => sum + entry.wordCount, 0);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full app-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0EA5FF]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full app-bg text-white flex flex-col">
      <div className="border-b border-white/10 bg-[#0B0E14]/70 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto w-full max-w-6xl px-6">
          <div className="flex items-center justify-between py-4">
            <button
              onClick={() => setLocation("/")}
              className="p-2 -ml-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            <h1 className="font-display text-xl font-semibold">Global</h1>
            <div className="w-6" />
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-6 pt-6">
        <div className="rounded-2xl border border-white/10 bg-[#111827] px-6 py-5 flex items-center gap-3">
          <Globe className="w-5 h-5 text-[#0EA5FF]" />
          <div>
            <p className="text-sm text-[#A6B0BE]">Global library</p>
            <p className="text-base">All folders created by everyone</p>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-6 pt-5">
        <div className="flex flex-col md:flex-row gap-3">
          <Input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search folders..."
            className="bg-[#0B0E14] border-white/10 text-white placeholder-[#A6B0BE]"
          />
          <div className="flex gap-2">
            <Button
              onClick={() => setSort("most")}
              variant="outline"
              className={sort === "most"
                ? "border-[#0EA5FF] text-[#0EA5FF] bg-[#0EA5FF]/10"
                : "border-white/10 text-white hover:bg-white/5"}
            >
              Most words
            </Button>
            <Button
              onClick={() => setSort("az")}
              variant="outline"
              className={sort === "az"
                ? "border-[#0EA5FF] text-[#0EA5FF] bg-[#0EA5FF]/10"
                : "border-white/10 text-white hover:bg-white/5"}
            >
              A - Z
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-6 pt-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card className="bg-[#111827] border border-white/10 p-5 card-fade-in card-hover-glow" style={{ animationDelay: "40ms" }}>
            <p className="text-xs uppercase tracking-[0.2em] text-[#A6B0BE]">Folders</p>
            <p className="text-2xl font-semibold mt-2">{visibleFolders.length}</p>
          </Card>
          <Card className="bg-[#111827] border border-white/10 p-5 card-fade-in card-hover-glow" style={{ animationDelay: "120ms" }}>
            <p className="text-xs uppercase tracking-[0.2em] text-[#A6B0BE]">Total Words</p>
            <p className="text-2xl font-semibold mt-2">{totalWords}</p>
          </Card>
          <Card className="bg-[#111827] border border-white/10 p-5 card-fade-in card-hover-glow" style={{ animationDelay: "200ms" }}>
            <p className="text-xs uppercase tracking-[0.2em] text-[#A6B0BE]">Active Topics</p>
            <p className="text-2xl font-semibold mt-2">{filteredFolders.length}</p>
          </Card>
        </div>
      </div>

      <div className="flex-1 mx-auto w-full max-w-6xl px-6 py-8">
        {filteredFolders.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border border-white/10 bg-[#0F1720]">
            <Globe className="w-12 h-12 mx-auto mb-4 text-[#A6B0BE]" />
            <p className="text-[#A6B0BE]">No folders found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredFolders.map(({ folder, wordCount }) => (
              <Card
                key={folder.id}
                className="bg-[#111827] border border-white/10 p-5 card-hover-glow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-semibold">{folder.name}</h3>
                    {folder.bookId && (
                      <p className="text-[#A6B0BE] text-xs">
                        {bookTitleById.get(folder.bookId) || "Book"} • Unit {folder.unitNumber || "-"}
                      </p>
                    )}
                    <p className="text-[#A6B0BE] text-sm">
                      {wordCount} words
                    </p>
                  </div>
                  <Button
                    onClick={() => setLocation(`/global/memorize/${folder.id}`)}
                    className="bg-[#0EA5FF] hover:bg-[#0c8fd9] text-white rounded-full text-sm"
                  >
                    Memorize
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
