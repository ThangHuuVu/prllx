import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  deleteSceneAsOwner,
  getScene,
  isSceneExpired,
  isSafeSceneId,
  toViewerScene,
} from "@/lib/kv";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!isSafeSceneId(id)) {
    return NextResponse.json({ error: "Scene not found" }, { status: 404 });
  }

  const scene = await getScene(id);
  if (!scene) {
    return NextResponse.json({ error: "Scene not found" }, { status: 404 });
  }

  if (isSceneExpired(scene)) {
    return NextResponse.json({ error: "Scene has expired" }, { status: 410 });
  }

  return NextResponse.json(toViewerScene(scene));
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deleted = await deleteSceneAsOwner(id, session.user.id);
  if (!deleted) {
    return NextResponse.json({ error: "Scene not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
