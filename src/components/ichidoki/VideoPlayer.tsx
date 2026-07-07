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
import { CastButton } from "./CastButton";

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
// If a buffering stall lasts longer than this, flag the network as "slow"
// so the spinner label changes from "Buffering…" to "Slow network — buffering…".
const SLOW_NETWORK_MS = 3500;

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
 * Convert an RGB pixel to a luma value so we can detect "dark" frames and
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
  const audioSwitchPositionRef = useRef<number | null>(null);
  const ambientCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const hintShownRef = useRef(false);
  const volumeHudTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const subSyncHudTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Buffering overlay — separate from `loading` (which covers initial URL
  // resolution). `isBuffering` fires whenever the video element reports it
  // is waiting for more data from the CDN (waiting/stalled events), and
  // clears on `playing` / `canplay`. This is essential for archive.org
  // sources where the CDN throughput can dip below the bitrate.
  const [isBuffering, setIsBuffering] = useState(false);
  // Slow-network hint: if a single buffering stall lasts longer than
  // SLOW_NETWORK_MS, swap the spinner label to "Slow network — buffering…"
  // so the user knows the problem is throughput, not the player.
  const [isSlowNetwork, setIsSlowNetwork] = useState(false);
  const bufferTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  const [volume, setVolume] = useState(1);
  const [audioTracks, setAudioTracks] = useState<AudioTrackInfo[]>([]);
  const [activeAudioTrack, setActiveAudioTrack] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [subtitleSource, setSubtitleSource] = useState<string>("");
  const [mirrored, setMirrored] = useState(false);
  // Subtitle timing offset in seconds. Positive = subtitles appear LATER
  // (useful when subs are too early). Negative = subtitles appear EARLIER
  // (useful when subs lag behind the audio, which is the common case when
  // using BluRay-timed subs against a TV-rip video source).
  // Persisted per malId+audioMode so different sources can have different
  // offsets. Default 0 = no adjustment.
  const [subtitleOffset, setSubtitleOffset] = useState(0);
  // Ambient backlight color sampled from the video frame — subtle.
  const [ambientColor, setAmbientColor] = useState<string>(
    "rgba(255, 255, 255, 0.08)",
  );
  const [showKbHint, setShowKbHint] = useState(false);
  const [showVolumeHud, setShowVolumeHud] = useState(false);
  const [showSubSyncHud, setShowSubSyncHud] = useState(false);

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
    // Reset buffering state from any previous source.
    setIsBuffering(false);
    setIsSlowNetwork(false);
    if (bufferTimerRef.current) {
      clearTimeout(bufferTimerRef.current);
      bufferTimerRef.current = null;
    }
    resumeAppliedRef.current = false;
    fetchVideoImport(malId, episode, audioMode.toLowerCase() as "sub" | "dub")
      .then((info) => {
        if (cancelled) return;
        setImportInfo(info);
        setLoading(false);
        if (!info || !info.url) {
          // Auto-switch to the available audio mode
          if (info && !info.url && info.hasDub && !info.hasSub && audioMode === "SUB") {
            setAudioMode("DUB");
            return; // The audioMode change will re-trigger this effect
          }
          if (info && !info.url && info.hasSub && !info.hasDub && audioMode === "DUB") {
            setAudioMode("SUB");
            return;
          }
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
      const adjTime = v.currentTime - subtitleOffset;
      const cue = cues.find(
        (c) => adjTime >= c.start && adjTime <= c.end,
      );
      setActiveCue(cue ? cue.text : "");
      const now = Date.now();
      if (onProgress && now - lastProgressEmitRef.current > 5000) {
        lastProgressEmitRef.current = now;
        onProgress(v.currentTime, v.duration || 0);
      }
    };
    const onLoadedMeta = () => {
      setDuration(v.duration || 0);
      setVolume(v.volume);
      setMuted(v.muted);
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
      setError(
        (prev) =>
          prev ?? "Video failed to load. The source may be unavailable.",
      );
    };

    // ----- Buffering overlay handlers -----
    // `waiting` fires when playback stops because the next frame isn't
    // buffered yet. `stalled` fires when the browser is trying to fetch
    // data but isn't receiving any. Both indicate CDN throughput issues.
    const startBuffer = () => {
      setIsBuffering(true);
      if (bufferTimerRef.current) clearTimeout(bufferTimerRef.current);
      bufferTimerRef.current = setTimeout(() => {
        setIsSlowNetwork(true);
      }, SLOW_NETWORK_MS);
    };
    const stopBuffer = () => {
      setIsBuffering(false);
      setIsSlowNetwork(false);
      if (bufferTimerRef.current) {
        clearTimeout(bufferTimerRef.current);
        bufferTimerRef.current = null;
      }
    };
    const onWaiting = () => {
      // Only show buffering if we're not actively seeking (seek shows its
      // own scrubber feedback).
      if (!seekingRef.current) startBuffer();
    };
    const onStalled = () => {
      if (!seekingRef.current) startBuffer();
    };
    const onPlayingEv = () => stopBuffer();
    const onCanPlay = () => stopBuffer();
    const onLoadStart = () => {
      // New src — reset buffering state, then mark as buffering until
      // enough data arrives to play.
      stopBuffer();
      startBuffer();
    };

    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onLoadedMeta);
    v.addEventListener("progress", onProgressBuf);
    v.addEventListener("ended", onEndedEv);
    v.addEventListener("error", onErr);
    v.addEventListener("waiting", onWaiting);
    v.addEventListener("stalled", onStalled);
    v.addEventListener("playing", onPlayingEv);
    v.addEventListener("canplay", onCanPlay);
    v.addEventListener("loadstart", onLoadStart);
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onLoadedMeta);
      v.removeEventListener("progress", onProgressBuf);
      v.removeEventListener("ended", onEndedEv);
      v.removeEventListener("error", onErr);
      v.removeEventListener("waiting", onWaiting);
      v.removeEventListener("stalled", onStalled);
      v.removeEventListener("playing", onPlayingEv);
      v.removeEventListener("canplay", onCanPlay);
      v.removeEventListener("loadstart", onLoadStart);
      if (bufferTimerRef.current) {
        clearTimeout(bufferTimerRef.current);
        bufferTimerRef.current = null;
      }
    };
  }, [cues, onProgress, onEnded, resumePosition, subtitleOffset, importInfo]);

  // ----- Apply playback rate -----
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = selectedSpeed;
  }, [selectedSpeed]);

  // ----- Load persisted subtitle offset per malId + audioMode -----
  // Different video sources (TV rip vs BluRay) have different start points,
  // so the same subtitle file can be ~0.4s off for one source and ~1s off
  // for another. The user can adjust via the settings menu and it persists
  // per anime+audio so they only tune it once.
  useEffect(() => {
    const key = `ichidoki-sub-offset-${malId}-${audioMode}`;
    try {
      const saved = localStorage.getItem(key);
      if (saved !== null) {
        const val = parseFloat(saved);
        if (Number.isFinite(val)) setSubtitleOffset(val);
      } else {
        setSubtitleOffset(0);
      }
    } catch {
      setSubtitleOffset(0);
    }
  }, [malId, audioMode]);

  const adjustSubtitleOffset = useCallback((delta: number) => {
    setSubtitleOffset((prev) => {
      const next = Math.max(-10, Math.min(10, Math.round((prev + delta) * 10) / 10));
      try {
        localStorage.setItem(
          `ichidoki-sub-offset-${malId}-${audioMode}`,
          String(next),
        );
      } catch {
        // localStorage may be unavailable in private browsing
      }
      return next;
    });
    // Flash the sub-sync HUD so the user sees the current offset value
    setShowSubSyncHud(true);
    if (subSyncHudTimerRef.current) clearTimeout(subSyncHudTimerRef.current);
    subSyncHudTimerRef.current = setTimeout(
      () => setShowSubSyncHud(false),
      1200,
    );
  }, [malId, audioMode]);

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

  // ----- Ambient backlight sampling (subtle) -----
  // Samples the average color of the current video frame every 2s using a
  // tiny offscreen canvas. If the video is cross-origin, the canvas becomes
  // tainted and getImageData throws — we catch that and keep the previous
  // color.
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
        // Subtle: low alpha, no blur boost.
        setAmbientColor(
          `rgba(${r}, ${g}, ${b}, 0.12)`,
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
      if (screen.orientation && screen.orientation.unlock) {
        screen.orientation.unlock().catch(() => {});
      }
    } else {
      el.requestFullscreen().catch(() => {});
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

  // switchAudioMode with position preservation.
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

  // ----- Volume HUD -----
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
        // Subtitle sync: Shift+, = subs earlier, Shift+. = subs later
        case "<":
          e.preventDefault();
          adjustSubtitleOffset(-0.1);
          keepControlsAlive();
          break;
        case ">":
          e.preventDefault();
          adjustSubtitleOffset(0.1);
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
    adjustSubtitleOffset,
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
  // Fullscreen mirror — applied to BOTH the video and every overlay.
  const mirrorStyle = undefined; // Removed fullscreen flip — was causing upside-down video

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
      ? `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0&playsinline=1`
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
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media; cast"
          allowFullScreen
        />
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="absolute left-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full bg-black/60 text-white"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div className="pointer-events-none absolute bottom-3 left-3 z-10 rounded bg-black/60 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
          Trailer · YouTube
        </div>
      </div>
    );
  }

  const progressPct =
    duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const bufferedPct =
    duration > 0 ? Math.min(100, (buffered / duration) * 100) : 0;

  const isEffectivelyMuted = muted || volume === 0;

  return (
    <div
      ref={containerRef}
      className="relative aspect-video w-full select-none overflow-hidden bg-black"
      onMouseMove={keepControlsAlive}
      onMouseLeave={() => {
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = setTimeout(() => {
          setControlsVisible(false);
          setShowSettings(false);
        }, HIDE_CONTROLS_MS / 2);
      }}
    >
      {/* ===== Ambient backlight — subtle, behind the video ===== */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-4 z-0 transition-[background] duration-1000 ease-out"
        style={{
          background: `radial-gradient(ellipse at center, ${ambientColor} 0%, transparent 60%)`,
        }}
      />

      {/* ===== Video element ===== */}
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
              className="absolute inset-0 h-full w-full object-cover opacity-30"
            />
          )}
        </div>
      )}

      {/* ===== Transparent click-catcher ===== */}
      {!loading && !error && videoUrl && (
        <div
          className="absolute inset-0 z-10"
          onClick={handleVideoTap}
          aria-hidden
        />
      )}

      {/* ===== Loading overlay (initial URL resolution) ===== */}
      {loading && (
        <div className="absolute inset-0 z-40 grid place-items-center bg-black/80">
          <div className="flex flex-col items-center gap-3 text-white">
            <div className="relative h-10 w-10">
              <div className="absolute inset-0 rounded-full border-2 border-white/10" />
              <div
                className="absolute inset-0 animate-spin rounded-full border-2 border-transparent"
                style={{
                  borderTopColor: "#f5c518",
                }}
              />
            </div>
            <p className="text-xs text-white/60">Resolving stream…</p>
          </div>
        </div>
      )}

      {/* ===== Buffering overlay (CDN throughput stalls) =====
          Distinct from the loading overlay: this fires when the video
          element reports `waiting` or `stalled`, meaning the source URL
          resolved fine but bytes aren't arriving fast enough from the CDN
          (typical for archive.org sources). Spinner sits on top of the
          last decoded frame so the user can see where playback paused. */}
      {!loading && !error && videoUrl && isBuffering && (
        <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center">
          <div className="flex flex-col items-center gap-2 rounded-xl bg-black/70 px-5 py-4 backdrop-blur-sm">
            <div className="relative h-9 w-9">
              <div className="absolute inset-0 rounded-full border-2 border-white/10" />
              <div
                className="absolute inset-0 animate-spin rounded-full border-2 border-transparent"
                style={{
                  borderTopColor: "#f5c518",
                }}
              />
            </div>
            <p className="text-[11px] font-medium text-white/80">
              {isSlowNetwork ? "Slow network — buffering…" : "Buffering…"}
            </p>
            {isSlowNetwork && (
              <p className="text-[9px] text-white/40">
                CDN throughput is below the video bitrate
              </p>
            )}
          </div>
        </div>
      )}

      {/* ===== Error overlay ===== */}
      {!loading && error && (
        <div className="absolute inset-0 z-40 grid place-items-center bg-black/90 p-6">
          <div className="flex max-w-xs flex-col items-center gap-3 rounded-lg bg-[#111111] p-5 text-center text-white">
            <p className="text-sm leading-relaxed">{error}</p>
          </div>
        </div>
      )}

      {/* ===== Keyboard shortcuts hint ===== */}
      {showKbHint && !loading && !error && videoUrl && (
        <div
          className="pointer-events-none absolute left-1/2 top-12 z-40 w-[92%] max-w-md -translate-x-1/2 fade-in"
          style={{ transform: mirrorStyle ? `translateX(-50%) scaleX(-1)` : "translateX(-50%)" }}
        >
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-lg bg-black/80 px-3 py-2 text-[10px] text-white/80">
            <span className="font-bold uppercase tracking-wider text-[#f5c518]">
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
            <span className="flex items-center gap-1">
              <Kbd>⇧</Kbd>
              <Kbd>&lt;</Kbd>
              <Kbd>&gt;</Kbd> Sub sync
            </span>
          </div>
        </div>
      )}

      {/* ===== Volume HUD ===== */}
      {showVolumeHud && (
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 z-40 -translate-x-1/2 -translate-y-1/2 fade-in"
          style={{ transform: mirrorStyle ? `translate(-50%, -50%) scaleX(-1)` : "translate(-50%, -50%)" }}
        >
          <div className="flex items-center gap-3 rounded-lg bg-black/80 px-5 py-3">
            {isEffectivelyMuted ? (
              <VolumeX className="h-6 w-6 text-white" />
            ) : (
              <Volume2 className="h-6 w-6 text-white" />
            )}
            <div className="h-1.5 w-28 overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-[#f5c518]"
                style={{ width: `${Math.round(volume * 100)}%` }}
              />
            </div>
            <span className="w-9 text-right text-sm font-bold tabular-nums text-white">
              {Math.round(volume * 100)}
            </span>
          </div>
        </div>
      )}

      {/* ===== Subtitle sync HUD — shows current offset when adjusting ===== */}
      {showSubSyncHud && (
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 z-40 -translate-x-1/2 -translate-y-1/2 fade-in"
          style={{ transform: mirrorStyle ? `translate(-50%, -50%) scaleX(-1)` : "translate(-50%, -50%)" }}
        >
          <div className="flex items-center gap-3 rounded-lg bg-black/80 px-5 py-3">
            <Captions className="h-5 w-5 text-[#f5c518]" />
            <span className="text-sm font-bold tabular-nums text-white">
              {subtitleOffset > 0
                ? `+${subtitleOffset.toFixed(1)}s`
                : `${subtitleOffset.toFixed(1)}s`}
            </span>
            <span className="text-[10px] text-white/50">
              {subtitleOffset === 0
                ? "reset"
                : subtitleOffset < 0
                  ? "subs earlier"
                  : "subs later"}
            </span>
          </div>
        </div>
      )}

      {/* ===== Custom subtitle overlay ===== */}
      {showSubtitles && activeCue && (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-20 z-20 flex justify-center px-4"
          style={{ transform: mirrorStyle }}
        >
          <span
            className="max-w-[90%] text-center text-base font-medium leading-snug text-white"
            style={{
              textShadow:
                "0 0 3px #000, 0 0 6px #000, 0 2px 4px rgba(0,0,0,0.9)",
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

      {/* ===== Subtitle "unavailable" hint ===== */}
      {showSubtitles &&
        !activeCue &&
        cues.length === 0 &&
        !loading &&
        videoUrl && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-20 z-20 flex justify-center px-4"
            style={{ transform: mirrorStyle }}
          >
            <span className="rounded bg-black/70 px-3 py-1 text-center text-xs font-medium text-white">
              字幕なし · No subtitles available for this episode
            </span>
          </div>
        )}

      {/* ===== Top bar ===== */}
      <div
        className={cn(
          "absolute inset-x-0 top-0 z-30 flex items-center gap-2 p-3 transition-opacity duration-200",
          "bg-gradient-to-b from-black/80 to-transparent",
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
            className="grid h-9 w-9 place-items-center rounded-full text-white transition-colors active:bg-white/10"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">
            {title ?? "Now Playing"}
          </p>
          {importInfo && (
            <p className="text-[11px] text-white/50">
              Episode {episode} · {audioMode} · {importInfo.quality}
            </p>
          )}
        </div>
        {(importInfo?.hasSub || importInfo?.hasDub) && (
          <SubDubPill
            audioMode={audioMode}
            hasSub={!!importInfo?.hasSub}
            hasDub={!!importInfo?.hasDub}
            onChange={(e) => {
              e.stopPropagation();
              const next = audioMode === "SUB" ? "DUB" : "SUB";
              // Only switch if the target mode is available
              if (next === "SUB" && !importInfo?.hasSub) return;
              if (next === "DUB" && !importInfo?.hasDub) return;
              switchAudioMode(next);
            }}
          />
        )}
      </div>

      {/* ===== Center controls ===== */}
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
              className="grid h-11 w-11 place-items-center rounded-full text-white transition-colors active:bg-white/10"
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
              className="grid h-16 w-16 place-items-center rounded-full bg-white text-black transition-transform active:scale-95"
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
              className="grid h-11 w-11 place-items-center rounded-full text-white transition-colors active:bg-white/10"
              aria-label="Forward 10 seconds"
            >
              <RotateCw className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* ===== Bottom controls container =====
          Single div anchored to bottom — controls row → progress bar → timestamp. */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 z-30 px-3 pb-2 pt-6 transition-opacity duration-200",
          "bg-gradient-to-t from-black/90 via-black/50 to-transparent",
          controlsVisible ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        style={{ transform: mirrorStyle }}
        onMouseMove={keepControlsAlive}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Row 1: Control buttons */}
        <div className="mb-2 flex items-center gap-1.5 text-white">
          <button
            type="button"
            onClick={togglePlay}
            className="grid h-8 w-8 place-items-center rounded-full transition-colors active:bg-white/10"
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
            className="grid h-8 w-8 place-items-center rounded-full transition-colors active:bg-white/10"
            aria-label="Mute"
          >
            {isEffectivelyMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>
          <span className="ml-1 text-[11px] tabular-nums text-white/80">
            {fmtTime(currentTime)} / {fmtTime(duration)}
          </span>

          <div className="ml-auto flex items-center gap-1">
            {/* CC toggle — gold when active */}
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
                  "grid h-8 w-8 place-items-center rounded-full transition-colors active:bg-white/10",
                  showSubtitles ? "text-[#f5c518]" : "text-white/70",
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

            {/* Audio tracks */}
            {audioTracks.length > 0 && (
              <AudioTracksMenu
                tracks={audioTracks}
                active={activeAudioTrack}
                onSelect={switchAudioTrack}
                onHover={keepControlsAlive}
              />
            )}

            {/* Settings */}
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
              subtitleOffset={subtitleOffset}
              onSubtitleOffset={(delta) => {
                if (delta === 0) {
                  // Reset to 0
                  setSubtitleOffset(0);
                  try {
                    localStorage.setItem(
                      `ichidoki-sub-offset-${malId}-${audioMode}`,
                      "0",
                    );
                  } catch {}
                } else {
                  adjustSubtitleOffset(delta);
                }
                keepControlsAlive();
              }}
              hasSubtitles={!!importInfo?.subtitleUrl && cues.length > 0}
            />

            {/* Cast to Chromecast — hidden for YouTube embeds (YouTube has
                its own built-in cast button in the player controls) */}
            {!isYoutube && videoUrl && (
              <CastButton
                mediaUrl={videoUrl}
                title={title ?? undefined}
                poster={posterUrl || undefined}
              />
            )}

            {/* Fullscreen */}
            <button
              type="button"
              onClick={toggleFullscreenFn}
              className="grid h-8 w-8 place-items-center rounded-full transition-colors active:bg-white/10"
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

        {/* Row 2: Progress bar — gold fill */}
        <div className="group relative h-1.5 w-full cursor-pointer rounded-full bg-white/20">
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-white/30"
            style={{ width: `${bufferedPct}%` }}
          />
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-[#f5c518]"
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
            className="pointer-events-none absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f5c518]"
            style={{ left: `${progressPct}%` }}
          />
        </div>

        {/* Row 3: Timestamp */}
        <div className="mt-1 flex justify-between text-[10px] tabular-nums text-white/60">
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
    <kbd className="inline-grid min-w-[18px] place-items-center rounded border border-white/20 bg-white/10 px-1 text-[9px] font-bold text-white">
      {children}
    </kbd>
  );
}

// SUB/DUB toggle — simple text pill. Each side is disabled if that audio
// mode is not available (e.g. dub-only anime disables the SUB button).
function SubDubPill({
  audioMode,
  onChange,
  hasSub,
  hasDub,
}: {
  audioMode: "SUB" | "DUB";
  onChange: (e: React.MouseEvent) => void;
  hasSub: boolean;
  hasDub: boolean;
}) {
  const isSub = audioMode === "SUB";
  return (
    <div className="flex items-center rounded-full bg-black/60 p-0.5 text-[11px] font-bold tracking-wider">
      <button
        type="button"
        onClick={hasSub ? onChange : undefined}
        disabled={!hasSub}
        className={cn(
          "rounded-full px-2.5 py-1 transition-colors",
          isSub && hasSub
            ? "bg-[#f5c518] text-black"
            : hasSub
              ? "text-white/70"
              : "text-white/20 cursor-not-allowed",
        )}
      >
        SUB
      </button>
      <button
        type="button"
        onClick={hasDub ? onChange : undefined}
        disabled={!hasDub}
        className={cn(
          "rounded-full px-2.5 py-1 transition-colors",
          !isSub && hasDub
            ? "bg-[#f5c518] text-black"
            : hasDub
              ? "text-white/70"
              : "text-white/20 cursor-not-allowed",
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
        className="grid h-8 w-8 place-items-center rounded-full text-[10px] font-bold transition-colors active:bg-white/10"
        aria-label="Audio tracks"
      >
        AUD
      </button>
      {open && (
        <div className="absolute bottom-10 right-0 w-40 overflow-hidden rounded-lg bg-[#111111] py-1 shadow-xl fade-in">
          <p className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-white/40">
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
                t.id === active ? "text-[#f5c518]" : "text-white/80",
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
  subtitleOffset: number;
  onSubtitleOffset: (delta: number) => void;
  hasSubtitles: boolean;
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
  subtitleOffset,
  onSubtitleOffset,
  hasSubtitles,
}: SettingsMenuProps) {
  return (
    <div className="relative" onMouseEnter={onHover}>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className={cn(
          "grid h-8 w-8 place-items-center rounded-full transition-colors active:bg-white/10",
          open && "text-[#f5c518]",
        )}
        aria-label="Settings"
      >
        <Settings className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute bottom-10 right-0 w-48 overflow-hidden rounded-lg bg-[#111111] shadow-xl fade-in">
          <div className="px-3 py-2">
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-white/40">
              Speed
            </p>
            <div className="flex flex-wrap gap-1">
              {SPEEDS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onSpeed(s)}
                  className={cn(
                    "rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                    s === speed
                      ? "bg-[#f5c518] text-black"
                      : "text-white/80 active:bg-white/10",
                  )}
                >
                  {s}×
                </button>
              ))}
            </div>
          </div>
          <div className="border-t border-white/10 px-3 py-2">
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-white/40">
              Quality
            </p>
            <div className="flex flex-wrap gap-1">
              {QUALITIES.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => onQuality(q)}
                  className={cn(
                    "rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                    q === quality
                      ? "bg-[#f5c518] text-black"
                      : "text-white/80 active:bg-white/10",
                  )}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
          {/* Subtitle sync — only shown when subtitles are available */}
          {hasSubtitles && (
            <div className="border-t border-white/10 px-3 py-2">
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-[10px] font-medium uppercase tracking-wider text-white/40">
                  Subtitle sync
                </p>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                    subtitleOffset !== 0
                      ? "bg-[#f5c518] text-black"
                      : "bg-white/10 text-white/60",
                  )}
                >
                  {subtitleOffset > 0 ? `+${subtitleOffset}s` : `${subtitleOffset}s`}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onSubtitleOffset(-0.1)}
                  className="flex-1 rounded-md bg-white/5 py-1.5 text-[11px] font-medium text-white/80 transition-colors active:bg-white/10"
                  aria-label="Subtitles earlier"
                >
                  −0.1s
                </button>
                <button
                  type="button"
                  onClick={() => onSubtitleOffset(0)}
                  className="rounded-md bg-white/5 px-2 py-1.5 text-[10px] font-medium text-white/60 transition-colors active:bg-white/10"
                  aria-label="Reset subtitle offset"
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => onSubtitleOffset(0.1)}
                  className="flex-1 rounded-md bg-white/5 py-1.5 text-[11px] font-medium text-white/80 transition-colors active:bg-white/10"
                  aria-label="Subtitles later"
                >
                  +0.1s
                </button>
              </div>
              <p className="mt-1 text-[9px] text-white/30">
                − = subs earlier · + = subs later
              </p>
            </div>
          )}
          <div className="border-t border-white/10 px-3 py-2">
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-white/40">
              Display
            </p>
            <button
              type="button"
              onClick={() => onMirror(!mirrored)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[11px] font-medium transition-colors",
                mirrored ? "text-[#f5c518]" : "text-white/80",
              )}
            >
              <FlipHorizontal className="h-3.5 w-3.5" />
              Mirror video
              <span
                className={cn(
                  "ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-bold",
                  mirrored
                    ? "bg-[#f5c518] text-black"
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
