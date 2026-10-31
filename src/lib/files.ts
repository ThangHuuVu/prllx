import { MAX_UPLOAD_BYTES } from "@/lib/blob";
import { HttpError } from "@/lib/http-error";

const HDR_TYPES = new Set([
  "",
  "application/octet-stream",
  "image/vnd.radiance",
]);

export function sanitizeFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? "";
  const cleaned = base
    .replace(/[^A-Za-z0-9._-]/g, "_")
    .replace(/\.{2,}/g, ".")
    .replace(/^[^A-Za-z0-9]+/, "")
    .replace(/_+/g, "_")
    .slice(0, 80);
  return cleaned || "file";
}

export function assertUploadSize(file: File): void {
  if (file.size <= 0) {
    throw new HttpError(400, "Empty file");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new HttpError(400, "File exceeds 10MB limit");
  }
}

async function readHead(file: File, bytes: number): Promise<Uint8Array> {
  const buffer = await file.slice(0, bytes).arrayBuffer();
  return new Uint8Array(buffer);
}

function isPng(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  );
}

function isJpeg(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  );
}

function isHdr(bytes: Uint8Array): boolean {
  const text = new TextDecoder("ascii").decode(bytes.subarray(0, 11));
  return text.startsWith("#?RADIANCE") || text.startsWith("#?RGBE");
}

export async function assertPngFile(file: File): Promise<void> {
  assertUploadSize(file);
  if (file.type !== "image/png") {
    throw new HttpError(400, "Layers must be PNG files");
  }
  if (!isPng(await readHead(file, 8))) {
    throw new HttpError(400, "Layers must be valid PNG files");
  }
}

export async function assertEnvironmentFile(
  file: File,
  envType: "hdr" | "ldr",
): Promise<void> {
  assertUploadSize(file);
  const head = await readHead(file, 16);
  if (envType === "hdr") {
    if (!HDR_TYPES.has(file.type) || !isHdr(head)) {
      throw new HttpError(400, "Environment must be a Radiance HDR file");
    }
    return;
  }
  const png = file.type === "image/png" && isPng(head);
  const jpeg =
    (file.type === "image/jpeg" || file.type === "image/jpg") && isJpeg(head);
  if (!png && !jpeg) {
    throw new HttpError(400, "LDR environment must be a PNG or JPEG file");
  }
}
