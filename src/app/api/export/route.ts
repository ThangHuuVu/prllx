import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { canExport } from "@/lib/permissions";
import { uploadBlob } from "@/lib/blob";
import { saveScene, generateSceneId, type StoredScene } from "@/lib/kv";

export async function POST(request: NextRequest) {
  // 1. Validate session
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Check export permission
  if (!canExport(session.user.email)) {
    return NextResponse.json({ error: "Export not allowed for this account" }, { status: 403 });
  }

  try {
    // 3. Parse request body
    const formData = await request.formData();
    const metadataStr = formData.get("metadata") as string;
    if (!metadataStr) {
      return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
    }

    const metadata = JSON.parse(metadataStr);
    const layerFiles = formData.getAll("layers") as File[];
    const envFile = formData.get("environment") as File | null;

    const sceneId = generateSceneId();

    // 4. Upload layers to Blob storage
    const uploadedLayers = await Promise.all(
      layerFiles.map(async (file, index) => {
        const layerMeta = metadata.layers[index];
        const blob = await uploadBlob(`scenes/${sceneId}/${file.name}`, file);
        return {
          id: `layer-${index}`,
          name: layerMeta.name,
          url: blob.url,
          order: layerMeta.order,
          visible: layerMeta.visible,
          gapAfter: layerMeta.gapAfter,
          rotation: layerMeta.rotation,
        };
      })
    );

    // 5. Upload environment if present
    let envUrl: string | null = null;
    if (envFile) {
      const blob = await uploadBlob(`scenes/${sceneId}/env/${envFile.name}`, envFile);
      envUrl = blob.url;
    }

    // 6. Create scene in Blob storage
    const scene: StoredScene = {
      id: sceneId,
      userId: session.user.id,
      userEmail: session.user.email || "",
      title: metadata.title || null,
      orbitSpan: metadata.orbitSpan,
      zoomLocked: metadata.zoomLocked,
      envUrl,
      envType: metadata.envType || null,
      expiresAt: metadata.expiresAt || null,
      allowedDomains: metadata.allowedDomains ?? null,
      viewCount: 0,
      createdAt: new Date().toISOString(),
      layers: uploadedLayers,
    };

    await saveScene(scene);

    // 7. Return share URLs
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return NextResponse.json({
      id: scene.id,
      shareUrl: `${baseUrl}/s/${scene.id}`,
      embedUrl: `${baseUrl}/embed/${scene.id}`,
      embedCode: `<iframe src="${baseUrl}/embed/${scene.id}" width="800" height="600" frameborder="0" allowfullscreen></iframe>`,
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Export failed" },
      { status: 500 }
    );
  }
}
