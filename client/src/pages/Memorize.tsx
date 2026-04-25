import { useAuth } from "@/_core/hooks/useAuth";
import { EnglishSpeakButton } from "@/components/EnglishSpeakButton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronLeft, Loader2, RotateCcw } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useEffect, useMemo, useRef, useState } from "react";
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

type StudyMode = "test" | "type";
type StudyDirection = "en-uz" | "uz-en" | "mixed";
type ModeStats = Record<StudyMode, { attempted: number; correct: number }>;

const TYPE_MODE_TIME_LIMIT_SECONDS = 9;

const INITIAL_MODE_STATS: ModeStats = {
  test: { attempted: 0, correct: 0 },
  type: { attempted: 0, correct: 0 },
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
  if (typeof window === "undefined") return "test";
  const mode = new URLSearchParams(window.location.search).get("mode");
  return mode === "type" ? "type" : "test";
}

function getDefaultDirectionForMode(mode: StudyMode): StudyDirection {
  return mode === "test" ? "en-uz" : "uz-en";
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

export default function Memorize() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams();
  const folderId = parseInt(params.id || "0");

  const [mode, setMode] = useState<StudyMode>(parseModeFromUrl);
  const [direction, setDirection] = useState<StudyDirection>(() => {
    const initialMode = parseModeFromUrl();
    const parsedDirection = parseDirectionFromUrl();
    if (typeof window === "undefined") return getDefaultDirectionForMode(initialMode);
    const hasDir = new URLSearchParams(window.location.search).has("dir");
    return hasDir ? parsedDirection : getDefaultDirectionForMode(initialMode);
  });
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [typedResult, setTypedResult] = useState<"correct" | "wrong" | null>(null);
  const [pendingWrongMode, setPendingWrongMode] = useState<StudyMode | null>(null);
  const [wordQueue, setWordQueue] = useState<Word[]>([]);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [showStats, setShowStats] = useState(false);
  const [modeStats, setModeStats] = useState<ModeStats>(INITIAL_MODE_STATS);
  const [isCardReady, setIsCardReady] = useState(false);
  const [typeTimeLeft, setTypeTimeLeft] = useState(TYPE_MODE_TIME_LIMIT_SECONDS);

  const typeInputRef = useRef<HTMLInputElement>(null);
  const typedAnswerRef = useRef("");
  const wrongContinueTimerRef = useRef<number | null>(null);
  const typeTimerRef = useRef<number | null>(null);
  const typeTimerIntervalRef = useRef<number | null>(null);

  const { data: words = [], isLoading: wordsLoading } = trpc.vocabulary.getWords.useQuery(
    { folderId },
    { enabled: isAuthenticated && folderId > 0 }
  );
  const { data: folder, isLoading: folderLoading } = trpc.vocabulary.getFolderById.useQuery(
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
    typedAnswerRef.current = typedAnswer;
  }, [typedAnswer]);

  useEffect(() => {
    if (words.length > 0) {
      const shuffled = shuffleArray(words);
      setWordQueue(shuffled);
      setSessionTotal(shuffled.length);
    }
  }, [words]);

  useEffect(() => {
    return () => {
      if (wrongContinueTimerRef.current !== null) {
        window.clearTimeout(wrongContinueTimerRef.current);
      }
      if (typeTimerRef.current !== null) {
        window.clearTimeout(typeTimerRef.current);
      }
      if (typeTimerIntervalRef.current !== null) {
        window.clearInterval(typeTimerIntervalRef.current);
      }
    };
  }, []);

  const currentWord = wordQueue[0];
  const completedWords = Math.max(0, sessionTotal - wordQueue.length);
  const progressPercent =
    sessionTotal > 0 ? Math.min(100, (completedWords / sessionTotal) * 100) : 0;

  const currentDirection = currentWord
    ? resolveDirection(direction, currentWord.id + completedWords)
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
  const optionsContainEnglish = currentDirection === "uz-en";

  const testOptions = useMemo(() => {
    if (!currentWord || mode !== "test") return [];
    const correct = answerText;
    const pool = words.map(word => {
      const resolved = resolveDirection(direction, word.id + completedWords);
      return resolved === "en-uz" ? word.uzbek : word.english;
    });
    const uniqueDistractors = Array.from(new Set(pool.filter(value => value !== correct)));
    return shuffleArray(Array.from(new Set([correct, ...shuffleArray(uniqueDistractors).slice(0, 3)])));
  }, [answerText, completedWords, currentWord, direction, mode, words]);

  useEffect(() => {
    if (!currentWord) return;
    setSelectedOption(null);
    setTypedAnswer("");
    setTypedResult(null);
    setPendingWrongMode(null);
    setIsCardReady(false);
    const rafId = requestAnimationFrame(() => setIsCardReady(true));
    return () => cancelAnimationFrame(rafId);
  }, [currentWord?.id, mode]);

  useEffect(() => {
    if (mode !== "type" || !currentWord || pendingWrongMode || typedResult !== null) return;
    const timer = window.setTimeout(() => typeInputRef.current?.focus(), 80);
    return () => window.clearTimeout(timer);
  }, [currentWord?.id, mode, pendingWrongMode, typedResult]);

  useEffect(() => {
    if (typeTimerRef.current !== null) {
      window.clearTimeout(typeTimerRef.current);
      typeTimerRef.current = null;
    }
    if (typeTimerIntervalRef.current !== null) {
      window.clearInterval(typeTimerIntervalRef.current);
      typeTimerIntervalRef.current = null;
    }

    if (mode !== "type" || !currentWord || pendingWrongMode || typedResult !== null) {
      setTypeTimeLeft(TYPE_MODE_TIME_LIMIT_SECONDS);
      return;
    }

    const startedAt = Date.now();
    setTypeTimeLeft(TYPE_MODE_TIME_LIMIT_SECONDS);

    typeTimerIntervalRef.current = window.setInterval(() => {
      const elapsedMs = Date.now() - startedAt;
      const remaining = Math.max(
        0,
        Math.ceil((TYPE_MODE_TIME_LIMIT_SECONDS * 1000 - elapsedMs) / 1000)
      );
      setTypeTimeLeft(remaining);
    }, 200);

    typeTimerRef.current = window.setTimeout(() => {
      setTypeTimeLeft(0);
      submitTypedAnswer(typedAnswerRef.current);
    }, TYPE_MODE_TIME_LIMIT_SECONDS * 1000);

    return () => {
      if (typeTimerRef.current !== null) {
        window.clearTimeout(typeTimerRef.current);
        typeTimerRef.current = null;
      }
      if (typeTimerIntervalRef.current !== null) {
        window.clearInterval(typeTimerIntervalRef.current);
        typeTimerIntervalRef.current = null;
      }
    };
  }, [currentWord?.id, mode, pendingWrongMode, typedResult]);

  const currentModeStats = modeStats[mode];
  const currentModeAccuracy =
    currentModeStats.attempted > 0
      ? Math.round((currentModeStats.correct / currentModeStats.attempted) * 100)
      : 0;

  const restartSession = () => {
    const shuffled = shuffleArray(words);
    setWordQueue(shuffled);
    setSessionTotal(shuffled.length);
    setSelectedOption(null);
    setTypedAnswer("");
    setTypedResult(null);
    setPendingWrongMode(null);
    setTypeTimeLeft(TYPE_MODE_TIME_LIMIT_SECONDS);
    if (wrongContinueTimerRef.current !== null) {
      window.clearTimeout(wrongContinueTimerRef.current);
      wrongContinueTimerRef.current = null;
    }
  };

  const handleModeChange = (nextMode: StudyMode) => {
    setMode(nextMode);
    setDirection(getDefaultDirectionForMode(nextMode));
  };

  const finalizeAnswer = (known: boolean, answeredMode: StudyMode) => {
    if (!currentWord) return;
    updateProgressMutation.mutate({ wordId: currentWord.id, known });
    setWordQueue(prev => {
      if (prev.length === 0) return prev;
      const [first, ...rest] = prev;
      return known ? rest : [...rest, first];
    });
    setPendingWrongMode(null);
    setSelectedOption(null);
    setTypedAnswer("");
    setTypedResult(null);
  };

  const handleAnswer = (known: boolean, answeredMode: StudyMode = mode) => {
    if (!currentWord || pendingWrongMode) return;
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
      if (wrongContinueTimerRef.current !== null) {
        window.clearTimeout(wrongContinueTimerRef.current);
      }
      wrongContinueTimerRef.current = window.setTimeout(() => {
        finalizeAnswer(false, answeredMode);
      }, 5000);
      return;
    }

    finalizeAnswer(true, answeredMode);
  };

  const submitTypedAnswer = (value: string) => {
    if (pendingWrongMode || typedResult !== null) return;

    const known = normalizeAnswer(value) === normalizeAnswer(answerText);
    setTypedResult(known ? "correct" : "wrong");
    window.setTimeout(() => handleAnswer(known, "type"), 220);
  };

  const continueAfterWrong = () => {
    if (!pendingWrongMode) return;
    if (wrongContinueTimerRef.current !== null) {
      window.clearTimeout(wrongContinueTimerRef.current);
      wrongContinueTimerRef.current = null;
    }
    finalizeAnswer(false, pendingWrongMode);
  };

  if (folderLoading || wordsLoading) {
    return (
      <div className="min-h-screen w-full app-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0EA5FF]" />
      </div>
    );
  }

  if (!folder || words.length === 0) {
    return (
      <div className="min-h-screen w-full app-bg text-white flex flex-col items-center justify-center">
        <p className="text-[#A6B0BE] mb-4">No words in this folder</p>
        <Button onClick={() => setLocation(`/folder/${folderId}`)} className="bg-[#0EA5FF] hover:bg-[#0c8fd9] text-white rounded-full">
          Go Back
        </Button>
      </div>
    );
  }

  if (!currentWord) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full px-6 app-bg">
        <div className="text-center">
          <p className="text-white text-xl font-bold mb-4">Memorize completed</p>
          <p className="text-[#A6B0BE] mb-8">Great job. Your correct answers were saved as learned.</p>
          <div className="flex items-center justify-center gap-3">
            <Button onClick={restartSession} className="bg-[#10B981] hover:bg-[#0ea073] text-white rounded-full">
              Start Again
            </Button>
            <Button onClick={() => setLocation(`/folder/${folderId}`)} className="bg-[#0EA5FF] hover:bg-[#0c8fd9] text-white rounded-full">
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
          <button onClick={() => setLocation(`/folder/${folderId}`)} className="glass-icon-button" type="button" aria-label="Back">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <h1 className="truncate font-display text-base text-strong">{folder.name}</h1>
            <p className="text-[11px] text-dim">Memorize</p>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="page-navbar-pill rounded-full px-3 py-1.5 text-xs">
                  {mode === "test" ? "Test" : "Type"}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="glass-dropdown min-w-36 rounded-2xl p-1.5">
                <DropdownMenuItem onClick={() => handleModeChange("test")} className="glass-dropdown-item">Test</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleModeChange("type")} className="glass-dropdown-item">Type</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
        <div className="rounded-2xl border border-white/10 bg-[#111827]/82 px-4 py-3">
          <div className="mb-2 flex items-center justify-between gap-3 text-xs text-[#A6B0BE]">
            <span>{completedWords}/{sessionTotal}</span>
            <button type="button" onClick={() => setShowStats(prev => !prev)} className="transition hover:text-white">
              {showStats ? "Hide stats" : "Show stats"}
            </button>
            <span>{mode === "test" ? "Test" : "Type"} {currentModeAccuracy}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#15202B]">
            <div className="h-full rounded-full bg-[#0EA5FF] transition-all" style={{ width: `${progressPercent}%` }} />
          </div>
          {showStats ? (
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[#A6B0BE]">
              <span className="text-white">Test {modeStats.test.correct}/{modeStats.test.attempted}</span>
              <span className="text-white">Type {modeStats.type.correct}/{modeStats.type.attempted}</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-3 sm:px-6 sm:py-10">
        <div
          onClick={() => {
            if (pendingWrongMode) continueAfterWrong();
          }}
          className="memorize-card relative flex w-full max-w-3xl min-h-[360px] flex-col justify-between rounded-3xl p-4 sm:min-h-[460px] md:min-h-[560px] sm:p-8"
          style={{
            transform: isCardReady ? "translateY(0) scale(1)" : "translateY(4px) scale(0.996)",
            opacity: isCardReady ? 1 : 0.985,
            transition: "transform 0.18s ease-out, opacity 0.16s ease-out",
          }}
        >
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full text-center">
              <p className="mb-3 text-xs uppercase tracking-[0.3em] text-[#A6B0BE]">Word {completedWords + 1} of {sessionTotal}</p>
              <p className="mb-2 text-sm text-[#A6B0BE]">
                {mode === "test"
                  ? "Choose the correct answer"
                  : "Type the translation"}
              </p>
              {mode === "type" ? (
                <p className="mb-3 text-xs uppercase tracking-[0.24em] text-[#FBBF24]">
                  {typeTimeLeft}s left
                </p>
              ) : null}
              <div className="flex items-center justify-center gap-2">
                <h2 className="text-center text-[1.9rem] font-bold leading-tight text-white sm:text-4xl">{promptText}</h2>
                {promptSpeechText ? (
                  <EnglishSpeakButton text={promptSpeechText} className="bg-white/10 text-white hover:bg-white/15" />
                ) : null}
              </div>
            </div>
          </div>

          {mode === "test" ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {testOptions.map(option => {
                const isSelected = selectedOption === option;
                const isCorrect = option === answerText;
                let optionClass = "memorize-glass-panel hover:bg-white/10";
                if (selectedOption) {
                  if (isCorrect) optionClass = "bg-[#10B981]";
                  else if (isSelected) optionClass = "bg-[#EF4444]";
                  else optionClass = "memorize-glass-panel opacity-70";
                }

                return (
                  <div
                    key={option}
                    className={`flex min-h-14 items-center gap-2 rounded-2xl px-4 py-3 text-white transition ${optionClass}`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedOption || pendingWrongMode) return;
                        setSelectedOption(option);
                        window.setTimeout(() => handleAnswer(option === answerText, "test"), 220);
                      }}
                      disabled={!!selectedOption || !!pendingWrongMode}
                      className="flex-1 text-left"
                    >
                      {option}
                    </button>
                    {optionsContainEnglish ? (
                      <EnglishSpeakButton text={option} className="bg-black/10 text-white hover:bg-black/20" />
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-3">
              <input
                ref={typeInputRef}
                value={typedAnswer}
                onChange={e => setTypedAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    submitTypedAnswer(typedAnswer);
                  }
                }}
                placeholder="Type your answer"
                className="memorize-glass-panel w-full rounded-2xl px-4 py-3 text-white outline-none focus:border-[#0EA5FF]"
                disabled={!!pendingWrongMode || typedResult !== null}
              />
              <Button
                onClick={() => {
                  submitTypedAnswer(typedAnswer);
                }}
                disabled={!!pendingWrongMode || !typedAnswer.trim() || typedResult !== null}
                className="w-full rounded-2xl bg-[#0EA5FF] hover:bg-[#0c8fd9] py-3 text-white"
              >
                Check Answer
              </Button>
              {typedResult ? (
                <div className={`rounded-2xl px-4 py-3 text-sm ${typedResult === "correct" ? "bg-[#10B981]" : "bg-[#EF4444]"} text-white`}>
                  {typedResult === "correct" ? (
                    "Correct"
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <span>{`Wrong. Correct: ${answerText}`}</span>
                      {answerSpeechText ? (
                        <EnglishSpeakButton text={answerSpeechText} className="border-white/20 bg-white/10 text-white hover:bg-white/20" />
                      ) : null}
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}

          {pendingWrongMode ? (
            <div className="mt-3 rounded-xl border border-[#EF4444]/40 bg-[#EF4444]/15 px-3 py-2 text-center text-sm text-white">
              Wrong answer. Tap anywhere on this card to continue, or wait 5 seconds.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
