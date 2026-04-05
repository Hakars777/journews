"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Pause, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

const RADIO_STREAM_URL = "https://stream.zeno.fm/dvodr8cuwc5uv";

declare global {
  interface Window {
    __jourNewsRadioAudio?: HTMLAudioElement;
  }
}

export function RadioPlayerButton() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const audio =
      window.__jourNewsRadioAudio ??
      (() => {
        const nextAudio = new Audio(RADIO_STREAM_URL);
        nextAudio.preload = "none";
        window.__jourNewsRadioAudio = nextAudio;
        return nextAudio;
      })();

    audioRef.current = audio;
    setIsPlaying(!audio.paused);

    const handlePlay = () => {
      setIsPlaying(true);
      setIsPending(false);
      setHasError(false);
    };
    const handlePause = () => {
      setIsPlaying(false);
      setIsPending(false);
    };
    const handleWaiting = () => {
      if (!audio.paused) setIsPending(true);
    };
    const handleCanPlay = () => {
      if (!audio.paused) setIsPending(false);
    };
    const handleError = () => {
      setIsPlaying(false);
      setIsPending(false);
      setHasError(true);
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("waiting", handleWaiting);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("waiting", handleWaiting);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("error", handleError);
      audioRef.current = null;
    };
  }, []);

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      return;
    }

    setHasError(false);
    setIsPending(true);

    try {
      await audio.play();
    } catch {
      setHasError(true);
      setIsPending(false);
      setIsPlaying(false);
    }
  }

  return (
    <button
      type="button"
      onClick={togglePlayback}
      aria-pressed={isPlaying}
      aria-label={isPlaying ? "Դադարեցնել ռադիոն" : "Միացնել ռադիոն"}
      title={hasError ? "Չհաջողվեց միանալ ռադիոյին" : isPlaying ? "Դադարեցնել ռադիոն" : "Միացնել ռադիոն"}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm transition-colors",
        isPlaying
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "bg-background text-foreground hover:bg-accent",
        hasError && "border border-destructive/40 text-destructive",
      )}
    >
      {isPending ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : isPlaying ? (
        <>
          <Pause className="h-3 w-3" />
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
            Ռադիո
          </span>
        </>
      ) : (
        <>
          <Radio className="h-3 w-3" />
          <span>Ռադիո</span>
        </>
      )}
    </button>
  );
}
