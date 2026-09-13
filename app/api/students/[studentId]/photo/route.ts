import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ studentId: string }> },
) {
  const { studentId } = await params;

  await requirePermission(PERMISSIONS.STUDENTS_VIEW);

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { photoKey: true },
  });
  if (!student?.photoKey) {
    return new Response("Photo not found", { status: 404 });
  }

  try {
    const file = await storage.read(student.photoKey);

    // Photos are validated images at upload time (magic-byte checked);
    // sniffing is disabled and the cache busts via the ?v= key.
    const ext = student.photoKey.split(".").pop()?.toLowerCase() ?? "";
    const mimeByExt: Record<string, string> = {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
      webp: "image/webp",
    };
    const contentType = mimeByExt[ext] ?? "application/octet-stream";

    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": "inline",
        "Cache-Control": "private, max-age=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error(
      `Error reading student photo ${studentId}:`,
      error instanceof Error ? error.message : String(error),
    );
    return new Response("Error reading file", { status: 500 });
  }
}
