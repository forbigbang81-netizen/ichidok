"use client";

import { useEffect, useRef, useState } from "react";

/**
 * CastButton — renders a Google Cast launcher button that, when clicked,
 * opens the Chromecast device picker. When a device is selected, the
 * provided media URL is loaded on the receiver.
 *
 * This component depends on the Google Cast Framework SDK being loaded
 * (see CastProviderScript in the app layout). It listens for the
 * 'cast-ready' event before initializing.
 *
 * The button is styled to match the other VideoPlayer control buttons
 * (8x8 grid, gold tint when a session is active).
 *
 * NOTE: archive.org/download/... URLs return a 302 redirect to the CDN
 * (e.g. ia801000.us.archive.org/...). The Chromecast receiver sometimes
 * fails to follow these redirects, so we resolve the redirect client-side
 * using a HEAD fetch and pass the direct CDN URL to the receiver.
 */

// Minimal type declarations for the Cast Framework SDK
declare global {
  interface Window {
    chrome?: {
      cast?: {
        DefaultApiOptions?: any;
        media?: {
          MediaInfo: any;
          GenericMediaMetadata: any;
          LoadRequest: any;
          Image: any;
          DEFAULT_MEDIA_RECEIVER_APP_ID?: string;
        };
        AutoJoinPolicy?: {
          ORIGIN_SCOPED: string;
          TAB_AND_ORIGIN_SCOPED: string;
        };
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
  /** The video URL to cast. Should be a CORS-accessible MP4/WEBM/HLS URL. */
  mediaUrl: string | null;
  /** Title to show on the cast receiver's "now playing" screen. */
  title?: string;
  /** Poster image URL for the cast receiver. */
  poster?: string;
  /** Called when a cast session starts or ends. */
  onSessionChange?: (isCasting: boolean) => void;
}

export function CastButton({ mediaUrl, title, poster, onSessionChange }: CastButtonProps) {
  const [castReady, setCastReady] = useState(false);
  const [isCasting, setIsCasting] = useState(false);
  const [castState, setCastState] = useState<string>("NO_DEVICES_AVAILABLE");
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const initializedRef = useRef(false);

  // Wait for the Cast SDK to be ready
  useEffect(() => {
    if (window.__castReady) {
      setCastReady(true);
      return;
    }
    const handler = () => setCastReady(true);
    window.addEventListener("cast-ready", handler);
    return () => window.removeEventListener("cast-ready", handler);
  }, []);

  // Resolve the archive.org 302 redirect to get the direct CDN URL.
  // Chromecast receivers sometimes fail to follow redirects, so we do it
  // client-side using a HEAD fetch (which follows redirects automatically)
  // and extract the final URL from the response.
  useEffect(() => {
    if (!mediaUrl) {
      setResolvedUrl(null);
      return;
    }
    let cancelled = false;
    // Use a HEAD request via fetch to resolve redirects. archive.org returns
    // CORS headers (Access-Control-Allow-Origin: *) so this works from the
    // browser.
    fetch(mediaUrl, { method: "HEAD", redirect: "follow" })
      .then((res) => {
        if (cancelled) return;
        // res.url is the final URL after following redirects
        if (res.url && res.url !== mediaUrl) {
          setResolvedUrl(res.url);
        } else {
          setResolvedUrl(mediaUrl);
        }
      })
      .catch(() => {
        if (!cancelled) setResolvedUrl(mediaUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [mediaUrl]);

  // Initialize the Cast context once the SDK is ready
  useEffect(() => {
    if (!castReady || !window.cast?.framework || initializedRef.current) return;
    initializedRef.current = true;

    const context = window.cast.framework.CastContext.getInstance();
    const appId =
      window.chrome?.cast?.media?.DEFAULT_MEDIA_RECEIVER_APP_ID ?? "CC1AD845";
    const autoJoin =
      window.chrome?.cast?.AutoJoinPolicy?.ORIGIN_SCOPED ?? "origin_scoped";

    context.setOptions({
      receiverApplicationId: appId,
      autoJoinPolicy: autoJoin,
    });

    const EventType = window.cast.framework.CastContextEventType;
    const SessionState = window.cast.framework.CastContext.SessionState;

    const onSessionStateChanged = (event: any) => {
      const state = event?.sessionState;
      const casting =
        state === SessionState.SESSION_STARTED ||
        state === SessionState.SESSION_RESUMED;
      setIsCasting(casting);
      onSessionChange?.(casting);
    };

    const onCastStateChanged = (event: any) => {
      setCastState(event?.castState ?? "NO_DEVICES_AVAILABLE");
    };

    context.addEventListener(EventType.SESSION_STATE_CHANGED, onSessionStateChanged);
    context.addEventListener(EventType.CAST_STATE_CHANGED, onCastStateChanged);

    try {
      setCastState(context.getCastState());
    } catch {}

    return () => {
      context.removeEventListener(EventType.SESSION_STATE_CHANGED, onSessionStateChanged);
      context.removeEventListener(EventType.CAST_STATE_CHANGED, onCastStateChanged);
    };
  }, [castReady, onSessionChange]);

  // Load media onto the receiver when a session is active and the URL changes
  useEffect(() => {
    if (!castReady || !isCasting || !resolvedUrl || !window.cast?.framework) return;
    const context = window.cast.framework.CastContext.getInstance();
    const session = context.getCurrentSession();
    if (!session || !window.chrome?.cast?.media) return;

    try {
      const mediaInfo = new window.chrome.cast.media.MediaInfo(
        resolvedUrl,
        "video/mp4",
      );
      const metadata = new window.chrome.cast.media.GenericMediaMetadata();
      if (title) metadata.title = title;
      if (poster && window.chrome.cast.media.Image) {
        const img = new window.chrome.cast.media.Image(poster);
        metadata.images = [img];
      }
      mediaInfo.metadata = metadata;
      const request = new window.chrome.cast.media.LoadRequest(mediaInfo);
      session.loadMedia(request).catch((err: any) => {
        console.error("[CastButton] loadMedia failed:", err);
      });
    } catch (e) {
      console.error("[CastButton] media setup error:", e);
    }
  }, [castReady, isCasting, resolvedUrl, title, poster]);

  // Don't render if the SDK isn't available (e.g. on desktop browsers
  // without cast extension, or during SSR)
  if (!castReady) return null;

  const handleClick = () => {
    const context = window.cast?.framework?.CastContext.getInstance();
    if (!context) return;
    context
      .requestSession()
      .then(() => {
        // Session started — the SESSION_STATE_CHANGED listener will fire
        // and loadMedia will be called by the effect above.
      })
      .catch((err: any) => {
        console.error("[CastButton] requestSession failed:", err);
      });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Cast to device"
      title={
        isCasting
          ? "Casting — click to disconnect"
          : castState === "NO_DEVICES_AVAILABLE"
            ? "No cast devices found"
            : "Cast to nearby device"
      }
      className={`grid h-8 w-8 place-items-center rounded-full transition-colors active:bg-white/10 ${
        isCasting ? "text-[#f5c518]" : "text-white/70"
      }`}
    >
      {/* Cast icon — matches lucide Cast icon shape */}
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 8V6a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-6" />
        <path d="M2 12a9 9 0 0 1 8 8" />
        <path d="M2 16a5 5 0 0 1 4 4" />
        <line x1="2" y1="20" x2="2.01" y2="20" />
      </svg>
    </button>
  );
}
