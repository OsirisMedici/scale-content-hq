import { getWorkspace, saveWorkspace } from "@/lib/database";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getWorkspace(), {
    headers: { "Cache-Control": "no-store" },
  });
}

export async function PUT(request: Request) {
  const body = (await request.json()) as { state?: unknown };
  if (!body.state || typeof body.state !== "object") {
    return NextResponse.json({ error: "A workspace state object is required." }, { status: 400 });
  }

  return NextResponse.json(saveWorkspace(body.state));
}
