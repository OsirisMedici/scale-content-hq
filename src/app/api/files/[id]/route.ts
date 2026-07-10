import { getUpload, getUploadsDirectory } from "@/lib/database";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const upload = getUpload(id);
  if (!upload) return new Response("File not found", { status: 404 });

  try {
    const file = await readFile(path.join(getUploadsDirectory(), upload.storage_name));
    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": upload.mime_type,
        "Content-Length": String(upload.size),
        "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(upload.original_name)}`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return new Response("File missing from local storage", { status: 404 });
  }
}
