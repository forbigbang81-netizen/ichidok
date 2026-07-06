"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Captions,
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Settings,
  Volume2,
  VolumeX,
  FlipHorizontal,
} from "lucide-react";
import { fetchVideoImport, type VideoImport } from "@/lib/api/client";
import { useApp } from "@/store/app";
import { cn } from "@/lib/utils";

// ============================================================
// Types
// ============================================================

interface SubtitleCue {
  start: number;
  end: number;
  text: string;
}

interface VideoPlayerProps {
  malId: number;
  episode: number;
  audioMode: "SUB" | "DUB";
  poster?: string;
  title?: string;
  subtitle?: string;
  resumePosition?: number | null;
  onProgress?: (position: number, duration: number) => void;
  onEnded?: () => void;
  onBack?: () => void;
}

interface AudioTrackInfo {
  id: number;
  label: string;
  language?: string;
  enabled: boolean;
}

// Minimal types for the non-standard HTMLMediaElement.audioTracks API.
interface AudioTrackLike {
  label: string;
  language: string;
  enabled: boolean;
}
interface AudioTrackListLike {
  length: number;
  [index: number]: AudioTrackLike;
}
interface VideoElementWithAudioTracks extends HTMLVideoElement {
  audioTracks?: AudioTrackListLike;
}

// ============================================================
// Constants
// ============================================================

const HIDE_CONTROLS_MS = 10000;
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const QUALITIES = ["Auto", "1080p", "720p", "480p", "360p"];
const AMBIENT_SAMPLE_INTERVAL_MS = 2000;
const KB_HINT_AUTOHIDE_MS = 5500;
const VOLUME_HUD_AUTOHIDE_MS = 1200;
const VOLUME_STEP = 0.1;

// ============================================================
// VTT parsing utilities
// ============================================================

function timeToSeconds(t: string): number {
  const m = t.match(/(\d{1,2}):(\d{2}):(\d{2})[.,](\d{1,3})/);
  if (!m) {
    const m2 = t.match(/(\d{1,2}):(\d{2})[.,](\d{1,3})/);
    if (!m2) return 0;
    return +m2[1] * 60 + +m2[2] + Number(m2[3]) / 1000;
  }
  return (
    +m[1] * 3600 + +m[2] * 60 + +m[3] + Number(m[4]) / Math.pow(10, m[4].length)
  );
}

/**
 * Parse a WebVTT subtitle file into a list of cues. Exported for use
 * outside the player (e.g. preview, tests).
 */
export function parseVtt(text: string): SubtitleCue[] {
  const normalized = text.replace(/\r/g, "");
  const blocks = normalized.split(/\n\s*\n/);
  const cues: SubtitleCue[] = [];
  for (const block of blocks) {
    const lines = block.split("\n").filter((l) => l.trim() !== "");
    if (lines.length === 0) continue;
    if (lines[0].startsWith("WEBVTT")) continue;
    let timingLine = lines[0];
    let textStart = 1;
    if (!timingLine.includes("-->")) {
      if (lines.length < 2) continue;
      timingLine = lines[1];
      textStart = 2;
    }
    const m = timingLine.match(/([\d:.,]+)\s*-->\s*([\d:.,]+)/);
    if (!m) continue;
    const start = timeToSeconds(m[1]);
    const end = timeToSeconds(m[2]);
    const cueText = lines.slice(textStart).join("\n").replace(/<[^>]+>/g, "");
    if (cueText.trim()) cues.push({ start, end, text: cueText });
  }
  return cues.sort((a, b) => a.start - b.start);
}

