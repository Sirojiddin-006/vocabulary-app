import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2, Volume2, VolumeX } from "lucide-react";
import { useEffect, useId, useState } from "react";

type Subscriber = (activeId: string | null) => void;

const subscribers = new Set<Subscriber>();

let activeButtonId: string | null = null;
let activeUtterance: SpeechSynthesisUtterance | null = null;

function notifySubscribers() {
  subscribers.forEach(subscriber => subscriber(activeButtonId));
}

function setActiveButtonId(nextId: string | null) {
  activeButtonId = nextId;
  notifySubscribers();
}

function stopActiveSpeech() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  activeUtterance = null;
  setActiveButtonId(null);
}

function pickEnglishVoice() {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find(voice => voice.lang.toLowerCase().startsWith("en-us")) ??
    voices.find(voice => voice.lang.toLowerCase().startsWith("en-gb")) ??
    voices.find(voice => voice.lang.toLowerCase().startsWith("en")) ??
    null
  );
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
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsSupported("speechSynthesis" in window);

    const subscriber: Subscriber = (currentActiveId) => {
      setIsSpeaking(currentActiveId === buttonId);
    };

    subscribers.add(subscriber);
    subscriber(activeButtonId);

    return () => {
      subscribers.delete(subscriber);
    };
  }, [buttonId]);

  if (!isSupported || !text.trim() || !looksEnglish(text)) {
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
        event.preventDefault();
        event.stopPropagation();

        if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

        const synthesis = window.speechSynthesis;
        const nextText = text.trim();

        if (activeButtonId === buttonId && synthesis.speaking) {
          stopActiveSpeech();
          return;
        }

        synthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(nextText);
        utterance.lang = "en-US";
        utterance.rate = 0.95;
        const voice = pickEnglishVoice();
        if (voice) {
          utterance.voice = voice;
        }

        activeUtterance = utterance;
        setActiveButtonId(buttonId);

        utterance.onend = () => {
          if (activeUtterance !== utterance) return;
          activeUtterance = null;
          setActiveButtonId(null);
        };

        utterance.onerror = () => {
          if (activeUtterance !== utterance) return;
          activeUtterance = null;
          setActiveButtonId(null);
        };

        synthesis.speak(utterance);
      }}
    >
      {isSpeaking ? (
        <>
          <Loader2 className={cn("h-4 w-4 animate-spin", iconClassName)} />
          <span className="sr-only">Speaking</span>
        </>
      ) : activeButtonId === buttonId ? (
        <VolumeX className={cn("h-4 w-4", iconClassName)} />
      ) : (
        <Volume2 className={cn("h-4 w-4", iconClassName)} />
      )}
    </Button>
  );
}
