import { getAppearanceSettings } from "@/lib/settings";
import { storage } from "@/lib/storage";

// Raster types only, matching the upload allowlist. SVG is deliberately
// absent: it is scriptable and this route serves content inline on origin.
const MIME_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
};

// `?variant=dark` serves the dark-background logo (falls back to the primary
// logo when none is uploaded, so a stale dark-variant URL keeps working).
export async function GET(request: Request) {
  const variant = new URL(request.url).searchParams.get("variant");
  const appearance = await getAppearanceSettings();

  const logoKey =
    variant === "dark" && appearance.logoDarkKey
      ? appearance.logoDarkKey
      : appearance.logoKey;

  if (!logoKey) {
    return new Response("No logo configured", { status: 404 });
  }

  try {
    const file = await storage.read(logoKey);
    if (!file) {
      return new Response("Logo not found", { status: 404 });
    }

    const ext = logoKey.split(".").pop()?.toLowerCase() ?? "";
    // Unmapped extensions (e.g. legacy svg uploads) are refused rather than
    // served with a guessed content type.
    const contentType = MIME_TYPES[ext];
    if (!contentType) {
      return new Response("Logo not found", { status: 404 });
    }

    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": contentType,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error(
      "Error reading logo:",
      error instanceof Error ? error.message : String(error),
    );
    return new Response("Error reading logo", { status: 500 });
  }
}
