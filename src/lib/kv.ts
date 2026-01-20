import { put, del, list } from "@vercel/blob";

const METADATA_FILENAME = "metadata.json";

export type StoredScene = {
  id: string;
  userId: string;
  userEmail: string;
  title: string | null;
  orbitSpan: number;
  zoomLocked: boolean;
  envUrl: string | null;
  envType: "hdr" | "ldr" | null;
  expiresAt: string | null; // ISO date or null for never
  allowedDomains: string[] | null; // null = allow all, [] = same origin only
  viewCount: number;
  createdAt: string;
  layers: {
    id: string;
    name: string;
    url: string; // Vercel Blob URL
    order: number;
    visible: boolean;
    gapAfter: number;
    rotation: { x: number; y: number; z: number };
  }[];
};

export async function saveScene(scene: StoredScene): Promise<void> {
  const json = JSON.stringify(scene);
  await put(`scenes/${scene.id}/${METADATA_FILENAME}`, json, {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export async function getScene(id: string): Promise<StoredScene | null> {
  try {
    const { blobs } = await list({ prefix: `scenes/${id}/` });
    const metadataBlob = blobs.find((b) => b.pathname.endsWith(METADATA_FILENAME));
    if (!metadataBlob) return null;

    const response = await fetch(metadataBlob.url);
    if (!response.ok) return null;
    return response.json();
  } catch {
    return null;
  }
}

export async function deleteScene(id: string): Promise<void> {
  const { blobs } = await list({ prefix: `scenes/${id}/` });
  await Promise.all(blobs.map((b) => del(b.url)));
}

export async function incrementViews(id: string): Promise<void> {
  const scene = await getScene(id);
  if (scene) {
    scene.viewCount++;
    await saveScene(scene);
  }
}

export function isSceneExpired(scene: StoredScene): boolean {
  if (!scene.expiresAt) return false;
  return new Date(scene.expiresAt) < new Date();
}

export function generateSceneId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}
