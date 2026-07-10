import {
  getUploadsDirectory,
  saveUpload,
  type UploadRecord,
} from "@/lib/database";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_UPLOAD_SIZE = 500 * 1024 * 1024;

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose a file to upload." }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_SIZE) {
    return NextResponse.json({ error: "Files must be smaller than 500 MB." }, { status: 413 });
  }

  const id = randomUUID();
  const extension = path.extname(file.name).replace(/[^.a-zA-Z0-9]/g, "").slice(0, 12);
  const storageName = `${id}${extension.toLowerCase()}`;
  const createdAt = new Date().toISOString();
  await writeFile(path.join(getUploadsDirectory(), storageName), Buffer.from(await file.arrayBuffer()));

  const upload: UploadRecord = {
    id,
    original_name: file.name,
    storage_name: storageName,
    mime_type: file.type || "application/octet-stream",
    size: file.size,
    created_at: createdAt,
  };
  saveUpload(upload);

  return NextResponse.json({
    id,
    url: `/api/files/${id}`,
    name: file.name,
    mimeType: upload.mime_type,
    size: file.size,
    createdAt,
  });
}
