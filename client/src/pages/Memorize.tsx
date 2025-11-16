import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, Eye } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useState, useRef, useEffect } from "react";
import { useLocation, useParams } from "wouter";

type Word = {
  id: number;
  folderId: number;
  english: string;
  uzbek: string;
  example: string | null;
  createdBy: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export default function Memorize() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams();
  const folderId = parseInt(params.id || "0");

  const [showTranslation, setShowTranslation] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<"left" | "right" | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);

  // Create a queue-based system: words marked "Don't Know" go to the end
  const [wordQueue, setWordQueue] = useState<Word[]>([]);
  const [queueIndex, setQueueIndex] = useState(0);

  // Fetch words in folder
  const { data: words = [], isLoading: wordsLoading } = trpc.vocabulary.getWords.useQuery(
    { folderId },
    { enabled: isAuthenticated && folderId > 0 }
  );

  // Update progress mutation
  const updateProgressMutation = trpc.vocabulary.updateProgress.useMutation();

  // Initialize word queue when words are loaded
  useEffect(() => {
    if (words.length > 0) {
      setWordQueue([...words]);
      setQueueIndex(0);
    }
  }, [words]);

  const currentWord = wordQueue[queueIndex];
  const remainingWords = wordQueue.length - queueIndex;

  if (wordsLoading) {
    return (
      <div className="min-h-screen bg-[#0F1720] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0EA5FF]" />
      </div>
    );
  }

  if (words.length === 0) {
    return (
      <div className="min-h-screen bg-[#0F1720] text-white flex flex-col items-center justify-center">
        <p className="text-[#A6B0BE] mb-4">No words in this folder</p>
        <Button
          onClick={() => setLocation("/")}
          className="bg-[#0EA5FF] hover:bg-[#0c8fd9] text-white rounded-full"
        >
          Go Back
        </Button>
      </div>
    );
  }

  if (!currentWord) {
    return (
      <div className="flex items-center justify-center h-screen max-w-[390px] mx-auto px-6 bg-[#0F1720]">
        <div className="text-center">
          <p className="text-white text-xl font-bold mb-4">All words learned!</p>
          <p className="text-[#A6B0BE] mb-8">Great job! You've completed this session.</p>
          <Button
            onClick={() => setLocation("/")}
            className="px-6 py-3 bg-[#0EA5FF] hover:bg-[#0c8fd9] rounded-full text-white"
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const handleAnswer = (known: boolean) => {
    // Update progress in database
    updateProgressMutation.mutate({ wordId: currentWord.id, known });

    // Trigger animation
    setSwipeDirection(known ? "right" : "left");

    setTimeout(() => {
      // Update queue logic
      if (!known) {
        // Move word to the END of the queue (fixed bug)
        const newQueue = [...wordQueue];
        const currentWordCopy = { ...currentWord };
        newQueue.splice(queueIndex, 1);
        newQueue.push(currentWordCopy);
        setWordQueue(newQueue);
        // Stay at same index (next word shifts into position)
      } else {
        // Remove from queue
        const newQueue = wordQueue.filter((_, idx) => idx !== queueIndex);
        setWordQueue(newQueue);
        // Stay at same index
      }

      setShowTranslation(false);
      setSwipeDirection(null);
    }, 300);
  };

  // Touch/Mouse handlers for swipe
  const handleStart = (clientX: number) => {
    startX.current = clientX;
    setIsDragging(true);
  };

  const handleMove = (clientX: number) => {
    if (!isDragging) return;
    const offset = clientX - startX.current;
    setDragOffset(offset);
  };

  const handleEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const threshold = 100;
    if (Math.abs(dragOffset) > threshold) {
      // Swipe detected
      if (dragOffset > 0) {
        handleAnswer(true); // Swipe right = I Know
      } else {
        handleAnswer(false); // Swipe left = Don't Know
      }
    }

    setDragOffset(0);
  };

  const getCardTransform = () => {
    if (swipeDirection === "right") {
      return "translateX(400px) rotate(20deg)";
    }
    if (swipeDirection === "left") {
      return "translateX(-400px) rotate(-20deg)";
    }
    if (isDragging) {
      const rotation = dragOffset / 20;
      return `translateX(${dragOffset}px) rotate(${rotation}deg)`;
    }
    return "translateX(0) rotate(0)";
  };

  const getCardOpacity = () => {
    if (swipeDirection) return 0;
    if (isDragging) {
      return Math.max(0.5, 1 - Math.abs(dragOffset) / 400);
    }
    return 1;
  };

  return (
    <div className="flex flex-col h-screen max-w-[390px] mx-auto bg-[#0F1720]">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 pt-4 pb-3">
        <button
          onClick={() => setLocation("/")}
          className="p-2 -ml-2 hover:bg-[#15202B] rounded-lg transition-colors"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>
        <h1 className="text-[#0EA5FF]">Memorize</h1>
        <div className="w-6" />
      </div>

      {/* Flashcard Container */}
      <div className="flex-1 flex items-center justify-center px-6 py-8">
        {/* Card Stack Effect */}
        <div className="relative w-full">
          {/* Background cards */}
          <div className="absolute inset-0 bg-[#1a2732] rounded-3xl transform translate-y-2 scale-95 opacity-50" />
          <div className="absolute inset-0 bg-[#15202B] rounded-3xl transform translate-y-1 scale-[0.97] opacity-75" />

          {/* Main Card */}
          <div
            ref={cardRef}
            onMouseDown={(e) => handleStart(e.clientX)}
            onMouseMove={(e) => handleMove(e.clientX)}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={(e) => handleStart(e.touches[0].clientX)}
            onTouchMove={(e) => handleMove(e.touches[0].clientX)}
            onTouchEnd={handleEnd}
            className="relative bg-[#15202B] rounded-3xl p-8 min-h-[500px] flex flex-col justify-between cursor-grab active:cursor-grabbing select-none"
            style={{
              transform: getCardTransform(),
              opacity: getCardOpacity(),
              transition: isDragging ? "none" : "transform 0.3s ease, opacity 0.3s ease",
            }}
          >
            {/* Word */}
            <div className="flex-1 flex items-center justify-center">
              <h2 className="text-white text-center text-4xl font-bold">{currentWord.english}</h2>
            </div>

            {/* Translation Area */}
            <div className="mb-8">
              {!showTranslation ? (
                <button
                  onClick={() => setShowTranslation(true)}
                  className="w-full bg-[#6B7280] rounded-2xl py-8 flex items-center justify-center gap-3 hover:bg-[#7a8492] transition-colors"
                >
                  <Eye className="w-5 h-5 text-white" />
                  <span className="text-white">Show translation</span>
                </button>
              ) : (
                <div className="w-full bg-[#6B7280] rounded-2xl py-8 px-6 text-center">
                  <p className="text-white mb-2 text-lg font-semibold">{currentWord.uzbek}</p>
                  {currentWord.example && (
                    <p className="text-[#A6B0BE] text-sm">"{currentWord.example}"</p>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={() => handleAnswer(false)}
                className="flex-1 h-16 bg-[#0EA5FF] rounded-full flex items-center justify-center hover:bg-[#0c8fd9] transition-colors"
              >
                <span className="text-white font-semibold">Don't Know</span>
              </button>
              <button
                onClick={() => handleAnswer(true)}
                className="flex-1 h-16 bg-[#10B981] rounded-full flex items-center justify-center hover:bg-[#0ea073] transition-colors"
              >
                <span className="text-white font-semibold">I Know</span>
              </button>
            </div>
          </div>

          {/* Swipe Indicators */}
          {isDragging && (
            <>
              {dragOffset > 50 && (
                <div className="absolute top-1/4 right-8 text-[#10B981] opacity-80 pointer-events-none">
                  <div className="text-6xl">✓</div>
                </div>
              )}
              {dragOffset < -50 && (
                <div className="absolute top-1/4 left-8 text-[#0EA5FF] opacity-80 pointer-events-none">
                  <div className="text-6xl">✗</div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Card Counter */}
      <div className="text-center pb-8">
        <span className="text-[#A6B0BE]">{remainingWords} remaining</span>
      </div>
    </div>
  );
}
