import { del, put } from "@vercel/blob";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const assertBlobSize = (size: number) => {
  if (size > MAX_UPLOAD_BYTES) {
    throw new Error("File exceeds 10MB limit");
  }
};

const LAYER_BLOB_PATH =
  /^scenes\/[A-Za-z0-9-]{8,80}\/(?:layers|env)\/[A-Za-z0-9._-]{1,120}$/;

export const uploadBlob = async (path: string, file: File) => {
  if (!LAYER_BLOB_PATH.test(path)) {
    throw new Error("Invalid blob path");
  }
  assertBlobSize(file.size);
  return put(path, file, {
    access: "public",
    addRandomSuffix: true,
  });
};

export const deleteBlob = async (url: string) => del(url);
