import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, Eye } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useMemo, useState, useRef, useEffect } from "react";
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

type StudyMode = "classic" | "test" | "type" | "true-false";
type StudyDirection = "en-uz" | "uz-en";
type ModeStats = Record<StudyMode, { attempted: number; correct: number }>;

type TrueFalsePrompt = {
  candidate: string;
  isCorrect: boolean;
};

const EDGE_GESTURE_GUARD_PX = 24;
const SWIPE_THRESHOLD_PX = 80;
const MODE_LABELS: Record<StudyMode, string> = {
  classic: "Classic",
  test: "Test",
  type: "Type",
  "true-false": "T/F",
};
const INITIAL_MODE_STATS: ModeStats = {
  classic: { attempted: 0, correct: 0 },
  test: { attempted: 0, correct: 0 },
  type: { attempted: 0, correct: 0 },
  "true-false": { attempted: 0, correct: 0 },
};

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function normalizeAnswer(value: string) {
  return value.trim().toLowerCase();
}

function parseModeFromUrl(): StudyMode {
  if (typeof window === "undefined") return "classic";
  const mode = new URLSearchParams(window.location.search).get("mode");
  if (mode === "classic" || mode === "test" || mode === "type" || mode === "true-false") {
    return mode;
  }
  return "classic";
}

function parseDirectionFromUrl(): StudyDirection {
  if (typeof window === "undefined") return "en-uz";
  const dir = new URLSearchParams(window.location.search).get("dir");
  if (dir === "en-uz" || dir === "uz-en") return dir;
  return "en-uz";
}

