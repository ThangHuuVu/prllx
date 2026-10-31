import {
  BlobAccessError,
  BlobNotFoundError,
  del,
  get,
  list,
  put,
} from "@vercel/blob";
import { normalizeEmbedHosts } from "@/lib/domains";

const RECORD_FILENAME = "record.json";
const LEGACY_METADATA_FILENAME = "metadata.json";
const METADATA_CACHE_SECONDS = 60;

const SCENE_ID = /^[A-Za-z0-9-]{8,80}$/;
const STORED_PATH =
  /^scenes\/([A-Za-z0-9-]{8,80})\/(?:record|metadata)\.json$/;

export type SceneLayer = {
  id: string;
  name: string;
  url: string;
  order: number;
  visible: boolean;
  gapAfter: number;
  rotation: { x: number; y: number; z: number };
};

export type SceneRecord = {
  id: string;
  userId: string;
  title: string | null;
  orbitSpan: number;
  zoomLocked: boolean;
  envUrl: string | null;
  envType: "hdr" | "ldr" | null;
  expiresAt: string | null;
  allowedDomains: string[] | null;
  createdAt: string;
  layers: SceneLayer[];
};

export type ViewerScene = {
  id: string;
  title: string | null;
  orbitSpan: number;
  zoomLocked: boolean;
  envUrl: string | null;
  envType: "hdr" | "ldr" | null;
  layers: SceneLayer[];
};

export function isSafeSceneId(id: string): boolean {
  return SCENE_ID.test(id);
}

export function generateSceneId(): string {
  return crypto.randomUUID();
}

function sceneIdFromMetadataPath(pathname: string): string | null {
  const match = STORED_PATH.exec(pathname.replace(/^\/+/, ""));
  return match?.[1] ?? null;
}

function recordPath(id: string): string {
  return `scenes/${id}/${RECORD_FILENAME}`;
}

export function toViewerScene(record: SceneRecord): ViewerScene {
  return {
    id: record.id,
    title: record.title,
    orbitSpan: record.orbitSpan,
    zoomLocked: record.zoomLocked,
    envUrl: record.envUrl,
    envType: record.envType,
    layers: record.layers,
  };
}

export function isSceneExpired(scene: { expiresAt: string | null }): boolean {
  if (!scene.expiresAt) return false;
  const time = Date.parse(scene.expiresAt);
  if (Number.isNaN(time)) return false;
  return time < Date.now();
}

export async function saveScene(record: SceneRecord): Promise<void> {
  await put(recordPath(record.id), JSON.stringify(record), {
    access: "private",
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: "application/json",
    cacheControlMaxAge: METADATA_CACHE_SECONDS,
  });
}

export async function getScene(id: string): Promise<SceneRecord | null> {
  try {
    const loaded = await loadSceneRecord(id);
    if (!loaded) return null;
    if (isSceneExpired(loaded.record)) {
      await deleteScene(id).catch((error) => {
        console.error("Failed to delete expired scene", id, error);
      });
    }
    return loaded.record;
  } catch (error) {
    console.error("getScene failed", error);
    return null;
  }
}

export async function deleteScene(id: string): Promise<void> {
  if (!isSafeSceneId(id)) return;
  const { blobs } = await list({ prefix: `scenes/${id}/` });
  await Promise.all(blobs.map((blob) => del(blob.url)));
}

export async function deleteSceneAsOwner(
  id: string,
  userId: string,
): Promise<boolean> {
  if (!isSafeSceneId(id) || !userId) return false;
  const scene = await getScene(id);
  if (!scene?.userId || scene.userId !== userId) return false;
  await deleteScene(id);
  return true;
}

export async function cleanupExpiredScenes(): Promise<{
  scanned: number;
  deleted: number;
  migrated: number;
  errors: string[];
}> {
  const ids = new Set<string>();
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: "scenes/", cursor, limit: 1000 });
    for (const blob of page.blobs) {
      const id = sceneIdFromMetadataPath(blob.pathname);
      if (id) ids.add(id);
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  let deleted = 0;
  let migrated = 0;
  const errors: string[] = [];
  for (const id of ids) {
    try {
      const loaded = await loadSceneRecord(id);
      if (!loaded) continue;
      if (loaded.migrated || (await removeLegacyPublicMetadata(id))) {
        migrated += 1;
      }
      if (isSceneExpired(loaded.record)) {
        await deleteScene(id);
        deleted += 1;
      }
    } catch (error) {
      console.error("Scene cleanup failed", id, error);
      if (errors.length < 50) errors.push(id);
    }
  }

  return { scanned: ids.size, deleted, migrated, errors };
}

