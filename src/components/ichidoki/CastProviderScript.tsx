"use client";

import Script from "next/script";

/**
 * Loads the Google Cast Framework SDK (CAF).
 *
 * The SDK provides:
 *   - window.chrome.cast (the v3 API)
 *   - The <google-cast-launcher> custom element (renders the cast button)
 *   - cast.framework.CastContext (session management)
 *
 * We set the receiver application ID to the DEFAULT_MEDIA_RECEIVER
 * (chromecast), which can play MP4/WEBM/HLS URLs from any CORS-enabled
 * origin. archive.org serves video with `Access-Control-Allow-Origin: *`,
 * so Chromecast can stream directly from archive.org's CDN.
 *
 * The script tag is injected with strategy="afterInteractive" so it
 * doesn't block first paint but is available by the time the VideoPlayer
 * mounts. The callback `__onGCastApiAvailable` is invoked when the SDK
 * finishes loading, and we dispatch a 'cast-ready' event that the
 * VideoPlayer listens for.
 */
export default function CastProviderScript() {
  return (
    <>
      <Script
        id="cast-framework-callback"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window['__onGCastApiAvailable'] = function(isAvailable) {
              if (isAvailable) {
                window.__castReady = true;
                window.dispatchEvent(new Event('cast-ready'));
              }
            };
          `,
        }}
      />
      <Script
        id="cast-framework-sdk"
        src="https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1"
        strategy="afterInteractive"
      />
    </>
  );
}
