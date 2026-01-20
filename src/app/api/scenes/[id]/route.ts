import { NextRequest, NextResponse } from "next/server";
import { getScene, incrementViews, isSceneExpired } from "@/lib/kv";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const scene = await getScene(id);

  if (!scene) {
    return NextResponse.json({ error: "Scene not found" }, { status: 404 });
  }

  // Check expiration
  if (isSceneExpired(scene)) {
    return NextResponse.json({ error: "Scene has expired" }, { status: 410 });
  }

  // Increment view count (fire and forget)
  incrementViews(id).catch(() => {});

  // Return scene data
  return NextResponse.json({
    id: scene.id,
    title: scene.title,
    orbitSpan: scene.orbitSpan,
    zoomLocked: scene.zoomLocked,
    envUrl: scene.envUrl,
    envType: scene.envType,
    layers: scene.layers,
    viewCount: scene.viewCount,
  });
}
