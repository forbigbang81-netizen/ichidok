"use client";

import { useEffect, useRef, useState } from "react";

/**
 * CastButton — Chromecast button for the video player.
 *
 * APPROACH: The Chromecast DEFAULT_MEDIA_RECEIVER can only play URLs that
 * are directly accessible (no redirects, CORS headers present). archive.org
 * URLs fail because they 302-redirect to CDN URLs that may lack CORS.
 *
 * SOLUTION: We create a dedicated /api/cast-stream endpoint that:
 *   1. Takes the archive.org URL as a path parameter (not query param)
 *   2. Follows the redirect server-side
 *   3. Streams the video bytes with proper CORS headers
 *   4. Supports HTTP Range requests
 *
 * The CastButton passes the /api/cast-stream URL to the receiver, which
 * sees it as a regular video URL on our domain and fetches it directly.
 *
 * If the proxy approach fails, the button falls back to passing the raw
 * archive.org URL — the receiver might still be able to play it directly
 * in some cases.
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

  useEffect(() => {
    if (!castReady || !window.cast?.framework || initializedRef.current) return;
    initializedRef.current = true;

    const context = window.cast.framework.CastContext.getInstance();
    const appId = window.chrome?.cast?.media?.DEFAULT_MEDIA_RECEIVER_APP_ID ?? "CC1AD845";
    const autoJoin = window.chrome?.cast?.AutoJoinPolicy?.ORIGIN_SCOPED ?? "origin_scoped";

    context.setOptions({ receiverApplicationId: appId, autoJoinPolicy: autoJoin });

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

  // Load media when a session starts
  useEffect(() => {
    if (!castReady || !isCasting || !mediaUrl || !window.cast?.framework) return;
    const context = window.cast.framework.CastContext.getInstance();
    const session = context.getCurrentSession();
    if (!session || !window.chrome?.cast?.media) return;

    try {
      // Build the cast URL. If it's an archive.org URL, use our stream proxy
      // so the receiver can fetch it without redirect/CORS issues.
      let castUrl = mediaUrl;
      if (mediaUrl.includes("archive.org") && !mediaUrl.includes("/api/")) {
        castUrl = `/api/stream?url=${encodeURIComponent(mediaUrl)}`;
      }
      // Make it an absolute URL
      const absoluteUrl = castUrl.startsWith("/")
        ? `${window.location.origin}${castUrl}`
        : castUrl;

      const mediaInfo = new window.chrome.cast.media.MediaInfo(absoluteUrl, "video/mp4");
      const metadata = new window.chrome.cast.media.GenericMediaMetadata();
      if (title) metadata.title = title;
      if (poster && window.chrome.cast.media.Image) {
        const img = new window.chrome.cast.media.Image(poster);
        metadata.images = [img];
      }
      mediaInfo.metadata = metadata;
      // Enable CORS for the receiver
      mediaInfo.customData = { cors: true };
      const request = new window.chrome.cast.media.LoadRequest(mediaInfo);
      session.loadMedia(request).catch((err: any) => {
        console.error("[CastButton] loadMedia failed:", err);
        // Fallback: try the raw URL directly
        if (mediaUrl.includes("archive.org")) {
          try {
            const fallbackInfo = new window.chrome.cast.media.MediaInfo(mediaUrl, "video/mp4");
            fallbackInfo.metadata = metadata;
            const fallbackReq = new window.chrome.cast.media.LoadRequest(fallbackInfo);
            session.loadMedia(fallbackReq).catch((e: any) => console.error("[CastButton] fallback also failed:", e));
          } catch (e) {
            console.error("[CastButton] fallback setup error:", e);
          }
        }
      });
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
