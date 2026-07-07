"use client";

import { useEffect, useRef, useState } from "react";

/**
 * CastButton — renders a Google Cast launcher button.
 *
 * CHROMOCAST FIX: Instead of passing the raw archive.org URL (which does a
 * 302 redirect to a CDN URL that the Chromecast receiver can't follow), we
 * convert the URL to use our own /api/stream proxy. The proxy:
 *   1. Follows the archive.org redirect server-side
 *   2. Returns proper CORS headers (Access-Control-Allow-Origin: *)
 *   3. Supports HTTP Range requests (required for video playback)
 *   4. Serves from our Vercel domain (which the receiver can access)
 *
 * This means the Chromecast receiver sees a URL on our domain and fetches
 * video bytes through our proxy, which handles the archive.org redirect
 * transparently.
 */

declare global {
  interface Window {
    chrome?: {
      cast?: {
        media?: {
          MediaInfo: any;
          GenericMediaMetadata: any;
          LoadRequest: any;
          Image: any;
          DEFAULT_MEDIA_RECEIVER_APP_ID?: string;
        };
        AutoJoinPolicy?: { ORIGIN_SCOPED: string };
        [key: string]: any;
      };
    };
    cast?: {
      framework?: {
        CastContext: {
          getInstance(): any;
          setOptions(opts: any): void;
          getCastState(): any;
          requestSession(): Promise<any>;
          getCurrentSession(): any;
          addEventListener: (type: any, handler: any) => void;
          removeEventListener: (type: any, handler: any) => void;
          EventType: any;
          CastContextEventType: any;
          SessionState: any;
        };
      };
    };
    __castReady?: boolean;
    __onGCastApiAvailable?: (isAvailable: boolean) => void;
  }
}

export interface CastButtonProps {
  mediaUrl: string | null;
  title?: string;
  poster?: string;
  onSessionChange?: (isCasting: boolean) => void;
}

export function CastButton({ mediaUrl, title, poster, onSessionChange }: CastButtonProps) {
  const [castReady, setCastReady] = useState(false);
  const [isCasting, setIsCasting] = useState(false);
  const [castState, setCastState] = useState("NO_DEVICES_AVAILABLE");
  const initializedRef = useRef(false);

  useEffect(() => {
    if (window.__castReady) { setCastReady(true); return; }
    const handler = () => setCastReady(true);
    window.addEventListener("cast-ready", handler);
    return () => window.removeEventListener("cast-ready", handler);
  }, []);

  // Convert the archive.org URL to a /api/stream proxy URL so the
  // Chromecast receiver can fetch it without redirect/CORS issues.
  const getCastUrl = (url: string): string => {
    if (!url) return url;
    // If it's already a proxy URL, use it as-is
    if (url.includes("/api/stream")) return url;
    // If it's an archive.org URL, wrap it in the proxy
    if (url.includes("archive.org")) {
      return `/api/stream?url=${encodeURIComponent(url)}`;
    }
    return url;
  };

  // Initialize the Cast context
  useEffect(() => {
    if (!castReady || !window.cast?.framework || initializedRef.current) return;
    initializedRef.current = true;

    const context = window.cast.framework.CastContext.getInstance();
    const appId = window.chrome?.cast?.media?.DEFAULT_MEDIA_RECEIVER_APP_ID ?? "CC1AD845";
    const autoJoin = window.chrome?.cast?.AutoJoinPolicy?.ORIGIN_SCOPED ?? "origin_scoped";

    context.setOptions({
      receiverApplicationId: appId,
      autoJoinPolicy: autoJoin,
    });

    const EventType = window.cast.framework.CastContextEventType;
    const SessionState = window.cast.framework.CastContext.SessionState;

    const onSession = (event: any) => {
      const state = event?.sessionState;
      const casting = state === SessionState.SESSION_STARTED || state === SessionState.SESSION_RESUMED;
      setIsCasting(casting);
      onSessionChange?.(casting);
    };
    const onCastState = (event: any) => setCastState(event?.castState ?? "NO_DEVICES_AVAILABLE");

    context.addEventListener(EventType.SESSION_STATE_CHANGED, onSession);
    context.addEventListener(EventType.CAST_STATE_CHANGED, onCastState);
    try { setCastState(context.getCastState()); } catch {}

    return () => {
      context.removeEventListener(EventType.SESSION_STATE_CHANGED, onSession);
      context.removeEventListener(EventType.CAST_STATE_CHANGED, onCastState);
    };
  }, [castReady, onSessionChange]);

  // Load media onto the receiver when a session starts
  useEffect(() => {
    if (!castReady || !isCasting || !mediaUrl || !window.cast?.framework) return;
    const context = window.cast.framework.CastContext.getInstance();
    const session = context.getCurrentSession();
    if (!session || !window.chrome?.cast?.media) return;

    try {
      const castUrl = getCastUrl(mediaUrl);
      // Build an absolute URL if it's a relative proxy path
      const absoluteUrl = castUrl.startsWith("/") ? `${window.location.origin}${castUrl}` : castUrl;

      const mediaInfo = new window.chrome.cast.media.MediaInfo(absoluteUrl, "video/mp4");
      const metadata = new window.chrome.cast.media.GenericMediaMetadata();
      if (title) metadata.title = title;
      if (poster && window.chrome.cast.media.Image) {
        const img = new window.chrome.cast.media.Image(poster);
        metadata.images = [img];
      }
      mediaInfo.metadata = metadata;
      const request = new window.chrome.cast.media.LoadRequest(mediaInfo);
      session.loadMedia(request).catch((err: any) => console.error("[CastButton] loadMedia failed:", err));
    } catch (e) {
      console.error("[CastButton] media setup error:", e);
    }
  }, [castReady, isCasting, mediaUrl, title, poster]);

  if (!castReady) return null;

  return (
    <button
      type="button"
      onClick={() => {
        window.cast?.framework?.CastContext.getInstance()?.requestSession().catch((err: any) => console.error("[CastButton] requestSession failed:", err));
      }}
      aria-label="Cast to device"
      title={isCasting ? "Casting — click to disconnect" : castState === "NO_DEVICES_AVAILABLE" ? "No cast devices found" : "Cast to nearby device"}
      className={`grid h-8 w-8 place-items-center rounded-full transition-colors active:bg-white/10 ${isCasting ? "text-[#f5c518]" : "text-white/70"}`}
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6" />
        <path d="M2 12a9 9 0 0 1 8 8" />
        <path d="M2 16a5 5 0 0 1 4 4" />
        <line x1="2" y1="20" x2="2.01" y2="20" />
      </svg>
    </button>
  );
}