async function loadSceneRecord(
  id: string,
): Promise<{ record: SceneRecord; migrated: boolean } | null> {
  if (!isSafeSceneId(id)) return null;

  const fromPrivate = await readPrivateMetadata(id);
  if (fromPrivate && !isLegacyShape(fromPrivate)) {
    const record = toSceneRecord(fromPrivate, id);
    return record ? { record, migrated: false } : null;
  }

  const legacy = await readLegacyPublic(id);
  const raw = legacy?.raw ?? fromPrivate;
  if (!raw) return null;
  const record = toSceneRecord(raw, id);
  if (!record) return null;
  if (!legacy && !isLegacyShape(raw)) {
    return { record, migrated: false };
  }

  try {
    await moveMetadataPrivate(record, legacy?.url ?? null);
    return { record, migrated: true };
  } catch (error) {
    console.error("Failed to move scene metadata off public storage", id, error);
    return { record, migrated: false };
  }
}

async function moveMetadataPrivate(
  record: SceneRecord,
  publicUrl: string | null,
): Promise<void> {
  await saveScene(record);
  if (!publicUrl) return;
  try {
    await del(publicUrl);
  } catch (error) {
    if (!(error instanceof BlobNotFoundError)) throw error;
  }
}

async function removeLegacyPublicMetadata(id: string): Promise<boolean> {
  const legacy = await readLegacyPublic(id);
  if (!legacy) return false;
  await del(legacy.url);
  return true;
}

async function readPrivateMetadata(id: string): Promise<unknown | null> {
  try {
    const result = await get(recordPath(id), {
      access: "private",
      useCache: false,
    });
    if (!result || result.statusCode !== 200 || !result.stream) return null;
    return JSON.parse(await new Response(result.stream).text()) as unknown;
  } catch (error) {
    if (error instanceof BlobNotFoundError || error instanceof BlobAccessError) {
      return null;
    }
    throw error;
  }
}

async function readLegacyPublic(
  id: string,
): Promise<{ raw: unknown; url: string } | null> {
  const { blobs } = await list({ prefix: `scenes/${id}/` });
  const metadata = blobs.find(
    (blob) =>
      blob.pathname.replace(/^\/+/, "") ===
      `scenes/${id}/${LEGACY_METADATA_FILENAME}`,
  );
  if (!metadata) return null;
  const response = await fetch(metadata.url, { cache: "no-store" });
  if (!response.ok) return null;
  return { raw: await response.json(), url: metadata.url };
}

function isLegacyShape(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const record = raw as Record<string, unknown>;
  return "userEmail" in record || "viewCount" in record;
}

function toSceneRecord(raw: unknown, expectedId: string): SceneRecord | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const id = typeof value.id === "string" ? value.id : expectedId;
  if (id !== expectedId || !isSafeSceneId(id)) return null;
  const layers = parseLayers(value.layers);
  if (!layers) return null;

  return {
    id,
    userId: typeof value.userId === "string" ? value.userId : "",
    title: typeof value.title === "string" ? value.title.slice(0, 200) : null,
    orbitSpan: typeof value.orbitSpan === "number" ? value.orbitSpan : 30,
    zoomLocked: value.zoomLocked === true,
    envUrl: typeof value.envUrl === "string" ? value.envUrl : null,
    envType: value.envType === "hdr" || value.envType === "ldr" ? value.envType : null,
    expiresAt: typeof value.expiresAt === "string" ? value.expiresAt : null,
    allowedDomains: sanitizeDomains(value.allowedDomains),
    createdAt:
      typeof value.createdAt === "string"
        ? value.createdAt
        : new Date(0).toISOString(),
    layers,
  };
}

function sanitizeDomains(value: unknown): string[] | null {
  if (value === null || value === undefined) return null;
  if (!Array.isArray(value)) return [];
  return normalizeEmbedHosts(
    value.filter((item): item is string => typeof item === "string"),
  );
}

function parseLayers(value: unknown): SceneLayer[] | null {
  if (!Array.isArray(value)) return null;
  const layers: SceneLayer[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const layer = item as Record<string, unknown>;
    if (typeof layer.id !== "string" || typeof layer.url !== "string") continue;
    const rotation =
      layer.rotation && typeof layer.rotation === "object"
        ? (layer.rotation as Record<string, unknown>)
        : {};
    layers.push({
      id: layer.id,
      name: typeof layer.name === "string" ? layer.name : "layer",
      url: layer.url,
      order: typeof layer.order === "number" ? layer.order : layers.length,
      visible: layer.visible !== false,
      gapAfter: typeof layer.gapAfter === "number" ? layer.gapAfter : 0.02,
      rotation: {
        x: typeof rotation.x === "number" ? rotation.x : 0,
        y: typeof rotation.y === "number" ? rotation.y : 0,
        z: typeof rotation.z === "number" ? rotation.z : 0,
      },
    });
  }
  return layers;
}
