"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Loader2, Pause, Radio, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

const RADIO_STREAM_URL = "https://stream.zeno.fm/dvodr8cuwc5uv";
const RADIO_VOLUME_KEY = "journews-radio-volume";

type RadioSnapshot = {
  isPlaying: boolean;
  isPending: boolean;
  hasError: boolean;
  volume: number;
};

declare global {
  interface Window {
    __jourNewsRadioAudio?: HTMLAudioElement;
    __jourNewsRadioBound?: boolean;
  }
}

const defaultSnapshot: RadioSnapshot = {
  isPlaying: false,
  isPending: false,
  hasError: false,
  volume: 0.75,
};

let radioSnapshot = defaultSnapshot;
const radioListeners = new Set<() => void>();

function emitRadioSnapshot(next: Partial<RadioSnapshot>) {
  radioSnapshot = { ...radioSnapshot, ...next };
  radioListeners.forEach((listener) => listener());
}

function subscribeRadio(listener: () => void) {
  radioListeners.add(listener);
  return () => radioListeners.delete(listener);
}

function getRadioSnapshot() {
  return radioSnapshot;
}

function readSavedVolume() {
  if (typeof window === "undefined") return defaultSnapshot.volume;

  const raw = window.localStorage.getItem(RADIO_VOLUME_KEY);
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) return defaultSnapshot.volume;
  return Math.max(0, Math.min(1, parsed));
}

function ensureRadioAudio() {
  if (typeof window === "undefined") return null;

  const audio =
    window.__jourNewsRadioAudio ??
    (() => {
      const nextAudio = new Audio(RADIO_STREAM_URL);
      nextAudio.preload = "none";
      nextAudio.volume = readSavedVolume();
      window.__jourNewsRadioAudio = nextAudio;
      return nextAudio;
    })();

  if (!window.__jourNewsRadioBound) {
    window.__jourNewsRadioBound = true;

    audio.addEventListener("play", () => {
      emitRadioSnapshot({ isPlaying: true, isPending: false, hasError: false });
    });
    audio.addEventListener("pause", () => {
      emitRadioSnapshot({ isPlaying: false, isPending: false });
    });
    audio.addEventListener("waiting", () => {
      if (!audio.paused) emitRadioSnapshot({ isPending: true });
    });
    audio.addEventListener("canplay", () => {
      if (!audio.paused) emitRadioSnapshot({ isPending: false });
    });
    audio.addEventListener("volumechange", () => {
      emitRadioSnapshot({ volume: audio.volume });
    });
    audio.addEventListener("error", () => {
      emitRadioSnapshot({ isPlaying: false, isPending: false, hasError: true });
    });
  }

  emitRadioSnapshot({
    isPlaying: !audio.paused,
    isPending: radioSnapshot.isPending && !audio.paused,
    hasError: false,
    volume: audio.volume,
  });

  return audio;
}

async function toggleRadioPlayback() {
  const audio = ensureRadioAudio();
  if (!audio) return;

  if (!audio.paused) {
    audio.pause();
    return;
  }

  emitRadioSnapshot({ isPending: true, hasError: false });

  try {
    await audio.play();
  } catch {
    emitRadioSnapshot({ isPlaying: false, isPending: false, hasError: true });
  }
}

function setRadioVolume(nextVolume: number) {
  const audio = ensureRadioAudio();
  if (!audio) return;

  const volume = Math.max(0, Math.min(1, nextVolume));
  audio.volume = volume;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(RADIO_VOLUME_KEY, String(volume));
  }
  emitRadioSnapshot({ volume });
}

function useRadioPlayer() {
  const snapshot = useSyncExternalStore(subscribeRadio, getRadioSnapshot, getRadioSnapshot);

  useEffect(() => {
    ensureRadioAudio();
  }, []);

  return {
    ...snapshot,
    togglePlayback: toggleRadioPlayback,
    setVolume: setRadioVolume,
  };
}

export function RadioPlayerButton({
  className,
  idleLabel = "Ռադիո",
  playingLabel = "Ռադիո",
}: {
  className?: string;
  idleLabel?: string;
  playingLabel?: string;
}) {
  const { isPlaying, isPending, hasError, togglePlayback } = useRadioPlayer();

  return (
    <button
      type="button"
      onClick={togglePlayback}
      aria-pressed={isPlaying}
      aria-label={isPlaying ? "Դադարեցնել ռադիոն" : "Միացնել ռադիոն"}
      title={
        hasError
          ? "Չհաջողվեց միանալ ռադիոյին"
          : isPlaying
            ? "Դադարեցնել ռադիոն"
            : "Միացնել ռադիոն"
      }
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm transition-colors",
        isPlaying
          ? "bg-primary text-primary-foreground hover:bg-primary/90"
          : "bg-background text-foreground hover:bg-accent",
        hasError && "border border-destructive/40 text-destructive",
        className,
      )}
    >
      {isPending ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : isPlaying ? (
        <>
          <Pause className="h-3 w-3" />
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
            {playingLabel}
          </span>
        </>
      ) : (
        <>
          <Radio className="h-3 w-3" />
          <span>{idleLabel}</span>
        </>
      )}
    </button>
  );
}

export function RadioVolumeControl({ className }: { className?: string }) {
  const { isPlaying, isPending, volume, setVolume } = useRadioPlayer();

  if (!isPlaying && !isPending) return null;

  return (
    <label className={cn("inline-flex items-center gap-2 text-muted-foreground", className)}>
      <Volume2 className="h-3.5 w-3.5 shrink-0" />
      <input
        type="range"
        min="0"
        max="100"
        step="1"
        value={Math.round(volume * 100)}
        onChange={(event) => setVolume(Number(event.target.value) / 100)}
        className="h-1.5 w-16 cursor-pointer appearance-none rounded-full bg-border accent-primary"
        aria-label="Громкость радио"
      />
    </label>
  );
}

export function MobileRadioPlayerPanel() {
  return (
    <div className="rounded-md border bg-muted/30 p-3">
      <div>
        <div className="jn-headline text-sm font-semibold uppercase tracking-wide">Ռադիո</div>
        <div className="mt-1 text-xs text-muted-foreground">Ուղիղ հեռարձակում Jour News-ի համար</div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <RadioPlayerButton className="px-3 py-1.5 text-xs" idleLabel="Միացնել" playingLabel="Դադար" />
        <RadioVolumeControl className="flex-1 justify-end" />
      </div>
    </div>
  );
}
