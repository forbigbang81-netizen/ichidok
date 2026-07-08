import { NextResponse } from "next/server";
import { spawn } from "node:child_process";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * GET /api/transcode?url=<archive.org MKV URL>&audio=<stream_index>
 *
 * Transcodes an archive.org MKV to MP4 on the fly:
 * - Selects the specified audio stream (e.g. 3 for Japanese)
 * - Transcodes video to H.264 (browser-compatible)
 * - Transcodes audio to AAC
 * - Streams the result to the browser
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  const audioStream = searchParams.get("audio") ?? "3";

  if (!url) {
    return NextResponse.json({ error: "Missing 'url' parameter" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  if (!parsed.hostname.includes("archive.org")) {
    return NextResponse.json({ error: "Only archive.org URLs allowed" }, { status: 403 });
  }

  const args = [
    "-v", "error",
    "-i", url,
    "-map", "0:0",
    "-map", `0:${audioStream}`,
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-crf", "28",
    "-c:a", "aac",
    "-b:a", "128k",
    "-f", "mp4",
    "-movflags", "frag_keyframe+empty_moov",
    "pipe:1",
  ];

  const ffmpeg = spawn("ffmpeg", args);

  const stream = new ReadableStream({
    start(controller) {
      ffmpeg.stdout.on("data", (chunk) => controller.enqueue(new Uint8Array(chunk)));
      ffmpeg.stderr.on("data", (chunk) => {
        console.error("[transcode] ffmpeg stderr:", chunk.toString());
      });
      ffmpeg.on("close", (code) => {
        console.log("[transcode] ffmpeg exited with code", code);
        controller.close();
      });
      ffmpeg.on("error", (err) => {
        console.error("[transcode] ffmpeg error:", err);
        controller.error(err);
      });
    },
    cancel() {
      ffmpeg.kill("SIGKILL");
    },
  });

  return new NextResponse(stream, {
    status: 200,
    headers: {
      "Content-Type": "video/mp4",
      "Cache-Control": "no-cache",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
