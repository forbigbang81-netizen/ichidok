// Server-side route that fetches zokoanime's embed page, decodes the
// obfuscated __P blob, and returns the underlying HLS stream URL.
//
// zokoanime obfuscates the stream config with:
//   blob = base64( xor( JSON.stringify(config), 'otaku-embed-v1' ) )
//
// We undo that here so the client can use hls.js directly and gain
// full control (skip intro, seek, picture-in-picture, subtitles, etc.).

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const OBF_KEY = "otaku-embed-v1";

function xorStr(input: string): string {
  let out = "";
  for (let i = 0; i < input.length; i++) {
    out += String.fromCharCode(input.charCodeAt(i) ^ OBF_KEY.charCodeAt(i % OBF_KEY.length));
  }
  return out;
}

function deobfuscate(blob: string): any {
  const decoded = Buffer.from(blob, "base64").toString("latin1");
  const xored = xorStr(decoded);
  return JSON.parse(xored);
}

interface ZokoConfig {
  src?: string;
  poster?: string;
  subtitles?: { lang?: string; label?: string; default?: boolean; src?: string }[];
  download_url?: string;
  video_id?: number;
  player?: { engine?: string; skin?: string; accent?: string };
  default_audio?: string | null;
  autoplay?: boolean;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const malId = searchParams.get("malId");
  const episode = searchParams.get("episode");
  const audio = (searchParams.get("audio") || "sub") as "sub" | "dub";

  if (!malId || !episode) {
    return NextResponse.json({ error: "malId and episode are required" }, { status: 400 });
  }

  const url = `https://zokoanime.video/stream/mal/${malId}/${episode}/${audio}`;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        Referer: "https://zokoanime.video/",
      },
      redirect: "follow",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Failed to fetch zokoanime page: ${res.status}` },
        { status: 502 }
      );
    }

    const html = await res.text();

    const match = html.match(/window\.__P\s*=\s*"([^"]+)"/);
    if (!match) {
      return NextResponse.json(
        { error: "Could not find stream config in zokoanime page" },
        { status: 502 }
      );
    }

    const blob = match[1];
    let config: ZokoConfig;
    try {
      config = deobfuscate(blob) as ZokoConfig;
    } catch (e) {
      return NextResponse.json(
        { error: "Failed to decode stream config" },
        { status: 500 }
      );
    }

    if (!config.src) {
      return NextResponse.json(
        { error: "No stream source found in config" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      src: config.src,
      poster: config.poster || "",
      subtitles: (config.subtitles || []).filter((s) => s && s.src),
      downloadUrl: config.download_url
        ? `https://zokoanime.video${config.download_url}`
        : null,
      videoId: config.video_id || null,
      engine: config.player?.engine || "hlsjs",
      fetchedAt: Date.now(),
    });
  } catch (err: any) {
    console.error("[/api/zoko-source] error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to fetch stream source" },
      { status: 500 }
    );
  }
}
