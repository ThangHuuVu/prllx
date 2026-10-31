import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { uploadBlob } from "@/lib/blob";
import { isAllowedEmbedHost, MAX_EMBED_HOSTS } from "@/lib/domains";
import { assertEnvironmentFile, assertPngFile, sanitizeFileName } from "@/lib/files";
import { HttpError } from "@/lib/http-error";
import { canExport } from "@/lib/permissions";
import {
  deleteScene,
  generateSceneId,
  saveScene,
  type SceneRecord,
} from "@/lib/kv";
import {
  exportMetadataSchema,
  MAX_METADATA_CHARS,
  type ExportMetadata,
} from "@/lib/scene-schema";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canExport(session.user.email)) {
    return NextResponse.json(
      { error: "Export not allowed for this account" },
      { status: 403 },
    );
  }

  const sceneId = generateSceneId();
  let uploaded = false;

  try {
    const formData = await request.formData();
    const metadata = readMetadata(formData);
    const allowedDomains = normalizeAllowedDomains(metadata.allowedDomains);
    const layerFiles = readLayerFiles(formData, metadata.layers.length);
    const envFile = readEnvironmentFile(formData, metadata.envType);

    await Promise.all(layerFiles.map((file) => assertPngFile(file)));
    if (envFile && metadata.envType) {
      await assertEnvironmentFile(envFile, metadata.envType);
    }

    uploaded = true;
    const uploadedLayers = await Promise.all(
      layerFiles.map(async (file, index) => {
        const layerMeta = metadata.layers[index];
        const filename = `${String(index).padStart(2, "0")}-${sanitizeFileName(file.name)}`;
        const blob = await uploadBlob(`scenes/${sceneId}/layers/${filename}`, file);
        return {
          id: `layer-${index}`,
          name: layerMeta.name,
          url: blob.url,
          order: layerMeta.order,
          visible: layerMeta.visible,
          gapAfter: layerMeta.gapAfter,
          rotation: layerMeta.rotation,
        };
      }),
    );

    let envUrl: string | null = null;
    if (envFile) {
      const blob = await uploadBlob(
        `scenes/${sceneId}/env/${sanitizeFileName(envFile.name)}`,
        envFile,
      );
      envUrl = blob.url;
    }

    const scene: SceneRecord = {
      id: sceneId,
      userId: session.user.id,
      title: metadata.title,
      orbitSpan: metadata.orbitSpan,
      zoomLocked: metadata.zoomLocked,
      envUrl,
      envType: envUrl ? metadata.envType : null,
      expiresAt: metadata.expiresAt,
      allowedDomains,
      createdAt: new Date().toISOString(),
      layers: uploadedLayers,
    };

    await saveScene(scene);

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return NextResponse.json({
      id: scene.id,
      shareUrl: `${baseUrl}/s/${scene.id}`,
      embedUrl: `${baseUrl}/embed/${scene.id}`,
      embedCode: `<iframe src="${baseUrl}/embed/${scene.id}" width="800" height="600" frameborder="0" allowfullscreen></iframe>`,
    });
  } catch (error) {
    if (uploaded) {
      await deleteScene(sceneId).catch((cleanupError) => {
        console.error("Failed to clean up export", cleanupError);
      });
    }
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Export error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}

function readMetadata(formData: FormData): ExportMetadata {
  const metadataValue = formData.get("metadata");
  if (typeof metadataValue !== "string" || metadataValue.length === 0) {
    throw new HttpError(400, "Missing metadata");
  }
  if (metadataValue.length > MAX_METADATA_CHARS) {
    throw new HttpError(400, "Metadata is too large");
  }

  let metadataJson: unknown;
  try {
    metadataJson = JSON.parse(metadataValue);
  } catch {
    throw new HttpError(400, "Invalid metadata");
  }

  const parsed = exportMetadataSchema.safeParse(metadataJson);
  if (!parsed.success) {
    throw new HttpError(400, parsed.error.issues[0]?.message ?? "Invalid metadata");
  }
  return parsed.data;
}

function readLayerFiles(formData: FormData, expected: number): File[] {
  const entries = formData.getAll("layers");
  if (entries.length !== expected) {
    throw new HttpError(400, "Layer files do not match metadata");
  }
  return entries.map((entry) => {
    if (!(entry instanceof File)) {
      throw new HttpError(400, "Invalid layer file");
    }
    return entry;
  });
}

function readEnvironmentFile(
  formData: FormData,
  envType: "hdr" | "ldr" | null,
): File | null {
  const entry = formData.get("environment");
  if (entry === null) {
    if (envType) throw new HttpError(400, "Environment file is required");
    return null;
  }
  if (!(entry instanceof File)) {
    throw new HttpError(400, "Invalid environment file");
  }
  if (!envType) {
    throw new HttpError(400, "Environment type is required");
  }
  return entry;
}

function normalizeAllowedDomains(domains: string[] | null): string[] | null {
  if (domains === null) return null;
  if (domains.length > MAX_EMBED_HOSTS) {
    throw new HttpError(400, "Too many embed domains");
  }
  const hosts = domains.map((domain) => domain.trim().toLowerCase());
  if (hosts.some((host) => !isAllowedEmbedHost(host))) {
    throw new HttpError(
      400,
      "Embed domains must be hostnames like example.com or *.example.com",
    );
  }
  return [...new Set(hosts)];
}
