import { useAuth } from "@/_core/hooks/useAuth";
import { EnglishSpeakButton } from "@/components/EnglishSpeakButton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronLeft, Eye, Loader2, RotateCcw } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";

type Word = {
  id: number;
  folderId: number;
  english: string;
  uzbek: string;
  description: string | null;
  example: string | null;
  createdBy: number | null;
  createdAt: Date;
  updatedAt: Date;
};

type StudyDirection = "en-uz" | "uz-en" | "mixed";

const EDGE_GESTURE_GUARD_PX = 24;
const SWIPE_RIGHT_THRESHOLD_PX = 56;
const SWIPE_LEFT_THRESHOLD_PX = 76;

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function parseDirectionFromUrl(): StudyDirection {
  if (typeof window === "undefined") return "en-uz";
  const dir = new URLSearchParams(window.location.search).get("dir");
  if (dir === "en-uz" || dir === "uz-en" || dir === "mixed") return dir;
  return "en-uz";
}

function resolveDirection(direction: StudyDirection, seed: number): Exclude<StudyDirection, "mixed"> {
  if (direction !== "mixed") return direction;
  return seed % 2 === 0 ? "en-uz" : "uz-en";
}

export default function GlobalReview() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams();
  const folderId = parseInt(params.id || "0");

  const [direction, setDirection] = useState<StudyDirection>(parseDirectionFromUrl);
  const [showTranslation, setShowTranslation] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isCardReady, setIsCardReady] = useState(false);
  const [wordQueue, setWordQueue] = useState<Word[]>([]);
  const [sessionTotal, setSessionTotal] = useState(0);

  const cardRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const edgeGestureBlocked = useRef(false);

  const { data: folder, isLoading: folderLoading } = trpc.vocabulary.getGlobalFolderById.useQuery(
    { folderId },
    { enabled: isAuthenticated && folderId > 0 }
  );
  const { data: words = [], isLoading: wordsLoading } = trpc.vocabulary.getGlobalWords.useQuery(
    { folderId },
    { enabled: isAuthenticated && folderId > 0 }
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    params.set("dir", direction);
    const query = params.toString();
    const next = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", next);
  }, [direction]);

  useEffect(() => {
    if (words.length > 0) {
      const shuffled = shuffleArray(words);
      setWordQueue(shuffled);
      setSessionTotal(shuffled.length);
    }
  }, [words]);

  const currentWord = wordQueue[0];
  const previewWord = wordQueue[1] ?? null;
  const completedWords = Math.max(0, sessionTotal - wordQueue.length);
  const progressPercent =
    sessionTotal > 0 ? Math.min(100, (completedWords / sessionTotal) * 100) : 0;

  const currentDirection = currentWord
    ? resolveDirection(direction, currentWord.id + completedWords)
    : "en-uz";
  const previewDirection = previewWord
    ? resolveDirection(direction, previewWord.id + completedWords + 1)
    : "en-uz";

  const promptText =
    currentWord
      ? currentDirection === "en-uz"
        ? currentWord.english
        : currentWord.uzbek
      : "";
  const answerText =
    currentWord
      ? currentDirection === "en-uz"
        ? currentWord.uzbek
        : currentWord.english
      : "";
  const promptSpeechText = currentDirection === "en-uz" ? promptText : null;
  const answerSpeechText = currentDirection === "uz-en" ? answerText : null;
  const previewPromptText =
    previewWord
      ? previewDirection === "en-uz"
        ? previewWord.english
        : previewWord.uzbek
      : "";

  useEffect(() => {
    if (!currentWord) return;
    setShowTranslation(false);
    setIsCardReady(false);
    const rafId = requestAnimationFrame(() => {
      setIsCardReady(true);
    });
    return () => cancelAnimationFrame(rafId);
  }, [currentWord?.id]);

  const restartSession = () => {
    const shuffled = shuffleArray(words);
    setWordQueue(shuffled);
    setSessionTotal(shuffled.length);
    setShowTranslation(false);
    setSwipeDirection(null);
    setDragOffset(0);
    setIsDragging(false);
  };

  const handleAnswer = (known: boolean) => {
    if (!currentWord) return;
    setSwipeDirection(known ? "right" : "left");

    window.setTimeout(() => {
      setWordQueue(prev => {
        if (prev.length === 0) return prev;
        const [first, ...rest] = prev;
        return known ? rest : [...rest, first];
      });
      setSwipeDirection(null);
      setDragOffset(0);
      setIsDragging(false);
      setShowTranslation(false);
    }, 240);
  };

  const handleStart = (clientX: number, clientY: number) => {
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    const nearScreenEdge =
      clientX <= EDGE_GESTURE_GUARD_PX || clientX >= viewportWidth - EDGE_GESTURE_GUARD_PX;

    edgeGestureBlocked.current = nearScreenEdge;
    if (nearScreenEdge) {
      setIsDragging(false);
      setDragOffset(0);
      return;
    }

    startX.current = clientX;
    startY.current = clientY;
    setIsDragging(true);
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging || edgeGestureBlocked.current) return false;

    const offsetX = clientX - startX.current;
    const offsetY = clientY - startY.current;
    const horizontalIntent = Math.abs(offsetX) > Math.abs(offsetY);

    if (!horizontalIntent) {
      setDragOffset(0);
      return false;
    }

    setDragOffset(offsetX < 0 ? offsetX * 0.82 : offsetX);
    return true;
  };

  const handleEnd = () => {
    if (!isDragging) {
      edgeGestureBlocked.current = false;
      return;
    }

    setIsDragging(false);
    edgeGestureBlocked.current = false;

    if (dragOffset > SWIPE_RIGHT_THRESHOLD_PX) {
      handleAnswer(true);
    } else if (dragOffset < -SWIPE_LEFT_THRESHOLD_PX) {
      handleAnswer(false);
    }

    setDragOffset(0);
  };

  const getCardTransform = () => {
    if (swipeDirection === "right") return "translateX(320px) rotate(12deg) scale(0.985)";
    if (swipeDirection === "left") return "translateX(-320px) rotate(-12deg) scale(0.985)";
    if (isDragging) {
      const rotation = dragOffset / 28;
      const lift = Math.min(10, Math.abs(dragOffset) / 18);
      return `translateX(${dragOffset}px) translateY(-${lift}px) rotate(${rotation}deg)`;
    }
    if (!isCardReady) return "translateY(4px) scale(0.996)";
    return "translateX(0) translateY(0) rotate(0)";
  };

  const getCardOpacity = () => {
    if (swipeDirection) return 0;
    if (isDragging) return Math.max(0.5, 1 - Math.abs(dragOffset) / 400);
    return isCardReady ? 1 : 0.985;
  };

  const previewProgress = swipeDirection ? 1 : Math.min(1, Math.abs(dragOffset) / 140);
  const previewBackStyle = {
    transform: `translateY(${14 - previewProgress * 5}px) scale(${0.94 + previewProgress * 0.015})`,
    opacity: 0.32 + previewProgress * 0.1,
    transition: isDragging ? "none" : "transform 0.18s ease-out, opacity 0.18s ease-out",
  };
  const previewMidStyle = {
    transform: `translateY(${7 - previewProgress * 7}px) scale(${0.97 + previewProgress * 0.03})`,
    opacity: 0.56 + previewProgress * 0.34,
    transition: isDragging ? "none" : "transform 0.18s ease-out, opacity 0.18s ease-out",
  };

  if (folderLoading || wordsLoading) {
    return (
      <div className="min-h-screen w-full app-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  if (!folder || words.length === 0) {
    return (
      <div className="min-h-screen w-full app-bg scholar-title flex flex-col items-center justify-center">
        <p className="scholar-muted mb-4">No words in this folder</p>
        <Button
          onClick={() => setLocation(`/global/folder/${folderId}`)}
          className="bg-[var(--accent)] hover:bg-[var(--accent-strong)] scholar-title rounded-full"
        >
          Go Back
        </Button>
      </div>
    );
  }

  if (!currentWord) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full px-6 app-bg">
        <div className="text-center">
          <p className="scholar-title text-xl font-bold mb-4">Review completed</p>
          <p className="scholar-muted mb-8">Session finished. No progress was marked as learned.</p>
          <div className="flex items-center justify-center gap-3">
            <Button onClick={restartSession} className="bg-[#10B981] hover:bg-[#0ea073] scholar-title rounded-full">
              Repeat Again
            </Button>
            <Button onClick={() => setLocation(`/global/folder/${folderId}`)} className="bg-[var(--accent)] hover:bg-[var(--accent-strong)] scholar-title rounded-full">
              Back
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="memorize-page flex flex-col min-h-screen w-full app-bg text-foreground">
      <div className="page-navbar sticky top-0 z-40">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <button onClick={() => setLocation(`/global/folder/${folderId}`)} className="glass-icon-button" type="button" aria-label="Back">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <h1 className="truncate font-display text-base text-strong">{folder.name}</h1>
            <p className="text-[11px] text-dim">Review</p>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="page-navbar-pill rounded-full px-3 py-1.5 text-xs">
                  {direction === "en-uz" ? "ENG" : direction === "uz-en" ? "UZB" : "Mix"}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="glass-dropdown min-w-36 rounded-2xl p-1.5">
                <DropdownMenuItem onClick={() => setDirection("en-uz")} className="glass-dropdown-item">ENG {"->"} UZB</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDirection("uz-en")} className="glass-dropdown-item">UZB {"->"} ENG</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDirection("mixed")} className="glass-dropdown-item">Mixed</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <button onClick={restartSession} className="glass-icon-button" type="button" aria-label="Restart">
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 pt-3 sm:px-6">
        <div className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] px-4 py-3">
          <div className="mb-2 flex items-center justify-between text-xs scholar-muted">
            <span>Review progress</span>
            <span>{completedWords}/{sessionTotal}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[color-mix(in_srgb,_var(--text-primary)_12%,_transparent)]">
            <div className="h-full rounded-full bg-[var(--accent)] transition-all" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-3 sm:px-6 sm:py-10">
        <div className="memorize-card-shell relative w-full max-w-3xl">
          <div className="memorize-card-backdrop memorize-card-backdrop-back" style={previewBackStyle} />
          <div className="memorize-card-backdrop memorize-card-backdrop-mid p-0" style={previewMidStyle}>
            {previewWord ? (
              <div className="memorize-card memorize-preview-card pointer-events-none relative h-full min-h-[360px] w-full rounded-3xl p-4 sm:min-h-[460px] md:min-h-[560px] sm:p-8 flex flex-col justify-between select-none">
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-full text-center">
                    <p className="mb-3 text-xs uppercase tracking-[0.3em] scholar-muted">Word {Math.min(sessionTotal, completedWords + 2)} of {sessionTotal}</p>
                    <p className="mb-2 text-sm scholar-muted">Review</p>
                    <h2 className="text-center text-[1.9rem] font-bold leading-tight scholar-muted sm:text-4xl">{previewPromptText}</h2>
                  </div>
                </div>
                <div className="mb-4 sm:mb-8">
                  <div className="memorize-glass-panel flex w-full items-center justify-center gap-3 rounded-2xl py-5 opacity-80 sm:py-8">
                    <Eye className="h-5 w-5 scholar-muted" />
                    <span className="scholar-muted">Show translation</span>
                  </div>
                </div>
                <div className="flex gap-3 sm:gap-4">
                  <div className="memorize-action-button flex h-14 flex-1 items-center justify-center rounded-full bg-[#EF4444] sm:h-16">
                    <span className="text-sm sm:text-base scholar-title font-semibold">Don't Know</span>
                  </div>
                  <div className="memorize-action-button flex h-14 flex-1 items-center justify-center rounded-full bg-[#10B981] sm:h-16">
                    <span className="text-sm sm:text-base scholar-title font-semibold">I Know</span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div
            key={currentWord.id}
            ref={cardRef}
            onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
            onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchMove={(e) => {
              const isHorizontal = handleMove(e.touches[0].clientX, e.touches[0].clientY);
              if (isHorizontal) e.preventDefault();
            }}
            onTouchEnd={handleEnd}
            onTouchCancel={handleEnd}
            className="memorize-card swipe-card relative flex min-h-[360px] select-none flex-col justify-between rounded-3xl p-4 sm:min-h-[460px] md:min-h-[560px] sm:p-8 cursor-grab active:cursor-grabbing"
            style={{
              transform: getCardTransform(),
              opacity: getCardOpacity(),
              transition: isDragging ? "none" : "transform 0.2s ease-out, opacity 0.18s ease-out",
              willChange: "transform, opacity",
            }}
          >
            <div className="flex flex-1 items-center justify-center">
              <div className="w-full text-center">
                <p className="mb-3 text-xs uppercase tracking-[0.3em] scholar-muted">Word {completedWords + 1} of {sessionTotal}</p>
                <p className="mb-2 text-sm scholar-muted">Review</p>
                <div className="flex items-center justify-center gap-2">
                  <h2 className="text-center text-[1.9rem] font-bold leading-tight scholar-title sm:text-4xl">{promptText}</h2>
                  {promptSpeechText ? (
                    <EnglishSpeakButton text={promptSpeechText} className="bg-white/10 scholar-title hover:bg-white/15" />
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mb-4 sm:mb-8">
              {!showTranslation ? (
                <button onClick={() => setShowTranslation(true)} className="memorize-glass-panel flex w-full items-center justify-center gap-3 rounded-2xl py-5 transition-colors hover:bg-white/10 sm:py-8">
                  <Eye className="h-5 w-5 scholar-title" />
                  <span className="scholar-title">Show translation</span>
                </button>
              ) : (
                <div className="memorize-glass-panel w-full rounded-2xl px-4 py-5 text-center sm:px-6 sm:py-8">
                  <div className="mb-2 flex items-center justify-center gap-2">
                    <p className="text-lg font-semibold scholar-title">{answerText}</p>
                    {answerSpeechText ? (
                      <EnglishSpeakButton text={answerSpeechText} className="bg-white/10 scholar-title hover:bg-white/15" />
                    ) : null}
                  </div>
                  {currentWord.description ? <p className="mb-2 text-sm scholar-title">{currentWord.description}</p> : null}
                  {currentWord.example ? <p className="text-sm scholar-muted">"{currentWord.example}"</p> : null}
                </div>
              )}
            </div>

            <div className="flex gap-3 sm:gap-4">
              <button onClick={() => handleAnswer(false)} className="memorize-action-button flex h-14 flex-1 items-center justify-center rounded-full bg-[#EF4444] hover:bg-[#dc2626] sm:h-16">
                <span className="text-sm sm:text-base scholar-title font-semibold">Don't Know</span>
              </button>
              <button onClick={() => handleAnswer(true)} className="memorize-action-button flex h-14 flex-1 items-center justify-center rounded-full bg-[#10B981] hover:bg-[#0ea073] sm:h-16">
                <span className="text-sm sm:text-base scholar-title font-semibold">I Know</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
