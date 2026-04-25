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
type SessionResult = { word: Word; correct: boolean };

const TYPE_MODE_TIME_LIMIT_SECONDS = 9;
const CORRECT_COOLDOWN_SECONDS = 3;

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

export default function GlobalMemorize() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams();
  const folderId = parseInt(params.id || "0");

  const [mode, setMode] = useState<StudyMode>(parseModeFromUrl);
  const [direction, setDirection] = useState<StudyDirection>(() => {
    const initialMode = parseModeFromUrl();
    const parsedDirection = parseDirectionFromUrl();
    if (typeof window === "undefined")
      return getDefaultDirectionForMode(initialMode);
    const hasDir = new URLSearchParams(window.location.search).has("dir");
    return hasDir ? parsedDirection : getDefaultDirectionForMode(initialMode);
  });

  const [remainingWords, setRemainingWords] = useState<Word[]>([]);
  const [results, setResults] = useState<SessionResult[]>([]);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [showStats, setShowStats] = useState(false);
  const [modeStats, setModeStats] = useState<ModeStats>(INITIAL_MODE_STATS);
  const [isCardReady, setIsCardReady] = useState(false);

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [typedResult, setTypedResult] = useState<"correct" | "wrong" | null>(
    null
  );
  const [typeTimeLeft, setTypeTimeLeft] = useState(
    TYPE_MODE_TIME_LIMIT_SECONDS
  );

  const [feedbackState, setFeedbackState] = useState<
    "correct" | "incorrect" | null
  >(null);
  const [countdown, setCountdown] = useState(0);

  const typeInputRef = useRef<HTMLInputElement>(null);
  const typedAnswerRef = useRef("");
  const mixedDirectionByWordIdRef = useRef<
    Map<number, Exclude<StudyDirection, "mixed">>
  >(new Map());
  const typeTimerRef = useRef<number | null>(null);
  const typeTimerIntervalRef = useRef<number | null>(null);
  const cooldownTimerRef = useRef<number | null>(null);
  const pendingAnswerRef = useRef<{
    correct: boolean;
    answeredMode: StudyMode;
  } | null>(null);

  const { data: words = [], isLoading: wordsLoading } =
    trpc.vocabulary.getGlobalWords.useQuery(
      { folderId },
      { enabled: isAuthenticated && folderId > 0 }
    );
  const { data: folder, isLoading: folderLoading } =
    trpc.vocabulary.getGlobalFolderById.useQuery(
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
    if (words.length === 0) return;
    const shuffled = shuffleArray(words);
    setRemainingWords(shuffled);
    setSessionTotal(shuffled.length);
    setResults([]);
    setModeStats(INITIAL_MODE_STATS);
    setSelectedOption(null);
    setTypedAnswer("");
    setTypedResult(null);
    setFeedbackState(null);
    setCountdown(0);
    setTypeTimeLeft(TYPE_MODE_TIME_LIMIT_SECONDS);
    mixedDirectionByWordIdRef.current.clear();
  }, [words]);

  useEffect(() => {
    return () => {
      if (typeTimerRef.current !== null)
        window.clearTimeout(typeTimerRef.current);
      if (typeTimerIntervalRef.current !== null)
        window.clearInterval(typeTimerIntervalRef.current);
      if (cooldownTimerRef.current !== null)
        window.clearInterval(cooldownTimerRef.current);
    };
  }, []);

  const currentWord = remainingWords[0];
  const answeredCount = results.length;
  const correctCount = results.filter(item => item.correct).length;
  const completedWords = answeredCount;
  const progressPercent =
    sessionTotal > 0 ? Math.round((answeredCount / sessionTotal) * 100) : 0;
  const isSessionDone = remainingWords.length === 0 && results.length > 0;

  const currentDirection: Exclude<StudyDirection, "mixed"> = useMemo(() => {
    if (!currentWord) return "en-uz";
    if (direction !== "mixed") return direction;

    const cached = mixedDirectionByWordIdRef.current.get(currentWord.id);
    if (cached) return cached;

    const nextDirection = Math.random() < 0.5 ? "en-uz" : "uz-en";
    mixedDirectionByWordIdRef.current.set(currentWord.id, nextDirection);
    return nextDirection;
  }, [currentWord, direction]);
  const promptText = currentWord
    ? currentDirection === "en-uz"
      ? currentWord.english
      : currentWord.uzbek
    : "";
  const answerText = currentWord
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
    const pool = words.map(word =>
      currentDirection === "en-uz" ? word.uzbek : word.english
    );
    const uniqueDistractors = Array.from(
      new Set(pool.filter(value => value !== correct))
    );
    return shuffleArray(
      Array.from(
        new Set([correct, ...shuffleArray(uniqueDistractors).slice(0, 3)])
      )
    );
  }, [answerText, currentDirection, currentWord, mode, words]);

  useEffect(() => {
    if (!currentWord) return;
    setSelectedOption(null);
    setTypedAnswer("");
    setTypedResult(null);
    setIsCardReady(false);
    const rafId = requestAnimationFrame(() => setIsCardReady(true));
    return () => cancelAnimationFrame(rafId);
  }, [currentWord?.id, mode]);

  useEffect(() => {
    if (
      mode !== "type" ||
      !currentWord ||
      typedResult !== null ||
      feedbackState !== null ||
      isSessionDone
    )
      return;
    const timer = window.setTimeout(() => typeInputRef.current?.focus(), 80);
    return () => window.clearTimeout(timer);
  }, [currentWord?.id, mode, typedResult, feedbackState, isSessionDone]);

  useEffect(() => {
    if (typeTimerRef.current !== null) {
      window.clearTimeout(typeTimerRef.current);
      typeTimerRef.current = null;
    }
    if (typeTimerIntervalRef.current !== null) {
      window.clearInterval(typeTimerIntervalRef.current);
      typeTimerIntervalRef.current = null;
    }

    if (
      mode !== "type" ||
      !currentWord ||
      typedResult !== null ||
      feedbackState !== null ||
      isSessionDone
    ) {
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
  }, [currentWord?.id, mode, typedResult, feedbackState, isSessionDone]);

  const resetForNewWord = () => {
    setSelectedOption(null);
    setTypedAnswer("");
    setTypedResult(null);
  };

  const removeCurrentWordAndStoreResult = (
    correct: boolean,
    answeredMode: StudyMode
  ) => {
    if (!currentWord) return;

    updateProgressMutation.mutate({ wordId: currentWord.id, known: correct });

    setModeStats(prev => {
      const current = prev[answeredMode];
      return {
        ...prev,
        [answeredMode]: {
          attempted: current.attempted + 1,
          correct: current.correct + (correct ? 1 : 0),
        },
      };
    });

    setResults(prev => [...prev, { word: currentWord, correct }]);
    setRemainingWords(prev => prev.slice(1));
    resetForNewWord();
  };

  const finalizePendingAnswer = () => {
    const pendingAnswer = pendingAnswerRef.current;
    if (!pendingAnswer) return;
    pendingAnswerRef.current = null;
    setFeedbackState(null);
    setCountdown(0);
    removeCurrentWordAndStoreResult(
      pendingAnswer.correct,
      pendingAnswer.answeredMode
    );
  };

  const startAnswerCooldown = (correct: boolean, answeredMode: StudyMode) => {
    if (cooldownTimerRef.current !== null) {
      window.clearInterval(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
    pendingAnswerRef.current = { correct, answeredMode };
    setFeedbackState(correct ? "correct" : "incorrect");
    setCountdown(CORRECT_COOLDOWN_SECONDS);

    cooldownTimerRef.current = window.setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          if (cooldownTimerRef.current !== null) {
            window.clearInterval(cooldownTimerRef.current);
            cooldownTimerRef.current = null;
          }
          finalizePendingAnswer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleAnswer = (correct: boolean, answeredMode: StudyMode = mode) => {
    if (!currentWord || feedbackState !== null) return;
    startAnswerCooldown(correct, answeredMode);
  };

  const submitTypedAnswer = (value: string) => {
    if (!currentWord || feedbackState !== null || typedResult !== null) return;

    const correct = normalizeAnswer(value) === normalizeAnswer(answerText);
    setTypedResult(correct ? "correct" : "wrong");
    startAnswerCooldown(correct, "type");
  };

  const handleCardClick = () => {
    if (feedbackState === null) return;
    if (cooldownTimerRef.current !== null) {
      window.clearInterval(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
    finalizePendingAnswer();
  };

  const restartSession = () => {
    const shuffled = shuffleArray(words);
    setRemainingWords(shuffled);
    setSessionTotal(shuffled.length);
    setResults([]);
    setModeStats(INITIAL_MODE_STATS);
    setFeedbackState(null);
    setCountdown(0);
    setTypeTimeLeft(TYPE_MODE_TIME_LIMIT_SECONDS);
    resetForNewWord();
    mixedDirectionByWordIdRef.current.clear();

    if (cooldownTimerRef.current !== null) {
      window.clearInterval(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
    pendingAnswerRef.current = null;
  };

  const retryIncorrect = () => {
    const incorrectWords = results
      .filter(item => !item.correct)
      .map(item => item.word);
    if (incorrectWords.length === 0) return;
    const shuffled = shuffleArray(incorrectWords);
    setRemainingWords(shuffled);
    setSessionTotal(shuffled.length);
    setResults([]);
    setModeStats(INITIAL_MODE_STATS);
    setFeedbackState(null);
    setCountdown(0);
    setTypeTimeLeft(TYPE_MODE_TIME_LIMIT_SECONDS);
    resetForNewWord();
    mixedDirectionByWordIdRef.current.clear();
    if (cooldownTimerRef.current !== null) {
      window.clearInterval(cooldownTimerRef.current);
      cooldownTimerRef.current = null;
    }
    pendingAnswerRef.current = null;
  };

  const handleModeChange = (nextMode: StudyMode) => {
    setMode(nextMode);
    setDirection(getDefaultDirectionForMode(nextMode));
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

  if (isSessionDone) {
    const correctCountDone = results.filter(item => item.correct).length;
    const incorrectCount = results.length - correctCountDone;
    const correctPct =
      results.length > 0
        ? Math.round((correctCountDone / results.length) * 100)
        : 0;
    const incorrectPct = results.length > 0 ? 100 - correctPct : 0;
    const incorrectWords = results
      .filter(item => !item.correct)
      .map(item => item.word.english);
    const correctWords = results
      .filter(item => item.correct)
      .map(item => item.word.english);

    return (
      <div className="app-bg min-h-screen flex items-center justify-center px-4">
        <div className="memorize-card w-full max-w-3xl rounded-3xl p-6 sm:p-8">
          <h2 className="font-display text-3xl font-semibold scholar-title text-center">
            Session Complete
          </h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="memorize-glass-panel rounded-2xl p-4">
              <p className="scholar-title font-semibold">Correct</p>
              <p className="mt-1 text-2xl scholar-title">
                {correctCountDone} / {results.length} ({correctPct}%)
              </p>
            </div>
            <div className="memorize-glass-panel rounded-2xl p-4">
              <p className="scholar-title font-semibold">Incorrect</p>
              <p className="mt-1 text-2xl scholar-title">
                {incorrectCount} / {results.length} ({incorrectPct}%)
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="memorize-glass-panel rounded-2xl p-4">
              <p className="mb-2 scholar-title font-medium">Correct words</p>
              <p className="text-sm scholar-muted">
                {correctWords.length > 0 ? correctWords.join(", ") : "-"}
              </p>
            </div>
            <div className="memorize-glass-panel rounded-2xl p-4">
              <p className="mb-2 scholar-title font-medium">Incorrect words</p>
              <p className="text-sm scholar-muted">
                {incorrectWords.length > 0 ? incorrectWords.join(", ") : "-"}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button
              onClick={retryIncorrect}
              disabled={incorrectCount === 0}
              className="rounded-full bg-[var(--accent)] hover:bg-[var(--accent-strong)] scholar-title"
            >
              Retry incorrect
            </Button>
            <Button
              onClick={() => setLocation(`/global/folder/${folderId}`)}
              variant="outline"
              className="rounded-full border-[var(--surface-border)] scholar-title hover:bg-[var(--accent-muted)]"
            >
              Done
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
          <button
            onClick={() => setLocation(`/global/folder/${folderId}`)}
            className="glass-icon-button"
            type="button"
            aria-label="Back"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <h1 className="truncate font-display text-base text-strong">
              {folder.name}
            </h1>
            <p className="text-[11px] text-dim">Memorize</p>
          </div>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="page-navbar-pill rounded-full px-3 py-1.5 text-xs"
                >
                  {mode === "test" ? "Test" : "Type"}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="glass-dropdown min-w-36 rounded-2xl p-1.5"
              >
                <DropdownMenuItem
                  onClick={() => handleModeChange("test")}
                  className="glass-dropdown-item"
                >
                  Test
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleModeChange("type")}
                  className="glass-dropdown-item"
                >
                  Type
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="page-navbar-pill rounded-full px-3 py-1.5 text-xs"
                >
                  {direction === "en-uz"
                    ? "ENG"
                    : direction === "uz-en"
                      ? "UZB"
                      : "Mix"}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="glass-dropdown min-w-36 rounded-2xl p-1.5"
              >
                <DropdownMenuItem
                  onClick={() => setDirection("en-uz")}
                  className="glass-dropdown-item"
                >
                  ENG {"->"} UZB
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setDirection("uz-en")}
                  className="glass-dropdown-item"
                >
                  UZB {"->"} ENG
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setDirection("mixed")}
                  className="glass-dropdown-item"
                >
                  Mixed
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              onClick={restartSession}
              className="glass-icon-button"
              type="button"
              aria-label="Restart"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 pt-3 sm:px-6">
        <div className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] px-4 py-3">
          <div className="mb-2 flex items-center justify-between gap-3 text-xs scholar-muted">
            <span>
              {answeredCount}/{sessionTotal}
            </span>
            <button
              type="button"
              onClick={() => setShowStats(prev => !prev)}
              className="transition hover:text-[var(--text-primary)]"
            >
              {showStats ? "Hide stats" : "Show stats"}
            </button>
            <span>✓ {correctCount} correct</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[color-mix(in_srgb,_var(--text-primary)_12%,_transparent)]">
            <div
              className="h-full rounded-full bg-[var(--accent)] transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {showStats ? (
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] scholar-muted">
              <span className="scholar-title">
                Test {modeStats.test.correct}/{modeStats.test.attempted}
              </span>
              <span className="scholar-title">
                Type {modeStats.type.correct}/{modeStats.type.attempted}
              </span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-3 sm:px-6 sm:py-10">
        <div
          onClick={handleCardClick}
          className="memorize-card relative flex w-full max-w-3xl h-[360px] sm:h-[460px] md:h-[560px] flex-col justify-between rounded-3xl p-4 sm:p-8"
          style={{
            transform: isCardReady
              ? "translateY(0) scale(1)"
              : "translateY(4px) scale(0.996)",
            opacity: isCardReady ? 1 : 0.985,
            transition: "transform 0.18s ease-out, opacity 0.16s ease-out",
            cursor: feedbackState ? "pointer" : "default",
            overflow: "hidden",
          }}
        >
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full text-center">
              <p className="mb-3 text-xs uppercase tracking-[0.3em] scholar-muted">
                Word {completedWords + 1} of {sessionTotal}
              </p>
              <p className="mb-2 text-sm scholar-muted">
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
                <h2 className="text-center text-[1.9rem] font-bold leading-tight scholar-title sm:text-4xl">
                  {promptText}
                </h2>
                {promptSpeechText ? (
                  <EnglishSpeakButton
                    text={promptSpeechText}
                    className="bg-white/10 scholar-title hover:bg-white/15"
                  />
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
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
                      className={`flex min-h-14 items-center gap-2 rounded-2xl px-4 py-3 scholar-title transition ${optionClass}`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedOption || feedbackState !== null) return;
                          setSelectedOption(option);
                          handleAnswer(option === answerText, "test");
                        }}
                        disabled={!!selectedOption || feedbackState !== null}
                        className="flex-1 text-left"
                      >
                        {option}
                      </button>
                      {optionsContainEnglish ? (
                        <EnglishSpeakButton
                          text={option}
                          className="bg-black/10 scholar-title hover:bg-black/20"
                        />
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
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      submitTypedAnswer(typedAnswer);
                    }
                  }}
                  placeholder="Type your answer"
                  className="memorize-glass-panel w-full rounded-2xl px-4 py-3 scholar-title outline-none focus:border-[var(--accent)]"
                  disabled={feedbackState !== null || typedResult !== null}
                />
                <Button
                  onClick={() => submitTypedAnswer(typedAnswer)}
                  disabled={
                    feedbackState !== null ||
                    !typedAnswer.trim() ||
                    typedResult !== null
                  }
                  className="w-full rounded-2xl bg-[var(--accent)] hover:bg-[var(--accent-strong)] py-3 scholar-title"
                >
                  Check Answer
                </Button>
                {typedResult ? (
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm ${typedResult === "correct" ? "bg-[#10B981]" : "bg-[#EF4444]"} scholar-title`}
                  >
                    {typedResult === "correct" ? (
                      "Correct"
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <span>{`Wrong. Correct: ${answerText}`}</span>
                        {answerSpeechText ? (
                          <EnglishSpeakButton
                            text={answerSpeechText}
                            className="border-white/20 bg-white/10 scholar-title hover:bg-white/20"
                          />
                        ) : null}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}

            <div className="h-11">
              {feedbackState ? (
                <div
                  className={`rounded-xl px-3 py-2 text-center text-sm scholar-title ${
                    feedbackState === "correct"
                      ? "border border-[#10B981]/40 bg-[#10B981]/15"
                      : "border border-[#EF4444]/40 bg-[#EF4444]/15"
                  }`}
                >
                  {feedbackState === "correct" ? "✓ Correct!" : "✗ Incorrect!"}{" "}
                  Next in {countdown}...
                  <span className="ml-1 text-xs opacity-70">(tap to skip)</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
