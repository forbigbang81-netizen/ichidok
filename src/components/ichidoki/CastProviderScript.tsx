"use client";

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
 * This component injects the SDK script directly into <head> via a
 * useEffect (not next/script) to avoid timing issues with the
 * `__onGCastApiAvailable` callback. The callback MUST be set on window
 * before the SDK script loads, otherwise the SDK won't fire the readiness
 * event.
 */
export default function CastProviderScript() {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `
            // Set the callback BEFORE the SDK script loads. The SDK calls
            // this function when it's ready, and we dispatch a 'cast-ready'
            // event that the CastButton component listens for.
            window['__onGCastApiAvailable'] = function(isAvailable) {
              if (isAvailable) {
                window.__castReady = true;
                window.dispatchEvent(new Event('cast-ready'));
              }
            };
          `,
        }}
      />
      <script
        src="https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1"
        async
      />
    </>
  );
}