export default function GlobalMemorize() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams();
  const folderId = parseInt(params.id || "0");

  const [mode, setMode] = useState<StudyMode>(parseModeFromUrl);
  const [direction, setDirection] = useState<StudyDirection>(parseDirectionFromUrl);
  const [isStarted, setIsStarted] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  const [showTranslation, setShowTranslation] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [typedResult, setTypedResult] = useState<"correct" | "wrong" | null>(null);
  const [trueFalseChoice, setTrueFalseChoice] = useState<boolean | null>(null);
  const [trueFalsePrompt, setTrueFalsePrompt] = useState<TrueFalsePrompt | null>(null);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isCardReady, setIsCardReady] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const typeInputRef = useRef<HTMLInputElement>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const edgeGestureBlocked = useRef(false);

  const [wordQueue, setWordQueue] = useState<Word[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [pendingWrongMode, setPendingWrongMode] = useState<StudyMode | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [modeStats, setModeStats] = useState<ModeStats>(INITIAL_MODE_STATS);
  const wrongContinueTimerRef = useRef<number | null>(null);

  const { data: folder } = trpc.vocabulary.getGlobalFolderById.useQuery(
    { folderId },
    { enabled: isAuthenticated && folderId > 0 }
  );

  const { data: words = [], isLoading: wordsLoading } = trpc.vocabulary.getGlobalWords.useQuery(
    { folderId },
    { enabled: isAuthenticated && folderId > 0 }
  );

  const updateProgressMutation = trpc.vocabulary.updateProgress.useMutation();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    params.set("mode", mode);
    params.set("dir", direction);
    const query = params.toString();
    const next = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
    window.history.replaceState({}, "", next);
  }, [mode, direction]);

  useEffect(() => {
    if (words.length > 0) {
      setWordQueue(shuffleArray(words));
      setQueueIndex(0);
      setSessionTotal(words.length);
      setIsStarted(false);
      setShowSettings(true);
    }
  }, [words]);

  useEffect(() => {
    return () => {
      if (wrongContinueTimerRef.current !== null) {
        window.clearTimeout(wrongContinueTimerRef.current);
      }
    };
  }, []);

  const currentWord = wordQueue[queueIndex];
  const remainingWords = wordQueue.length - queueIndex;
  const completedWords = Math.max(0, sessionTotal - remainingWords);
  const progressPercent =
    sessionTotal > 0 ? Math.min(100, (completedWords / sessionTotal) * 100) : 0;
  const currentModeStats = modeStats[mode];
  const currentModeAccuracy =
    currentModeStats.attempted > 0
      ? Math.round((currentModeStats.correct / currentModeStats.attempted) * 100)
      : 0;

  const promptText =
    direction === "en-uz" ? currentWord?.english ?? "" : currentWord?.uzbek ?? "";
  const answerText =
    direction === "en-uz" ? currentWord?.uzbek ?? "" : currentWord?.english ?? "";

  const testOptions = useMemo(() => {
    if (!currentWord || mode !== "test") return [];

    const correct = direction === "en-uz" ? currentWord.uzbek : currentWord.english;
    const pool = words.map(word => (direction === "en-uz" ? word.uzbek : word.english));
    const uniqueDistractors = Array.from(new Set(pool.filter(value => value !== correct)));
    const options = [correct, ...shuffleArray(uniqueDistractors).slice(0, 3)];

    return shuffleArray(Array.from(new Set(options)));
  }, [currentWord, direction, mode, words]);

  useEffect(() => {
    if (!currentWord) return;
    setIsCardReady(false);
    const rafId = requestAnimationFrame(() => {
      setIsCardReady(true);
    });
    return () => cancelAnimationFrame(rafId);
  }, [currentWord?.id]);

  useEffect(() => {
    if (!currentWord || mode !== "true-false") {
      setTrueFalsePrompt(null);
      return;
    }

    const correct = direction === "en-uz" ? currentWord.uzbek : currentWord.english;
    const pool = words
      .map(word => (direction === "en-uz" ? word.uzbek : word.english))
      .filter(value => value !== correct);

    if (pool.length === 0) {
      setTrueFalsePrompt({ candidate: correct, isCorrect: true });
      return;
    }

    const showCorrect = (currentWord.id + completedWords) % 2 === 0;
    if (showCorrect) {
      setTrueFalsePrompt({ candidate: correct, isCorrect: true });
      return;
    }

    const candidate = pool[(currentWord.id + completedWords) % pool.length];
    setTrueFalsePrompt({ candidate, isCorrect: false });
  }, [currentWord, direction, mode, words, completedWords]);

  useEffect(() => {
    if (
      !isStarted ||
      mode !== "type" ||
      pendingWrongMode ||
      typedResult !== null ||
      !currentWord
    ) {
      return;
    }

    const timer = window.setTimeout(() => {
      typeInputRef.current?.focus();
    }, 80);

    return () => window.clearTimeout(timer);
  }, [isStarted, mode, pendingWrongMode, typedResult, currentWord?.id]);

  if (wordsLoading) {
    return (
      <div className="min-h-screen w-full app-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0EA5FF]" />
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="min-h-screen w-full app-bg text-white flex flex-col items-center justify-center">
        <p className="text-[#A6B0BE] mb-4">No words in this folder</p>
        <Button
          onClick={() => setLocation("/global")}
          className="bg-[#0EA5FF] hover:bg-[#0c8fd9] text-white rounded-full"
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
          <p className="text-white text-xl font-bold mb-4">All words learned!</p>
          <p className="text-[#A6B0BE] mb-8">Great job! You've completed this session.</p>
          <Button
            onClick={() => setLocation("/global")}
            className="px-6 py-3 bg-[#0EA5FF] hover:bg-[#0c8fd9] rounded-full text-white"
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const resetCardState = () => {
    setShowTranslation(false);
    setSelectedOption(null);
    setTypedAnswer("");
    setTypedResult(null);
    setTrueFalseChoice(null);
    setTrueFalsePrompt(null);
  };

  const clearWrongContinueTimer = () => {
    if (wrongContinueTimerRef.current !== null) {
      window.clearTimeout(wrongContinueTimerRef.current);
      wrongContinueTimerRef.current = null;
    }
  };

  const selectMode = (nextMode: StudyMode) => {
    setMode(nextMode);
    setShowTranslation(false);
    setSelectedOption(null);
    setTypedAnswer("");
    setTypedResult(null);
    setTrueFalseChoice(null);
  };

  const selectDirection = (nextDirection: StudyDirection) => {
    setDirection(nextDirection);
    setShowTranslation(false);
    setSelectedOption(null);
    setTypedAnswer("");
    setTypedResult(null);
    setTrueFalseChoice(null);
  };

  const startMemorize = () => {
    setWordQueue(shuffleArray(words));
    setQueueIndex(0);
    setSessionTotal(words.length);
    setIsStarted(true);
    setShowSettings(false);
    setPendingWrongMode(null);
    clearWrongContinueTimer();
    resetCardState();
  };

  const finalizeAnswer = (known: boolean, answeredMode: StudyMode) => {
    updateProgressMutation.mutate({ wordId: currentWord.id, known });

    setSwipeDirection(known ? "right" : "left");

    setTimeout(() => {
      if (!known) {
        const newQueue = [...wordQueue];
        const currentWordCopy = { ...currentWord };
        newQueue.splice(queueIndex, 1);
        newQueue.push(currentWordCopy);
        setWordQueue(newQueue);
      } else {
        const newQueue = wordQueue.filter((_, idx) => idx !== queueIndex);
        setWordQueue(newQueue);
      }

      resetCardState();
      setPendingWrongMode(null);
      setSwipeDirection(null);
      setDragOffset(0);
      setIsDragging(false);
    }, 300);
  };

  const continueAfterWrong = () => {
    if (!pendingWrongMode) return;
    clearWrongContinueTimer();
    finalizeAnswer(false, pendingWrongMode);
  };

  const handleAnswer = (known: boolean, answeredMode: StudyMode = mode) => {
    if (!isStarted || pendingWrongMode) return;

    setModeStats(prev => {
      const current = prev[answeredMode];
      return {
        ...prev,
        [answeredMode]: {
          attempted: current.attempted + 1,
          correct: current.correct + (known ? 1 : 0),
        },
      };
    });

    if (!known) {
      setPendingWrongMode(answeredMode);
      clearWrongContinueTimer();
      wrongContinueTimerRef.current = window.setTimeout(() => {
        finalizeAnswer(false, answeredMode);
      }, 5000);
      return;
    }

    finalizeAnswer(true, answeredMode);
  };

  const handleOptionSelect = (option: string) => {
    if (!isStarted || pendingWrongMode || selectedOption) return;
    const known = option === answerText;
    const answeredMode = mode;
    setSelectedOption(option);
    setTimeout(() => {
      handleAnswer(known, answeredMode);
    }, 320);
  };

  const handleTypedSubmit = () => {
    if (!isStarted || pendingWrongMode || typedResult) return;
    const known = normalizeAnswer(typedAnswer) === normalizeAnswer(answerText);
    const answeredMode = mode;
    setTypedResult(known ? "correct" : "wrong");
    setTimeout(() => {
      handleAnswer(known, answeredMode);
    }, 350);
  };

  const handleTrueFalseSubmit = (choice: boolean) => {
    if (!isStarted || pendingWrongMode || !trueFalsePrompt || trueFalseChoice !== null) return;
    setTrueFalseChoice(choice);
    const known = choice === trueFalsePrompt.isCorrect;
    const answeredMode = mode;
    setTimeout(() => {
      handleAnswer(known, answeredMode);
    }, 350);
  };

  const handleStart = (clientX: number, clientY: number) => {
    if (!isStarted || pendingWrongMode || mode !== "classic") return;

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
    if (!isStarted || pendingWrongMode || mode !== "classic") return false;
    if (!isDragging || edgeGestureBlocked.current) return false;

    const offsetX = clientX - startX.current;
    const offsetY = clientY - startY.current;
    const horizontalIntent = Math.abs(offsetX) > Math.abs(offsetY);

    if (!horizontalIntent) {
      setDragOffset(0);
      return false;
    }

    setDragOffset(offsetX);
    return true;
  };

  const handleEnd = () => {
    if (!isStarted || pendingWrongMode || mode !== "classic") {
      setDragOffset(0);
      setIsDragging(false);
      edgeGestureBlocked.current = false;
      return;
    }

    if (!isDragging) {
      edgeGestureBlocked.current = false;
      return;
    }

    setIsDragging(false);
    edgeGestureBlocked.current = false;

    if (Math.abs(dragOffset) > SWIPE_THRESHOLD_PX) {
      if (dragOffset > 0) {
        handleAnswer(true);
      } else {
        handleAnswer(false);
      }
    }

    setDragOffset(0);
  };

  const getCardTransform = () => {
    if (swipeDirection === "right") return "translateX(400px) rotate(20deg)";
    if (swipeDirection === "left") return "translateX(-400px) rotate(-20deg)";
    if (isDragging && mode === "classic") {
      const rotation = dragOffset / 20;
      return `translateX(${dragOffset}px) rotate(${rotation}deg)`;
    }
    return "translateX(0) rotate(0)";
  };

  const getCardOpacity = () => {
    if (swipeDirection) return 0;
    if (isDragging && mode === "classic") {
      return Math.max(0.5, 1 - Math.abs(dragOffset) / 400);
    }
    return 1;
  };

  return (
    <div className="memorize-page flex flex-col min-h-screen w-full app-bg text-white">
      <div className="border-b border-white/10 bg-[#0B0E14]/70 backdrop-blur sticky top-0 z-40">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="flex items-center justify-between py-4">
            <button
              onClick={() => setLocation("/global")}
              className="p-2 -ml-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            <h1 className="font-display text-[#0EA5FF]">{folder?.name || "Memorize"}</h1>
            {isStarted ? (
              <button
                type="button"
                onClick={() => setShowSettings(prev => !prev)}
                className="rounded-lg px-2 py-1 text-xs text-[#A6B0BE] hover:text-white hover:bg-white/5 transition"
              >
                {showSettings ? "Hide" : "Settings"}
              </button>
            ) : (
              <div className="w-6" />
            )}
          </div>
        </div>
      </div>

      {!isStarted || showSettings ? (
      <div className="mx-auto w-full max-w-6xl px-4 pt-3 sm:px-6 sm:pt-5">
        <div className="rounded-2xl border border-white/10 bg-[#111827]/85 px-3 py-3 sm:px-4">
          <div className="flex items-center justify-between text-xs sm:text-sm text-[#A6B0BE] mb-2">
            <span>Session progress</span>
            <span>
              {completedWords}/{sessionTotal}
            </span>
          </div>
          <div className="h-2 bg-[#15202B] rounded-full overflow-hidden">
            <div
              className="bg-[#0EA5FF] h-full rounded-full transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowStats(prev => !prev)}
              className="text-[11px] sm:text-xs text-[#A6B0BE] hover:text-white transition"
            >
              {showStats ? "Hide stats" : "Show stats"}
            </button>
            <span className="text-[11px] sm:text-xs text-white">
              {MODE_LABELS[mode]} {currentModeAccuracy}%
            </span>
          </div>
          {showStats ? (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] sm:text-xs text-[#A6B0BE]">
              <span className="text-white">
                {MODE_LABELS[mode]} {currentModeAccuracy}% ({currentModeStats.correct}/
                {currentModeStats.attempted})
              </span>
              {(Object.keys(MODE_LABELS) as StudyMode[])
                .filter(modeKey => modeKey !== mode)
                .map((modeKey) => {
                  const stat = modeStats[modeKey];
                  const accuracy =
                    stat.attempted > 0 ? Math.round((stat.correct / stat.attempted) * 100) : 0;
                  return (
                    <span key={modeKey} className="rounded-md bg-white/5 px-1.5 py-0.5">
                      {MODE_LABELS[modeKey]} {accuracy}%
                    </span>
                  );
                })}
            </div>
          ) : null}

          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => selectMode("classic")}
              className={`rounded-lg px-2.5 py-1.5 text-xs sm:text-sm transition border ${
                mode === "classic"
                  ? "bg-[#0EA5FF] text-white border-[#0EA5FF]"
                  : "bg-[#0B1220] text-[#A6B0BE] border-white/10"
              }`}
            >
              Classic
            </button>
            <button
              type="button"
              onClick={() => selectMode("test")}
              className={`rounded-lg px-2.5 py-1.5 text-xs sm:text-sm transition border ${
                mode === "test"
                  ? "bg-[#0EA5FF] text-white border-[#0EA5FF]"
                  : "bg-[#0B1220] text-[#A6B0BE] border-white/10"
              }`}
            >
              Test
            </button>
            <button
              type="button"
              onClick={() => selectMode("type")}
              className={`rounded-lg px-2.5 py-1.5 text-xs sm:text-sm transition border ${
                mode === "type"
                  ? "bg-[#0EA5FF] text-white border-[#0EA5FF]"
                  : "bg-[#0B1220] text-[#A6B0BE] border-white/10"
              }`}
            >
              Type
            </button>
            <button
              type="button"
              onClick={() => selectMode("true-false")}
              className={`rounded-lg px-2.5 py-1.5 text-xs sm:text-sm transition border ${
                mode === "true-false"
                  ? "bg-[#0EA5FF] text-white border-[#0EA5FF]"
                  : "bg-[#0B1220] text-[#A6B0BE] border-white/10"
              }`}
            >
              True / False
            </button>
          </div>

          <div className="mt-2 flex bg-[#0B1220] rounded-xl p-1 border border-white/10">
            <button
              type="button"
              onClick={() => selectDirection("en-uz")}
              className={`flex-1 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm transition ${
                direction === "en-uz" ? "bg-[#10B981] text-white" : "text-[#A6B0BE]"
              }`}
            >
              ENG → UZB
            </button>
            <button
              type="button"
              onClick={() => selectDirection("uz-en")}
              className={`flex-1 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm transition ${
                direction === "uz-en" ? "bg-[#10B981] text-white" : "text-[#A6B0BE]"
              }`}
            >
              UZB → ENG
            </button>
          </div>
          {!isStarted ? (
            <Button
              onClick={startMemorize}
              className="mt-3 w-full bg-[#0EA5FF] hover:bg-[#0c8fd9] text-white rounded-xl py-2.5"
            >
              Start Memorize
            </Button>
          ) : null}
        </div>
      </div>
      ) : null}

      {isStarted ? (
      <div className="flex-1 flex items-center justify-center px-4 py-3 sm:px-6 sm:py-10">
        <div className="relative w-full max-w-3xl">
          <div className="absolute inset-0 bg-[#1a2732] rounded-3xl transform translate-y-2 scale-95 opacity-50" />
          <div className="absolute inset-0 bg-[#15202B] rounded-3xl transform translate-y-1 scale-[0.97] opacity-75" />

          <div
            ref={cardRef}
            onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
            onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
            onTouchMove={(e) => {
              const isHorizontal = handleMove(e.touches[0].clientX, e.touches[0].clientY);
              if (isHorizontal) {
                e.preventDefault();
              }
            }}
            onTouchEnd={handleEnd}
            onTouchCancel={handleEnd}
            onClick={() => {
              if (pendingWrongMode) {
                continueAfterWrong();
              }
            }}
            className={`swipe-card relative bg-[#15202B] rounded-3xl p-4 sm:p-8 min-h-[360px] sm:min-h-[460px] md:min-h-[560px] flex flex-col justify-between select-none ${
              mode === "classic"
                ? "cursor-grab active:cursor-grabbing"
                : "cursor-default"
            }`}
            style={{
              transform: getCardTransform(),
              opacity: isCardReady ? getCardOpacity() : 0,
              transition: isDragging ? "none" : "transform 0.3s ease, opacity 0.3s ease",
              willChange: "transform, opacity",
            }}
          >
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center w-full">
                <p className="text-xs uppercase tracking-[0.3em] text-[#A6B0BE] mb-3">
                  Word {completedWords + 1} of {sessionTotal}
                </p>
                <p className="text-sm text-[#A6B0BE] mb-2">
                  {mode === "test"
                    ? "Choose the correct answer"
                    : mode === "type"
                      ? "Type the translation"
                      : mode === "true-false"
                        ? "Is this translation correct?"
                        : "Memorize"}
                </p>
                <h2 className="text-white text-center text-[1.9rem] leading-tight sm:text-4xl font-bold">
                  {promptText}
                </h2>
              </div>
            </div>

            {mode === "classic" ? (
              <>
                <div className="mb-4 sm:mb-8">
                  {!showTranslation ? (
                    <button
                      onClick={() => setShowTranslation(true)}
                      disabled={!isStarted || !!pendingWrongMode}
                      className="w-full bg-[#6B7280] rounded-2xl py-5 sm:py-8 flex items-center justify-center gap-3 hover:bg-[#7a8492] transition-colors"
                    >
                      <Eye className="w-5 h-5 text-white" />
                      <span className="text-white">Show translation</span>
                    </button>
                  ) : (
                    <div className="w-full bg-[#6B7280] rounded-2xl py-5 sm:py-8 px-4 sm:px-6 text-center">
                      <p className="text-white mb-2 text-lg font-semibold">{answerText}</p>
                      {currentWord.description && (
                        <p className="text-white/90 text-sm mb-2">{currentWord.description}</p>
                      )}
                      {currentWord.example && (
                        <p className="text-[#A6B0BE] text-sm">"{currentWord.example}"</p>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 sm:gap-4">
                  <Button
                    onClick={() => handleAnswer(false)}
                    disabled={!isStarted || !!pendingWrongMode}
                    className="flex-1 bg-[#EF4444] hover:bg-[#dc2626] text-white rounded-full py-2.5 sm:py-3"
                  >
                    Don't Know
                  </Button>
                  <Button
                    onClick={() => handleAnswer(true)}
                    disabled={!isStarted || !!pendingWrongMode}
                    className="flex-1 bg-[#10B981] hover:bg-[#0ea073] text-white rounded-full py-2.5 sm:py-3"
                  >
                    I Know
                  </Button>
                </div>
              </>
            ) : null}

            {mode === "test" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2 sm:mb-0">
                {testOptions.map((option) => {
                  const isSelected = selectedOption === option;
                  const isCorrect = option === answerText;

                  let optionClass = "bg-[#1F2937] hover:bg-[#263447]";
                  if (selectedOption) {
                    if (isCorrect) {
                      optionClass = "bg-[#10B981]";
                    } else if (isSelected) {
                      optionClass = "bg-[#EF4444]";
                    } else {
                      optionClass = "bg-[#1F2937] opacity-70";
                    }
                  }

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleOptionSelect(option)}
                      disabled={!isStarted || !!pendingWrongMode || !!selectedOption}
                      className={`min-h-14 rounded-2xl px-4 py-3 text-left text-white transition ${optionClass}`}
                    >
                      {option}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {mode === "type" ? (
              <div className="space-y-3">
                <input
                  ref={typeInputRef}
                  value={typedAnswer}
                  onChange={(e) => setTypedAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleTypedSubmit();
                    }
                  }}
                  placeholder="Type your answer"
                  className="w-full rounded-2xl bg-[#1F2937] border border-white/10 px-4 py-3 text-white outline-none focus:border-[#0EA5FF]"
                  disabled={!isStarted || !!pendingWrongMode || typedResult !== null}
                />
                <Button
                  onClick={handleTypedSubmit}
                  disabled={!isStarted || !!pendingWrongMode || !typedAnswer.trim() || typedResult !== null}
                  className="w-full rounded-2xl bg-[#0EA5FF] hover:bg-[#0c8fd9] text-white py-3"
                >
                  Check Answer
                </Button>
                {typedResult && (
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm ${
                      typedResult === "correct"
                        ? "bg-[#10B981] text-white"
                        : "bg-[#EF4444] text-white"
                    }`}
                  >
                    {typedResult === "correct" ? "Correct" : `Wrong. Correct: ${answerText}`}
                  </div>
                )}
              </div>
            ) : null}

            {mode === "true-false" ? (
              <div className="space-y-3">
                <div className="rounded-2xl bg-[#1F2937] border border-white/10 px-4 py-4 text-center text-white text-lg font-semibold">
                  {trueFalsePrompt?.candidate || "..."}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => handleTrueFalseSubmit(true)}
                    disabled={!isStarted || !!pendingWrongMode || trueFalseChoice !== null || !trueFalsePrompt}
                    className={`rounded-2xl py-3 ${
                      trueFalseChoice === true
                        ? trueFalsePrompt?.isCorrect
                          ? "bg-[#10B981]"
                          : "bg-[#EF4444]"
                        : "bg-[#0EA5FF] hover:bg-[#0c8fd9]"
                    }`}
                  >
                    True
                  </Button>
                  <Button
                    onClick={() => handleTrueFalseSubmit(false)}
                    disabled={!isStarted || !!pendingWrongMode || trueFalseChoice !== null || !trueFalsePrompt}
                    className={`rounded-2xl py-3 ${
                      trueFalseChoice === false
                        ? !trueFalsePrompt?.isCorrect
                          ? "bg-[#10B981]"
                          : "bg-[#EF4444]"
                        : "bg-[#6B7280] hover:bg-[#7a8492]"
                    }`}
                  >
                    False
                  </Button>
                </div>
                {trueFalseChoice !== null && trueFalsePrompt && (
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm ${
                      trueFalseChoice === trueFalsePrompt.isCorrect
                        ? "bg-[#10B981] text-white"
                        : "bg-[#EF4444] text-white"
                    }`}
                  >
                    {trueFalseChoice === trueFalsePrompt.isCorrect
                      ? "Correct"
                      : `Wrong. Correct: ${answerText}`}
                  </div>
                )}
              </div>
            ) : null}
            {pendingWrongMode ? (
              <div className="mt-3 rounded-xl border border-[#EF4444]/40 bg-[#EF4444]/15 px-3 py-2 text-sm text-white text-center">
                Wrong answer. Tap anywhere on this card to continue, or wait 5 seconds.
              </div>
            ) : null}
            {!isStarted ? (
              null
            ) : null}
          </div>
        </div>
      </div>
      ) : (
      <div className="flex-1 flex items-center justify-center px-4 py-3 sm:px-6 sm:py-10">
        <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-[#15202B]/70 px-6 py-10 text-center">
          <p className="text-[#A6B0BE]">Configure settings above and press Start Memorize.</p>
        </div>
      </div>
      )}

      <div className="text-center pb-5 sm:pb-8">
        <span className="text-[#A6B0BE]">{remainingWords} remaining</span>
      </div>
    </div>
  );
}