function fmtTime(s: number): string {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

/**
 * Convert an RGB pixel to an HSL tuple so we can detect "dark" frames and
 * skip them — otherwise the ambient glow goes nearly black during night
 * scenes and the effect is lost.
 */
function rgbToLuma(r: number, g: number, b: number): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/**
 * Returns true if the currently focused element is a text-input control
 * (so we can avoid hijacking its keystrokes for player shortcuts).
 */
function isTextInput(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if ((el as HTMLElement).isContentEditable) return true;
  return false;
}

// ============================================================
// VideoPlayer
// ============================================================

export function VideoPlayer({
  malId,
  episode,
  audioMode,
  poster,
  title,
  subtitle,
  resumePosition,
  onProgress,
  onEnded,
  onBack,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seekingRef = useRef(false);
  const lastProgressEmitRef = useRef(0);
  const resumeAppliedRef = useRef(false);
  // Position captured before audio-mode switch — preserved across the
  // reload so the user resumes from the same timestamp in the new track.
  const audioSwitchPositionRef = useRef<number | null>(null);
  // Canvas used for ambient backlight color sampling.
  const ambientCanvasRef = useRef<HTMLCanvasElement | null>(null);
  // Ensures the keyboard-shortcut hint only plays once per mount.
  const hintShownRef = useRef(false);
  const volumeHudTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    setAudioMode,
    setQuality,
    setSpeed,
    selectedQuality,
    selectedSpeed,
    toggleFullscreen,
    fullscreenPlayer,
  } = useApp();

  const [importInfo, setImportInfo] = useState<VideoImport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [cues, setCues] = useState<SubtitleCue[]>([]);
  const [activeCue, setActiveCue] = useState("");
  const [muted, setMuted] = useState(false);
  // Volume is tracked in state so keyboard shortcuts can update the HUD
  // and the mute icon can reflect a zero-volume state.
  const [volume, setVolume] = useState(1);
  const [audioTracks, setAudioTracks] = useState<AudioTrackInfo[]>([]);
  const [activeAudioTrack, setActiveAudioTrack] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [subtitleSource, setSubtitleSource] = useState<string>("");
  const [mirrored, setMirrored] = useState(false);
  // Ambient backlight color sampled from the video frame (rgba string).
  const [ambientColor, setAmbientColor] = useState<string>(
    "rgba(255, 138, 0, 0.45)",
  );
  // Brief on-load keyboard-shortcut hint overlay.
  const [showKbHint, setShowKbHint] = useState(false);
  // Transient volume HUD shown when adjusting volume via keyboard.
  const [showVolumeHud, setShowVolumeHud] = useState(false);

  // ----- Auto-hide controls -----
  const keepControlsAlive = useCallback(() => {
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
      setShowSettings(false);
    }, HIDE_CONTROLS_MS);
  }, []);

  useEffect(() => {
    keepControlsAlive();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [keepControlsAlive]);

  // ----- Fetch video import -----
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setImportInfo(null);
    setCues([]);
    setActiveCue("");
    resumeAppliedRef.current = false;
    fetchVideoImport(malId, episode, audioMode.toLowerCase() as "sub" | "dub")
      .then((info) => {
        if (cancelled) return;
        setImportInfo(info);
        setLoading(false);
        if (!info || !info.url) {
          setError(
            "No stream available for this episode yet. Try another episode or audio mode.",
          );
        }
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setError(String(e?.message ?? e));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [malId, episode, audioMode]);

  // ----- Load subtitles (VTT) -----
  useEffect(() => {
    const subUrl = importInfo?.subtitleUrl ?? subtitle ?? null;
    if (!subUrl) {
      setCues([]);
      return;
    }
    let cancelled = false;
    fetch(subUrl)
      .then((r) => {
        if (!r.ok) return Promise.reject(r.status);
        // Track subtitle source for UI feedback (e.g. "OpenSubtitles" vs "Episode Info")
        const src = r.headers.get("x-subtitle-source");
        if (src) setSubtitleSource(src);
        return r.text();
      })
      .then((text) => {
        if (cancelled) return;
        try {
          setCues(parseVtt(text));
        } catch {
          setCues([]);
        }
      })
      .catch(() => {
        if (!cancelled) setCues([]);
      });
    return () => {
      cancelled = true;
    };
  }, [importInfo?.subtitleUrl, subtitle]);

  // ----- Wire up video element events -----
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTime = () => {
      if (seekingRef.current) return;
      setCurrentTime(v.currentTime);
      // Update active cue
      const cue = cues.find(
        (c) => v.currentTime >= c.start && v.currentTime <= c.end,
      );
      setActiveCue(cue ? cue.text : "");
      // Throttled progress callback (every 5s)
      const now = Date.now();
      if (onProgress && now - lastProgressEmitRef.current > 5000) {
        lastProgressEmitRef.current = now;
        onProgress(v.currentTime, v.duration || 0);
      }
    };
    const onLoadedMeta = () => {
      setDuration(v.duration || 0);
      // Sync volume state with the media element on load.
      setVolume(v.volume);
      setMuted(v.muted);
      // Resume position — prefer audio-switch captured position, fall back
      // to the resumePosition prop supplied by the parent (history-based).
      if (!resumeAppliedRef.current) {
        const resumeTarget =
          audioSwitchPositionRef.current ?? resumePosition ?? 0;
        if (resumeTarget > 5) {
          try {
            v.currentTime = Math.min(
              resumeTarget,
              (v.duration || resumeTarget) - 5,
            );
          } catch {
            /* noop */
          }
        }
        audioSwitchPositionRef.current = null;
      }
      resumeAppliedRef.current = true;
      // Audio tracks
      const at = (v as VideoElementWithAudioTracks).audioTracks;
      if (at && at.length > 1) {
        const tracks: AudioTrackInfo[] = [];
        for (let i = 0; i < at.length; i++) {
          const t = at[i];
          tracks.push({
            id: i,
            label: t.label || t.language || `Audio ${i + 1}`,
            language: t.language || undefined,
            enabled: t.enabled,
          });
        }
        setAudioTracks(tracks);
        const enabledIdx = tracks.findIndex((t) => t.enabled);
        setActiveAudioTrack(enabledIdx >= 0 ? enabledIdx : 0);
      } else {
        setAudioTracks([]);
      }
    };
    const onProgressBuf = () => {
      try {
        if (v.buffered.length > 0) {
          setBuffered(v.buffered.end(v.buffered.length - 1));
        }
      } catch {
        /* noop */
      }
    };
    const onEndedEv = () => {
      if (onProgress && v.duration) onProgress(v.duration, v.duration);
      onEnded?.();
    };
    const onErr = () => {
      // Don't override the initial "no stream" error.
      setError(
        (prev) =>
          prev ?? "Video failed to load. The source may be unavailable.",
      );
    };

    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onLoadedMeta);
    v.addEventListener("progress", onProgressBuf);
    v.addEventListener("ended", onEndedEv);
    v.addEventListener("error", onErr);
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onLoadedMeta);
      v.removeEventListener("progress", onProgressBuf);
      v.removeEventListener("ended", onEndedEv);
      v.removeEventListener("error", onErr);
    };
  }, [cues, onProgress, onEnded, resumePosition]);

  // ----- Apply playback rate -----
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = selectedSpeed;
  }, [selectedSpeed]);

  // ----- Fullscreen change listener -----
  useEffect(() => {
    const onFs = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      if (fullscreenPlayer !== fs) toggleFullscreen();
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, [fullscreenPlayer, toggleFullscreen]);

  // ----- Ambient backlight sampling -----
  // Samples the average color of the current video frame every 2s using a
  // tiny offscreen canvas. If the video is cross-origin (e.g. archive.org
  // direct URLs), the canvas becomes tainted and getImageData throws — we
  // catch that and just keep the previous color. Same-origin proxy URLs
  // (e.g. /api/stream?url=...) will work fine.
  const ambientVideoUrl = importInfo?.url ?? null;
  useEffect(() => {
    if (!ambientVideoUrl) return;
    if (!ambientCanvasRef.current) {
      const c = document.createElement("canvas");
      c.width = 16;
      c.height = 9;
      ambientCanvasRef.current = c;
    }
    const canvas = ambientCanvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const sample = () => {
      const v = videoRef.current;
      if (!v || v.readyState < 2 || !v.videoWidth) return;
      try {
        ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let r = 0;
        let g = 0;
        let b = 0;
        let count = 0;
        for (let i = 0; i < data.length; i += 4) {
          // Sample every pixel (16×9 = 144 pixels — cheap).
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }
        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);
        // Skip near-black frames — they kill the ambient effect.
        const luma = rgbToLuma(r, g, b);
        if (luma < 0.08) return;
        // Boost saturation slightly so the glow reads as "mood" not "mud".
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const boosted = [r, g, b].map((c) => {
          if (max === min) return c;
          return Math.min(255, Math.round(min + (c - min) * 1.15));
        });
        setAmbientColor(
          `rgba(${boosted[0]}, ${boosted[1]}, ${boosted[2]}, 0.55)`,
        );
      } catch {
        // Tainted canvas — keep the previous color. No-op.
      }
    };

    const interval = setInterval(sample, AMBIENT_SAMPLE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [ambientVideoUrl]);

  // ----- Controls -----
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    keepControlsAlive();
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }, [keepControlsAlive]);

  const skip = useCallback(
    (delta: number) => {
      const v = videoRef.current;
      if (!v) return;
      v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + delta));
      keepControlsAlive();
    },
    [keepControlsAlive],
  );

  const seekTo = useCallback(
    (t: number) => {
      const v = videoRef.current;
      if (!v) return;
      v.currentTime = Math.max(0, Math.min(v.duration || 0, t));
      setCurrentTime(v.currentTime);
      keepControlsAlive();
    },
    [keepControlsAlive],
  );

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    // If we're unmuting into a zero-volume state, restore audible volume
    // so the user actually hears something.
    if (v.muted && v.volume === 0) {
      v.volume = 1;
      setVolume(1);
    }
    v.muted = !v.muted;
    setMuted(v.muted);
    keepControlsAlive();
  }, [keepControlsAlive]);

  const toggleFullscreenFn = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      // Try to unlock orientation
      if (screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock().catch(() => {});
      }
    } else {
      el.requestFullscreen().catch(() => {});
      // Try to lock to landscape
      if (screen.orientation && screen.orientation.lock) {
        screen.orientation.lock("landscape").catch(() => {});
      }
    }
    keepControlsAlive();
  }, [keepControlsAlive]);

  const handleVideoTap = useCallback(() => {
    // Tap video toggles UI (does NOT pause).
    setControlsVisible((prev) => {
      const next = !prev;
      if (next) {
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = setTimeout(() => {
          setControlsVisible(false);
          setShowSettings(false);
        }, HIDE_CONTROLS_MS);
      } else {
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      }
      return next;
    });
  }, []);

  const switchAudioTrack = useCallback(
    (id: number) => {
      const v = videoRef.current as VideoElementWithAudioTracks | null;
      if (!v || !v.audioTracks) return;
      for (let i = 0; i < v.audioTracks.length; i++) {
        v.audioTracks[i].enabled = i === id;
      }
      setActiveAudioTrack(id);
      keepControlsAlive();
    },
    [keepControlsAlive],
  );

  // switchAudioMode with position preservation — capture the current
  // playback time before swapping audioMode so the new stream resumes
  // from the same timestamp.
  const switchAudioMode = useCallback(
    (mode: "SUB" | "DUB") => {
      const v = videoRef.current;
      if (v && v.currentTime > 5) {
        audioSwitchPositionRef.current = v.currentTime;
      }
      setAudioMode(mode);
      keepControlsAlive();
    },
    [setAudioMode, keepControlsAlive],
  );

  // ----- Volume HUD (briefly visible when adjusting volume via keyboard) -----
  const flashVolumeHud = useCallback(() => {
    setShowVolumeHud(true);
    if (volumeHudTimerRef.current) clearTimeout(volumeHudTimerRef.current);
    volumeHudTimerRef.current = setTimeout(
      () => setShowVolumeHud(false),
      VOLUME_HUD_AUTOHIDE_MS,
    );
  }, []);

  useEffect(() => {
    return () => {
      if (volumeHudTimerRef.current) clearTimeout(volumeHudTimerRef.current);
    };
  }, []);

  // ----- Keyboard shortcuts -----
  // Space/K: play-pause · ←/→: seek ±10s · ↑/↓: volume · F: fullscreen ·
  // M: mute · C: captions. Ignored while typing in inputs/textareas.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTextInput(document.activeElement)) return;
      const v = videoRef.current;
      if (!v) return;

      switch (e.key) {
        case " ":
        case "k":
        case "K":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          skip(-10);
          break;
        case "ArrowRight":
          e.preventDefault();
          skip(10);
          break;
        case "ArrowUp": {
          e.preventDefault();
          const next = Math.min(1, v.volume + VOLUME_STEP);
          v.volume = next;
          setVolume(next);
          if (v.muted) {
            v.muted = false;
            setMuted(false);
          }
          flashVolumeHud();
          keepControlsAlive();
          break;
        }
        case "ArrowDown": {
          e.preventDefault();
          const next = Math.max(0, v.volume - VOLUME_STEP);
          v.volume = next;
          setVolume(next);
          flashVolumeHud();
          keepControlsAlive();
          break;
        }
        case "f":
        case "F":
          e.preventDefault();
          toggleFullscreenFn();
          break;
        case "m":
        case "M":
          e.preventDefault();
          toggleMute();
          flashVolumeHud();
          break;
        case "c":
        case "C":
          e.preventDefault();
          setShowSubtitles((s) => !s);
          keepControlsAlive();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    togglePlay,
    skip,
    toggleMute,
    toggleFullscreenFn,
    keepControlsAlive,
    flashVolumeHud,
  ]);

  const onSeekScrub = (val: number[]) => {
    seekingRef.current = true;
    setCurrentTime(val[0]);
  };
  const onSeekCommit = (val: number[]) => {
    seekingRef.current = false;
    seekTo(val[0]);
  };

  // ----- Render -----
  const isYoutube = !!importInfo?.isYoutube && !!importInfo?.url;
  const videoUrl = importInfo?.url ?? null;
  const posterUrl = poster ?? "";
  // Fullscreen mirror — applied to BOTH the video and every overlay so the
  // controls remain readable (rather than being backwards) when the video
  // is horizontally flipped in fullscreen.
  const mirrorStyle = isFullscreen ? "scaleX(-1)" : undefined;

  // ----- Keyboard-shortcut hint: show once on first ready, then auto-hide -----
  useEffect(() => {
    if (hintShownRef.current) return;
    if (loading || error || !videoUrl || isYoutube) return;
    hintShownRef.current = true;
    setShowKbHint(true);
    const t = setTimeout(() => setShowKbHint(false), KB_HINT_AUTOHIDE_MS);
    return () => clearTimeout(t);
  }, [loading, error, videoUrl, isYoutube]);

  // ----- YouTube iframe branch -----
  if (isYoutube && videoUrl) {
    const ytId = (() => {
      try {
        const u = new URL(videoUrl);
        if (u.hostname.includes("youtube.com")) {
          return u.pathname.startsWith("/embed/")
            ? u.pathname.slice("/embed/".length)
            : u.searchParams.get("v") ?? "";
        }
        if (u.hostname.includes("youtu.be")) return u.pathname.slice(1);
      } catch {
        /* noop */
      }
      return "";
    })();
    const embedSrc = ytId
      ? `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&modestbranding=1`
      : videoUrl;

    return (
      <div
        ref={containerRef}
        className="relative aspect-video w-full overflow-hidden bg-black"
      >
        <iframe
          src={embedSrc}
          title={title ?? "Video player"}
          className="absolute inset-0 h-full w-full"
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
          allowFullScreen
        />
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="glass-card absolute left-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full text-white hover:text-[#f5c518]"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div className="glass-card pointer-events-none absolute bottom-3 left-3 z-10 rounded-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
          Trailer · YouTube
        </div>
      </div>
    );
  }

  const progressPct =
    duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const bufferedPct =
    duration > 0 ? Math.min(100, (buffered / duration) * 100) : 0;

  // Icon used by the mute button + volume HUD.
  const isEffectivelyMuted = muted || volume === 0;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative aspect-video w-full select-none overflow-hidden bg-black",
        isFullscreen ? "rounded-none" : "rounded-2xl",
      )}
      onMouseMove={keepControlsAlive}
      onMouseLeave={() => {
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = setTimeout(() => {
          setControlsVisible(false);
          setShowSettings(false);
        }, HIDE_CONTROLS_MS / 2);
      }}
    >
      {/* ===== Ambient backlight — sits BEHIND the video, extends beyond
          the container edges so the box-shadow / blurred gradient is
          visible as a glow around (not behind) the player. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-8 z-0 transition-[background,box-shadow] duration-1000 ease-out"
        style={{
          background: `radial-gradient(ellipse at center, ${ambientColor} 0%, transparent 65%)`,
          filter: "blur(24px)",
          boxShadow: `0 0 80px 8px ${ambientColor}`,
        }}
      />

      {/* ===== Video element =====
          NO crossOrigin (breaks archive.org CDN). Tap-to-toggle-UI is
          handled by a dedicated click-catcher below (the <video>
          element's onClick is unreliable on mobile). */}
      {videoUrl ? (
        <video
          ref={videoRef}
          src={videoUrl}
          poster={posterUrl}
          playsInline
          preload="metadata"
          className="absolute inset-0 z-[1] h-full w-full bg-black"
          style={{ transform: mirrorStyle }}
        />
      ) : (
        <div className="absolute inset-0 z-[1] grid place-items-center bg-black">
          {posterUrl && (
            <img
              src={posterUrl}
              alt={title ?? "poster"}
              className="absolute inset-0 h-full w-full object-cover opacity-40"
            />
          )}
        </div>
      )}

      {/* ===== Always-present transparent click-catcher =====
          Sits ABOVE the video (z-10) but BELOW the controls (z-20/z-30).
          The top/bottom bars become pointer-events-none when hidden, so
          taps fall through to this layer; the center overlay's buttons
          call e.stopPropagation() so they don't trigger this handler. */}
      {!loading && !error && videoUrl && (
        <div
          className="absolute inset-0 z-10"
          onClick={handleVideoTap}
          aria-hidden
        />
      )}

      {/* ===== Loading overlay — gradient ring animation ===== */}
      {loading && (
        <div className="absolute inset-0 z-40 grid place-items-center bg-black/70">
          <div className="flex flex-col items-center gap-3 text-white">
            <div className="relative h-12 w-12">
              <div className="absolute inset-0 rounded-full border-2 border-white/10" />
              <div
                className="absolute inset-0 animate-spin rounded-full border-2 border-transparent"
                style={{
                  borderTopColor: "#f5c518",
                  borderRightColor: "#ff8a00",
                }}
              />
            </div>
            <p className="text-xs tracking-wide text-white/70">
              Resolving stream…
            </p>
          </div>
        </div>
      )}

      {/* ===== Error overlay ===== */}
      {!loading && error && (
        <div className="absolute inset-0 z-40 grid place-items-center bg-black/80 p-6">
          <div className="glass-card flex max-w-xs flex-col items-center gap-3 rounded-xl p-5 text-center text-white">
            <p className="text-sm leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* ===== Keyboard shortcuts hint — appears briefly on first load ===== */}
      {showKbHint && !loading && !error && videoUrl && (
        <div
          className="pointer-events-none absolute left-1/2 top-12 z-40 w-[92%] max-w-md -translate-x-1/2 scale-in"
          style={{ transform: mirrorStyle ? `translateX(-50%) scaleX(-1)` : "translateX(-50%)" }}
        >
          <div className="glass-card flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-xl px-3 py-2 text-[10px] text-white/85 backdrop-blur-md">
            <span
              className="gradient-text font-black uppercase tracking-wider"
              style={{ textShadow: "0 0 8px rgba(255,138,0,0.5)" }}
            >
              Shortcuts
            </span>
            <span className="flex items-center gap-1">
              <Kbd>Space</Kbd> Play
            </span>
            <span className="flex items-center gap-1">
              <Kbd>←</Kbd>
              <Kbd>→</Kbd> Seek
            </span>
            <span className="flex items-center gap-1">
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd> Vol
            </span>
            <span className="flex items-center gap-1">
              <Kbd>F</Kbd> Full
            </span>
            <span className="flex items-center gap-1">
              <Kbd>M</Kbd> Mute
            </span>
            <span className="flex items-center gap-1">
              <Kbd>C</Kbd> CC
            </span>
          </div>
        </div>
      )}

      {/* ===== Volume HUD — brief feedback when adjusting volume ===== */}
      {showVolumeHud && (
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 z-40 -translate-x-1/2 -translate-y-1/2 scale-in"
          style={{ transform: mirrorStyle ? `translate(-50%, -50%) scaleX(-1)` : "translate(-50%, -50%)" }}
        >
          <div className="glass-card flex items-center gap-3 rounded-2xl px-5 py-3 backdrop-blur-md">
            {isEffectivelyMuted ? (
              <VolumeX className="h-6 w-6 text-white" />
            ) : (
              <Volume2 className="h-6 w-6 text-[#f5c518]" />
            )}
            <div className="h-2 w-28 overflow-hidden rounded-full bg-white/20">
              <div
                className="brand-gradient-bg h-full rounded-full transition-[width] duration-150 ease-out"
                style={{ width: `${Math.round(volume * 100)}%` }}
              />
            </div>
            <span
              className="gradient-text w-9 text-right text-sm font-black tabular-nums"
              style={{ textShadow: "0 0 8px rgba(255,138,0,0.5)" }}
            >
              {Math.round(volume * 100)}
            </span>
          </div>
        </div>
      )}

      {/* ===== Custom subtitle overlay — orange glow for readability ===== */}
      {showSubtitles && activeCue && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-24 z-20 flex justify-center px-4 sm:bottom-28"
          style={{ transform: mirrorStyle }}
        >
          <span
            className="max-w-[90%] text-center text-base font-bold leading-snug text-white"
            style={{
              textShadow:
                "0 0 3px #000, 0 0 6px #000, 0 0 10px #000, 0 0 15px rgba(255,138,0,0.6), 0 0 25px rgba(255,138,0,0.4), 0 2px 4px rgba(0,0,0,0.9)",
            }}
          >
            {activeCue.split("\n").map((line, i) => (
              <span key={i} className="block">
                {line}
              </span>
            ))}
          </span>
        </div>
      )}

      {/* ===== Subtitle "unavailable" hint — shows briefly when CC is on but no cues ===== */}
      {showSubtitles &&
        !activeCue &&
        cues.length === 0 &&
        !loading &&
        videoUrl && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-24 z-20 flex justify-center px-4 sm:bottom-28"
            style={{ transform: mirrorStyle }}
          >
            <span
              className="rounded-md bg-black/70 px-3 py-1 text-center text-xs font-bold text-white"
              style={{
                textShadow: "0 0 4px #000, 0 0 8px rgba(255,138,0,0.5)",
              }}
            >
              字幕なし · No subtitles available for this episode
            </span>
          </div>
        )}

      {/* ===== Top bar — flip in fullscreen to match mirrored video ===== */}
      <div
        className={cn(
          "glass-header absolute inset-x-0 top-0 z-30 flex items-center gap-2 p-3 transition-opacity duration-300",
          controlsVisible ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        style={{ transform: mirrorStyle }}
      >
        {onBack && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onBack();
            }}
            className="btn-press glass-card grid h-9 w-9 place-items-center rounded-full text-white hover:text-[#f5c518]"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <p
            className="truncate text-sm font-bold tracking-editorial text-white"
            style={{ textShadow: "0 1px 10px rgba(0,0,0,0.85)" }}
          >
            {title ?? "Now Playing"}
          </p>
          {importInfo && (
            <p className="text-[11px] text-white/60">
              Episode {episode} · {audioMode} · {importInfo.quality}
            </p>
          )}
        </div>
        {(importInfo?.hasSub || importInfo?.hasDub) && (
          <SubDubPill
            audioMode={audioMode}
            onChange={(e) => {
              e.stopPropagation();
              switchAudioMode(audioMode === "SUB" ? "DUB" : "SUB");
            }}
          />
        )}
      </div>

      {/* ===== Center controls — only when controls visible =====
          The wrapper is pointer-events-none so taps on empty center area
          fall through to the click-catcher (z-10) which toggles the UI.
          The buttons inside re-enable pointer-events-auto and call
          e.stopPropagation() so they don't trigger the toggle. */}
      {controlsVisible && !loading && !error && videoUrl && (
        <div
          className="pointer-events-none absolute inset-0 z-20 grid place-items-center"
          style={{ transform: mirrorStyle }}
        >
          <div className="pointer-events-auto flex items-center gap-6">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                skip(-10);
              }}
              className="btn-press glass-card grid h-11 w-11 place-items-center rounded-full text-white transition hover:text-[#f5c518] hover:glow"
              aria-label="Back 10 seconds"
            >
              <RotateCcw className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              className="btn-press brand-gradient-bg pulse-glow grid h-16 w-16 place-items-center rounded-full text-black shadow-2xl shadow-[#ff8a00]/40 transition-transform duration-300 hover:scale-105"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
                <Pause className="h-7 w-7" />
              ) : (
                <Play className="ml-0.5 h-7 w-7 fill-black" />
              )}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                skip(10);
              }}
              className="btn-press glass-card grid h-11 w-11 place-items-center rounded-full text-white transition hover:text-[#f5c518] hover:glow"
              aria-label="Forward 10 seconds"
            >
              <RotateCw className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* ===== Bottom controls container =====
          ONE div, absolute bottom-0, holding EVERYTHING that belongs at
          the bottom — control buttons row, then progress bar, then
          timestamp. This keeps them anchored to the bottom edge instead
          of drifting to the middle of the screen. Flip in fullscreen to
          match the mirrored video. */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-30 px-3 pb-2 pt-6 transition-opacity duration-300",
          "bg-gradient-to-t from-black/90 via-black/55 to-transparent",
          controlsVisible ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        style={{ transform: mirrorStyle }}
        onMouseMove={keepControlsAlive}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Row 1: Control buttons (play, mute, time, CC, settings, fullscreen) */}
        <div className="mb-2 flex items-center gap-1.5 text-white">
          <button
            type="button"
            onClick={togglePlay}
            className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/10"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            onClick={toggleMute}
            className="grid h-8 w-8 place-items-center rounded-full hover:bg-white/10"
            aria-label="Mute"
          >
            {isEffectivelyMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>
          {/* Inline current time / duration (mobile-friendly summary) */}
          <span
            className="ml-1 text-[11px] tabular-nums text-white/80"
            style={{ textShadow: "0 0 8px rgba(255,138,0,0.5)" }}
          >
            {fmtTime(currentTime)} / {fmtTime(duration)}
          </span>

          <div className="ml-auto flex items-center gap-1">
            {/* CC toggle — glow when active */}
            {(cues.length > 0 ||
              importInfo?.hasSub ||
              importInfo?.subtitleUrl) && (
              <button
                type="button"
                onClick={() => {
                  setShowSubtitles((s) => !s);
                  keepControlsAlive();
                }}
                className={cn(
                  "grid h-8 w-8 place-items-center rounded-full transition-all duration-300 hover:bg-white/10",
                  showSubtitles ? "text-[#f5c518] glow" : "text-white/70",
                )}
                aria-label="Toggle subtitles"
                title={
                  cues.length === 0
                    ? "Subtitles unavailable for this episode"
                    : subtitleSource === "opensubtitles"
                      ? "Subtitles from OpenSubtitles (real dialogue)"
                      : subtitleSource.startsWith("jikan")
                        ? "Episode info (configure OpenSubtitles for dialogue subs)"
                        : "Toggle subtitles"
                }
              >
                <Captions className="h-4 w-4" />
              </button>
            )}

            {/* Audio tracks (only when dual-audio detected) */}
            {audioTracks.length > 0 && (
              <AudioTracksMenu
                tracks={audioTracks}
                active={activeAudioTrack}
                onSelect={switchAudioTrack}
                onHover={keepControlsAlive}
              />
            )}

            {/* Settings: speed + quality + mirror */}
            <SettingsMenu
              speed={selectedSpeed}
              quality={selectedQuality}
              mirrored={mirrored}
              onMirror={(m) => {
                setMirrored(m);
                keepControlsAlive();
              }}
              onSpeed={(s) => {
                setSpeed(s);
                keepControlsAlive();
              }}
              onQuality={(q) => {
                setQuality(q);
                keepControlsAlive();
              }}
              onHover={keepControlsAlive}
              open={showSettings}
              onOpenChange={(o) => {
                setShowSettings(o);
                if (o) keepControlsAlive();
              }}
            />

            {/* Fullscreen button — rotation animation on toggle */}
            <button
              type="button"
              onClick={toggleFullscreenFn}
              className="grid h-8 w-8 place-items-center rounded-full transition-transform duration-500 hover:bg-white/10 hover:rotate-12"
              style={{
                transform: isFullscreen ? "rotate(180deg)" : "rotate(0deg)",
              }}
              aria-label="Fullscreen"
            >
              {isFullscreen ? (
                <Minimize className="h-4 w-4" />
              ) : (
                <Maximize className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Row 2: Progress bar (full width) */}
        <div className="group relative h-1.5 w-full cursor-pointer rounded-full bg-white/20">
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-white/30"
            style={{ width: `${bufferedPct}%` }}
          />
          <div
            className="brand-gradient-bg absolute left-0 top-0 h-full rounded-full transition-[width] duration-150 ease-out"
            style={{ width: `${progressPct}%` }}
          />
          <input
            type="range"
            min={0}
            max={duration || 0}
            step={0.1}
            value={currentTime}
            onChange={(e) => onSeekScrub([Number(e.target.value)])}
            onPointerUp={(e) =>
              onSeekCommit([Number((e.target as HTMLInputElement).value)])
            }
            onTouchEnd={(e) =>
              onSeekCommit([Number((e.target as HTMLInputElement).value)])
            }
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label="Seek"
          />
          <div
            className="brand-gradient-bg pointer-events-none absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ left: `${progressPct}%` }}
          />
        </div>

        {/* Row 3: Timestamp (left = current, right = duration) */}
        <div className="mt-1 flex justify-between text-[10px] tabular-nums text-white/70">
          <span>{fmtTime(currentTime)}</span>
          <span>{fmtTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

// Small <kbd>-styled key cap used by the keyboard-shortcut hint.
function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      className="inline-grid min-w-[18px] place-items-center rounded border border-white/20 bg-white/10 px-1 text-[9px] font-bold text-white"
      style={{ textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}
    >
      {children}
    </kbd>
  );
}

// SUB/DUB toggle — glass pill with sliding gradient indicator
function SubDubPill({
  audioMode,
  onChange,
}: {
  audioMode: "SUB" | "DUB";
  onChange: (e: React.MouseEvent) => void;
}) {
  const isSub = audioMode === "SUB";
  return (
    <div className="glass-card relative flex items-center rounded-full p-0.5 text-[11px] font-black tracking-wider">
      <span
        className="brand-gradient-bg tab-pill-indicator absolute top-0.5 bottom-0.5 rounded-full"
        style={{
          left: isSub ? "0.125rem" : "50%",
          width: "calc(50% - 0.125rem)",
        }}
      />
      <button
        type="button"
        onClick={onChange}
        className={cn(
          "relative z-10 px-2.5 py-1 transition-colors duration-300",
          isSub ? "text-black" : "text-white/70",
        )}
      >
        SUB
      </button>
      <button
        type="button"
        onClick={onChange}
        className={cn(
          "relative z-10 px-2.5 py-1 transition-colors duration-300",
          !isSub ? "text-black" : "text-white/70",
        )}
      >
        DUB
      </button>
    </div>
  );
}

interface AudioTracksMenuProps {
  tracks: AudioTrackInfo[];
  active: number;
  onSelect: (id: number) => void;
  onHover: () => void;
}

function AudioTracksMenu({
  tracks,
  active,
  onSelect,
  onHover,
}: AudioTracksMenuProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" onMouseEnter={onHover}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="grid h-8 w-8 place-items-center rounded-full text-[10px] font-black hover:bg-white/10"
        aria-label="Audio tracks"
      >
        AUD
      </button>
      {open && (
        <div className="glass-card scale-in absolute bottom-10 right-0 w-40 overflow-hidden rounded-xl shadow-2xl">
          <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white/50">
            Audio Track
          </p>
          {tracks.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                onSelect(t.id);
                setOpen(false);
              }}
              className={cn(
                "block w-full px-3 py-2 text-left text-xs transition-colors hover:bg-white/5",
                t.id === active ? "gradient-text font-bold" : "text-white",
              )}
            >
              {t.label}
              {t.id === active && " ✓"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface SettingsMenuProps {
  speed: number;
  quality: string;
  mirrored: boolean;
  onMirror: (m: boolean) => void;
  onSpeed: (s: number) => void;
  onQuality: (q: string) => void;
  onHover: () => void;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

function SettingsMenu({
  speed,
  quality,
  mirrored,
  onMirror,
  onSpeed,
  onQuality,
  onHover,
  open,
  onOpenChange,
}: SettingsMenuProps) {
  return (
    <div className="relative" onMouseEnter={onHover}>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className={cn(
          "grid h-8 w-8 place-items-center rounded-full transition-all duration-300 hover:bg-white/10",
          open && "text-[#f5c518] glow",
        )}
        aria-label="Settings"
      >
        <Settings className="h-4 w-4" />
      </button>
      {open && (
        <div className="glass-card scale-in absolute bottom-10 right-0 w-48 overflow-hidden rounded-xl shadow-2xl">
          <div className="px-3 py-2">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-white/50">
              Speed
            </p>
            <div className="flex flex-wrap gap-1">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onSpeed(s)}
                  className={cn(
                    "rounded-md px-2 py-1 text-[11px] font-semibold transition-all duration-300 hover:bg-white/10",
                    s === speed
                      ? "brand-gradient-bg text-black"
                      : "text-white",
                  )}
                >
                  {s}×
                </button>
              ))}
            </div>
          </div>
          <div className="border-t border-white/10 px-3 py-2">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-white/50">
              Quality
            </p>
            <div className="flex flex-wrap gap-1">
              {QUALITIES.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => onQuality(q)}
                  className={cn(
                    "rounded-md px-2 py-1 text-[11px] font-semibold transition-all duration-300 hover:bg-white/10",
                    q === quality
                      ? "brand-gradient-bg text-black"
                      : "text-white",
                  )}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
          <div className="border-t border-white/10 px-3 py-2">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-white/50">
              Display
            </p>
            <button
              type="button"
              onClick={() => onMirror(!mirrored)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[11px] font-semibold transition-all duration-300 hover:bg-white/10",
                mirrored ? "gradient-text" : "text-white",
              )}
            >
              <FlipHorizontal className="h-3.5 w-3.5" />
              Mirror video
              <span
                className={cn(
                  "ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-black",
                  mirrored
                    ? "brand-gradient-bg text-black"
                    : "bg-white/10 text-white/60",
                )}
              >
                {mirrored ? "ON" : "OFF"}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
