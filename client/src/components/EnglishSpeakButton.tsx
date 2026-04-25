import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2, Volume2, VolumeX } from "lucide-react";
import { useEffect, useId, useState } from "react";

type Subscriber = (activeId: string | null) => void;

const subscribers = new Set<Subscriber>();

let activeButtonId: string | null = null;
let activeAudio: HTMLAudioElement | null = null;
const audioUrlCache = new Map<string, string>();
const DEFAULT_VOICE = "nova";
const DEFAULT_SPEED = 0.95;

function notifySubscribers() {
  subscribers.forEach(subscriber => subscriber(activeButtonId));
}

function setActiveButtonId(nextId: string | null) {
  activeButtonId = nextId;
  notifySubscribers();
}

function stopActiveAudio() {
  if (!activeAudio) {
    setActiveButtonId(null);
    return;
  }
  activeAudio.pause();
  activeAudio.currentTime = 0;
  activeAudio = null;
  setActiveButtonId(null);
}

function stopBrowserTtsFallback() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
}

async function fetchTtsAudioUrl(text: string) {
  const cacheKey = `${DEFAULT_VOICE}:${DEFAULT_SPEED}:${text}`;
  const cached = audioUrlCache.get(cacheKey);
  if (cached) return cached;

  const response = await fetch("/api/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      voice: DEFAULT_VOICE,
      speed: DEFAULT_SPEED,
    }),
  });

  if (!response.ok) {
    throw new Error("TTS request failed");
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  audioUrlCache.set(cacheKey, objectUrl);
  return objectUrl;
}

function speakFallback(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = DEFAULT_SPEED;
  window.speechSynthesis.speak(utterance);
}

function looksEnglish(text: string) {
  return /[A-Za-z]/.test(text);
}

type EnglishSpeakButtonProps = {
  text: string;
  className?: string;
  iconClassName?: string;
};

export function EnglishSpeakButton({
  text,
  className,
  iconClassName,
}: EnglishSpeakButtonProps) {
  const buttonId = useId();
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    const subscriber: Subscriber = (currentActiveId) => {
      setIsSpeaking(currentActiveId === buttonId);
    };

    subscribers.add(subscriber);
    subscriber(activeButtonId);

    return () => {
      subscribers.delete(subscriber);
      if (activeButtonId === buttonId) {
        stopActiveAudio();
      }
    };
  }, [buttonId]);

  if (!text.trim() || !looksEnglish(text)) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={isSpeaking ? `Stop pronunciation for ${text}` : `Hear pronunciation for ${text}`}
      title={isSpeaking ? "Stop pronunciation" : "Hear pronunciation"}
      className={cn(
        "rounded-full border border-white/10 bg-white/5 text-[#A6B0BE] hover:bg-white/10 hover:text-white",
        className
      )}
      onClick={(event) => {
        void (async () => {
          event.preventDefault();
          event.stopPropagation();

          if (typeof window === "undefined") return;

          const nextText = text.trim();
          if (!nextText) return;

          if (activeButtonId === buttonId && activeAudio && !activeAudio.paused) {
            stopActiveAudio();
            stopBrowserTtsFallback();
            return;
          }

          stopActiveAudio();
          stopBrowserTtsFallback();
          setIsLoading(true);

          try {
            const audioUrl = await fetchTtsAudioUrl(nextText);
            const audio = new Audio(audioUrl);
            activeAudio = audio;
            setActiveButtonId(buttonId);

            audio.onended = () => {
              if (activeAudio !== audio) return;
              activeAudio = null;
              setActiveButtonId(null);
            };

            audio.onerror = () => {
              if (activeAudio !== audio) return;
              activeAudio = null;
              setActiveButtonId(null);
            };

            await audio.play();
          } catch (error) {
            console.error("TTS error:", error);
            setActiveButtonId(null);
            speakFallback(nextText);
          } finally {
            setIsLoading(false);
          }
        })();
      }}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className={cn("h-4 w-4 animate-spin", iconClassName)} />
          <span className="sr-only">Loading audio</span>
        </>
      ) : isSpeaking ? (
        <VolumeX className={cn("h-4 w-4", iconClassName)} />
      ) : (
        <Volume2 className={cn("h-4 w-4", iconClassName)} />
      )}
    </Button>
  );
}
